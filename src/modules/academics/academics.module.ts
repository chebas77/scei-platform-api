import { Module } from '@nestjs/common';
import { AcademicStructureService } from './application/academic-structure.service';
import { EnrollmentService } from './application/enrollment.service';
import {
  ACADEMIC_YEAR_REPOSITORY, ENROLLMENT_REPOSITORY, GRADE_LEVEL_REPOSITORY, SECTION_REPOSITORY,
} from './domain/ports/academic.repository.port';
import { DrizzleAcademicYearRepository } from './infrastructure/persistence/drizzle-academic-year.repository';
import { DrizzleEnrollmentRepository } from './infrastructure/persistence/drizzle-enrollment.repository';
import { DrizzleGradeLevelRepository } from './infrastructure/persistence/drizzle-grade-level.repository';
import { DrizzleSectionRepository } from './infrastructure/persistence/drizzle-section.repository';
import { AcademicsController } from './interfaces/http/academics.controller';

@Module({
  controllers: [AcademicsController],
  providers: [
    { provide: ACADEMIC_YEAR_REPOSITORY, useClass: DrizzleAcademicYearRepository },
    { provide: GRADE_LEVEL_REPOSITORY, useClass: DrizzleGradeLevelRepository },
    { provide: SECTION_REPOSITORY, useClass: DrizzleSectionRepository },
    { provide: ENROLLMENT_REPOSITORY, useClass: DrizzleEnrollmentRepository },
    AcademicStructureService,
    EnrollmentService,
  ],
})
export class AcademicsModule {}
