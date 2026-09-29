import { Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { AppConfig } from '../../../../shared/config/env';
import { OperatorNotifierPort } from '../../domain/ports/operator-notifier.port';

/** Envía la invitación por correo real vía SMTP (p. ej. Gmail con contraseña de aplicación). */
export class SmtpOperatorNotifier implements OperatorNotifierPort {
  private readonly log = new Logger('Notifier');
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(cfg: AppConfig) {
    this.from = cfg.SMTP_FROM ?? cfg.SMTP_USER ?? 'no-reply@scei-platform.local';
    this.transport = createTransport({
      host: cfg.SMTP_HOST,
      port: cfg.SMTP_PORT,
      secure: cfg.SMTP_SECURE,
      auth: cfg.SMTP_USER ? { user: cfg.SMTP_USER, pass: cfg.SMTP_PASS } : undefined,
    });
  }

  async sendOperatorInvitation(input: { to: string; roleName: string; scopeLabel: string; acceptUrl: string; expiresAt: Date }): Promise<void> {
    const vence = input.expiresAt.toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
    await this.transport.sendMail({
      from: this.from,
      to: input.to,
      subject: `Invitación · ${input.roleName} · SCEI Plataforma`,
      text: `Te invitaron como "${input.roleName}" (${input.scopeLabel}) en SCEI Plataforma.\n\nAcepta la invitación aquí:\n${input.acceptUrl}\n\nEste enlace vence el ${vence} y solo puede usarse una vez.`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
          <h2 style="margin-bottom:4px">SCEI Plataforma</h2>
          <p>Te invitaron como <b>${escapeHtml(input.roleName)}</b> (${escapeHtml(input.scopeLabel)}).</p>
          <p style="margin:24px 0">
            <a href="${input.acceptUrl}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Aceptar invitación</a>
          </p>
          <p style="color:#71717a;font-size:13px">Este enlace vence el ${vence} y solo puede usarse una vez. Si no esperabas este correo, ignóralo.</p>
        </div>`,
    });
    this.log.log(`Invitación de operador enviada a ${input.to.replace(/^(.).*(@.*)$/, '$1***$2')} (${input.roleName} · ${input.scopeLabel}), vence ${input.expiresAt.toISOString()}`);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}
