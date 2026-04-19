import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get('BREVO_API_KEY', '');
    this.senderEmail = this.config.get('MAIL_FROM', 'contact@quantum-code.fr');
    this.senderName = this.config.get('MAIL_FROM_NAME', 'Quantum Code');
  }

  private async brevoSend(payload: Record<string, unknown>): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY not set – email skipped');
      return;
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Brevo API error ${res.status}: ${body}`);
      throw new Error(`Brevo API error ${res.status}: ${body}`);
    }
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<void> {
    const payload: Record<string, unknown> = {
      sender: { name: this.senderName, email: this.senderEmail },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
    };

    if (options.replyTo) {
      payload.replyTo = { email: options.replyTo };
    }

    await this.brevoSend(payload);
  }

  async sendDocument(options: {
    to: string;
    subject: string;
    html: string;
    pdf: Buffer;
    filename: string;
  }): Promise<void> {
    await this.brevoSend({
      sender: { name: this.senderName, email: this.senderEmail },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      attachment: [
        {
          content: options.pdf.toString('base64'),
          name: options.filename,
        },
      ],
    });
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
