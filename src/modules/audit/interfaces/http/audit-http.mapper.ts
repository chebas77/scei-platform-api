import { Page } from '../../../../shared/http/pagination';
import { AuditEntry } from '../../domain/audit-entry';
import { AuditLogPageResponseDto, AuditLogResponseDto } from './dto/audit-log.response.dto';

/** Traduce dominio → contrato HTTP. Aquí se decide qué campos salen al exterior. */
export const AuditHttpMapper = {
  toResponse(e: AuditEntry): AuditLogResponseDto {
    return {
      id: e.id,
      occurredAt: e.occurredAt.toISOString(),
      actorUserId: e.actorUserId,
      actorType: e.actorType,
      action: e.action,
      outcome: e.outcome,
      resourceType: e.resourceType,
      resourceId: e.resourceId,
      tenantId: e.tenantId,
      ip: e.ip,
      requestId: e.requestId,
      metadata: e.metadata,
      hash: e.hash,
    };
  },
  toPage(page: Page<AuditEntry>): AuditLogPageResponseDto {
    return { page: page.page, pageSize: page.pageSize, total: page.total, items: page.items.map(AuditHttpMapper.toResponse) };
  },
};
