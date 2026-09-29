import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class InviteOperatorRequestDto {
  @ApiProperty({ example: 'ops@empresa.pe', description: 'Recibirá una invitación de un solo uso para definir su propia clave.' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ format: 'uuid', description: 'Rol a asignar; su ámbito determina si es un operador de plataforma o un colegio.' })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Colegio, cuando el rol es de ámbito colegio. Omitir para roles de plataforma.' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class ChangeUserRoleRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Colegio, cuando el rol es de ámbito colegio. Omitir para roles de plataforma.' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class AcceptOperatorInvitationRequestDto {
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
