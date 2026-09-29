import { AppException } from '../../../shared/errors/app.exception';
import { graceEndsAt, isValidSlug, nextStatus, TenantAction, TenantStatus } from './tenant';
import { limitViolations } from './plan';

describe('máquina de estados del colegio', () => {
  const valid: [TenantStatus, TenantAction, TenantStatus][] = [
    ['active', 'suspend', 'suspended'],
    ['suspended', 'reactivate', 'active'],
    ['active', 'request_deletion', 'pending_deletion'],
    ['suspended', 'request_deletion', 'pending_deletion'],
    ['pending_deletion', 'cancel_deletion', 'suspended'],
    ['pending_deletion', 'purge', 'purged'],
    ['active', 'change_plan', 'active'],
  ];
  it.each(valid)('%s + %s → %s', (from, action, to) => expect(nextStatus(from, action)).toBe(to));

  const invalid: [TenantStatus, TenantAction][] = [
    ['active', 'reactivate'], ['active', 'purge'], ['suspended', 'purge'], ['suspended', 'suspend'],
    ['pending_deletion', 'suspend'], ['pending_deletion', 'change_plan'], ['purged', 'reactivate'],
    ['purged', 'request_deletion'], ['purged', 'purge'], ['purged', 'change_plan'],
  ];
  it.each(invalid)('%s + %s se rechaza con TEN-004', (from, action) => {
    expect(() => nextStatus(from, action)).toThrow(AppException);
    try { nextStatus(from, action); } catch (e) { expect((e as AppException).code).toBe('TEN-004'); }
  });

  it('calcula el fin del periodo de gracia', () => {
    expect(graceEndsAt(new Date('2026-01-01T00:00:00Z'), 7).toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('valida slugs', () => {
    expect(isValidSlug('colegio-san-martin')).toBe(true);
    for (const bad of ['ab', 'Colegio', '-x-', 'a--b', 'con espacio', 'a'.repeat(64)]) expect(isValidSlug(bad)).toBe(false);
  });
});

describe('límites del plan', () => {
  it('sin uso no hay violaciones', () => expect(limitViolations({ maxStudents: 1, maxKiosks: 1 }, null)).toEqual([]));
  it('detecta alumnos y kioscos por encima del límite', () => {
    expect(limitViolations({ maxStudents: 10, maxKiosks: 1 }, { studentsCount: 11, kiosksCount: 2 })).toHaveLength(2);
    expect(limitViolations({ maxStudents: 10, maxKiosks: 1 }, { studentsCount: 10, kiosksCount: 1 })).toEqual([]);
  });
});
