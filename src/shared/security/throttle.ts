import { Throttle } from '@nestjs/throttler';

/**
 * Límite estricto para endpoints sensibles (login, MFA, refresh, invitaciones): por defecto 10/min por IP.
 * Se lee del entorno en cada solicitud para poder ajustarlo (las pruebas lo suben).
 */
export const StrictThrottle = () =>
  Throttle({ default: { limit: () => Number(process.env.AUTH_RATE_LIMIT_PER_MINUTE ?? 10), ttl: 60_000 } });
