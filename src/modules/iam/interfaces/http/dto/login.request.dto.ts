import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** Entrada de login. No se valida complejidad aquí (solo al crear/cambiar la contraseña). */
export class LoginRequestDto {
  @ApiProperty({ example: 'admin@plataforma.pe' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: '••••••••••••', minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128) // tope para que argon2 no procese entradas gigantes
  password: string;
}
