# SCEI Platform · Backend

API multi-colegio (multi-tenant) — **NestJS 11 + Fastify · PostgreSQL 16 · Drizzle ORM · arquitectura hexagonal**.
Fase actual: **SuperAdmin de plataforma** (PL-01 … PL-06). El reconocimiento facial vive en un servicio aparte que esta API solo consume por API interna.

## Arranque rápido

```bash
cp .env.example .env            # completa JWT_ACCESS_SECRET, SIGNING_KEY, MASTER_KEY
docker compose up -d db
npm install
npm run db:migrate
SUPERADMIN_EMAIL=ops@empresa.pe SUPERADMIN_PASSWORD='frase-larga-12+' npm run cli:create-superadmin
npm run start:dev               # Swagger en http://localhost:3000/docs
npm test                        # unitarias + e2e contra PostgreSQL real (base *_test)
```

Las pruebas e2e usan `DATABASE_URL` (por defecto `postgres://postgres@127.0.0.1:54329/scei_test`); por seguridad **se niegan a correr si la base no termina en `_test`** y la recrean completa.

## Arquitectura

```
src/
  shared/            kernel: config (zod), errores, seguridad (guards/decorators), cripto, BD, HTTP, contratos entre módulos
  modules/<modulo>/
    domain/          entidades, reglas puras y puertos (interfaces)
    application/     casos de uso / servicios (solo dependen de puertos)
    infrastructure/  adaptadores: schema Drizzle por tabla (*.table.ts), repositorios, cifrado, notificaciones
    interfaces/http/ controladores, dto/ de ENTRADA (request) y de SALIDA (response) separados, mappers
```

Módulos: `audit` (bitácora inmutable), `iam` (usuarios, login, MFA, sesiones), `rbac` (catálogo, roles), `tenants` (colegios, planes, métricas, invitaciones).
Los módulos **no importan tablas ajenas**: se hablan por contratos en `shared/contracts` (p. ej. Tenants pide a IAM crear una cuenta y a RBAC asignar un rol). Las FK entre módulos están en la migración `0002`.

### Migraciones y esquema por tabla
Un archivo `schema/<tabla>.table.ts` por tabla. `npm run db:generate` produce el SQL; `npm run db:generate:custom` crea una migración vacía para SQL a mano (triggers, seeds, FK cruzadas). `npm run db:migrate` las aplica en orden.

### DTO de entrada ≠ DTO de salida
Cada endpoint recibe un `*RequestDto` (validado con `class-validator`, `whitelist + forbidNonWhitelisted`) y responde un `*ResponseDto` construido por un mapper. Nunca se devuelve una entidad de BD: no se filtran hashes, secretos ni campos internos.

## RBAC por módulos

- Cada controlador declara `@ApiModule({ key, name, scope })` y cada endpoint `@RequirePermission('<modulo>:<accion>', 'descripción')`.
- Al arrancar, el catálogo (`modules` → `permissions` con sus endpoints) **se sincroniza solo** leyendo los controladores. Si el prefijo del permiso no coincide con el módulo, la app no inicia.
- Un **rol** recibe *módulos* (todas sus APIs) y/o *permisos sueltos*. Permisos efectivos = unión. Se administra en `/v1/rbac/...`.
- **Denegación por defecto**: una ruta sin `@Public`, `@AuthenticatedOnly` o `@RequirePermission` responde `RBAC-007`.
- `platform_superadmin` es de sistema: no se edita y no pierde módulos; recibe automáticamente todo módulo de plataforma nuevo.
- Los roles tienen ámbito (`platform` | `tenant`) y no se pueden mezclar módulos de otro ámbito (`RBAC-008`).

Módulos y permisos actuales: `audit` (read, verify) · `metrics` (read) · `plans` (read, manage) · `rbac` (read, manage) · `tenants` (create, read, assign-plan, suspend, offboard, purge).

## Seguridad (OWASP)

| Riesgo | Medida |
|---|---|
| A01 Control de acceso | RBAC deny-by-default; guards globales Throttler → JWT → Permisos; UUID validados en rutas |
| A02 Criptografía | argon2id; JWT HS256 fijo con issuer/audience; secretos TOTP cifrados AES-256-GCM; clave de datos (DEK) por colegio envuelta con `MASTER_KEY` |
| A04 Diseño inseguro | Invitación de un solo uso (hash del token, consumo atómico); el operador nunca conoce la clave del admin del colegio |
| A05 Configuración | Secretos sin valores por defecto (falla al iniciar); helmet; CORS por lista; Swagger apagable |
| A07 Autenticación | MFA TOTP obligatorio para roles que lo exigen; bloqueo progresivo; refresh rotativo con detección de reutilización; revocación inmediata de sesiones |
| A08 Integridad | Bitácora con cadena SHA-256 + triggers que impiden UPDATE/DELETE/TRUNCATE; constancias de borrado firmadas (HMAC) |
| A09 Logging | Bitácora de operadores (PL-06) con redacción de claves sensibles; `traceId` en cada error |
| API4 Recursos | Rate limit global y estricto para `/auth`; body máx. 1 MiB; paginación acotada |

### Datos de menores y Ley 29733
La plataforma **no muestra datos personales de alumnos al SuperAdmin** (métricas solo agregadas). La baja de un colegio destruye su clave de datos (*crypto-shredding*), ejecuta los purgadores registrados por cada módulo y emite constancia firmada. Los plazos de retención, consentimientos y el registro de bancos de datos deben validarse con un abogado.

### Endurecimiento de la BD (producción)
- El rol de la aplicación **no debe ser dueño** de `audit_logs` ni tener `TRUNCATE`/`ALTER`: los triggers son la última barrera, no la única.
- Migraciones con un rol distinto al de ejecución.
- Deja RLS por `tenant_id` para cuando existan tablas con datos de colegios.

## Colegios (PL-01 … PL-06)

| Caso | Endpoint |
|---|---|
| PL-01 alta + invitación | `POST /v1/platform/tenants` · `POST /v1/invitations/accept` (público) · `POST /v1/platform/tenants/:id/invitations/resend` |
| PL-02 planes y límites | `POST/PATCH /v1/platform/plans` · `PUT /v1/platform/tenants/:id/plan` |
| PL-03 suspender/reactivar | `POST /v1/platform/tenants/:id/suspend` · `/reactivate` |
| PL-04 baja y purga | `POST/DELETE /v1/platform/tenants/:id/offboarding` · `POST .../purge` · `GET .../deletion-certificate` |
| PL-05 métricas | `GET /v1/platform/metrics/overview` · `/tenants/:id` |
| PL-06 bitácora | `GET /v1/platform/audit-logs` · `/verify-chain` |

Estados: `active ⇄ suspended → pending_deletion → purged`. La purga exige estar en baja, **confirmar el slug** y que haya pasado `TENANT_PURGE_GRACE_DAYS`.

### Cómo se enchufan los módulos futuros
- Datos por colegio: implementa `TenantDataPurger` y regístralo en `TenantDataPurgerRegistry` (`onModuleInit`). La baja lo ejecuta y deja el conteo en la constancia.
- Cifrado por colegio: pide la DEK con `TENANT_KEY_STORE.unwrap(tenantId)`.
- Métricas: quien mida uso escribe en `tenant_usage_snapshots`; la plataforma solo lee.
- Correo: cambia el adaptador `NOTIFIER` (hoy consola).
- Importar/exportar genéricos: se sumarán como módulo compartido con su propio `@ApiModule`, y los tenants lo consumirán vía RBAC.

## Catálogo de códigos de error

Respuesta estándar: `{ code, message, details?, traceId, timestamp, path }`. Los endpoints documentan sus códigos en Swagger.

| Código | HTTP | Mensaje |
|---|---|---|
| `SYS-500` | 500 | Ocurrió un error interno. Inténtalo nuevamente. |
| `SYS-404` | 404 | El recurso solicitado no existe. |
| `SYS-429` | 429 | Demasiadas solicitudes. Espera un momento e inténtalo de nuevo. |
| `SYS-413` | 413 | La solicitud excede el tamaño permitido. |
| `VAL-400` | 400 | Los datos enviados no son válidos. |
| `AUTH-001` | 401 | Credenciales inválidas. |
| `AUTH-002` | 423 | La cuenta está bloqueada temporalmente. Inténtalo más tarde. |
| `AUTH-003` | 401 | El código de verificación es inválido o ya fue usado. |
| `AUTH-004` | 401 | Token inválido. |
| `AUTH-005` | 401 | El token expiró. |
| `AUTH-006` | 401 | La sesión fue invalidada por seguridad. Inicia sesión nuevamente. |
| `AUTH-007` | 403 | Debes completar la verificación en dos pasos para usar este recurso. |
| `AUTH-008` | 409 | La verificación en dos pasos ya está activa. |
| `AUTH-009` | 409 | Primero debes iniciar el enrolamiento de la verificación en dos pasos. |
| `AUTH-010` | 400 | La invitación no es válida, expiró o ya fue utilizada. |
| `AUTH-011` | 400 | La contraseña no cumple la política de seguridad. |
| `AUTH-012` | 403 | La cuenta está deshabilitada. |
| `RBAC-001` | 403 | No tienes permiso para realizar esta acción. |
| `RBAC-002` | 404 | El rol no existe. |
| `RBAC-003` | 409 | Los roles del sistema no se pueden modificar. |
| `RBAC-004` | 409 | Ya existe un rol con ese código. |
| `RBAC-005` | 404 | Uno o más módulos no existen. |
| `RBAC-006` | 404 | Uno o más permisos no existen. |
| `RBAC-007` | 403 | El recurso no tiene una política de acceso declarada. |
| `RBAC-008` | 409 | El módulo o permiso no corresponde al ámbito del rol. |
| `RBAC-009` | 409 | El rol está asignado a usuarios y no se puede eliminar. |
| `RBAC-010` | 409 | Este rol no puede perder módulos porque dejaría la plataforma sin operador. |
| `TEN-001` | 404 | El colegio no existe. |
| `TEN-002` | 409 | Ya existe un colegio con ese identificador. |
| `TEN-003` | 409 | Ya existe un colegio con ese RUC. |
| `TEN-004` | 409 | La operación no es válida para el estado actual del colegio. |
| `TEN-005` | 400 | La confirmación no coincide con el identificador del colegio. |
| `TEN-006` | 409 | El colegio aún está dentro del periodo de gracia previo al borrado. |
| `TEN-007` | 404 | El colegio no tiene constancia de borrado. |
| `TEN-008` | 409 | Ese correo ya es administrador de este colegio. |
| `PLAN-001` | 404 | El plan no existe. |
| `PLAN-002` | 409 | Ya existe un plan con ese código. |
| `PLAN-003` | 409 | El plan tiene límites menores al uso actual del colegio. |
| `PLAN-004` | 409 | El plan está inactivo y no se puede asignar. |
| `AUD-001` | 400 | El rango de fechas no es válido. |

## Pendiente / siguientes fases
- RBAC y sesiones **con alcance de colegio** (hoy los permisos se resuelven en ámbito plataforma) + RLS.
- JWT asimétrico (JWKS) cuando el servicio facial deba verificar tokens; hoy HS256.
- Endpoint/cola de ingesta de métricas; BullMQ; servicio facial (FastAPI + ONNX + pgvector).
- Servicios genéricos de importación/exportación.
