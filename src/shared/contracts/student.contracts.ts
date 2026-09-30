/** Existencia de un alumno dentro de un colegio, para validar matrículas sin acoplarse a la tabla de alumnos (lo implementa Students). */
export interface StudentDirectoryPort {
  existsInTenant(tenantId: string, studentId: string): Promise<boolean>;
}
export const STUDENT_DIRECTORY = Symbol('STUDENT_DIRECTORY');
