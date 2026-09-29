import { LoginResult } from '../../application/login.use-case';
import { MeResult } from '../../application/get-me.use-case';
import { LoginResponseDto, MeResponseDto } from './dto/auth.response.dto';

export const AuthHttpMapper = {
  toLoginResponse(result: LoginResult): LoginResponseDto {
    switch (result.status) {
      case 'authenticated':
        return { status: 'authenticated', tokens: result.tokens };
      case 'mfa_required':
        return { status: 'mfa_required', mfaChallengeToken: result.challengeToken };
      case 'mfa_setup_required':
        return { status: 'mfa_setup_required', setupToken: result.setupToken };
    }
  },
  toMe(me: MeResult): MeResponseDto {
    return { userId: me.userId, email: me.email, mfaEnabled: me.mfaEnabled, scope: me.scope };
  },
};
