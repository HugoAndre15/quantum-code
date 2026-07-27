import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SimulatorLeadDto } from './dto/simulator-lead.dto';
import { LeadSource } from '@prisma/client';



@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  async submitLead(dto: SimulatorLeadDto) {
    // 1) Calcule le score
    const score = this.calculateScore(dto);

    // 2) Crée le Lead CRM
    const lead = await this.prisma.lead.create({
      data: {
        name: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        budget: dto.estimatedTotal,
        pageCount: dto.pages,
        source: LeadSource.SIMULATOR,
        score,
        notes: dto.message,
        simulatorData: {
          mode: dto.mode,
          trade: dto.trade,
          address: dto.address,
          website: dto.website,
          optionIds: dto.optionIds,
          estimatedTotal: dto.estimatedTotal,
        },
        ...(dto.packId && { packId: dto.packId }),
      },
      include: { pack: { select: { name: true } } },
    });

    // 3) Notification admin
    const adminEmail = this.config.get('MAIL_FROM', 'contact@quantum-code.fr');
    const adminUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/admin/crm/leads`;
    try {
      await this.mail.sendMail({
        to: adminEmail,
        subject: `Nouveau lead simulateur – ${dto.company || dto.contactName}`,
        replyTo: dto.email,
        html: this.buildAdminNotificationEmail(dto, lead, score, adminUrl),
      });
    } catch (err) {
      this.logger.error(`Échec envoi mail simulateur : ${(err as Error).message}`);
    }

    return { message: 'Demande enregistrée avec succès', leadId: lead.id, score };
  }

  private calculateScore(dto: SimulatorLeadDto): number {
    let score = 0;
    const budget = dto.estimatedTotal;
    if (budget !== undefined) {
      if (budget > 1000) score += 30;
      else if (budget >= 700) score += 20;
      else if (budget >= 400) score += 10;
    }
    if (dto.pages !== undefined) {
      if (dto.pages > 10) score += 20;
      else if (dto.pages >= 5) score += 15;
      else if (dto.pages >= 3) score += 10;
      else score += 5;
    }
    score += 15; // source SIMULATOR
    if (dto.phone) score += 5;
    if (dto.company) score += 5;
    return Math.min(score, 100);
  }

  private buildAdminNotificationEmail(
    dto: SimulatorLeadDto,
    lead: { id: string; pack?: { name: string } | null },
    score: number,
    adminUrl: string,
  ): string {
    const scoreLabel =
      score >= 81 ? 'Très chaud 🔥' : score >= 61 ? 'Chaud' : score >= 31 ? 'Tiède' : 'Froid';

    const rows: Array<{ label: string; value: string }> = [
      { label: 'Contact', value: dto.contactName },
      { label: 'Email', value: dto.email },
      ...(dto.company ? [{ label: 'Société', value: dto.company }] : []),
      ...(dto.phone ? [{ label: 'Téléphone', value: dto.phone }] : []),
      ...(dto.trade ? [{ label: 'Secteur', value: dto.trade }] : []),
      ...(dto.address ? [{ label: 'Adresse', value: dto.address }] : []),
      ...(dto.website ? [{ label: 'Site actuel', value: dto.website }] : []),
    ];

    const simRows: Array<{ label: string; value: string }> = [
      { label: 'Mode', value: dto.mode === 'pack' ? 'Pack' : 'Sur mesure' },
      ...(lead.pack ? [{ label: 'Pack choisi', value: lead.pack.name }] : []),
      ...(dto.pages ? [{ label: 'Pages', value: String(dto.pages) }] : []),
      ...(dto.optionIds?.length
        ? [{ label: 'Options', value: `${dto.optionIds.length} sélectionnée(s)` }]
        : []),
      ...(dto.estimatedTotal !== undefined
        ? [{ label: 'Estimation', value: `${dto.estimatedTotal.toFixed(2)} € HT` }]
        : []),
    ];

    const renderTable = (entries: Array<{ label: string; value: string }>) =>
      `<table style="width:100%;border-collapse:collapse;">${entries
        .map(
          (r) =>
            `<tr><td style="padding:6px 12px;font-weight:bold;color:#555;white-space:nowrap;vertical-align:top;">${escapeHtml(r.label)}</td><td style="padding:6px 12px;color:#333;">${escapeHtml(r.value)}</td></tr>`,
        )
        .join('')}</table>`;

    const messageBlock = dto.message
      ? `<div style="background:#f9f9f9;padding:16px;border-radius:6px;border-left:4px solid #2d6fff;margin-top:16px;"><p style="margin:0 0 4px;font-weight:bold;color:#555;">Message</p><p style="margin:0;color:#333;white-space:pre-wrap;">${escapeHtml(dto.message)}</p></div>`
      : '';

    return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
      <div style="background:#282828;padding:24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">Quantum Code</h1>
        <p style="color:#aaa;margin:4px 0 0;font-size:12px;">Nouveau lead issu du simulateur</p>
      </div>
      <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
        <div style="background:#eef5ff;border:1px solid #2d6fff;border-radius:8px;padding:12px 20px;margin-bottom:16px;display:inline-block;">
          <p style="margin:0;font-size:22px;font-weight:bold;color:#2d6fff;">${score}/100 — ${escapeHtml(scoreLabel)}</p>
        </div>
        <p style="margin:0 0 8px;font-weight:bold;color:#555;">Coordonnées</p>
        ${renderTable(rows)}
        <p style="margin:16px 0 8px;font-weight:bold;color:#555;">Projet</p>
        ${renderTable(simRows)}
        ${messageBlock}
        <div style="margin-top:24px;text-align:center;">
          <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#2d6fff;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Voir le lead dans le CRM</a>
        </div>
      </div>
    </div>`;
  }
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
