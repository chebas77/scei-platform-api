import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../../../../../shared/http/pagination';

export class CreateTenantRequestDto {
  @ApiProperty({ example: 'colegio-san-martin', description: 'Identificador único en minúsculas y guiones (3-63).' })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug solo admite minúsculas, números y guiones' })
  @MinLength(3)
  @MaxLength(63)
  slug: string;

  @ApiProperty({ example: 'I.E. San Martín de Porres S.A.C.' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  legalName: string;

  @ApiPropertyOptional({ example: '20123456789', description: 'RUC de 11 dígitos.' })
  @IsOptional()
  @Matches(/^\d{11}$/, { message: 'ruc debe tener 11 dígitos' })
  ruc?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  planId: string;

  @ApiProperty({ example: 'director@colegio.pe', description: 'Recibirá una invitación de un solo uso para definir su propia clave.' })
  @IsEmail()
  @MaxLength(254)
  adminEmail: string;
}

export class ListTenantsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'suspended', 'pending_deletion', 'purged'] })
  @IsOptional()
  @IsIn(['active', 'suspended', 'pending_deletion', 'purged'])
  status?: 'active' | 'suspended' | 'pending_deletion' | 'purged';

  @ApiPropertyOptional({ description: 'Busca en nombre legal e identificador.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class AssignPlanRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  planId: string;
}

export class SuspendTenantRequestDto {
  @ApiProperty({ example: 'Pago pendiente', description: 'Motivo (queda en la bitácora).' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason: string;
}

export class PurgeTenantRequestDto {
  @ApiProperty({ example: 'colegio-san-martin', description: 'Debe coincidir exactamente con el slug del colegio.' })
  @IsString()
  @MaxLength(63)
  confirmSlug: string;
}

export class ResendInvitationRequestDto {
  @ApiProperty({ example: 'director@colegio.pe' })
  @IsEmail()
  @MaxLength(254)
  adminEmail: string;
}

export class AcceptInvitationRequestDto {
  @ApiProperty({ description: 'Token del enlace recibido por correo.' })
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token: string;

  @ApiProperty({ minLength: 12, maxLength: 128, description: 'Clave propia (mín. 12 caracteres). Si la cuenta ya existe se conserva su clave actual.' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
