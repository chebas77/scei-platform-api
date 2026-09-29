import { canonicalize, computeEntryHash, GENESIS_HASH } from './audit-hash';

const entry = (over: Record<string, unknown> = {}) =>
  ({ occurredAt: new Date('2026-01-01T00:00:00Z'), actorUserId: 'u1', actorType: 'user', action: 'a.b', outcome: 'success', metadata: { x: 1 }, ...over }) as never;

describe('cadena de hashes de auditoría', () => {
  it('el JSON canónico no depende del orden de las claves', () => {
    expect(canonicalize({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalize({ a: { c: 3, d: 2 }, b: 1 }));
  });
  it('es determinista y cambia ante cualquier alteración o cambio del eslabón previo', () => {
    const h = computeEntryHash(GENESIS_HASH, entry());
    expect(computeEntryHash(GENESIS_HASH, entry())).toBe(h);
    expect(computeEntryHash(GENESIS_HASH, entry({ outcome: 'failure' }))).not.toBe(h);
    expect(computeEntryHash(GENESIS_HASH, entry({ metadata: { x: 2 } }))).not.toBe(h);
    expect(computeEntryHash('1'.repeat(64), entry())).not.toBe(h);
  });
});
