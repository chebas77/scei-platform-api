import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class VerifyMfaRequestDto {
  @ApiProperty({ description: 'Token `mfaChallengeToken` devuelto por el login.' })
  @IsString()
  @MaxLength(2048)
  challengeToken: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos de la app autenticadora.' })
  @Matches(/^\d{6}$/, { message: 'code debe tener 6 dígitos' })
  code: string;
}
