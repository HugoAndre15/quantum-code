import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailLineItem {
  label: string;
  quantity: number;
  unitPrice: number;
  recurring: boolean;
  recurringUnit?: string | null;
}

interface QuoteEmailData {
  number: string;
  contactName: string;
  company: string;
  total: number;
  validUntil?: Date | null;
  discountAmount?: number;
  promoCode?: string | null;
  items: MailLineItem[];
  acceptUrl?: string;
}

interface DocumentEmailData {
  number: string;
  contactName: string;
  company: string;
  total: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentUrl?: string;
}

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
      this.logger.error('BREVO_API_KEY not set – email not sent');
      throw new Error("Le service d'email n'est pas configuré");
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
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
    replyTo?: string;
  }): Promise<void> {
    const payload: Record<string, unknown> = {
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
    };

    if (options.replyTo) {
      payload.replyTo = { email: options.replyTo };
    }

    await this.brevoSend(payload);
  }

  buildDevisEmail(data: QuoteEmailData): string {
    const firstName = getFirstName(data.contactName);
    const subscriptions = summarizeSubscriptions(data.items);
    const hasAcceptance = Boolean(data.acceptUrl);
    const validUntil = data.validUntil
      ? formatDate(data.validUntil)
      : '30 jours après son émission';

    const discount =
      data.discountAmount && data.discountAmount > 0
        ? `<tr>
            <td style="padding:0 0 8px;color:#667085;font-size:13px;">Remise${data.promoCode ? ` · ${escapeHtml(data.promoCode)}` : ''}</td>
            <td style="padding:0 0 8px;color:#16845b;font-size:13px;font-weight:700;text-align:right;">− ${formatMoney(data.discountAmount)}</td>
          </tr>`
        : '';

    const subscriptionsBlock = subscriptions.length
      ? `<div style="margin-top:16px;padding:18px 20px;background:#f6f7fa;border:1px solid #dfe3ea;border-radius:10px;">
          <p style="margin:0 0 10px;color:#315cca;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Accompagnement optionnel</p>
          ${subscriptions
            .map(
              (subscription) =>
                `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:4px 0;color:#344054;font-size:13px;">${escapeHtml(subscription.label)}</td>
                    <td style="padding:4px 0;color:#315cca;font-size:13px;font-weight:800;text-align:right;">${formatMoney(subscription.amount)} / ${escapeHtml(subscription.unit)}</td>
                  </tr>
                </table>`,
            )
            .join('')}
          <p style="margin:10px 0 0;color:#667085;font-size:11px;line-height:1.55;">Ces prestations sont présentées séparément du coût de création du site.</p>
        </div>`
      : '';

    return this.emailLayout({
      preheader: hasAcceptance
        ? `Votre devis ${data.number} est prêt à être consulté et accepté.`
        : `Votre devis ${data.number} est joint à cet email.`,
      eyebrow: hasAcceptance ? 'Votre proposition est prête' : 'Votre devis',
      title: hasAcceptance
        ? `${firstName}, construisons la suite.`
        : `${firstName}, voici votre proposition.`,
      intro: hasAcceptance
        ? `J’ai préparé une proposition claire pour <strong>${escapeHtml(data.company)}</strong>, à partir du périmètre défini ensemble. Prenez le temps de la parcourir : chaque prestation et chaque coût y sont détaillés.`
        : `Vous trouverez en pièce jointe la proposition préparée pour <strong>${escapeHtml(data.company)}</strong>. Elle reprend le périmètre, les prestations et les conditions du projet.`,
      body: `
        <div style="margin:26px 0;padding:22px;background:#f7f8fa;border:1px solid #dfe3ea;border-radius:10px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 8px;color:#667085;font-size:13px;">Devis</td>
              <td style="padding:0 0 8px;color:#101828;font-size:13px;font-weight:800;text-align:right;">${escapeHtml(data.number)}</td>
            </tr>
            ${discount}
            <tr>
              <td style="padding:10px 0 0;border-top:1px solid #e4e7ec;color:#101828;font-size:14px;font-weight:700;">Montant ponctuel</td>
              <td style="padding:10px 0 0;border-top:1px solid #e4e7ec;color:#2d6fff;font-size:22px;font-weight:800;text-align:right;">${formatMoney(data.total)}</td>
            </tr>
          </table>
          <p style="margin:8px 0 0;color:#98a2b3;font-size:10px;text-align:right;">Prix final · TVA non applicable, art. 293 B du CGI</p>
        </div>
        ${subscriptionsBlock}
        ${
          hasAcceptance
            ? this.emailButton(
                data.acceptUrl!,
                'Consulter et accepter le devis',
              )
            : ''
        }
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eaecf0;">
          <p style="margin:0 0 8px;color:#344054;font-size:13px;line-height:1.65;"><strong>Validité :</strong> ${escapeHtml(validUntil)}</p>
          <p style="margin:0;color:#667085;font-size:13px;line-height:1.65;">Le PDF complet est joint à cet email. Une question ou un ajustement ? Répondez simplement à ce message, je vous répondrai personnellement.</p>
        </div>
      `,
      signature:
        'Hugo André<br><span style="color:#667085;font-weight:400;">Quantum Code · Création de sites web</span>',
    });
  }

  buildFactureEmail(data: DocumentEmailData): string {
    const firstName = getFirstName(data.contactName);
    const paidAmount = data.paidAmount || 0;
    const remainingAmount =
      data.remainingAmount === undefined
        ? Math.max(0, data.total - paidAmount)
        : data.remainingAmount;
    const paymentRows = paidAmount > 0
      ? `<tr>
          <td style="padding:0 0 8px;color:#667085;font-size:13px;">Déjà réglé</td>
          <td style="padding:0 0 8px;color:#16845b;font-size:13px;font-weight:700;text-align:right;">${formatMoney(paidAmount)}</td>
        </tr>`
      : '';
    const paymentButton =
      data.paymentUrl && remainingAmount > 0
        ? `${this.emailButton(data.paymentUrl, `Payer ${formatMoney(remainingAmount)} en ligne`)}
          <p style="margin:12px 0 0;color:#98a2b3;font-size:10px;line-height:1.6;text-align:center;">Paiement sécurisé par Stripe. Le règlement par virement reste également possible.</p>`
        : '';

    return this.emailLayout({
      preheader:
        remainingAmount > 0
          ? `Votre facture ${data.number} est prête à être réglée.`
          : `Le paiement de la facture ${data.number} est enregistré.`,
      eyebrow:
        remainingAmount > 0 ? 'Document de facturation' : 'Facture réglée',
      title:
        remainingAmount > 0
          ? `${firstName}, votre facture est prête.`
          : `${firstName}, cette facture est réglée.`,
      intro: `Vous trouverez en pièce jointe la facture <strong>${escapeHtml(data.number)}</strong> établie pour <strong>${escapeHtml(data.company)}</strong>.`,
      body: `
        <div style="margin:26px 0;padding:22px;background:#f7f8fa;border:1px solid #dfe3ea;border-radius:10px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 8px;color:#667085;font-size:13px;">Montant de la facture</td>
              <td style="padding:0 0 8px;color:#101828;font-size:13px;font-weight:700;text-align:right;">${formatMoney(data.total)}</td>
            </tr>
            ${paymentRows}
            <tr>
              <td style="padding:10px 0 0;border-top:1px solid #e4e7ec;color:#101828;font-size:14px;font-weight:700;">${remainingAmount > 0 ? 'Reste à payer' : 'Statut'}</td>
              <td style="padding:10px 0 0;border-top:1px solid #e4e7ec;color:${remainingAmount > 0 ? '#2d6fff' : '#16845b'};font-size:22px;font-weight:800;text-align:right;">${remainingAmount > 0 ? formatMoney(remainingAmount) : 'Payée'}</td>
            </tr>
          </table>
          <p style="margin:8px 0 0;color:#98a2b3;font-size:10px;text-align:right;">Prix final · TVA non applicable, art. 293 B du CGI</p>
        </div>
        ${paymentButton}
        <p style="margin:22px 0 0;color:#667085;font-size:13px;line-height:1.7;">Le PDF complet est joint à cet email. Une question sur cette facture ? Répondez directement à ce message, je vous répondrai personnellement.</p>
      `,
      signature:
        'Hugo André<br><span style="color:#667085;font-weight:400;">Quantum Code</span>',
    });
  }

  buildPaymentReceivedClientEmail(data: {
    number: string;
    contactName: string;
    company: string;
    amount: number;
    paidAmount: number;
    remainingAmount: number;
  }): string {
    const firstName = getFirstName(data.contactName);
    return this.emailLayout({
      preheader: `Votre paiement de ${formatMoney(data.amount)} a bien été reçu.`,
      eyebrow: 'Paiement confirmé',
      title: `Merci ${firstName}, le paiement est enregistré.`,
      intro: `Le règlement par carte de la facture <strong>${escapeHtml(data.number)}</strong> pour <strong>${escapeHtml(data.company)}</strong> a bien été confirmé par Stripe.`,
      body: `
        <div style="margin:26px 0;padding:22px;background:#f1f8f5;border:1px solid #c9e2d7;border-radius:10px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr><td style="padding:0 0 8px;color:#175c45;font-size:13px;">Paiement reçu</td><td style="padding:0 0 8px;color:#16845b;font-size:20px;font-weight:800;text-align:right;">${formatMoney(data.amount)}</td></tr>
            <tr><td style="padding:10px 0 0;border-top:1px solid #c9e2d7;color:#527566;font-size:12px;">Reste à payer</td><td style="padding:10px 0 0;border-top:1px solid #c9e2d7;color:#175c45;font-size:13px;font-weight:700;text-align:right;">${formatMoney(data.remainingAmount)}</td></tr>
          </table>
        </div>
        <p style="margin:0;color:#667085;font-size:13px;line-height:1.7;">Vous pouvez conserver cet email comme confirmation. Je reste disponible si vous avez la moindre question.</p>
      `,
      signature:
        'Hugo André<br><span style="color:#667085;font-weight:400;">Quantum Code</span>',
    });
  }

  buildPaymentReceivedAdminEmail(data: {
    number: string;
    contactName: string;
    company: string;
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    adminUrl: string;
  }): string {
    return this.emailLayout({
      preheader: `${data.company} vient de régler ${formatMoney(data.amount)} par carte.`,
      eyebrow: 'Paiement Stripe reçu',
      title: `${escapeHtml(data.company)} a effectué un paiement.`,
      intro: `<strong>${escapeHtml(data.contactName)}</strong> vient de régler la facture <strong>${escapeHtml(data.number)}</strong>.`,
      body: `
        <div style="margin:26px 0;padding:22px;background:#f1f8f5;border:1px solid #c9e2d7;border-radius:10px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr><td style="padding:0 0 8px;color:#175c45;font-size:13px;">Reçu maintenant</td><td style="padding:0 0 8px;color:#16845b;font-size:20px;font-weight:800;text-align:right;">${formatMoney(data.amount)}</td></tr>
            <tr><td style="padding:10px 0 0;border-top:1px solid #c9e2d7;color:#527566;font-size:12px;">Reste à payer</td><td style="padding:10px 0 0;border-top:1px solid #c9e2d7;color:#175c45;font-size:13px;font-weight:700;text-align:right;">${formatMoney(data.remainingAmount)}</td></tr>
          </table>
        </div>
        ${this.emailButton(data.adminUrl, 'Ouvrir la facture dans le CRM')}
      `,
      signature: 'Notification automatique Quantum Code',
    });
  }

  buildQuoteAcceptedClientEmail(data: {
    number: string;
    contactName: string;
    company: string;
    total: number;
    subscriptions: MailLineItem[];
  }): string {
    const firstName = getFirstName(data.contactName);
    const subscriptions = summarizeSubscriptions(data.subscriptions);
    return this.emailLayout({
      preheader: `L’acceptation du devis ${data.number} a bien été enregistrée.`,
      eyebrow: 'Accord bien reçu',
      title: `Merci ${firstName}, le projet peut démarrer.`,
      intro: `L’acceptation du devis <strong>${escapeHtml(data.number)}</strong> pour <strong>${escapeHtml(data.company)}</strong> a bien été enregistrée.`,
      body: `
        <div style="margin:26px 0;padding:22px;background:#f1f8f5;border:1px solid #c9e2d7;border-radius:10px;">
          <p style="margin:0 0 6px;color:#16845b;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Prochaine étape</p>
          <p style="margin:0;color:#175c45;font-size:14px;line-height:1.7;">Je vous recontacte pour confirmer le planning, organiser le lancement et préparer l’acompte prévu au devis.</p>
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:22px;border-collapse:collapse;">
          <tr>
            <td style="padding:5px 0;color:#667085;font-size:13px;">Montant ponctuel accepté</td>
            <td style="padding:5px 0;color:#101828;font-size:15px;font-weight:800;text-align:right;">${formatMoney(data.total)}</td>
          </tr>
          ${subscriptions
            .map(
              (subscription) =>
                `<tr>
                  <td style="padding:5px 0;color:#667085;font-size:13px;">${escapeHtml(subscription.label)}</td>
                  <td style="padding:5px 0;color:#315cca;font-size:13px;font-weight:800;text-align:right;">${formatMoney(subscription.amount)} / ${escapeHtml(subscription.unit)}</td>
                </tr>`,
            )
            .join('')}
        </table>
        <p style="margin:0;color:#667085;font-size:13px;line-height:1.7;">Vous n’avez rien d’autre à faire pour le moment. Vous pouvez conserver cet email comme confirmation de votre accord.</p>
      `,
      signature:
        'Hugo André<br><span style="color:#667085;font-weight:400;">Quantum Code</span>',
    });
  }

  buildQuoteAcceptedAdminEmail(data: {
    number: string;
    contactName: string;
    company: string;
    total: number;
    adminUrl: string;
  }): string {
    return this.emailLayout({
      preheader: `${data.company} vient d’accepter le devis ${data.number}.`,
      eyebrow: 'Devis accepté',
      title: `${escapeHtml(data.company)} a donné son accord.`,
      intro: `<strong>${escapeHtml(data.contactName)}</strong> vient d’accepter le devis <strong>${escapeHtml(data.number)}</strong>.`,
      body: `
        <div style="margin:26px 0;padding:22px;background:#f1f8f5;border:1px solid #c9e2d7;border-radius:10px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="color:#175c45;font-size:13px;">Montant ponctuel</td>
              <td style="color:#16845b;font-size:20px;font-weight:800;text-align:right;">${formatMoney(data.total)}</td>
            </tr>
          </table>
        </div>
        ${this.emailButton(data.adminUrl, 'Ouvrir le devis dans le CRM')}
        <p style="margin:22px 0 0;color:#667085;font-size:12px;line-height:1.65;">Une tâche de finalisation a été créée automatiquement pour préparer le projet et l’acompte.</p>
      `,
      signature: 'Notification automatique Quantum Code',
    });
  }

  private emailLayout(data: {
    preheader: string;
    eyebrow: string;
    title: string;
    intro: string;
    body: string;
    signature: string;
  }): string {
    return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(data.eyebrow)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f2f3f5;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(data.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f3f5;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:30px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;border:1px solid #dfe3ea;border-collapse:separate;background:#ffffff;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:22px 30px;background:#181b21;border-bottom:2px solid #2d6fff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td>
                      <span style="display:inline-block;padding:7px 9px;border:1px solid #4d5d7d;border-radius:6px;color:#9bb8f3;font-size:15px;font-weight:900;">Q</span>
                      <span style="margin-left:9px;color:#fff;font-size:16px;font-weight:800;">Quantum <span style="color:#9bb8f3;">Code</span></span>
                    </td>
                    <td style="color:#98a2b3;font-size:10px;letter-spacing:.08em;text-align:right;text-transform:uppercase;">Web · Design · Conseil</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 34px 34px;">
                <p style="margin:0 0 10px;color:#2d6fff;font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;">${escapeHtml(data.eyebrow)}</p>
                <h1 style="margin:0 0 16px;color:#101828;font-size:28px;line-height:1.15;letter-spacing:-.02em;">${data.title}</h1>
                <p style="margin:0;color:#475467;font-size:14px;line-height:1.75;">${data.intro}</p>
                ${data.body}
                <p style="margin:28px 0 0;color:#101828;font-size:13px;font-weight:700;line-height:1.6;">${data.signature}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px;background:#f8fafc;border-top:1px solid #eaecf0;color:#98a2b3;font-size:10px;line-height:1.6;text-align:center;">
                Quantum Code · Oise, Hauts-de-France · contact@quantum-code.fr<br>
                Vous recevez cet email dans le cadre d’une demande ou d’un projet en cours.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private emailButton(url: string, label: string): string {
    return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px auto 0;border-collapse:separate;">
      <tr>
        <td style="background:#2d6fff;border-radius:7px;text-align:center;">
          <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 24px;color:#fff;font-size:13px;font-weight:800;text-decoration:none;">${escapeHtml(label)} →</a>
        </td>
      </tr>
    </table>`;
  }
}

function summarizeSubscriptions(items: MailLineItem[]) {
  const subscriptions = new Map<
    string,
    { label: string; amount: number; unit: string }
  >();
  for (const item of items.filter((entry) => entry.recurring)) {
    const unit = item.recurringUnit || 'mois';
    const key = `${item.label}:${unit}`;
    subscriptions.set(key, {
      label:
        item.quantity > 1 ? `${item.label} × ${item.quantity}` : item.label,
      amount: item.quantity * item.unitPrice,
      unit,
    });
  }
  return [...subscriptions.values()];
}

function getFirstName(contactName: string): string {
  return escapeHtml(contactName.trim().split(/\s+/)[0] || 'bonjour');
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
