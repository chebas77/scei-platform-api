import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Tx } from '../../../shared/database/tx';
import { TenantDataPurger } from '../../tenants/domain/ports/tenant-data-purger.port';
import { TenantDataPurgerRegistry } from '../../tenants/application/tenant-data-purger.registry';
import { KIOSK_REPOSITORY, KioskRepositoryPort } from '../domain/ports/kiosk.repository.port';

/** Borra los kioscos del colegio cuando se ejecuta su baja definitiva (PL-04). */
@Injectable()
export class KioskTenantPurger implements TenantDataPurger, OnModuleInit {
  readonly name = 'kiosks';

  constructor(
    @Inject(KIOSK_REPOSITORY) private readonly kiosks: KioskRepositoryPort,
    private readonly registry: TenantDataPurgerRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async purge(tenantId: string, tx: Tx): Promise<{ deleted: number }> {
    return { deleted: await this.kiosks.deleteAllForTenant(tenantId, tx) };
  }
}
