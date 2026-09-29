-- Rol de sistema para cuentas de alumno (ver 0003_seed_system_roles.sql). Ámbito colegio, sin MFA
-- (muchos alumnos son menores; el colegio decide si más adelante lo exige).
INSERT INTO "roles" ("code", "name", "description", "scope", "tenant_id", "is_system", "requires_mfa")
VALUES
  ('alumno', 'Alumno',
   'Cuenta del alumno (y de su padre/madre, que usa las mismas credenciales). Ve sus propios cursos, notas y asistencia.',
   'tenant', NULL, true, false)
ON CONFLICT ON CONSTRAINT "roles_code_tenant_uq" DO NOTHING;
