import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';

export type TenantStatus = 'active' | 'suspended' | 'pending_deletion' | 'purged';

export interface Tenant {
  id: string;
  slug: string;
  legalName: string;
  ruc: string | null;
  status: TenantStatus;
  planId: string;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  deletionRequestedAt: Date | null;
  deletionRequestedBy: string | null;
  purgedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TenantAction = 'suspend' | 'reactivate' | 'request_deletion' | 'cancel_deletion' | 'purge' | 'change_plan';

/**
 * Máquina de estados del colegio. Única fuente de verdad de qué se puede hacer y cuándo:
 *   active ⇄ suspended → pending_deletion → purged (terminal)
 * `cancel_deletion` devuelve a `suspended` (no reactiva el servicio sin decisión explícita).
 */
const TRANSITIONS: Record<TenantAction, { from: TenantStatus[]; to: TenantStatus | null }> = {
  suspend: { from: ['active'], to: 'suspended' },
  reactivate: { from: ['suspended'], to: 'active' },
  request_deletion: { from: ['active', 'suspended'], to: 'pending_deletion' },
  cancel_deletion: { from: ['pending_deletion'], to: 'suspended' },
  purge: { from: ['pending_deletion'], to: 'purged' },
  change_plan: { from: ['active', 'suspended'], to: null },
};

export function nextStatus(current: TenantStatus, action: TenantAction): TenantStatus {
  const rule = TRANSITIONS[action];
  if (!rule.from.includes(current)) throw new AppException(ErrorCodes.TEN_INVALID_STATE, [{ message: `No se puede ${action} un colegio en estado ${current}` }]);
  return rule.to ?? current;
}

export function graceEndsAt(requestedAt: Date, graceDays: number): Date {
  return new Date(requestedAt.getTime() + graceDays * 86_400_000);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 63;
}
