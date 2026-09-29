import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carga `.env` si existe (Node >= 20.12). No pisa variables ya definidas en el entorno,
 * de modo que producción siempre manda sobre el archivo local.
 */
export function loadDotEnv(file = '.env'): void {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) process.loadEnvFile(path);
}
