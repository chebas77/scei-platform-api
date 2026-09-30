import { Tx } from '../../../../shared/database/tx';
import { StudentRecord, StudentStatus } from '../student';

export interface NewStudentRecord {
  tenantId: string;
  userId: string;
  code: string;
  fullNameEnc: string;
}

export interface StudentRepositoryPort {
  /** `null` si el código ya existe en ese colegio. */
  create(input: NewStudentRecord, tx?: Tx): Promise<StudentRecord | null>;
  findById(id: string): Promise<StudentRecord | null>;
  existsInTenant(tenantId: string, id: string): Promise<boolean>;
  listByTenant(tenantId: string): Promise<StudentRecord[]>;
  countActiveByTenant(tenantId: string): Promise<number>;
  update(id: string, patch: Partial<Pick<StudentRecord, 'fullNameEnc' | 'status'>>): Promise<StudentRecord | null>;
  deleteAllForTenant(tenantId: string, tx: Tx): Promise<number>;
}
export const STUDENT_REPOSITORY = Symbol('STUDENT_REPOSITORY');
