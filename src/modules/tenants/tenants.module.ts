import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../../shared/config/env';
import { TENANT_DIRECTORY } from '../../shared/contracts/tenant.contracts';
import { AcceptInvitationUseCase } from './application/accept-invitation.use-case';
import { CreateTenantUseCase } from './application/create-tenant.use-case';
import { MetricsService } from './application/metrics.service';
import { PlanService } from './application/plan.service';
import { ResendInvitationUseCase } from './application/resend-invitation.use-case';
import { TenantDataPurgerRegistry } from './application/tenant-data-purger.registry';
import { TenantLifecycleService } from './application/tenant-lifecycle.service';
import { TenantQueryService } from './application/tenant-query.service';
import { CERTIFICATE_REPOSITORY } from './domain/ports/certificate.repository.port';
import { INVITATION_REPOSITORY } from './domain/ports/invitation.repository.port';
import { NOTIFIER } from './domain/ports/notifier.port';
import { PLAN_REPOSITORY, USAGE_REPOSITORY } from './domain/ports/plan.repository.port';
import { TENANT_KEY_STORE } from './domain/ports/tenant-key.store.port';
import { TENANT_REPOSITORY } from './domain/ports/tenant.repository.port';
import { ConsoleNotifier } from './infrastructure/notifications/console-notifier';
import { SmtpNotifier } from './infrastructure/notifications/smtp-notifier';
import { DrizzleCertificateRepository } from './infrastructure/persistence/drizzle-certificate.repository';
import { DrizzleInvitationRepository } from './infrastructure/persistence/drizzle-invitation.repository';
import { DrizzlePlanRepository } from './infrastructure/persistence/drizzle-plan.repository';
import { DrizzleTenantKeyStore } from './infrastructure/persistence/drizzle-tenant-key.store';
import { DrizzleTenantRepository } from './infrastructure/persistence/drizzle-tenant.repository';
import { DrizzleUsageRepository } from './infrastructure/persistence/drizzle-usage.repository';
import { InvitationsController } from './interfaces/http/invitations.controller';
import { MetricsController } from './interfaces/http/metrics.controller';
import { PlansController } from './interfaces/http/plans.controller';
import { TenantsController } from './interfaces/http/tenants.controller';

/**
 * Global porque los módulos con datos por colegio (alumnos, asistencia...) necesitan
 * registrar su `TenantDataPurger` y pedir la clave de datos del colegio (TENANT_KEY_STORE).
 */
@Global()
@Module({
  controllers: [TenantsController, PlansController, MetricsController, InvitationsController],
  providers: [
    { provide: TENANT_REPOSITORY, useClass: DrizzleTenantRepository },
    { provide: TENANT_DIRECTORY, useExisting: TenantQueryService },
    { provide: PLAN_REPOSITORY, useClass: DrizzlePlanRepository },
    { provide: USAGE_REPOSITORY, useClass: DrizzleUsageRepository },
    { provide: INVITATION_REPOSITORY, useClass: DrizzleInvitationRepository },
    { provide: CERTIFICATE_REPOSITORY, useClass: DrizzleCertificateRepository },
    { provide: TENANT_KEY_STORE, useClass: DrizzleTenantKeyStore },
    ConsoleNotifier,
    {
      provide: NOTIFIER,
      // Sin SMTP_HOST se usa la consola (dev/test); con SMTP_HOST configurado, se envía correo real.
      useFactory: (cfg: AppConfig, fallback: ConsoleNotifier) => (cfg.SMTP_HOST ? new SmtpNotifier(cfg) : fallback),
      inject: [APP_CONFIG, ConsoleNotifier],
    },
    TenantDataPurgerRegistry,
    CreateTenantUseCase,
    ResendInvitationUseCase,
    AcceptInvitationUseCase,
    PlanService,
    TenantLifecycleService,
    TenantQueryService,
    MetricsService,
  ],
  exports: [TENANT_KEY_STORE, TenantDataPurgerRegistry, NOTIFIER, ConsoleNotifier, TENANT_DIRECTORY],
})
export class TenantsModule {}
