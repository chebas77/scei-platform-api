import { Global, Module } from '@nestjs/common';
import { AUDIT_RECORDER } from '../../shared/audit/audit-recorder.port';
import { AuditRecorderService } from './application/audit-recorder.service';
import { ListAuditLogsUseCase } from './application/list-audit-logs.use-case';
import { VerifyAuditChainUseCase } from './application/verify-audit-chain.use-case';
import { AUDIT_LOG_REPOSITORY } from './domain/ports/audit-log.repository.port';
import { DrizzleAuditLogRepository } from './infrastructure/persistence/drizzle-audit-log.repository';
import { AuditController } from './interfaces/http/audit.controller';

@Global()
@Module({
  controllers: [AuditController],
  providers: [
    { provide: AUDIT_LOG_REPOSITORY, useClass: DrizzleAuditLogRepository },
    AuditRecorderService,
    { provide: AUDIT_RECORDER, useExisting: AuditRecorderService },
    ListAuditLogsUseCase,
    VerifyAuditChainUseCase,
  ],
  exports: [AUDIT_RECORDER],
})
export class AuditModule {}
