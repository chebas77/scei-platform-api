import { AcademicYear, Enrollment, GradeLevel, Section } from '../../domain/academic';
import { AcademicYearResponseDto, EnrollmentResponseDto, GradeLevelResponseDto, SectionResponseDto } from './dto/academics.response.dto';

export const AcademicsHttpMapper = {
  toYear(y: AcademicYear): AcademicYearResponseDto {
    return { id: y.id, year: y.year, status: y.status, createdAt: y.createdAt.toISOString() };
  },
  toGrade(g: GradeLevel): GradeLevelResponseDto {
    return { id: g.id, name: g.name, order: g.order };
  },
  toSection(s: Section): SectionResponseDto {
    return { id: s.id, academicYearId: s.academicYearId, gradeLevelId: s.gradeLevelId, name: s.name };
  },
  toEnrollment(e: Enrollment): EnrollmentResponseDto {
    return { id: e.id, academicYearId: e.academicYearId, sectionId: e.sectionId, studentId: e.studentId, status: e.status, createdAt: e.createdAt.toISOString() };
  },
};
