import { Tx } from '../../../../shared/database/tx';
import { Page } from '../../../../shared/http/pagination';
import { AuditEntry, NewAuditEntry } from '../audit-entry';

export interface AuditLogFilter {
  from?: Date;
  to?: Date;
  action?: string;
  outcome?: string;
  actorUserId?: string;
  tenantId?: string;
  resourceType?: string;
}

export interface AuditLogRepositoryPort {
  /** Inserta el eslabón siguiente de la cadena de forma serializada. */
  append(entry: NewAuditEntry, tx?: Tx): Promise<AuditEntry>;
  list(filter: AuditLogFilter, page: number, pageSize: number): Promise<Page<AuditEntry>>;
  /** Lee en orden ascendente por id, para verificar la cadena por lotes. */
  readBatch(afterId: number, limit: number): Promise<AuditEntry[]>;
}
export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');
