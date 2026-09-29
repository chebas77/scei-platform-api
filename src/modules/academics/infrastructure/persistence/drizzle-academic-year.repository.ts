import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Db, DB } from '../../../../shared/database/tx';
import { AcademicYear } from '../../domain/academic';
import { AcademicYearRepositoryPort } from '../../domain/ports/academic.repository.port';
import { academicYears } from './schema/academic-years.table';

const toDomain = (r: typeof academicYears.$inferSelect): AcademicYear => ({
  id: r.id, tenantId: r.tenantId, year: r.year, status: r.status as AcademicYear['status'], createdAt: r.createdAt,
});

@Injectable()
export class DrizzleAcademicYearRepository implements AcademicYearRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: { tenantId: string; year: number }): Promise<AcademicYear | null> {
    const [row] = await this.db.insert(academicYears).values(input).onConflictDoNothing({ target: [academicYears.tenantId, academicYears.year] }).returning();
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<AcademicYear | null> {
    const [row] = await this.db.select().from(academicYears).where(eq(academicYears.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async listByTenant(tenantId: string): Promise<AcademicYear[]> {
    return (await this.db.select().from(academicYears).where(eq(academicYears.tenantId, tenantId))).map(toDomain);
  }

  async update(id: string, patch: Partial<Pick<AcademicYear, 'status'>>): Promise<AcademicYear | null> {
    const [row] = await this.db.update(academicYears).set(patch).where(eq(academicYears.id, id)).returning();
    return row ? toDomain(row) : null;
  }
}
