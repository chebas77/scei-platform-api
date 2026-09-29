import { Tx } from '../../../../shared/database/tx';

export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  roleId: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface InvitationRepositoryPort {
  create(input: { tenantId: string; email: string; roleId: string; tokenHash: string; expiresAt: Date; createdBy: string | null }, tx?: Tx): Promise<TenantInvitation>;
  /** Marca como usada la invitación vigente de ese token. Devuelve `null` si no existe, venció, se usó o se revocó (un solo uso, atómico). */
  consume(tokenHash: string, now: Date, tx: Tx): Promise<TenantInvitation | null>;
  revokePending(tenantId: string, now: Date, tx?: Tx): Promise<number>;
  listByTenant(tenantId: string): Promise<TenantInvitation[]>;
}
export const INVITATION_REPOSITORY = Symbol('INVITATION_REPOSITORY');
