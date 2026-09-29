import { createHash } from 'node:crypto';
import { NewAuditEntry } from './audit-entry';

export const GENESIS_HASH = '0'.repeat(64);

/** JSON canónico: claves ordenadas, para que el hash no dependa del orden de `jsonb`. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const body = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
    .join(',');
  return `{${body}}`;
}

/** Hash de un eslabón: SHA-256(prevHash | contenido canónico). Cualquier alteración lo rompe. */
export function computeEntryHash(prevHash: string, entry: NewAuditEntry): string {
  const content = canonicalize({
    occurredAt: entry.occurredAt.toISOString(),
    actorUserId: entry.actorUserId,
    actorType: entry.actorType,
    action: entry.action,
    outcome: entry.outcome,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    tenantId: entry.tenantId,
    ip: entry.ip,
    userAgent: entry.userAgent,
    requestId: entry.requestId,
    metadata: entry.metadata,
  });
  return createHash('sha256').update(`${prevHash}|${content}`).digest('hex');
}

const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie|dni|embedding|otp|credential|api[-_]?key/i;

/** Defensa en profundidad: aunque un caller lo intente, la bitácora no guarda secretos ni datos de menores. */
export function redactMetadata(input: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!input) return {};
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, SENSITIVE_KEY.test(k) ? '[REDACTED]' : walk(val)]),
      );
    }
    return v;
  };
  return walk(input) as Record<string, unknown>;
}
