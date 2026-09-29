import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { Page } from '../../../shared/http/pagination';
import { AuditEntry } from '../domain/audit-entry';
import { AUDIT_LOG_REPOSITORY, AuditLogFilter, AuditLogRepositoryPort } from '../domain/ports/audit-log.repository.port';

@Injectable()
export class ListAuditLogsUseCase {
  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly repo: AuditLogRepositoryPort) {}

  execute(filter: AuditLogFilter, page: number, pageSize: number): Promise<Page<AuditEntry>> {
    if (filter.from && filter.to && filter.from > filter.to) throw new AppException(ErrorCodes.AUD_INVALID_RANGE);
    return this.repo.list(filter, page, pageSize);
  }
}
