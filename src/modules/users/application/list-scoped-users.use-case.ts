import { Inject, Injectable } from '@nestjs/common';
import { MEMBERSHIP_DIRECTORY, MembershipDirectoryPort } from '../../../shared/contracts/rbac.contracts';
import { USER_DIRECTORY, UserDirectoryEntry, UserDirectoryPort } from '../../../shared/contracts/identity.contracts';

export interface ScopedUser {
  userId: string;
  email: string;
  status: 'active' | 'disabled';
  mfaEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  roleId: string;
  roleCode: string;
  roleName: string;
}

/** Usuarios con su rol en un ámbito (plataforma si `tenantId` es nulo, o un colegio). */
@Injectable()
export class ListScopedUsersUseCase {
  constructor(
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectoryPort,
    @Inject(USER_DIRECTORY) private readonly users: UserDirectoryPort,
  ) {}

  async execute(tenantId: string | null): Promise<ScopedUser[]> {
    const grants = await this.memberships.listByScope(tenantId);
    if (grants.length === 0) return [];
    const people = await this.users.listByIds(grants.map((g) => g.userId));
    const byId = new Map<string, UserDirectoryEntry>(people.map((p) => [p.id, p]));
    return grants
      .map((g): ScopedUser | null => {
        const person = byId.get(g.userId);
        if (!person) return null;
        return {
          userId: g.userId, roleId: g.roleId, roleCode: g.roleCode, roleName: g.roleName,
          email: person.email, status: person.status, mfaEnabled: person.mfaEnabled, lastLoginAt: person.lastLoginAt, createdAt: person.createdAt,
        };
      })
      .filter((x): x is ScopedUser => x !== null);
  }
}
