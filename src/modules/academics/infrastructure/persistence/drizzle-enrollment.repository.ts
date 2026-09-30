import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { Enrollment } from '../../domain/academic';
import { EnrollmentRepositoryPort } from '../../domain/ports/academic.repository.port';
import { enrollments } from './schema/enrollments.table';

const toDomain = (r: typeof enrollments.$inferSelect): Enrollment => ({
  id: r.id, tenantId: r.tenantId, academicYearId: r.academicYearId, sectionId: r.sectionId, studentId: r.studentId,
  status: r.status as Enrollment['status'], createdAt: r.createdAt,
});

@Injectable()
export class DrizzleEnrollmentRepository implements EnrollmentRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: { tenantId: string; academicYearId: string; sectionId: string; studentId: string }, tx?: Tx): Promise<Enrollment | null> {
    const [row] = await pick(this.db, tx)
      .insert(enrollments)
      .values(input)
      .onConflictDoNothing({ target: [enrollments.academicYearId, enrollments.studentId] })
      .returning();
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<Enrollment | null> {
    const [row] = await this.db.select().from(enrollments).where(eq(enrollments.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async listBySection(sectionId: string): Promise<Enrollment[]> {
    return (await this.db.select().from(enrollments).where(eq(enrollments.sectionId, sectionId))).map(toDomain);
  }

  async findActiveForStudent(studentId: string, academicYearId: string): Promise<Enrollment | null> {
    const [row] = await this.db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.academicYearId, academicYearId), eq(enrollments.status, 'active')))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async update(id: string, patch: Partial<Pick<Enrollment, 'sectionId' | 'status'>>): Promise<Enrollment | null> {
    const [row] = await this.db.update(enrollments).set(patch).where(eq(enrollments.id, id)).returning();
    return row ? toDomain(row) : null;
  }

  async deleteAllForTenant(tenantId: string, tx: Tx): Promise<number> {
    const rows = await pick(this.db, tx).delete(enrollments).where(eq(enrollments.tenantId, tenantId)).returning({ id: enrollments.id });
    return rows.length;
  }
}
