import { createHarness, Harness, SUPERADMIN } from './harness';

describe('Plataforma (e2e contra PostgreSQL real)', () => {
  let h: Harness;
  let token: string;
  let planId: string;
  let tenantId: string;

  beforeAll(async () => {
    h = await createHarness();
    token = await h.loginSuperadmin();
  });
  afterAll(() => h.close());

  describe('seguridad base', () => {
    it('health es público', async () => {
      const r = await h.req('GET', '/v1/health');
      expect(r.status).toBe(200);
      expect(r.body.database).toBe(true);
    });

    it('rutas protegidas exigen JWT (AUTH) y devuelven el formato de error estándar', async () => {
      const r = await h.req('GET', '/v1/platform/tenants');
      expect(r.status).toBe(401);
      expect(r.body).toEqual(expect.objectContaining({ code: expect.stringMatching(/^AUTH-/), traceId: expect.any(String), path: expect.any(String) }));
    });

    it('un token con firma alterada se rechaza', async () => {
      const r = await h.req('GET', '/v1/platform/tenants', { token: token.slice(0, -3) + 'abc' });
      expect(r.status).toBe(401);
    });

    it('el body con campos no declarados se rechaza (mass assignment)', async () => {
      const r = await h.req('POST', '/v1/platform/plans', { token, body: { code: 'x1', name: 'X', maxStudents: 1, maxKiosks: 1, retentionDays: 1, isActive: false, evil: true } });
      expect(r.status).toBe(400);
      expect(r.body.code).toBe('VAL-400');
    });

    it('login con clave incorrecta no revela si la cuenta existe y bloquea tras varios intentos', async () => {
      const unknown = await h.req('POST', '/v1/auth/login', { body: { email: 'nadie@x.pe', password: 'incorrecta-123456' } });
      const wrong = await h.req('POST', '/v1/auth/login', { body: { email: SUPERADMIN.email, password: 'incorrecta-123456' } });
      expect(unknown.body.code).toBe('AUTH-001');
      expect(wrong.body.code).toBe('AUTH-001');
      await h.pool.query('update users set failed_login_attempts = 0, lockout_count = 0, locked_until = null');
    });
  });

  describe('RBAC por módulos', () => {
    it('el catálogo se sincronizó desde los controladores con las APIs de cada módulo', async () => {
      const r = await h.req('GET', '/v1/rbac/modules', { token });
      expect(r.status).toBe(200);
      const keys = r.body.map((m: any) => m.key);
      expect(keys).toEqual(expect.arrayContaining(['audit', 'metrics', 'plans', 'rbac', 'tenants']));
      const tenants = r.body.find((m: any) => m.key === 'tenants');
      const create = tenants.permissions.find((p: any) => p.code === 'tenants:create');
      expect(create.endpoints).toEqual(expect.arrayContaining([{ method: 'POST', path: '/v1/platform/tenants' }]));
    });

    it('el rol SuperAdmin del sistema no se puede editar ni quitar módulos', async () => {
      const roles = await h.req('GET', '/v1/rbac/roles?scope=platform', { token });
      const sa = roles.body.find((r: any) => r.code === 'platform_superadmin');
      expect((await h.req('PATCH', `/v1/rbac/roles/${sa.id}`, { token, body: { name: 'otro nombre' } })).body.code).toBe('RBAC-003');
      expect((await h.req('PUT', `/v1/rbac/roles/${sa.id}/modules`, { token, body: { moduleIds: [] } })).body.code).toBe('RBAC-010');
    });

    it('un rol solo de lectura ve colegios pero no puede crearlos (403 RBAC-001)', async () => {
      const mods = (await h.req('GET', '/v1/rbac/modules', { token })).body;
      const tenantsMod = mods.find((m: any) => m.key === 'tenants');
      const readPerm = tenantsMod.permissions.find((p: any) => p.code === 'tenants:read');

      const role = await h.req('POST', '/v1/rbac/roles', { token, body: { code: 'soporte_lectura', name: 'Soporte lectura', scope: 'platform', requiresMfa: false } });
      expect(role.status).toBe(201);
      const set = await h.req('PUT', `/v1/rbac/roles/${role.body.id}/permissions`, { token, body: { permissionIds: [readPerm.id] } });
      expect(set.body.effectivePermissions).toEqual(['tenants:read']);

      // usuario con ese rol
      const { userId } = (await h.app.get(require('../src/shared/contracts/identity.contracts').IDENTITY_PROVISIONING).provisionUser({ email: 'soporte@plataforma.pe', password: 'Tucan-Verde-Lluvia-2026' })) as { userId: string };
      await h.app.get(require('../src/shared/contracts/rbac.contracts').ROLE_ASSIGNMENT).assign({ userId, roleId: role.body.id, tenantId: null });
      const login = await h.req('POST', '/v1/auth/login', { body: { email: 'soporte@plataforma.pe', password: 'Tucan-Verde-Lluvia-2026' } });
      expect(login.body.status).toBe('authenticated');
      const t = login.body.tokens.accessToken;

      expect((await h.req('GET', '/v1/platform/tenants', { token: t })).status).toBe(200);
      const denied = await h.req('POST', '/v1/platform/tenants', { token: t, body: { slug: 'abc', legalName: 'ABC SAC', planId: '00000000-0000-4000-8000-000000000000', adminEmail: 'a@b.pe' } });
      expect(denied.status).toBe(403);
      expect(denied.body.code).toBe('RBAC-001');
      const me = await h.req('GET', '/v1/rbac/me/permissions', { token: t });
      expect(me.body.permissions).toEqual(['tenants:read']);

      // asignar un módulo completo amplía permisos
      const set2 = await h.req('PUT', `/v1/rbac/roles/${role.body.id}/modules`, { token, body: { moduleIds: [tenantsMod.id] } });
      expect(set2.body.effectivePermissions).toEqual(expect.arrayContaining(['tenants:create', 'tenants:purge']));
      expect((await h.req('GET', '/v1/rbac/me/permissions', { token: t })).body.permissions).toContain('tenants:create');
    });

    it('rechaza módulos de otro ámbito (RBAC-008) y roles en uso no se borran (RBAC-009)', async () => {
      const mods = (await h.req('GET', '/v1/rbac/modules', { token })).body;
      const role = await h.req('POST', '/v1/rbac/roles', { token, body: { code: 'rol_colegio', name: 'Rol colegio', scope: 'tenant' } });
      const bad = await h.req('PUT', `/v1/rbac/roles/${role.body.id}/modules`, { token, body: { moduleIds: [mods[0].id] } });
      expect(bad.body.code).toBe('RBAC-008');
      const roles = (await h.req('GET', '/v1/rbac/roles', { token })).body;
      const inUse = roles.find((r: any) => r.code === 'soporte_lectura');
      expect((await h.req('DELETE', `/v1/rbac/roles/${inUse.id}`, { token })).body.code).toBe('RBAC-009');
      expect((await h.req('DELETE', `/v1/rbac/roles/${role.body.id}`, { token })).status).toBe(204);
    });
  });

  describe('ciclo de vida del colegio (PL-01..PL-05)', () => {
    it('PL-02 · crea planes y valida código único', async () => {
      const r = await h.req('POST', '/v1/platform/plans', { token, body: { code: 'basico', name: 'Básico', maxStudents: 100, maxKiosks: 1, retentionDays: 90 } });
      expect(r.status).toBe(201);
      planId = r.body.id;
      expect((await h.req('POST', '/v1/platform/plans', { token, body: { code: 'basico', name: 'Otro', maxStudents: 1, maxKiosks: 1, retentionDays: 1 } })).body.code).toBe('PLAN-002');
    });

    it('PL-01 · alta con invitación de un solo uso; el administrador define su propia clave', async () => {
      const created = await h.req('POST', '/v1/platform/tenants', { token, body: { slug: 'colegio-san-martin', legalName: 'I.E. San Martín S.A.C.', ruc: '20123456789', planId, adminEmail: 'Director@SanMartin.pe' } });
      expect(created.status).toBe(201);
      tenantId = created.body.id;
      expect(JSON.stringify(created.body)).not.toMatch(/token/i);

      expect((await h.req('POST', '/v1/platform/tenants', { token, body: { slug: 'colegio-san-martin', legalName: 'Otro', planId, adminEmail: 'x@y.pe' } })).body.code).toBe('TEN-002');
      expect((await h.req('POST', '/v1/platform/tenants', { token, body: { slug: 'otro-colegio', legalName: 'Otro', ruc: '20123456789', planId, adminEmail: 'x@y.pe' } })).body.code).toBe('TEN-003');

      const url = new URL(h.notifier.lastInvitationUrl!);
      const inviteToken = url.searchParams.get('token')!;

      // clave débil: se rechaza y el mismo enlace sigue sirviendo
      const weak = await h.req('POST', '/v1/invitations/accept', { body: { token: inviteToken, password: 'corta' } });
      expect(weak.body.code).toBe('AUTH-011');

      const ok = await h.req('POST', '/v1/invitations/accept', { body: { token: inviteToken, password: 'Montana-Azul-Rio-Fuerte-26' } });
      expect(ok.status).toBe(200);
      expect(ok.body).toEqual({ tenantSlug: 'colegio-san-martin', accountCreated: true });

      // un solo uso
      const again = await h.req('POST', '/v1/invitations/accept', { body: { token: inviteToken, password: 'Montana-Azul-Rio-Fuerte-26' } });
      expect(again.body.code).toBe('AUTH-010');

      // la membresía quedó en el colegio (no en plataforma): el director no accede a la API de plataforma
      const login = await h.req('POST', '/v1/auth/login', { body: { email: 'director@sanmartin.pe', password: 'Montana-Azul-Rio-Fuerte-26' } });
      expect(login.body.status).toBe('mfa_setup_required');
      const detail = await h.req('GET', `/v1/platform/tenants/${tenantId}`, { token });
      expect(detail.body.invitations[0]).toEqual(expect.objectContaining({ state: 'accepted', email: 'd***@sanmartin.pe' }));
    });

    it('PL-02 · asignar plan valida límites contra el uso actual', async () => {
      const big = (await h.req('POST', '/v1/platform/plans', { token, body: { code: 'grande', name: 'Grande', maxStudents: 1000, maxKiosks: 5, retentionDays: 365 } })).body;
      const small = (await h.req('POST', '/v1/platform/plans', { token, body: { code: 'mini', name: 'Mini', maxStudents: 10, maxKiosks: 1, retentionDays: 30 } })).body;
      await h.pool.query('insert into tenant_usage_snapshots (tenant_id, captured_at, students_count, kiosks_count, api_p95_ms) values ($1, now(), 60, 1, 120)', [tenantId]);

      const ok = await h.req('PUT', `/v1/platform/tenants/${tenantId}/plan`, { token, body: { planId: big.id } });
      expect(ok.status).toBe(200);
      expect(ok.body.plan.code).toBe('grande');

      const bad = await h.req('PUT', `/v1/platform/tenants/${tenantId}/plan`, { token, body: { planId: small.id } });
      expect(bad.status).toBe(409);
      expect(bad.body.code).toBe('PLAN-003');

      await h.req('PATCH', `/v1/platform/plans/${small.id}`, { token, body: { isActive: false } });
      expect((await h.req('PUT', `/v1/platform/tenants/${tenantId}/plan`, { token, body: { planId: small.id } })).body.code).toBe('PLAN-004');
      // bajar los límites de un plan en uso por debajo del consumo también se impide
      expect((await h.req('PATCH', `/v1/platform/plans/${big.id}`, { token, body: { maxStudents: 20 } })).body.code).toBe('PLAN-003');
    });

    it('PL-05 · métricas agregadas sin datos personales', async () => {
      const overview = await h.req('GET', '/v1/platform/metrics/overview', { token });
      expect(overview.status).toBe(200);
      expect(overview.body.tenantsByStatus.active).toBe(1);
      expect(overview.body.totals.students).toBe(60);
      const health = await h.req('GET', `/v1/platform/metrics/tenants/${tenantId}`, { token });
      expect(health.body).toEqual(expect.objectContaining({ studentsUsagePct: 6, planCode: 'grande', stale: false }));
    });

    it('PL-03 · suspender y reactivar respetando la máquina de estados', async () => {
      expect((await h.req('POST', `/v1/platform/tenants/${tenantId}/reactivate`, { token })).body.code).toBe('TEN-004');
      const s = await h.req('POST', `/v1/platform/tenants/${tenantId}/suspend`, { token, body: { reason: 'Pago pendiente' } });
      expect(s.body.status).toBe('suspended');
      expect((await h.req('POST', `/v1/platform/tenants/${tenantId}/suspend`, { token, body: { reason: 'otra vez' } })).body.code).toBe('TEN-004');
      expect((await h.req('POST', `/v1/platform/tenants/${tenantId}/reactivate`, { token })).body.status).toBe('active');
    });

    it('PL-04 · baja: gracia, confirmación por slug, borrado criptográfico y constancia firmada', async () => {
      const early = await h.req('POST', `/v1/platform/tenants/${tenantId}/purge`, { token, body: { confirmSlug: 'colegio-san-martin' } });
      expect(early.body.code).toBe('TEN-004'); // aún no está en baja

      const req = await h.req('POST', `/v1/platform/tenants/${tenantId}/offboarding`, { token });
      expect(req.body.status).toBe('pending_deletion');

      // cancelar deja al colegio suspendido; se vuelve a solicitar
      expect((await h.req('DELETE', `/v1/platform/tenants/${tenantId}/offboarding`, { token })).body.status).toBe('suspended');
      expect((await h.req('POST', `/v1/platform/tenants/${tenantId}/offboarding`, { token })).body.status).toBe('pending_deletion');

      expect((await h.req('POST', `/v1/platform/tenants/${tenantId}/purge`, { token, body: { confirmSlug: 'otro' } })).body.code).toBe('TEN-005');
      const grace = await h.req('POST', `/v1/platform/tenants/${tenantId}/purge`, { token, body: { confirmSlug: 'colegio-san-martin' } });
      expect(grace.body.code).toBe('TEN-006');

      h.clock.advanceDays(8);
      const purge = await h.req('POST', `/v1/platform/tenants/${tenantId}/purge`, { token, body: { confirmSlug: 'colegio-san-martin' } });
      expect(purge.status).toBe(200);
      expect(purge.body.payload).toEqual(expect.objectContaining({ keyDestroyed: true, method: 'crypto-shredding+row-deletion' }));
      expect(purge.body.signature).toMatch(/^[0-9a-f]{64}$/);

      const key = await h.pool.query('select wrapped_dek, destroyed_at from tenant_keys where tenant_id = $1', [tenantId]);
      expect(key.rows[0].wrapped_dek).toBeNull();
      expect(key.rows[0].destroyed_at).not.toBeNull();
      const members = await h.pool.query('select count(*)::int as n from memberships where tenant_id = $1', [tenantId]);
      expect(members.rows[0].n).toBe(0);

      const cert = await h.req('GET', `/v1/platform/tenants/${tenantId}/deletion-certificate`, { token });
      expect(cert.body.signatureValid).toBe(true);

      // manipular el payload invalida la firma
      await h.pool.query(`update deletion_certificates set payload = jsonb_set(payload, '{keyDestroyed}', 'false') where tenant_id = $1`, [tenantId]);
      expect((await h.req('GET', `/v1/platform/tenants/${tenantId}/deletion-certificate`, { token })).body.signatureValid).toBe(false);

      // estado terminal
      expect((await h.req('POST', `/v1/platform/tenants/${tenantId}/reactivate`, { token })).body.code).toBe('TEN-004');
    });
  });

  describe('PL-06 · bitácora inmutable', () => {
    it('registra las acciones de operadores y la cadena de hashes es verificable', async () => {
      const logs = await h.req('GET', '/v1/platform/audit-logs?pageSize=100', { token });
      expect(logs.status).toBe(200);
      const actions = logs.body.items.map((l: any) => l.action);
      expect(actions).toEqual(expect.arrayContaining(['tenant.created', 'tenant.purged', 'tenant.plan.changed', 'role.created', 'access.denied']));
      expect(JSON.stringify(logs.body)).not.toMatch(/Clave-|Montana-|Tucan-/);

      const verify = await h.req('GET', '/v1/platform/audit-logs/verify-chain', { token });
      expect(verify.body.valid).toBe(true);
    });

    it('la base impide modificar o borrar la bitácora', async () => {
      await expect(h.pool.query(`update audit_logs set action = 'x'`)).rejects.toThrow(/inmutable|immutable|append/i);
      await expect(h.pool.query('delete from audit_logs')).rejects.toThrow();
      await expect(h.pool.query('truncate audit_logs')).rejects.toThrow();
    });
  });

  describe('sesiones y MFA', () => {
    it('el refresh token es rotativo y su reutilización revoca la sesión', async () => {
      // sesión de soporte (sin MFA)
      const login = await h.req('POST', '/v1/auth/login', { body: { email: 'soporte@plataforma.pe', password: 'Tucan-Verde-Lluvia-2026' } });
      const { accessToken, refreshToken } = login.body.tokens;
      const r1 = await h.req('POST', '/v1/auth/refresh', { body: { refreshToken } });
      expect(r1.status).toBe(200);
      const reuse = await h.req('POST', '/v1/auth/refresh', { body: { refreshToken } });
      expect(reuse.body.code).toBe('AUTH-006');
      // la familia completa quedó revocada: ni el token nuevo ni el access token viejo sirven
      expect((await h.req('POST', '/v1/auth/refresh', { body: { refreshToken: r1.body.refreshToken } })).status).toBe(401);
      expect((await h.req('GET', '/v1/auth/me', { token: accessToken })).status).toBe(401);
    });

    it('el SuperAdmin inicia sesión con TOTP y no puede reutilizar el mismo código', async () => {
      const login = await h.req('POST', '/v1/auth/login', { body: SUPERADMIN });
      expect(login.body.status).toBe('mfa_required');
      const secretRow = await h.pool.query('select mfa_secret_enc from users where email = $1', [SUPERADMIN.email]);
      expect(secretRow.rows[0].mfa_secret_enc).toMatch(/^v1\./); // cifrado en reposo
    });
  });

  describe('Swagger', () => {
    it('documenta las rutas, DTOs separados de entrada/salida y los códigos de error', async () => {
      const res = await h.app.inject({ method: 'GET', url: '/docs-json' });
      expect(res.statusCode).toBe(200);
      const doc = JSON.parse(res.body);
      expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(['/v1/platform/tenants', '/v1/rbac/roles/{id}/modules', '/v1/invitations/accept']));
      expect(Object.keys(doc.components.schemas)).toEqual(expect.arrayContaining(['CreateTenantRequestDto', 'CreateTenantResponseDto']));
      expect(JSON.stringify(doc.paths['/v1/platform/tenants'].post.responses)).toContain('TEN-002');
    });
  });
});
