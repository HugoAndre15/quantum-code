import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SimulatorLeadDto } from './dto/simulator-lead.dto';
import {
  LeadSource,
  ProspectWebsiteStatus,
  ServiceOption,
} from '@prisma/client';
import { ConversionService } from '../conversion/conversion.service';

type PricingSnapshot = {
  packId?: string;
  packName?: string;
  selectedOptionIds: string[];
  oneTimeOptionIds: string[];
  recurringOptionIds: string[];
  optionNames: string[];
  oneTimeTotal: number;
  estimatedMin: number;
  estimatedMax: number;
  recurring: Array<{
    name: string;
    price: number;
    unit: string | null;
  }>;
};

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
    private conversion: ConversionService,
  ) {}

  async submitLead(dto: SimulatorLeadDto) {
    // Le prix affiché côté navigateur reste indicatif. Le budget CRM et le
    // futur devis utilisent toujours les tarifs actifs recalculés côté serveur.
    const pricing = await this.calculatePricing(dto);
    const score = this.calculateScore(dto, pricing.oneTimeTotal);

    const lead = await this.prisma.lead.create({
      data: {
        name: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        trade: dto.trade || dto.sector,
        website: dto.website,
        websiteStatus: dto.website
          ? ProspectWebsiteStatus.INCONNU
          : ProspectWebsiteStatus.ABSENT,
        need: dto.primaryGoal || dto.message,
        budget: pricing.oneTimeTotal,
        delayMonths: this.delayMonths(dto.timeline),
        pageCount: dto.pages,
        source: LeadSource.SIMULATOR,
        score,
        notes: dto.message,
        simulatorData: {
          version: 2,
          mode: 'recommended',
          projectType: dto.projectType,
          sector: dto.sector,
          trade: dto.trade || dto.sector,
          primaryGoal: dto.primaryGoal,
          contentScale: dto.contentScale,
          selectedFeatures: dto.selectedFeatures || [],
          timeline: dto.timeline,
          contentReadiness: dto.contentReadiness,
          supportChoice: dto.supportChoice,
          website: dto.website,
          recommendationName: pricing.packName || dto.recommendationName,
          optionIds: pricing.selectedOptionIds,
          oneTimeOptionIds: pricing.oneTimeOptionIds,
          recurringOptionIds: pricing.recurringOptionIds,
          optionNames: pricing.optionNames,
          pricingSnapshot: {
            oneTimeTotal: pricing.oneTimeTotal,
            estimatedMin: pricing.estimatedMin,
            estimatedMax: pricing.estimatedMax,
            recurring: pricing.recurring,
          },
        },
        ...(pricing.packId && { packId: pricing.packId }),
      },
      include: { pack: { select: { name: true } } },
    });
    await this.conversion.attachLead(dto.sessionId, lead.id);

    const adminEmail = this.config.get(
      'MAIL_ADMIN_TO',
      this.config.get('MAIL_FROM', 'contact@quantum-code.fr'),
    );
    const adminUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/admin/crm/prospects/${lead.id}`;
    try {
      await this.mail.sendMail({
        to: adminEmail,
        subject: `Nouveau prospect simulateur – ${dto.company || dto.contactName}`,
        replyTo: dto.email,
        html: this.buildAdminNotificationEmail(
          dto,
          lead,
          pricing,
          score,
          adminUrl,
        ),
      });
    } catch (err) {
      this.logger.error(
        `Échec envoi mail simulateur : ${(err as Error).message}`,
      );
    }

    return {
      message: 'Demande enregistrée avec succès',
      leadId: lead.id,
      score,
    };
  }

  private async calculatePricing(
    dto: SimulatorLeadDto,
  ): Promise<PricingSnapshot> {
    const selectedIds = [
      ...new Set([...(dto.optionIds || []), ...(dto.recurringOptionIds || [])]),
    ];
    const selectedOptionsPromise: Promise<ServiceOption[]> = selectedIds.length
      ? this.prisma.serviceOption.findMany({
          where: { id: { in: selectedIds }, active: true },
        })
      : Promise.resolve([]);
    const [pack, base, selectedOptions] = await Promise.all([
      dto.packId
        ? this.prisma.pack.findFirst({
            where: { id: dto.packId, active: true },
            include: { includedOptions: true },
          })
        : Promise.resolve(null),
      this.prisma.pricingBase.findFirst({ where: { active: true } }),
      selectedOptionsPromise,
    ]);

    const includedIds = new Set(
      pack?.includedOptions.map((entry) => entry.serviceOptionId) || [],
    );
    const pages = Math.max(
      1,
      dto.pages || pack?.includedPages || base?.basePages || 1,
    );
    const includedPages = pack?.includedPages || base?.basePages || 1;
    const extraPages = Math.max(0, pages - includedPages);
    const oneTimeOptions = selectedOptions.filter(
      (option) => !option.recurring && !includedIds.has(option.id),
    );
    const recurringOptions = selectedOptions.filter(
      (option) => option.recurring && !includedIds.has(option.id),
    );
    const oneTimeTotal =
      (pack?.price || base?.basePrice || 0) +
      extraPages * (base?.pagePrice || 0) +
      oneTimeOptions.reduce((sum, option) => sum + option.price, 0);
    const roundedTotal = Math.round(oneTimeTotal * 100) / 100;

    return {
      packId: pack?.id,
      packName: pack?.name,
      selectedOptionIds: selectedOptions.map((option) => option.id),
      oneTimeOptionIds: oneTimeOptions.map((option) => option.id),
      recurringOptionIds: recurringOptions.map((option) => option.id),
      optionNames: selectedOptions.map((option) => option.name),
      oneTimeTotal: roundedTotal,
      estimatedMin: Math.round((roundedTotal * 0.95) / 50) * 50,
      estimatedMax: Math.round((roundedTotal * 1.12) / 50) * 50,
      recurring: recurringOptions.map((option) => ({
        name: option.name,
        price: option.price,
        unit: option.recurringUnit,
      })),
    };
  }

  private calculateScore(dto: SimulatorLeadDto, budget: number): number {
    let score = 10; // demande ayant terminé le conseiller
    if (budget >= 3000) score += 25;
    else if (budget >= 1800) score += 20;
    else if (budget >= 1000) score += 15;
    else if (budget >= 650) score += 10;

    if (dto.timeline === 'asap') score += 20;
    else if (dto.timeline === '1-2') score += 15;
    else if (dto.timeline === '3-4') score += 8;
    else if (dto.timeline === 'explore') score += 3;

    if (dto.projectType === 'shop' || dto.projectType === 'custom') score += 15;
    else if (dto.projectType === 'booking' || dto.projectType === 'leads')
      score += 10;
    else if (dto.projectType) score += 5;

    if (dto.contentReadiness === 'ready') score += 10;
    else if (dto.contentReadiness === 'partial') score += 7;
    else if (dto.contentReadiness === 'help') score += 4;

    if ((dto.selectedFeatures?.length || 0) >= 3) score += 5;
    if (dto.phone) score += 5;
    if (dto.company) score += 5;
    return Math.min(score, 100);
  }

  private delayMonths(timeline?: string) {
    if (timeline === 'asap') return 0;
    if (timeline === '1-2') return 2;
    if (timeline === '3-4') return 4;
    if (timeline === 'explore') return 6;
    return undefined;
  }

  private buildAdminNotificationEmail(
    dto: SimulatorLeadDto,
    lead: { id: string; pack?: { name: string } | null },
    pricing: PricingSnapshot,
    score: number,
    adminUrl: string,
  ): string {
    const scoreLabel =
      score >= 81
        ? 'Très chaud 🔥'
        : score >= 61
          ? 'Chaud'
          : score >= 31
            ? 'Tiède'
            : 'Froid';

    const rows: Array<{ label: string; value: string }> = [
      { label: 'Contact', value: dto.contactName },
      { label: 'Email', value: dto.email },
      ...(dto.company ? [{ label: 'Société', value: dto.company }] : []),
      ...(dto.phone ? [{ label: 'Téléphone', value: dto.phone }] : []),
      ...(dto.sector || dto.trade
        ? [{ label: 'Secteur', value: dto.trade || dto.sector || '' }]
        : []),
      ...(dto.website ? [{ label: 'Site actuel', value: dto.website }] : []),
    ];

    const simRows: Array<{ label: string; value: string }> = [
      ...(dto.primaryGoal
        ? [{ label: 'Objectif', value: dto.primaryGoal }]
        : []),
      ...(lead.pack
        ? [{ label: 'Recommandation', value: lead.pack.name }]
        : []),
      ...(dto.pages ? [{ label: 'Pages', value: String(dto.pages) }] : []),
      ...(dto.selectedFeatures?.length
        ? [{ label: 'Fonctionnalités', value: dto.selectedFeatures.join(', ') }]
        : []),
      ...(dto.timeline ? [{ label: 'Lancement', value: dto.timeline }] : []),
      ...(dto.contentReadiness
        ? [{ label: 'Contenus', value: dto.contentReadiness }]
        : []),
      ...(dto.supportChoice
        ? [{ label: 'Suivi', value: dto.supportChoice }]
        : []),
      ...(pricing.oneTimeTotal !== undefined
        ? [
            {
              label: 'Estimation',
              value: `${pricing.estimatedMin.toFixed(0)} à ${pricing.estimatedMax.toFixed(0)} € — TVA non applicable`,
            },
          ]
        : []),
      ...(pricing.recurring.length
        ? [
            {
              label: 'Récurrent',
              value: pricing.recurring
                .map(
                  (item) =>
                    `${item.name} : ${item.price.toFixed(0)} €/${item.unit || 'période'}`,
                )
                .join(' · '),
            },
          ]
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
        <p style="color:#aaa;margin:4px 0 0;font-size:12px;">Nouveau prospect issu du simulateur</p>
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
          <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#2d6fff;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Voir le prospect dans le CRM</a>
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
