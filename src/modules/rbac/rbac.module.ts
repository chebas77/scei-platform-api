import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { MFA_POLICY, ROLE_ASSIGNMENT, ROLE_DIRECTORY, TENANT_ACCESS_REVOKER } from '../../shared/contracts/rbac.contracts';
import { PERMISSION_RESOLVER } from '../../shared/security/auth-context';
import { ApiCatalogScanner } from './application/api-catalog.scanner';
import { CatalogSyncService } from './application/catalog-sync.service';
import { RbacAccessService } from './application/rbac-access.service';
import { RoleManagementService } from './application/role-management.service';
import { ACCESS_REPOSITORY } from './domain/ports/access.repository.port';
import { CATALOG_REPOSITORY } from './domain/ports/catalog.repository.port';
import { ROLE_REPOSITORY } from './domain/ports/role.repository.port';
import { DrizzleAccessRepository } from './infrastructure/persistence/drizzle-access.repository';
import { DrizzleCatalogRepository } from './infrastructure/persistence/drizzle-catalog.repository';
import { DrizzleRoleRepository } from './infrastructure/persistence/drizzle-role.repository';
import { RbacController } from './interfaces/http/rbac.controller';

@Global()
@Module({
  imports: [DiscoveryModule],
  controllers: [RbacController],
  providers: [
    { provide: ACCESS_REPOSITORY, useClass: DrizzleAccessRepository },
    { provide: CATALOG_REPOSITORY, useClass: DrizzleCatalogRepository },
    { provide: ROLE_REPOSITORY, useClass: DrizzleRoleRepository },
    ApiCatalogScanner,
    CatalogSyncService,
    RbacAccessService,
    { provide: PERMISSION_RESOLVER, useExisting: RbacAccessService },
    { provide: ROLE_DIRECTORY, useExisting: RbacAccessService },
    { provide: ROLE_ASSIGNMENT, useExisting: RbacAccessService },
    { provide: MFA_POLICY, useExisting: RbacAccessService },
    { provide: TENANT_ACCESS_REVOKER, useExisting: RbacAccessService },
    RoleManagementService,
  ],
  exports: [PERMISSION_RESOLVER, ROLE_DIRECTORY, ROLE_ASSIGNMENT, MFA_POLICY, TENANT_ACCESS_REVOKER],
})
export class RbacModule {}
