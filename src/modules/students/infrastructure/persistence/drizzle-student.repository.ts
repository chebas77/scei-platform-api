import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { NewStudentRecord, StudentRepositoryPort } from '../../domain/ports/student.repository.port';
import { StudentRecord } from '../../domain/student';
import { students } from './schema/students.table';

const toDomain = (r: typeof students.$inferSelect): StudentRecord => ({
  id: r.id, tenantId: r.tenantId, userId: r.userId, code: r.code, fullNameEnc: r.fullNameEnc,
  status: r.status as StudentRecord['status'], createdAt: r.createdAt, updatedAt: r.updatedAt,
});

@Injectable()
export class DrizzleStudentRepository implements StudentRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: NewStudentRecord, tx?: Tx): Promise<StudentRecord | null> {
    const [row] = await pick(this.db, tx).insert(students).values(input).onConflictDoNothing({ target: [students.tenantId, students.code] }).returning();
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<StudentRecord | null> {
    const [row] = await this.db.select().from(students).where(eq(students.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async existsInTenant(tenantId: string, id: string): Promise<boolean> {
    const rows = await this.db.select({ id: students.id }).from(students).where(and(eq(students.id, id), eq(students.tenantId, tenantId))).limit(1);
    return rows.length > 0;
  }

  async listByTenant(tenantId: string): Promise<StudentRecord[]> {
    return (await this.db.select().from(students).where(eq(students.tenantId, tenantId))).map(toDomain);
  }

  async countActiveByTenant(tenantId: string): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(students).where(and(eq(students.tenantId, tenantId), eq(students.status, 'active')));
    return row?.n ?? 0;
  }

  async update(id: string, patch: Partial<Pick<StudentRecord, 'fullNameEnc' | 'status'>>): Promise<StudentRecord | null> {
    const [row] = await this.db.update(students).set({ ...patch, updatedAt: new Date() }).where(eq(students.id, id)).returning();
    return row ? toDomain(row) : null;
  }

  async deleteAllForTenant(tenantId: string, tx: Tx): Promise<number> {
    const rows = await pick(this.db, tx).delete(students).where(eq(students.tenantId, tenantId)).returning({ id: students.id });
    return rows.length;
  }
}
