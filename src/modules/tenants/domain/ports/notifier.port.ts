/** Envío de correos transaccionales. Hoy: consola; después: SES/SendGrid sin tocar los casos de uso. */
export interface NotifierPort {
  sendTenantInvitation(input: { to: string; legalName: string; acceptUrl: string; expiresAt: Date }): Promise<void>;
}
export const NOTIFIER = Symbol('NOTIFIER');
