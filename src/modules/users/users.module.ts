import { Module } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../../shared/config/env';
import { AcceptOperatorInvitationUseCase } from './application/accept-operator-invitation.use-case';
import { ChangeUserRoleUseCase } from './application/change-user-role.use-case';
import { InviteOperatorUseCase } from './application/invite-operator.use-case';
import { LastPlatformAdminGuard } from './application/last-platform-admin.guard';
import { ListScopedUsersUseCase } from './application/list-scoped-users.use-case';
import { SetUserStatusUseCase } from './application/set-user-status.use-case';
import { OPERATOR_INVITATION_REPOSITORY } from './domain/ports/operator-invitation.repository.port';
import { OPERATOR_NOTIFIER } from './domain/ports/operator-notifier.port';
import { ConsoleOperatorNotifier } from './infrastructure/notifications/console-operator-notifier';
import { SmtpOperatorNotifier } from './infrastructure/notifications/smtp-operator-notifier';
import { DrizzleOperatorInvitationRepository } from './infrastructure/persistence/drizzle-operator-invitation.repository';
import { OperatorInvitationsController } from './interfaces/http/operator-invitations.controller';
import { UsersController } from './interfaces/http/users.controller';

@Module({
  controllers: [UsersController, OperatorInvitationsController],
  providers: [
    { provide: OPERATOR_INVITATION_REPOSITORY, useClass: DrizzleOperatorInvitationRepository },
    ConsoleOperatorNotifier,
    {
      provide: OPERATOR_NOTIFIER,
      // Sin SMTP_HOST se usa la consola (dev/test); con SMTP_HOST configurado, se envía correo real.
      useFactory: (cfg: AppConfig, fallback: ConsoleOperatorNotifier) => (cfg.SMTP_HOST ? new SmtpOperatorNotifier(cfg) : fallback),
      inject: [APP_CONFIG, ConsoleOperatorNotifier],
    },
    LastPlatformAdminGuard,
    ListScopedUsersUseCase,
    InviteOperatorUseCase,
    ChangeUserRoleUseCase,
    SetUserStatusUseCase,
    AcceptOperatorInvitationUseCase,
  ],
})
export class UsersModule {}
