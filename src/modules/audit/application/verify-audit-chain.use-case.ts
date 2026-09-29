import { Inject, Injectable } from '@nestjs/common';
import { GENESIS_HASH, computeEntryHash } from '../domain/audit-hash';
import { AUDIT_LOG_REPOSITORY, AuditLogRepositoryPort } from '../domain/ports/audit-log.repository.port';

export interface ChainVerification {
  valid: boolean;
  checked: number;
  /** Primer id cuya cadena o hash no coincide (si la hubo). */
  firstBrokenId: number | null;
}

@Injectable()
export class VerifyAuditChainUseCase {
  private static readonly BATCH = 1000;

  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly repo: AuditLogRepositoryPort) {}

  async execute(): Promise<ChainVerification> {
    let afterId = 0;
    let prevHash = GENESIS_HASH;
    let checked = 0;
    for (;;) {
      const batch = await this.repo.readBatch(afterId, VerifyAuditChainUseCase.BATCH);
      if (batch.length === 0) return { valid: true, checked, firstBrokenId: null };
      for (const entry of batch) {
        const expected = computeEntryHash(prevHash, entry);
        if (entry.prevHash !== prevHash || entry.hash !== expected) {
          return { valid: false, checked, firstBrokenId: entry.id };
        }
        prevHash = entry.hash;
        checked += 1;
        afterId = entry.id;
      }
    }
  }
}
