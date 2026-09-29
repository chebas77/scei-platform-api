-- Roles del sistema. Los módulos y permisos se sincronizan solos desde los controladores
-- al iniciar la app; `platform_superadmin` recibe todos los módulos de plataforma.
INSERT INTO "roles" ("code", "name", "description", "scope", "tenant_id", "is_system", "requires_mfa")
VALUES
  ('platform_superadmin', 'SuperAdmin de plataforma',
   'Opera la plataforma: colegios, planes, auditoría y roles. No ve datos personales de alumnos.',
   'platform', NULL, true, true),
  ('school_admin', 'Administrador del colegio',
   'Plantilla de rol para el administrador de cada colegio (sus módulos se configuran en RBAC).',
   'tenant', NULL, true, true)
ON CONFLICT ON CONSTRAINT "roles_code_tenant_uq" DO NOTHING;
