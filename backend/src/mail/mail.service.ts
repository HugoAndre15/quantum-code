import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'smtp.zoho.eu'),
      port: parseInt(this.config.get('SMTP_PORT', '587')),
      secure: this.config.get('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.config.get('SMTP_USER', 'contact@quantum-code.fr'),
        pass: this.config.get('SMTP_PASS', ''),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<void> {
    const from = this.config.get('SMTP_FROM', 'contact@quantum-code.fr');

    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.replyTo && { replyTo: options.replyTo }),
      });
    } catch (err) {
      this.logger.error('Failed to send email', err instanceof Error ? err.stack : String(err));
      throw new ServiceUnavailableException('Le service d\'envoi d\'email est temporairement indisponible. Veuillez réessayer plus tard.');
    }
  }

  async sendDocument(options: {
    to: string;
    subject: string;
    html: string;
    pdf: Buffer;
    filename: string;
  }): Promise<void> {
    const from = this.config.get('SMTP_FROM', 'contact@quantum-code.fr');

    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: [
          {
            filename: options.filename,
            content: options.pdf,
            contentType: 'application/pdf',
          },
        ],
      });
    } catch (err) {
      this.logger.error('Failed to send document email', err instanceof Error ? err.stack : String(err));
      throw new ServiceUnavailableException('Le service d\'envoi d\'email est temporairement indisponible. Veuillez réessayer plus tard.');
    }
  }

  buildDevisEmail(data: { number: string; company: string; total: number }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #282828; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">Quantum Code</h1>
          <p style="color: #aaa; margin: 4px 0 0; font-size: 12px;">Développement Web & Applications</p>
        </div>
        <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #333;">Bonjour,</p>
          <p style="color: #333;">Veuillez trouver ci-joint votre devis <strong>${data.number}</strong> pour un montant de <strong>${data.total.toFixed(2)}€ HT</strong>.</p>
          <p style="color: #333;">N'hésitez pas à revenir vers nous pour toute question.</p>
          <p style="color: #333; margin-top: 24px;">Cordialement,<br/><strong>Quantum Code</strong></p>
        </div>
      </div>
    `;
  }

  buildFactureEmail(data: { number: string; company: string; total: number }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #282828; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">Quantum Code</h1>
          <p style="color: #aaa; margin: 4px 0 0; font-size: 12px;">Développement Web & Applications</p>
        </div>
        <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #333;">Bonjour,</p>
          <p style="color: #333;">Veuillez trouver ci-joint votre facture <strong>${data.number}</strong> pour un montant de <strong>${data.total.toFixed(2)}€ HT</strong>.</p>
          <p style="color: #333;">Nous vous remercions pour votre confiance.</p>
          <p style="color: #333; margin-top: 24px;">Cordialement,<br/><strong>Quantum Code</strong></p>
        </div>
      </div>
    `;
  }
}
