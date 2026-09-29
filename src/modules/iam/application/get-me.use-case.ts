import { Inject, Injectable } from '@nestjs/common';
import { MEMBERSHIP_DIRECTORY, MembershipDirectoryPort } from '../../../shared/contracts/rbac.contracts';
import { TENANT_DIRECTORY, TenantDirectoryPort } from '../../../shared/contracts/tenant.contracts';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { AuthContext, TokenScope } from '../../../shared/security/auth-context';
import { USER_REPOSITORY, UserRepositoryPort } from '../domain/ports/user.repository.port';

export interface MeMembership {
  roleCode: string;
  roleName: string;
  tenant: { id: string; slug: string; legalName: string } | null;
}

export interface MeResult {
  userId: string;
  email: string;
  mfaEnabled: boolean;
  scope: TokenScope;
  memberships: MeMembership[];
}

/** Le dice al front dónde entra este usuario: como operador de plataforma, como administrador de uno o más colegios, o ambos. */
@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectoryPort,
    @Inject(TENANT_DIRECTORY) private readonly tenants: TenantDirectoryPort,
  ) {}

  async execute(auth: AuthContext): Promise<MeResult> {
    const user = await this.users.findById(auth.userId);
    if (!user) throw new AppException(ErrorCodes.AUTH_TOKEN_INVALID);

    const grants = await this.memberships.listForUser(user.id);
    const tenantIds = [...new Set(grants.map((g) => g.tenantId).filter((id): id is string => id !== null))];
    const tenantById = new Map((await Promise.all(tenantIds.map((id) => this.tenants.findBasic(id)))).filter((t) => t !== null).map((t) => [t.id, t]));

    const memberships: MeMembership[] = grants
      .filter((g) => g.tenantId === null || tenantById.has(g.tenantId))
      .map((g) => ({
        roleCode: g.roleCode,
        roleName: g.roleName,
        tenant: g.tenantId ? { id: g.tenantId, slug: tenantById.get(g.tenantId)!.slug, legalName: tenantById.get(g.tenantId)!.legalName } : null,
      }));

    return { userId: user.id, email: user.email, mfaEnabled: user.mfaEnabled, scope: auth.scope, memberships };
  }
}
