import { Module } from '@nestjs/common';
import { AcademicsModule } from './modules/academics/academics.module';
import { AuditModule } from './modules/audit/audit.module';
import { IamModule } from './modules/iam/iam.module';
import { KiosksModule } from './modules/kiosks/kiosks.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { StudentsModule } from './modules/students/students.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { ConfigModule } from './shared/config/config.module';
import { CryptoModule } from './shared/crypto/crypto.module';
import { DatabaseModule } from './shared/database/database.module';
import { HealthController } from './shared/http/health.controller';
import { SecurityModule } from './shared/security/security.module';

@Module({
  imports: [
    ConfigModule, CryptoModule, DatabaseModule, SecurityModule, AuditModule, IamModule, RbacModule, TenantsModule, UsersModule, KiosksModule,
    StudentsModule, AcademicsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
