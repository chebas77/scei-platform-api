import { Logger } from '@nestjs/common';
import { NotifierPort } from '../../domain/ports/notifier.port';

/**
 * Adaptador de desarrollo: NO imprime el enlace (contiene el token). Solo deja constancia del envío.
 * En pruebas y desarrollo el enlace se obtiene del evento `lastInvitationUrl`.
 */
export class ConsoleNotifier implements NotifierPort {
  private readonly log = new Logger('Notifier');
  /** Solo para pruebas locales/e2e; en producción se reemplaza el adaptador por uno real. */
  lastInvitationUrl: string | null = null;

  async sendTenantInvitation(input: { to: string; legalName: string; acceptUrl: string; expiresAt: Date }): Promise<void> {
    this.lastInvitationUrl = input.acceptUrl;
    this.log.log(`Invitación enviada a ${input.to.replace(/^(.).*(@.*)$/, '$1***$2')} (${input.legalName}), vence ${input.expiresAt.toISOString()}`);
  }
}
