import { Inject, Injectable } from '@nestjs/common';
import { SQL, and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { Page } from '../../../../shared/http/pagination';
import { AuditEntry, NewAuditEntry } from '../../domain/audit-entry';
import { GENESIS_HASH, computeEntryHash } from '../../domain/audit-hash';
import { AuditLogFilter, AuditLogRepositoryPort } from '../../domain/ports/audit-log.repository.port';
import { auditLogs } from './schema/audit-logs.table';

/** Clave del advisory lock que serializa la escritura de la cadena. */
const CHAIN_LOCK_KEY = 7_301_001;

type Row = typeof auditLogs.$inferSelect;

const toEntry = (r: Row): AuditEntry => ({
  id: r.id,
  occurredAt: r.occurredAt,
  actorUserId: r.actorUserId,
  actorType: r.actorType as AuditEntry['actorType'],
  action: r.action,
  outcome: r.outcome as AuditEntry['outcome'],
  resourceType: r.resourceType,
  resourceId: r.resourceId,
  tenantId: r.tenantId,
  ip: r.ip,
  userAgent: r.userAgent,
  requestId: r.requestId,
  metadata: r.metadata,
  prevHash: r.prevHash,
  hash: r.hash,
});

@Injectable()
export class DrizzleAuditLogRepository implements AuditLogRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async append(entry: NewAuditEntry, tx?: Tx): Promise<AuditEntry> {
    if (!tx) return this.db.transaction((t) => this.appendIn(t as unknown as Tx, entry));
    return this.appendIn(tx, entry);
  }

  private async appendIn(tx: Tx, entry: NewAuditEntry): Promise<AuditEntry> {
    const ex = pick(this.db, tx);
    // El lock vive hasta el fin de la transacción: dos escritores no pueden tomar el mismo `prev_hash`.
    await ex.execute(sql`select pg_advisory_xact_lock(${CHAIN_LOCK_KEY})`);
    const [last] = await ex.select({ hash: auditLogs.hash }).from(auditLogs).orderBy(desc(auditLogs.id)).limit(1);
    const prevHash = last?.hash ?? GENESIS_HASH;
    const hash = computeEntryHash(prevHash, entry);
    const [row] = await ex
      .insert(auditLogs)
      .values({ ...entry, prevHash, hash })
      .returning();
    return toEntry(row);
  }

  async list(filter: AuditLogFilter, page: number, pageSize: number): Promise<Page<AuditEntry>> {
    const conditions: SQL[] = [];
    if (filter.from) conditions.push(gte(auditLogs.occurredAt, filter.from));
    if (filter.to) conditions.push(lte(auditLogs.occurredAt, filter.to));
    if (filter.action) conditions.push(eq(auditLogs.action, filter.action));
    if (filter.outcome) conditions.push(eq(auditLogs.outcome, filter.outcome));
    if (filter.actorUserId) conditions.push(eq(auditLogs.actorUserId, filter.actorUserId));
    if (filter.tenantId) conditions.push(eq(auditLogs.tenantId, filter.tenantId));
    if (filter.resourceType) conditions.push(eq(auditLogs.resourceType, filter.resourceType));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.id)).limit(pageSize).offset((page - 1) * pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(auditLogs).where(where),
    ]);
    return { items: rows.map(toEntry), page, pageSize, total };
  }

  async readBatch(afterId: number, limit: number): Promise<AuditEntry[]> {
    const rows = await this.db.select().from(auditLogs).where(sql`${auditLogs.id} > ${afterId}`).orderBy(asc(auditLogs.id)).limit(limit);
    return rows.map(toEntry);
  }
}
