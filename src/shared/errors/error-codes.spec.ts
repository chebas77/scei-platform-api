import { ALL_ERROR_DEFINITIONS } from './error-codes';

describe('catálogo de errores', () => {
  it('los códigos son únicos y con formato PREFIJO-NNN', () => {
    const codes = ALL_ERROR_DEFINITIONS.map((d) => d.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of codes) expect(c).toMatch(/^[A-Z]{3,4}-\d{3}$/);
  });
  it('cada definición tiene mensaje y un estado HTTP de error', () => {
    for (const d of ALL_ERROR_DEFINITIONS) {
      expect(d.message.length).toBeGreaterThan(5);
      expect(d.status).toBeGreaterThanOrEqual(400);
    }
  });
});
