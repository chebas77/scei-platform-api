import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { AcademicYear, GradeLevel, Section } from '../domain/academic';
import {
  ACADEMIC_YEAR_REPOSITORY, AcademicYearRepositoryPort, GRADE_LEVEL_REPOSITORY, GradeLevelRepositoryPort,
  SECTION_REPOSITORY, SectionRepositoryPort,
} from '../domain/ports/academic.repository.port';

/** Ciclos escolares, grados (catálogo fijo del colegio) y secciones (instancia de un grado por ciclo). */
@Injectable()
export class AcademicStructureService {
  constructor(
    @Inject(ACADEMIC_YEAR_REPOSITORY) private readonly years: AcademicYearRepositoryPort,
    @Inject(GRADE_LEVEL_REPOSITORY) private readonly grades: GradeLevelRepositoryPort,
    @Inject(SECTION_REPOSITORY) private readonly sections: SectionRepositoryPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
  ) {}

  // ── Ciclos escolares ─────────────────────────────────────────────────
  listYears(tenantId: string): Promise<AcademicYear[]> {
    return this.years.listByTenant(tenantId);
  }

  async createYear(tenantId: string, year: number, actorId: string, meta: RequestMeta): Promise<AcademicYear> {
    const created = await this.years.create({ tenantId, year });
    if (!created) throw new AppException(ErrorCodes.ACA_YEAR_TAKEN);
    await this.audit.record({ action: 'academic_year.created', outcome: 'success', actorUserId: actorId, resourceType: 'academic_year', resourceId: created.id, tenantId, meta, metadata: { year } });
    return created;
  }

  async closeYear(tenantId: string, id: string, actorId: string, meta: RequestMeta): Promise<AcademicYear> {
    const year = await this.requireOwnedYear(tenantId, id);
    const updated = await this.years.update(year.id, { status: 'closed' });
    if (!updated) throw new AppException(ErrorCodes.ACA_YEAR_NOT_FOUND);
    await this.audit.record({ action: 'academic_year.closed', outcome: 'success', actorUserId: actorId, resourceType: 'academic_year', resourceId: id, tenantId, meta });
    return updated;
  }

  // ── Grados ───────────────────────────────────────────────────────────
  listGrades(tenantId: string): Promise<GradeLevel[]> {
    return this.grades.listByTenant(tenantId);
  }

  async createGrade(tenantId: string, input: { name: string; order: number }, actorId: string, meta: RequestMeta): Promise<GradeLevel> {
    const created = await this.grades.create({ tenantId, ...input });
    if (!created) throw new AppException(ErrorCodes.ACA_GRADE_TAKEN);
    await this.audit.record({ action: 'grade_level.created', outcome: 'success', actorUserId: actorId, resourceType: 'grade_level', resourceId: created.id, tenantId, meta, metadata: { name: input.name } });
    return created;
  }

  async deleteGrade(tenantId: string, id: string, actorId: string, meta: RequestMeta): Promise<void> {
    const grade = await this.grades.findById(id);
    if (!grade || grade.tenantId !== tenantId) throw new AppException(ErrorCodes.ACA_GRADE_NOT_FOUND);
    const deleted = await this.grades.delete(id).catch(() => {
      throw new AppException(ErrorCodes.ACA_GRADE_IN_USE);
    });
    if (!deleted) throw new AppException(ErrorCodes.ACA_GRADE_NOT_FOUND);
    await this.audit.record({ action: 'grade_level.deleted', outcome: 'success', actorUserId: actorId, resourceType: 'grade_level', resourceId: id, tenantId, meta });
  }

  // ── Secciones ────────────────────────────────────────────────────────
  async listSections(tenantId: string, academicYearId: string): Promise<Section[]> {
    await this.requireOwnedYear(tenantId, academicYearId);
    return this.sections.listByYear(academicYearId);
  }

  async createSection(tenantId: string, input: { academicYearId: string; gradeLevelId: string; name: string }, actorId: string, meta: RequestMeta): Promise<Section> {
    await this.requireOwnedYear(tenantId, input.academicYearId);
    const grade = await this.grades.findById(input.gradeLevelId);
    if (!grade || grade.tenantId !== tenantId) throw new AppException(ErrorCodes.ACA_GRADE_NOT_FOUND);

    const created = await this.sections.create({ tenantId, ...input });
    if (!created) throw new AppException(ErrorCodes.ACA_SECTION_TAKEN);
    await this.audit.record({
      action: 'section.created', outcome: 'success', actorUserId: actorId, resourceType: 'section', resourceId: created.id, tenantId, meta,
      metadata: { name: input.name, gradeLevelId: input.gradeLevelId },
    });
    return created;
  }

  async deleteSection(tenantId: string, id: string, actorId: string, meta: RequestMeta): Promise<void> {
    const section = await this.sections.findById(id);
    if (!section || section.tenantId !== tenantId) throw new AppException(ErrorCodes.ACA_SECTION_NOT_FOUND);
    const deleted = await this.sections.delete(id).catch(() => {
      throw new AppException(ErrorCodes.ACA_SECTION_HAS_ENROLLMENTS);
    });
    if (!deleted) throw new AppException(ErrorCodes.ACA_SECTION_NOT_FOUND);
    await this.audit.record({ action: 'section.deleted', outcome: 'success', actorUserId: actorId, resourceType: 'section', resourceId: id, tenantId, meta });
  }

  private async requireOwnedYear(tenantId: string, id: string): Promise<AcademicYear> {
    const year = await this.years.findById(id);
    if (!year || year.tenantId !== tenantId) throw new AppException(ErrorCodes.ACA_YEAR_NOT_FOUND);
    return year;
  }
}
