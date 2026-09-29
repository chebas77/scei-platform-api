import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CATALOG_REPOSITORY, CatalogRepositoryPort } from '../domain/ports/catalog.repository.port';
import { ApiCatalogScanner } from './api-catalog.scanner';

/** Al arrancar, vuelca al catálogo los módulos/permisos declarados en los controladores. */
@Injectable()
export class CatalogSyncService implements OnApplicationBootstrap {
  private readonly log = new Logger(CatalogSyncService.name);

  constructor(
    private readonly scanner: ApiCatalogScanner,
    @Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepositoryPort,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const result = await this.catalog.sync(this.scanner.scan());
    this.log.log(
      `Catálogo RBAC: ${result.modules} módulos, ${result.permissions} permisos (desactivados: ${result.deactivatedModules}/${result.deactivatedPermissions})`,
    );
  }
}
