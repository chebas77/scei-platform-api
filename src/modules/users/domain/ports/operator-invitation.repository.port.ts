import { Tx } from '../../../../shared/database/tx';

export interface OperatorInvitation {
  id: string;
  tenantId: string | null;
  email: string;
  roleId: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface OperatorInvitationRepositoryPort {
  create(input: { tenantId: string | null; email: string; roleId: string; tokenHash: string; expiresAt: Date; createdBy: string | null }, tx?: Tx): Promise<OperatorInvitation>;
  /** Marca como usada la invitación vigente de ese token. `null` si no existe, venció, se usó o se revocó (un solo uso, atómico). */
  consume(tokenHash: string, now: Date, tx: Tx): Promise<OperatorInvitation | null>;
  /** ¿Ya hay una invitación pendiente para ese correo en ese ámbito? */
  hasPending(email: string, tenantId: string | null, now: Date): Promise<boolean>;
}
export const OPERATOR_INVITATION_REPOSITORY = Symbol('OPERATOR_INVITATION_REPOSITORY');
