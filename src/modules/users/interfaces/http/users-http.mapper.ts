import { ScopedUser } from '../../application/list-scoped-users.use-case';
import { ScopedUserResponseDto } from './dto/users.response.dto';

export const UsersHttpMapper = {
  toScopedUser(u: ScopedUser): ScopedUserResponseDto {
    return {
      userId: u.userId, email: u.email, status: u.status, mfaEnabled: u.mfaEnabled,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null, createdAt: u.createdAt.toISOString(),
      roleId: u.roleId, roleCode: u.roleCode, roleName: u.roleName,
    };
  },
};
