import { Logger } from '@nestjs/common';
import { OperatorNotifierPort } from '../../domain/ports/operator-notifier.port';

/** Adaptador de desarrollo: NO imprime el enlace (contiene el token). Solo deja constancia del envío. */
export class ConsoleOperatorNotifier implements OperatorNotifierPort {
  private readonly log = new Logger('Notifier');

  async sendOperatorInvitation(input: { to: string; roleName: string; scopeLabel: string; acceptUrl: string; expiresAt: Date }): Promise<void> {
    this.log.log(`Invitación de operador enviada a ${input.to.replace(/^(.).*(@.*)$/, '$1***$2')} (${input.roleName} · ${input.scopeLabel}), vence ${input.expiresAt.toISOString()}`);
  }
}
