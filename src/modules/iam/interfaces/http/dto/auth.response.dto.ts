import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokenPairResponseDto {
  @ApiProperty({ description: 'JWT de vida corta para el header `Authorization: Bearer`.' })
  accessToken: string;

  @ApiProperty({ description: 'Token opaco de un solo uso; se rota en cada renovación.' })
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Segundos de vida del access token.' })
  expiresIn: number;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;
}

export class SetupTokenResponseDto {
  @ApiProperty({ description: 'Token limitado: solo sirve para enrolar la verificación en dos pasos.' })
  accessToken: string;

  @ApiProperty({ example: 600 })
  expiresIn: number;
}

/** Respuesta del login; los campos presentes dependen de `status`. */
export class LoginResponseDto {
  @ApiProperty({
    enum: ['authenticated', 'mfa_required', 'mfa_setup_required'],
    description:
      '`authenticated`: usa `tokens`. `mfa_required`: envía `mfaChallengeToken` + código a /auth/mfa/verify. `mfa_setup_required`: usa `setupToken` para enrolar MFA.',
  })
  status: 'authenticated' | 'mfa_required' | 'mfa_setup_required';

  @ApiPropertyOptional({ type: TokenPairResponseDto })
  tokens?: TokenPairResponseDto;

  @ApiPropertyOptional({ description: 'Vale 5 minutos y solo para /auth/mfa/verify.' })
  mfaChallengeToken?: string;

  @ApiPropertyOptional({ type: SetupTokenResponseDto })
  setupToken?: SetupTokenResponseDto;
}

export class MfaEnrollmentResponseDto {
  @ApiProperty({ example: 'otpauth://totp/SCEI%20Plataforma:admin%40plataforma.pe?secret=...&issuer=SCEI%20Plataforma' })
  otpauthUrl: string;

  @ApiProperty({ description: 'Clave para ingreso manual. Se muestra una sola vez.' })
  manualEntryKey: string;
}

export class MeResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  mfaEnabled: boolean;

  @ApiProperty({ enum: ['full', 'mfa_setup'] })
  scope: string;
}
