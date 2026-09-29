import { AppException, ErrorDetail } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';

const MIN_LENGTH = 12;
const MAX_LENGTH = 128; // evita usar argon2 como vector de DoS con contraseñas enormes
const COMMON = new Set([
  'password1234',
  'contrasena123',
  'contraseña123',
  '123456789012',
  'qwertyuiop12',
  'administrador',
  'colegio12345',
  'iloveyou1234',
]);

/** Devuelve los motivos de rechazo (vacío = contraseña aceptable). Regla NIST: longitud sobre complejidad. */
export function passwordProblems(password: string, email?: string): string[] {
  const problems: string[] = [];
  if (password.length < MIN_LENGTH) problems.push(`debe tener al menos ${MIN_LENGTH} caracteres`);
  if (password.length > MAX_LENGTH) problems.push(`no puede superar ${MAX_LENGTH} caracteres`);
  if (/^(.)\1+$/.test(password)) problems.push('no puede repetir un mismo carácter');
  if (COMMON.has(password.toLowerCase())) problems.push('es una contraseña demasiado común');
  const local = email?.split('@')[0]?.toLowerCase();
  if (local && local.length >= 4 && password.toLowerCase().includes(local)) problems.push('no puede contener tu correo');
  return problems;
}

export function assertPasswordAcceptable(password: string, email?: string): void {
  const problems = passwordProblems(password, email);
  if (problems.length > 0) {
    const details: ErrorDetail[] = problems.map((message) => ({ field: 'password', message }));
    throw new AppException(ErrorCodes.AUTH_PASSWORD_WEAK, details);
  }
}
