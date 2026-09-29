import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePlanRequestDto {
  @ApiProperty({ example: 'estandar' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_-]{1,39}$/, { message: 'code usa minúsculas, números, guion y guion bajo' })
  code: string;

  @ApiProperty({ example: 'Estándar' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 1500 }) @IsInt() @Min(1) @Max(1_000_000) maxStudents: number;
  @ApiProperty({ example: 4 }) @IsInt() @Min(1) @Max(10_000) maxKiosks: number;
  @ApiProperty({ example: 365, description: 'Días de retención de marcas y plantillas.' }) @IsInt() @Min(1) @Max(3650) retentionDays: number;
}

export class UpdatePlanRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(1_000_000) maxStudents?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(10_000) maxKiosks?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(3650) retentionDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class PlanResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty() maxStudents: number;
  @ApiProperty() maxKiosks: number;
  @ApiProperty() retentionDays: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

export class PlanListItemResponseDto extends PlanResponseDto {
  @ApiProperty({ description: 'Colegios vigentes o en baja que usan el plan.' }) tenantCount: number;
}
