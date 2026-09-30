import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { AppException } from '../../../shared/errors/app.exception';
import { ErrorCodes } from '../../../shared/errors/error-codes';
import { IDENTITY_PROVISIONING, IdentityProvisioningPort, USER_DIRECTORY, UserDirectoryPort } from '../../../shared/contracts/identity.contracts';
import { MEMBERSHIP_DIRECTORY, MembershipDirectoryPort, ROLE_DIRECTORY, RoleDirectoryPort } from '../../../shared/contracts/rbac.contracts';
import { StudentDirectoryPort } from '../../../shared/contracts/student.contracts';
import { TENANT_DATA_KEY, TENANT_DIRECTORY, TenantDataKeyPort, TenantDirectoryPort } from '../../../shared/contracts/tenant.contracts';
import { AesGcmSecretCipher } from '../../../shared/crypto/crypto.ports';
import { TRANSACTION_RUNNER, TransactionRunnerPort } from '../../../shared/database/tx';
import { Student } from '../domain/student';
import { STUDENT_REPOSITORY, StudentRepositoryPort } from '../domain/ports/student.repository.port';

const STUDENT_ROLE_CODE = 'alumno';

/** Alta y consulta de alumnos. El nombre se cifra con la clave propia del colegio (TENANT_KEY_STORE). */
@Injectable()
export class StudentService implements StudentDirectoryPort {
  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly students: StudentRepositoryPort,
    @Inject(TENANT_DATA_KEY) private readonly keys: TenantDataKeyPort,
    @Inject(TENANT_DIRECTORY) private readonly tenants: TenantDirectoryPort,
    @Inject(IDENTITY_PROVISIONING) private readonly identity: IdentityProvisioningPort,
    @Inject(ROLE_DIRECTORY) private readonly roles: RoleDirectoryPort,
    @Inject(MEMBERSHIP_DIRECTORY) private readonly memberships: MembershipDirectoryPort,
    @Inject(USER_DIRECTORY) private readonly users: UserDirectoryPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    @Inject(TRANSACTION_RUNNER) private readonly trx: TransactionRunnerPort,
  ) {}

  async create(
    tenantId: string, input: { email: string; password: string; code: string; fullName: string }, actorId: string, meta: RequestMeta,
  ): Promise<Student> {
    const role = await this.roles.findSystemRole(STUDENT_ROLE_CODE);
    if (!role) throw new Error(`Falta el rol ${STUDENT_ROLE_CODE}: ejecuta las migraciones`);
    const limits = await this.tenants.getPlanLimits(tenantId);
    const activeCount = await this.students.countActiveByTenant(tenantId);
    if (limits && activeCount >= limits.maxStudents) throw new AppException(ErrorCodes.STU_LIMIT_REACHED);
    const cipher = await this.cipherFor(tenantId);

    const { userId } = await this.identity.provisionUser({ email: input.email, password: input.password });
    const record = await this.trx.run(async (tx) => {
      await this.memberships.setRole(userId, tenantId, role.id, tx);
      return this.students.create({ tenantId, userId, code: input.code.trim(), fullNameEnc: cipher.encrypt(input.fullName.trim()) }, tx);
    });
    if (!record) throw new AppException(ErrorCodes.STU_CODE_TAKEN);

    await this.audit.record({
      action: 'student.created', outcome: 'success', actorUserId: actorId, resourceType: 'student', resourceId: record.id, tenantId, meta,
      metadata: { code: record.code },
    });
    const [person] = await this.users.listByIds([userId]);
    return { id: record.id, userId, code: record.code, fullName: input.fullName.trim(), email: person.email, status: record.status, createdAt: record.createdAt };
  }

  async list(tenantId: string): Promise<Student[]> {
    const records = await this.students.listByTenant(tenantId);
    if (records.length === 0) return [];
    const cipher = await this.cipherFor(tenantId);
    const people = await this.users.listByIds(records.map((r) => r.userId));
    const byUserId = new Map(people.map((p) => [p.id, p]));
    return records
      .map((r) => {
        const person = byUserId.get(r.userId);
        if (!person) return null;
        return { id: r.id, userId: r.userId, code: r.code, fullName: cipher.decrypt(r.fullNameEnc).toString('utf8'), email: person.email, status: r.status, createdAt: r.createdAt };
      })
      .filter((x): x is Student => x !== null);
  }

  async update(tenantId: string, id: string, patch: { fullName?: string; status?: 'active' | 'inactive' }, actorId: string, meta: RequestMeta): Promise<void> {
    const record = await this.students.findById(id);
    if (!record || record.tenantId !== tenantId) throw new AppException(ErrorCodes.STU_NOT_FOUND);

    const dbPatch: { fullNameEnc?: string; status?: 'active' | 'inactive' } = {};
    if (patch.fullName !== undefined) dbPatch.fullNameEnc = (await this.cipherFor(tenantId)).encrypt(patch.fullName.trim());
    if (patch.status !== undefined) dbPatch.status = patch.status;
    await this.students.update(id, dbPatch);

    // Un alumno inactivo (retirado) no debe poder seguir entrando con esa cuenta.
    if (patch.status) await this.users.setStatus(record.userId, patch.status === 'active' ? 'active' : 'disabled');

    await this.audit.record({ action: 'student.updated', outcome: 'success', actorUserId: actorId, resourceType: 'student', resourceId: id, tenantId, meta, metadata: { fields: Object.keys(patch) } });
  }

  existsInTenant(tenantId: string, studentId: string): Promise<boolean> {
    return this.students.existsInTenant(tenantId, studentId);
  }

  private async cipherFor(tenantId: string): Promise<AesGcmSecretCipher> {
    const dek = await this.keys.unwrap(tenantId);
    if (!dek) throw new Error(`El colegio ${tenantId} no tiene clave de datos (¿fue dado de baja?)`);
    return new AesGcmSecretCipher(dek.toString('base64'));
  }
}
