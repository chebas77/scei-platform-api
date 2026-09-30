import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { STUDENT_DIRECTORY, StudentDirectoryPort } from '../../../shared/contracts/student.contracts';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { Enrollment } from '../domain/academic';
import { ENROLLMENT_REPOSITORY, EnrollmentRepositoryPort, SECTION_REPOSITORY, SectionRepositoryPort } from '../domain/ports/academic.repository.port';

/** Matrícula de un alumno en una sección de un ciclo escolar. Quién puede matricular alumnos vive en Students. */
@Injectable()
export class EnrollmentService {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollments: EnrollmentRepositoryPort,
    @Inject(SECTION_REPOSITORY) private readonly sections: SectionRepositoryPort,
    @Inject(STUDENT_DIRECTORY) private readonly studentDirectory: StudentDirectoryPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
  ) {}

  listBySection(sectionId: string): Promise<Enrollment[]> {
    return this.enrollments.listBySection(sectionId);
  }

  async enroll(tenantId: string, input: { sectionId: string; studentId: string }, actorId: string, meta: RequestMeta): Promise<Enrollment> {
    const section = await this.sections.findById(input.sectionId);
    if (!section || section.tenantId !== tenantId) throw new AppException(ErrorCodes.ACA_SECTION_NOT_FOUND);
    if (!(await this.studentDirectory.existsInTenant(tenantId, input.studentId))) throw new AppException(ErrorCodes.STU_NOT_FOUND);

    const created = await this.enrollments.create({ tenantId, academicYearId: section.academicYearId, sectionId: section.id, studentId: input.studentId });
    if (!created) throw new AppException(ErrorCodes.ACA_ALREADY_ENROLLED);
    await this.audit.record({
      action: 'enrollment.created', outcome: 'success', actorUserId: actorId, resourceType: 'enrollment', resourceId: created.id, tenantId, meta,
      metadata: { sectionId: section.id, studentId: input.studentId },
    });
    return created;
  }

  /** Traslada al alumno a otra sección DEL MISMO ciclo escolar (transferencia dentro del año, no promoción). */
  async transfer(tenantId: string, enrollmentId: string, newSectionId: string, actorId: string, meta: RequestMeta): Promise<Enrollment> {
    const enrollment = await this.requireOwnedEnrollment(tenantId, enrollmentId);
    const newSection = await this.sections.findById(newSectionId);
    if (!newSection || newSection.tenantId !== tenantId) throw new AppException(ErrorCodes.ACA_SECTION_NOT_FOUND);
    if (newSection.academicYearId !== enrollment.academicYearId) throw new AppException(ErrorCodes.ACA_SCOPE_MISMATCH);

    const updated = await this.enrollments.update(enrollmentId, { sectionId: newSectionId });
    if (!updated) throw new AppException(ErrorCodes.ACA_ENROLLMENT_NOT_FOUND);
    await this.audit.record({
      action: 'enrollment.transferred', outcome: 'success', actorUserId: actorId, resourceType: 'enrollment', resourceId: enrollmentId, tenantId, meta,
      metadata: { fromSectionId: enrollment.sectionId, toSectionId: newSectionId },
    });
    return updated;
  }

  async withdraw(tenantId: string, enrollmentId: string, actorId: string, meta: RequestMeta): Promise<void> {
    await this.requireOwnedEnrollment(tenantId, enrollmentId);
    await this.enrollments.update(enrollmentId, { status: 'withdrawn' });
    await this.audit.record({ action: 'enrollment.withdrawn', outcome: 'success', actorUserId: actorId, resourceType: 'enrollment', resourceId: enrollmentId, tenantId, meta });
  }

  private async requireOwnedEnrollment(tenantId: string, id: string): Promise<Enrollment> {
    const enrollment = await this.enrollments.findById(id);
    if (!enrollment || enrollment.tenantId !== tenantId) throw new AppException(ErrorCodes.ACA_ENROLLMENT_NOT_FOUND);
    return enrollment;
  }
}
