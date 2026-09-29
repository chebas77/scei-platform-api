import { Inject, Injectable } from '@nestjs/common';
import { MEMBERSHIP_DIRECTORY, MembershipDirectoryPort } from '../../../shared/contracts/rbac.contracts';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';

const PLATFORM_SUPERADMIN_CODE = 'platform_superadmin';

/** Evita dejar la plataforma sin ningún SuperAdmin activo al reasignar un rol o deshabilitar una cuenta. */
@Injectable()
export class LastPlatformAdminGuard {
  constructor(@Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectoryPort) {}

  async assertCanLoseSuperAdmin(userId: string): Promise<void> {
    const platformGrants = await this.memberships.listByScope(null);
    const holdsSuperAdmin = platformGrants.some((g) => g.userId === userId && g.roleCode === PLATFORM_SUPERADMIN_CODE);
    if (!holdsSuperAdmin) return;
    const count = await this.memberships.countActiveUsersWithSystemRole(PLATFORM_SUPERADMIN_CODE);
    if (count <= 1) throw new AppException(ErrorCodes.USR_LAST_PLATFORM_ADMIN);
  }
}
