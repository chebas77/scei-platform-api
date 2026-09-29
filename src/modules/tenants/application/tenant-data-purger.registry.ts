import { Injectable } from '@nestjs/common';
import { TenantDataPurger } from '../domain/ports/tenant-data-purger.port';

/** Los módulos con datos por colegio se registran aquí (`onModuleInit`) para participar en la baja. */
@Injectable()
export class TenantDataPurgerRegistry {
  private readonly purgers = new Map<string, TenantDataPurger>();

  register(purger: TenantDataPurger): void {
    if (this.purgers.has(purger.name)) throw new Error(`Ya existe un purgador llamado "${purger.name}"`);
    this.purgers.set(purger.name, purger);
  }

  all(): TenantDataPurger[] {
    return [...this.purgers.values()];
  }
}
