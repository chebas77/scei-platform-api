import { Tx } from '../../../../shared/database/tx';
import { AcademicYear, Enrollment, GradeLevel, Section } from '../academic';

export interface AcademicYearRepositoryPort {
  create(input: { tenantId: string; year: number }): Promise<AcademicYear | null>;
  findById(id: string): Promise<AcademicYear | null>;
  listByTenant(tenantId: string): Promise<AcademicYear[]>;
  update(id: string, patch: Partial<Pick<AcademicYear, 'status'>>): Promise<AcademicYear | null>;
}
export const ACADEMIC_YEAR_REPOSITORY = Symbol('ACADEMIC_YEAR_REPOSITORY');

export interface GradeLevelRepositoryPort {
  create(input: { tenantId: string; name: string; order: number }): Promise<GradeLevel | null>;
  findById(id: string): Promise<GradeLevel | null>;
  listByTenant(tenantId: string): Promise<GradeLevel[]>;
  delete(id: string): Promise<boolean>;
}
export const GRADE_LEVEL_REPOSITORY = Symbol('GRADE_LEVEL_REPOSITORY');

export interface SectionRepositoryPort {
  create(input: { tenantId: string; academicYearId: string; gradeLevelId: string; name: string }): Promise<Section | null>;
  findById(id: string): Promise<Section | null>;
  listByYear(academicYearId: string): Promise<Section[]>;
  delete(id: string): Promise<boolean>;
}
export const SECTION_REPOSITORY = Symbol('SECTION_REPOSITORY');

export interface EnrollmentRepositoryPort {
  /** `null` si el alumno ya tiene matrícula (activa o retirada) en ese ciclo. */
  create(input: { tenantId: string; academicYearId: string; sectionId: string; studentId: string }, tx?: Tx): Promise<Enrollment | null>;
  findById(id: string): Promise<Enrollment | null>;
  listBySection(sectionId: string): Promise<Enrollment[]>;
  findActiveForStudent(studentId: string, academicYearId: string): Promise<Enrollment | null>;
  update(id: string, patch: Partial<Pick<Enrollment, 'sectionId' | 'status'>>): Promise<Enrollment | null>;
  deleteAllForTenant(tenantId: string, tx: Tx): Promise<number>;
}
export const ENROLLMENT_REPOSITORY = Symbol('ENROLLMENT_REPOSITORY');
