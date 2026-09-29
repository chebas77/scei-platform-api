import { Inject, Injectable } from '@nestjs/common';
import { AuditEvent, AuditRecorderPort } from '../../../shared/audit/audit-recorder.port';
import { CLOCK, ClockPort } from '../../../shared/clock/clock.port';
import { Tx } from '../../../shared/database/tx';
import { redactMetadata } from '../domain/audit-hash';
import { AUDIT_LOG_REPOSITORY, AuditLogRepositoryPort } from '../domain/ports/audit-log.repository.port';

/** Implementa el puerto compartido `AuditRecorderPort` que usan todos los módulos. */
@Injectable()
export class AuditRecorderService implements AuditRecorderPort {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY) private readonly repo: AuditLogRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async record(event: AuditEvent, tx?: Tx): Promise<void> {
    await this.repo.append(
      {
        occurredAt: this.clock.now(),
        actorUserId: event.actorUserId ?? null,
        actorType: event.actorType ?? (event.actorUserId ? 'user' : 'system'),
        action: event.action,
        outcome: event.outcome,
        resourceType: event.resourceType ?? null,
        resourceId: event.resourceId ?? null,
        tenantId: event.tenantId ?? null,
        ip: event.meta?.ip ?? null,
        userAgent: event.meta?.userAgent ?? null,
        requestId: event.meta?.requestId ?? null,
        metadata: redactMetadata(event.metadata),
      },
      tx,
    );
  }
}
