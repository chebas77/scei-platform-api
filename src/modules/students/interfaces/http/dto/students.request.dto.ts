import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateStudentRequestDto {
  @ApiProperty({ example: 'ana.torres@colegio.pe', description: 'Correo con el que el alumno (y su padre/madre) inicia sesión.' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: 12, maxLength: 128, description: 'Clave inicial que el colegio define (el alumno/padre puede cambiarla después).' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: 'A2026-014', description: 'Código o identificador del alumno en el colegio, único.' })
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/, { message: 'code usa letras, números, punto, guion y guion bajo' })
  code: string;

  @ApiProperty({ example: 'Ana Torres Ríos' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName: string;
}

export class UpdateStudentRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(200) fullName?: string;
  @ApiPropertyOptional({ enum: ['active', 'inactive'] }) @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}
