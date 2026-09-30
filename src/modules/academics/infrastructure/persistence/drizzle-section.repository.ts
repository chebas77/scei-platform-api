import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Db, DB } from '../../../../shared/database/tx';
import { Section } from '../../domain/academic';
import { SectionRepositoryPort } from '../../domain/ports/academic.repository.port';
import { sections } from './schema/sections.table';

const toDomain = (r: typeof sections.$inferSelect): Section => ({
  id: r.id, tenantId: r.tenantId, academicYearId: r.academicYearId, gradeLevelId: r.gradeLevelId, name: r.name,
});

@Injectable()
export class DrizzleSectionRepository implements SectionRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: { tenantId: string; academicYearId: string; gradeLevelId: string; name: string }): Promise<Section | null> {
    const [row] = await this.db
      .insert(sections)
      .values(input)
      .onConflictDoNothing({ target: [sections.academicYearId, sections.gradeLevelId, sections.name] })
      .returning();
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<Section | null> {
    const [row] = await this.db.select().from(sections).where(eq(sections.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async listByYear(academicYearId: string): Promise<Section[]> {
    return (await this.db.select().from(sections).where(eq(sections.academicYearId, academicYearId))).map(toDomain);
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(sections).where(eq(sections.id, id)).returning({ id: sections.id });
    return rows.length > 0;
  }
}
