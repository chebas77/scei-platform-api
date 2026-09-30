import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Tx } from '../../../shared/database/tx';
import { TenantDataPurger } from '../../tenants/domain/ports/tenant-data-purger.port';
import { TenantDataPurgerRegistry } from '../../tenants/application/tenant-data-purger.registry';
import { STUDENT_REPOSITORY, StudentRepositoryPort } from '../domain/ports/student.repository.port';

/**
 * Borra los perfiles de alumnos del colegio en la baja definitiva (PL-04). Sus matrículas se van solas
 * por la FK `enrollments.student_id ON DELETE CASCADE`. La cuenta (iam.users) no se borra —igual que
 * el resto de la plataforma— pero ya quedó inservible: su membresía se revoca y el nombre era lo único
 * cifrado con la clave del colegio, que la baja ya destruyó (crypto-shredding).
 */
@Injectable()
export class StudentTenantPurger implements TenantDataPurger, OnModuleInit {
  readonly name = 'students';

  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly students: StudentRepositoryPort,
    private readonly registry: TenantDataPurgerRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async purge(tenantId: string, tx: Tx): Promise<{ deleted: number }> {
    return { deleted: await this.students.deleteAllForTenant(tenantId, tx) };
  }
}
