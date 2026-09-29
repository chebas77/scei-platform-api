import { Tx } from '../database/tx';

/** Datos de la solicitud que interesan a la auditoría (nunca contienen credenciales). */
export interface RequestMeta {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuditEvent {
  /** Acción en notación `recurso.verbo`, p. ej. `tenant.created`, `auth.login.failed`. */
  action: string;
  outcome: 'success' | 'denied' | 'failure';
  actorUserId?: string | null;
  actorType?: 'user' | 'system';
  resourceType?: string;
  resourceId?: string;
  tenantId?: string | null;
  meta?: RequestMeta;
  /** Solo datos no sensibles: nunca contraseñas, tokens ni datos personales de menores. */
  metadata?: Record<string, unknown>;
}

/** Contrato compartido: lo implementa el módulo `audit`, lo consumen todos los demás. */
export interface AuditRecorderPort {
  record(event: AuditEvent, tx?: Tx): Promise<void>;
}
export const AUDIT_RECORDER = Symbol('AUDIT_RECORDER');
