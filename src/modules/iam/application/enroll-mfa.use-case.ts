import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { SECRET_CIPHER, SecretCipherPort } from '../../../shared/crypto/crypto.ports';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { TOTP, TotpPort } from '../domain/ports/totp.port';
import { USER_REPOSITORY, UserRepositoryPort } from '../domain/ports/user.repository.port';

export interface MfaEnrollment {
  otpauthUrl: string;
  manualEntryKey: string;
}

@Injectable()
export class EnrollMfaUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(TOTP) private readonly totp: TotpPort,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipherPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
  ) {}

  async execute(userId: string, meta: RequestMeta): Promise<MfaEnrollment> {
    const secret = this.totp.generateSecret();
    let email = '';
    const updated = await this.users.mutate(userId, (u) => {
      if (u.mfaEnabled) throw new AppException(ErrorCodes.AUTH_MFA_ALREADY_ENABLED);
      email = u.email;
      u.startMfaEnrollment(this.cipher.encrypt(secret));
    });
    if (!updated) throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);
    await this.audit.record({ action: 'auth.mfa.enroll_started', outcome: 'success', actorUserId: userId, meta });
    return { otpauthUrl: this.totp.keyUri(email, secret), manualEntryKey: secret };
  }
}
