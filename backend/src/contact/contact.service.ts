import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { ContactDto } from './dto/contact.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionService } from '../conversion/conversion.service';
import { LeadSource, LeadStatus, ProspectWebsiteStatus } from '@prisma/client';
import { calculateLeadScore } from '../crm/leads/lead-scoring';

@Injectable()
export class ContactService {
  constructor(
    private mail: MailService,
    private config: ConfigService,
    private prisma: PrismaService,
    private conversion: ConversionService,
  ) {}

  async sendContactEmail(dto: ContactDto): Promise<void> {
    const to = this.config.get(
      'MAIL_ADMIN_TO',
      this.config.get('MAIL_FROM', 'contact@quantum-code.fr'),
    );

    const html = this.buildContactHtml(dto);

    await this.mail.sendMail({
      to,
      subject: `Nouveau message de ${dto.name}`,
      html,
      replyTo: dto.email,
    });

    const leadData = {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      company: dto.company,
      source: LeadSource.CONTACT,
      status: LeadStatus.NOUVEAU,
      websiteStatus: ProspectWebsiteStatus.INCONNU,
      need: dto.message,
      notes: dto.message,
    };
    const lead = await this.prisma.lead.create({
      data: {
        ...leadData,
        score: calculateLeadScore(leadData).total,
      },
    });
    await this.conversion.attachLead(dto.sessionId, lead.id);
  }

  private buildContactHtml(dto: ContactDto): string {
    const rows = [
      { label: 'Nom / Prénom', value: dto.name },
      { label: 'Email', value: dto.email },
      ...(dto.phone ? [{ label: 'Téléphone', value: dto.phone }] : []),
      ...(dto.company ? [{ label: 'Société', value: dto.company }] : []),
    ];

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #282828; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">Quantum Code</h1>
          <p style="color: #aaa; margin: 4px 0 0; font-size: 12px;">Nouveau message depuis le formulaire de contact</p>
        </div>
        <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            ${rows
              .map(
                (r) => `
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #555; white-space: nowrap; vertical-align: top;">${escapeHtml(r.label)}</td>
                <td style="padding: 8px 12px; color: #333;">${escapeHtml(r.value)}</td>
              </tr>`,
              )
              .join('')}
          </table>
          <div style="background: #f9f9f9; padding: 16px; border-radius: 6px; border-left: 4px solid #2d6fff;">
            <p style="margin: 0 0 4px; font-weight: bold; color: #555;">Message</p>
            <p style="margin: 0; color: #333; white-space: pre-wrap;">${escapeHtml(dto.message)}</p>
          </div>
        </div>
      </div>
    `;
  }
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
