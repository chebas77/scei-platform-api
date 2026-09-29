/** Envío de correos transaccionales. Hoy: consola; después: SES/SendGrid sin tocar los casos de uso. */
export interface OperatorNotifierPort {
  sendOperatorInvitation(input: { to: string; roleName: string; scopeLabel: string; acceptUrl: string; expiresAt: Date }): Promise<void>;
}
export const OPERATOR_NOTIFIER = Symbol('OPERATOR_NOTIFIER');
