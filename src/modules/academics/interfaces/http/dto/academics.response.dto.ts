import { ApiProperty } from '@nestjs/swagger';

export class AcademicYearResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() year: number;
  @ApiProperty({ enum: ['active', 'closed'] }) status: 'active' | 'closed';
  @ApiProperty() createdAt: string;
}

export class GradeLevelResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() order: number;
}

export class SectionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() academicYearId: string;
  @ApiProperty() gradeLevelId: string;
  @ApiProperty() name: string;
}

export class EnrollmentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() academicYearId: string;
  @ApiProperty() sectionId: string;
  @ApiProperty() studentId: string;
  @ApiProperty({ enum: ['active', 'withdrawn'] }) status: 'active' | 'withdrawn';
  @ApiProperty() createdAt: string;
}
