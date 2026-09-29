/**
 * Catálogo único de errores de la API.
 *
 * Formato del código: <PREFIJO>-<NNN>. El prefijo identifica el módulo:
 *   SYS  sistema/transversal   VAL  validación     AUTH  autenticación e identidad
 *   RBAC roles y permisos      TEN  tenants        PLAN  planes
 *   AUD  auditoría             MET  métricas
 *
 * Reglas:
 *  - Un código nunca se reutiliza ni cambia de significado (los clientes dependen de él).
 *  - `message` es texto seguro para mostrar al usuario; nunca incluye datos internos.
 *  - Los detalles específicos van en `details` de la respuesta, no en el mensaje.
 */
export interface ErrorDefinition {
  readonly code: string;
  readonly status: number;
  readonly message: string;
}

const define = <T extends Record<string, ErrorDefinition>>(defs: T): T => defs;

export const ErrorCodes = define({
  // ── Sistema y validación ────────────────────────────────────────────────
  SYS_INTERNAL: { code: 'SYS-500', status: 500, message: 'Ocurrió un error interno. Inténtalo nuevamente.' },
  SYS_ROUTE_NOT_FOUND: { code: 'SYS-404', status: 404, message: 'El recurso solicitado no existe.' },
  SYS_RATE_LIMITED: { code: 'SYS-429', status: 429, message: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' },
  SYS_PAYLOAD_TOO_LARGE: { code: 'SYS-413', status: 413, message: 'La solicitud excede el tamaño permitido.' },
  VAL_INVALID_INPUT: { code: 'VAL-400', status: 400, message: 'Los datos enviados no son válidos.' },

  // ── Autenticación e identidad ───────────────────────────────────────────
  AUTH_INVALID_CREDENTIALS: { code: 'AUTH-001', status: 401, message: 'Credenciales inválidas.' },
  AUTH_ACCOUNT_LOCKED: { code: 'AUTH-002', status: 423, message: 'La cuenta está bloqueada temporalmente. Inténtalo más tarde.' },
  AUTH_MFA_INVALID_CODE: { code: 'AUTH-003', status: 401, message: 'El código de verificación es inválido o ya fue usado.' },
  AUTH_TOKEN_INVALID: { code: 'AUTH-004', status: 401, message: 'Token inválido.' },
  AUTH_TOKEN_EXPIRED: { code: 'AUTH-005', status: 401, message: 'El token expiró.' },
  AUTH_REFRESH_REUSED: { code: 'AUTH-006', status: 401, message: 'La sesión fue invalidada por seguridad. Inicia sesión nuevamente.' },
  AUTH_SCOPE_INSUFFICIENT: { code: 'AUTH-007', status: 403, message: 'Debes completar la verificación en dos pasos para usar este recurso.' },
  AUTH_MFA_ALREADY_ENABLED: { code: 'AUTH-008', status: 409, message: 'La verificación en dos pasos ya está activa.' },
  AUTH_MFA_NOT_ENROLLED: { code: 'AUTH-009', status: 409, message: 'Primero debes iniciar el enrolamiento de la verificación en dos pasos.' },
  AUTH_INVITATION_INVALID: { code: 'AUTH-010', status: 400, message: 'La invitación no es válida, expiró o ya fue utilizada.' },
  AUTH_PASSWORD_WEAK: { code: 'AUTH-011', status: 400, message: 'La contraseña no cumple la política de seguridad.' },
  AUTH_ACCOUNT_DISABLED: { code: 'AUTH-012', status: 403, message: 'La cuenta está deshabilitada.' },

  // ── Roles, módulos y permisos ───────────────────────────────────────────
  RBAC_FORBIDDEN: { code: 'RBAC-001', status: 403, message: 'No tienes permiso para realizar esta acción.' },
  RBAC_ROLE_NOT_FOUND: { code: 'RBAC-002', status: 404, message: 'El rol no existe.' },
  RBAC_ROLE_SYSTEM_PROTECTED: { code: 'RBAC-003', status: 409, message: 'Los roles del sistema no se pueden modificar.' },
  RBAC_ROLE_CODE_TAKEN: { code: 'RBAC-004', status: 409, message: 'Ya existe un rol con ese código.' },
  RBAC_MODULE_NOT_FOUND: { code: 'RBAC-005', status: 404, message: 'Uno o más módulos no existen.' },
  RBAC_PERMISSION_NOT_FOUND: { code: 'RBAC-006', status: 404, message: 'Uno o más permisos no existen.' },
  RBAC_ENDPOINT_UNDECLARED: { code: 'RBAC-007', status: 403, message: 'El recurso no tiene una política de acceso declarada.' },
  RBAC_SCOPE_MISMATCH: { code: 'RBAC-008', status: 409, message: 'El módulo o permiso no corresponde al ámbito del rol.' },
  RBAC_ROLE_IN_USE: { code: 'RBAC-009', status: 409, message: 'El rol está asignado a usuarios y no se puede eliminar.' },
  RBAC_ROLE_LOCKED: { code: 'RBAC-010', status: 409, message: 'Este rol no puede perder módulos porque dejaría la plataforma sin operador.' },

  // ── Tenants ─────────────────────────────────────────────────────────────
  TEN_NOT_FOUND: { code: 'TEN-001', status: 404, message: 'El colegio no existe.' },
  TEN_SLUG_TAKEN: { code: 'TEN-002', status: 409, message: 'Ya existe un colegio con ese identificador.' },
  TEN_RUC_TAKEN: { code: 'TEN-003', status: 409, message: 'Ya existe un colegio con ese RUC.' },
  TEN_INVALID_STATE: { code: 'TEN-004', status: 409, message: 'La operación no es válida para el estado actual del colegio.' },
  TEN_PURGE_CONFIRMATION_MISMATCH: { code: 'TEN-005', status: 400, message: 'La confirmación no coincide con el identificador del colegio.' },
  TEN_PURGE_GRACE_PERIOD: { code: 'TEN-006', status: 409, message: 'El colegio aún está dentro del periodo de gracia previo al borrado.' },
  TEN_CERTIFICATE_NOT_FOUND: { code: 'TEN-007', status: 404, message: 'El colegio no tiene constancia de borrado.' },
  TEN_INVITATION_EMAIL_TAKEN: { code: 'TEN-008', status: 409, message: 'Ese correo ya es administrador de este colegio.' },

  // ── Planes ──────────────────────────────────────────────────────────────
  PLAN_NOT_FOUND: { code: 'PLAN-001', status: 404, message: 'El plan no existe.' },
  PLAN_CODE_TAKEN: { code: 'PLAN-002', status: 409, message: 'Ya existe un plan con ese código.' },
  PLAN_LIMIT_BELOW_USAGE: { code: 'PLAN-003', status: 409, message: 'El plan tiene límites menores al uso actual del colegio.' },
  PLAN_INACTIVE: { code: 'PLAN-004', status: 409, message: 'El plan está inactivo y no se puede asignar.' },

  // ── Auditoría y métricas ────────────────────────────────────────────────
  AUD_INVALID_RANGE: { code: 'AUD-001', status: 400, message: 'El rango de fechas no es válido.' },
} as const);

export type ErrorKey = keyof typeof ErrorCodes;

/** Lista plana, útil para documentación y para verificar unicidad en pruebas. */
export const ALL_ERROR_DEFINITIONS: readonly ErrorDefinition[] = Object.values(ErrorCodes);
