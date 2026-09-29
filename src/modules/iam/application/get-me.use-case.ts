import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { AuthContext, TokenScope } from '../../../shared/security/auth-context';
import { USER_REPOSITORY, UserRepositoryPort } from '../domain/ports/user.repository.port';

export interface MeResult {
  userId: string;
  email: string;
  mfaEnabled: boolean;
  scope: TokenScope;
}

@Injectable()
export class GetMeUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort) {}

  async execute(auth: AuthContext): Promise<MeResult> {
    const user = await this.users.findById(auth.userId);
    if (!user) throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);
    return { userId: user.id, email: user.email, mfaEnabled: user.mfaEnabled, scope: auth.scope };
  }
}
