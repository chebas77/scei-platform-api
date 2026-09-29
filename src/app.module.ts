import { Module } from '@nestjs/common';
import { AuditModule } from './modules/audit/audit.module';
import { IamModule } from './modules/iam/iam.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ConfigModule } from './shared/config/config.module';
import { CryptoModule } from './shared/crypto/crypto.module';
import { DatabaseModule } from './shared/database/database.module';
import { HealthController } from './shared/http/health.controller';
import { SecurityModule } from './shared/security/security.module';

@Module({
  imports: [ConfigModule, CryptoModule, DatabaseModule, SecurityModule, AuditModule, IamModule, RbacModule, TenantsModule],
  controllers: [HealthController],
})
export class AppModule {}
