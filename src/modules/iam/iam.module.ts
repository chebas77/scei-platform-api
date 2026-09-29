import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IDENTITY_PROVISIONING } from '../../shared/contracts/identity.contracts';
import { APP_CONFIG, AppConfig } from '../../shared/config/env';
import { ACCESS_TOKEN_VERIFIER, SESSION_VALIDATOR } from '../../shared/security/auth-context';
import { ConfirmMfaUseCase } from './application/confirm-mfa.use-case';
import { CreatePlatformAdminUseCase } from './application/create-platform-admin.use-case';
import { EnrollMfaUseCase } from './application/enroll-mfa.use-case';
import { GetMeUseCase } from './application/get-me.use-case';
import { IdentityProvisioningService } from './application/identity-provisioning.service';
import { LoginUseCase } from './application/login.use-case';
import { LogoutUseCase } from './application/logout.use-case';
import { MfaVerifier } from './application/mfa-verifier.service';
import { RefreshSessionUseCase } from './application/refresh-session.use-case';
import { SessionIssuer } from './application/session-issuer.service';
import { VerifyMfaUseCase } from './application/verify-mfa.use-case';
import { REFRESH_TOKEN_REPOSITORY } from './domain/ports/refresh-token.repository.port';
import { TOKEN_ISSUER } from './domain/ports/token-issuer.port';
import { TOTP } from './domain/ports/totp.port';
import { USER_REPOSITORY } from './domain/ports/user.repository.port';
import { DrizzleRefreshTokenRepository } from './infrastructure/persistence/drizzle-refresh-token.repository';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user.repository';
import { DbSessionValidator } from './infrastructure/security/db-session-validator';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { OtplibTotp } from './infrastructure/security/otplib-totp';
import { AuthController } from './interfaces/http/auth.controller';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig) => ({
        secret: cfg.JWT_ACCESS_SECRET,
        signOptions: { algorithm: 'HS256', issuer: cfg.JWT_ISSUER },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: DrizzleRefreshTokenRepository },
    { provide: TOTP, useClass: OtplibTotp },
    JwtTokenService,
    { provide: TOKEN_ISSUER, useExisting: JwtTokenService },
    { provide: ACCESS_TOKEN_VERIFIER, useExisting: JwtTokenService },
    { provide: SESSION_VALIDATOR, useClass: DbSessionValidator },
    SessionIssuer,
    MfaVerifier,
    LoginUseCase,
    VerifyMfaUseCase,
    EnrollMfaUseCase,
    ConfirmMfaUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    GetMeUseCase,
    IdentityProvisioningService,
    { provide: IDENTITY_PROVISIONING, useExisting: IdentityProvisioningService },
    CreatePlatformAdminUseCase,
  ],
  exports: [ACCESS_TOKEN_VERIFIER, SESSION_VALIDATOR, IDENTITY_PROVISIONING, CreatePlatformAdminUseCase],
})
export class IamModule {}
