export type AuditOutcome = 'success' | 'denied' | 'failure';

export interface AuditEntry {
  id: number;
  occurredAt: Date;
  actorUserId: string | null;
  actorType: 'user' | 'system';
  action: string;
  outcome: AuditOutcome;
  resourceType: string | null;
  resourceId: string | null;
  tenantId: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

/** Entrada antes de persistir: el repositorio le asigna id y eslabón de la cadena. */
export type NewAuditEntry = Omit<AuditEntry, 'id' | 'prevHash' | 'hash'>;
