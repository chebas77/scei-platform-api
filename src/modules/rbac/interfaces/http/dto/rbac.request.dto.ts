import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class ListRolesQueryDto {
  @ApiPropertyOptional({ enum: ['platform', 'tenant'] })
  @IsOptional()
  @IsIn(['platform', 'tenant'])
  scope?: 'platform' | 'tenant';
}

export class CreateRoleRequestDto {
  @ApiProperty({ example: 'soporte_plataforma', description: 'Identificador estable en minúsculas.' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]{2,59}$/, { message: 'code debe usar minúsculas, números y guion bajo (3-60).' })
  code: string;

  @ApiProperty({ example: 'Soporte de plataforma' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ['platform', 'tenant'] })
  @IsIn(['platform', 'tenant'])
  scope: 'platform' | 'tenant';

  @ApiPropertyOptional({ default: true, description: 'Exige verificación en dos pasos a quien tenga este rol.' })
  @IsOptional()
  @IsBoolean()
  requiresMfa?: boolean;
}

export class UpdateRoleRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresMfa?: boolean;
}

export class SetRoleModulesRequestDto {
  @ApiProperty({ type: [String], description: 'Reemplaza los módulos del rol; cada módulo concede todos sus permisos.' })
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  moduleIds: string[];
}

export class SetRolePermissionsRequestDto {
  @ApiProperty({ type: [String], description: 'Reemplaza los permisos sueltos del rol (además de los que dan sus módulos).' })
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  permissionIds: string[];
}
