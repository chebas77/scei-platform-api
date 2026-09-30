import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAcademicYearRequestDto {
  @ApiProperty({ example: 2026 }) @IsInt() @Min(2000) @Max(2200) year: number;
}

export class CreateGradeLevelRequestDto {
  @ApiProperty({ example: '1er año' }) @IsString() @MinLength(1) @MaxLength(60) name: string;
  @ApiProperty({ example: 1, description: 'Orden de despliegue (menor primero).' }) @IsInt() @Min(0) @Max(100) order: number;
}

export class CreateSectionRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() academicYearId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() gradeLevelId: string;
  @ApiProperty({ example: 'A' }) @IsString() @MinLength(1) @MaxLength(20) name: string;
}

export class CreateEnrollmentRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() sectionId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() studentId: string;
}

export class TransferEnrollmentRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() sectionId: string;
}
