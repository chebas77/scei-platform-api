import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_RECORDER, AuditRecorderPort, RequestMeta } from '../../../shared/audit/audit-recorder.port';
import { USER_DIRECTORY, UserDirectoryPort } from '../../../shared/contracts/identity.contracts';
import { LastPlatformAdminGuard } from './last-platform-admin.guard';

/** Habilita o deshabilita una cuenta (deshabilitar invalida sus sesiones activas). */
@Injectable()
export class SetUserStatusUseCase {
  constructor(
    @Inject(USER_DIRECTORY) private readonly users: UserDirectoryPort,
    @Inject(AUDIT_RECORDER) private readonly audit: AuditRecorderPort,
    private readonly lastAdminGuard: LastPlatformAdminGuard,
  ) {}

  async execute(userId: string, status: 'active' | 'disabled', actorId: string, meta: RequestMeta): Promise<void> {
    if (status === 'disabled') await this.lastAdminGuard.assertCanLoseSuperAdmin(userId);
    await this.users.setStatus(userId, status);
    await this.audit.record({
      action: status === 'disabled' ? 'user.disabled' : 'user.enabled', outcome: 'success', actorUserId: actorId,
      resourceType: 'user', resourceId: userId, meta,
    });
  }
}
