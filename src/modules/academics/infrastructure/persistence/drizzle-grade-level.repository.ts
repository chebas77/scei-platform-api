import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { Db, DB } from '../../../../shared/database/tx';
import { GradeLevel } from '../../domain/academic';
import { GradeLevelRepositoryPort } from '../../domain/ports/academic.repository.port';
import { gradeLevels } from './schema/grade-levels.table';

const toDomain = (r: typeof gradeLevels.$inferSelect): GradeLevel => ({ id: r.id, tenantId: r.tenantId, name: r.name, order: r.order });

@Injectable()
export class DrizzleGradeLevelRepository implements GradeLevelRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: { tenantId: string; name: string; order: number }): Promise<GradeLevel | null> {
    const [row] = await this.db.insert(gradeLevels).values(input).onConflictDoNothing({ target: [gradeLevels.tenantId, gradeLevels.name] }).returning();
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<GradeLevel | null> {
    const [row] = await this.db.select().from(gradeLevels).where(eq(gradeLevels.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async listByTenant(tenantId: string): Promise<GradeLevel[]> {
    return (await this.db.select().from(gradeLevels).where(eq(gradeLevels.tenantId, tenantId)).orderBy(asc(gradeLevels.order))).map(toDomain);
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(gradeLevels).where(eq(gradeLevels.id, id)).returning({ id: gradeLevels.id });
    return rows.length > 0;
  }
}
