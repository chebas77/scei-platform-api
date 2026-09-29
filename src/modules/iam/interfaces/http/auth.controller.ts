import { Body, Controller, Get, Header, HttpCode, Post } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestMeta } from '../../../../shared/audit/audit-recorder.port';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { AuthContext } from '../../../../shared/security/auth-context';
import { AuthenticatedOnly, CurrentAuth, Public, ReqMeta } from '../../../../shared/security/decorators';
import { StrictThrottle } from '../../../../shared/security/throttle';
import { ConfirmMfaUseCase } from '../../application/confirm-mfa.use-case';
import { EnrollMfaUseCase } from '../../application/enroll-mfa.use-case';
import { GetMeUseCase } from '../../application/get-me.use-case';
import { LoginUseCase } from '../../application/login.use-case';
import { LogoutUseCase } from '../../application/logout.use-case';
import { RefreshSessionUseCase } from '../../application/refresh-session.use-case';
import { VerifyMfaUseCase } from '../../application/verify-mfa.use-case';
import { AuthHttpMapper } from './auth-http.mapper';
import { LoginResponseDto, MeResponseDto, MfaEnrollmentResponseDto, TokenPairResponseDto } from './dto/auth.response.dto';
import { ConfirmMfaRequestDto } from './dto/confirm-mfa.request.dto';
import { LoginRequestDto } from './dto/login.request.dto';
import { RefreshRequestDto } from './dto/refresh.request.dto';
import { VerifyMfaRequestDto } from './dto/verify-mfa.request.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly verifyMfa: VerifyMfaUseCase,
    private readonly enrollMfa: EnrollMfaUseCase,
    private readonly confirmMfa: ConfirmMfaUseCase,
    private readonly refresh: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getMe: GetMeUseCase,
  ) {}

  @Public()
  @StrictThrottle()
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Iniciar sesión con correo y contraseña (paso 1)' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiErrorResponses(
    ErrorCodes.VAL_INVALID_INPUT,
    ErrorCodes.AUTH_INVALID_CREDENTIALS,
    ErrorCodes.AUTH_ACCOUNT_LOCKED,
    ErrorCodes.AUTH_ACCOUNT_DISABLED,
    ErrorCodes.SYS_RATE_LIMITED,
  )
  async loginWithPassword(@Body() body: LoginRequestDto, @ReqMeta() meta: RequestMeta): Promise<LoginResponseDto> {
    return AuthHttpMapper.toLoginResponse(await this.login.execute(body, meta));
  }

  @Public()
  @StrictThrottle()
  @Post('mfa/verify')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Completar el login con el código de verificación en dos pasos (paso 2)' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiErrorResponses(
    ErrorCodes.VAL_INVALID_INPUT,
    ErrorCodes.AUTH_TOKEN_INVALID,
    ErrorCodes.AUTH_TOKEN_EXPIRED,
    ErrorCodes.AUTH_MFA_INVALID_CODE,
    ErrorCodes.AUTH_ACCOUNT_LOCKED,
    ErrorCodes.SYS_RATE_LIMITED,
  )
  verify(@Body() body: VerifyMfaRequestDto, @ReqMeta() meta: RequestMeta): Promise<TokenPairResponseDto> {
    return this.verifyMfa.execute(body, meta);
  }

  @AuthenticatedOnly({ allowSetupScope: true })
  @StrictThrottle()
  @Post('mfa/enroll')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Iniciar el enrolamiento de la verificación en dos pasos (devuelve la clave TOTP)' })
  @ApiOkResponse({ type: MfaEnrollmentResponseDto })
  @ApiErrorResponses(ErrorCodes.AUTH_TOKEN_INVALID, ErrorCodes.AUTH_MFA_ALREADY_ENABLED)
  enroll(@CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<MfaEnrollmentResponseDto> {
    return this.enrollMfa.execute(auth.userId, meta);
  }

  @AuthenticatedOnly({ allowSetupScope: true })
  @StrictThrottle()
  @Post('mfa/confirm')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Confirmar el enrolamiento con un código y obtener una sesión completa' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiErrorResponses(
    ErrorCodes.VAL_INVALID_INPUT,
    ErrorCodes.AUTH_TOKEN_INVALID,
    ErrorCodes.AUTH_MFA_NOT_ENROLLED,
    ErrorCodes.AUTH_MFA_ALREADY_ENABLED,
    ErrorCodes.AUTH_MFA_INVALID_CODE,
  )
  confirm(@CurrentAuth() auth: AuthContext, @Body() body: ConfirmMfaRequestDto, @ReqMeta() meta: RequestMeta): Promise<TokenPairResponseDto> {
    return this.confirmMfa.execute(auth.userId, body.code, meta);
  }

  @Public()
  @StrictThrottle()
  @Post('refresh')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Renovar la sesión (rota el refresh token; un token reutilizado revoca la sesión)' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiErrorResponses(
    ErrorCodes.VAL_INVALID_INPUT,
    ErrorCodes.AUTH_TOKEN_INVALID,
    ErrorCodes.AUTH_TOKEN_EXPIRED,
    ErrorCodes.AUTH_REFRESH_REUSED,
    ErrorCodes.AUTH_ACCOUNT_DISABLED,
  )
  refreshSession(@Body() body: RefreshRequestDto, @ReqMeta() meta: RequestMeta): Promise<TokenPairResponseDto> {
    return this.refresh.execute(body.refreshToken, meta);
  }

  @AuthenticatedOnly({ allowSetupScope: true })
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cerrar la sesión actual' })
  @ApiNoContentResponse({ description: 'Sesión cerrada.' })
  @ApiErrorResponses(ErrorCodes.AUTH_TOKEN_INVALID)
  async logout(@CurrentAuth() auth: AuthContext, @ReqMeta() meta: RequestMeta): Promise<void> {
    await this.logoutUseCase.execute(auth, meta);
  }

  @AuthenticatedOnly({ allowSetupScope: true })
  @Get('me')
  @ApiOperation({ summary: 'Datos de la sesión actual' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiErrorResponses(ErrorCodes.AUTH_TOKEN_INVALID)
  async me(@CurrentAuth() auth: AuthContext): Promise<MeResponseDto> {
    return AuthHttpMapper.toMe(await this.getMe.execute(auth));
  }
}
