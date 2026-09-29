import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

/**
 * Orden de los guards globales: límite de tasa → autenticación → autorización.
 * Los proveedores ACCESS_TOKEN_VERIFIER, SESSION_VALIDATOR, PERMISSION_RESOLVER y
 * AUDIT_RECORDER los aportan los módulos IAM, RBAC y Audit (globales).
 */
@Module({
  imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: () => Number(process.env.RATE_LIMIT_PER_MINUTE ?? 120) }])],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class SecurityModule {}
