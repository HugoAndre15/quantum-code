import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  LeadSource,
  LeadStatus,
  Prisma,
  ProspectWebsiteStatus,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConvertLeadDto,
  CreateLeadDto,
  ImportLeadsDto,
  UpdateLeadDto,
} from './dto/lead.dto';
import {
  calculateLeadScore,
  getScoreLabel,
  LeadScoreInput,
} from './lead-scoring';
import { isEmail } from 'class-validator';

const CONTACTED_STATUSES = new Set<LeadStatus>([
  LeadStatus.CONTACTE,
  LeadStatus.REPONSE_RECUE,
  LeadStatus.RENDEZ_VOUS,
  LeadStatus.DEVIS_ENVOYE,
  LeadStatus.GAGNE,
  LeadStatus.CONVERTI,
  LeadStatus.PERDU,
]);

const STATUS_LABELS: Record<LeadStatus, string> = {
  NOUVEAU: 'À qualifier',
  A_CONTACTER: 'À contacter',
  CONTACTE: 'Contacté',
  QUALIFIE: 'À contacter',
  REPONSE_RECUE: 'Réponse reçue',
  RENDEZ_VOUS: 'Rendez-vous',
  DEVIS_ENVOYE: 'Devis envoyé',
  GAGNE: 'Gagné',
  CONVERTI: 'Gagné',
  PERDU: 'Perdu',
};

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  calculateScore(data: LeadScoreInput): number {
    return calculateLeadScore(data).total;
  }

  getScoreLabel(score: number): string {
    return getScoreLabel(score);
  }

  private withScore<T extends LeadScoreInput>(lead: T) {
    const score = calculateLeadScore(lead);
    return {
      ...lead,
      score: score.total,
      scoreLabel: score.label,
      scoreBreakdown: score.parts,
    };
  }

  async findAll() {
    const leads = await this.prisma.lead.findMany({
      include: {
        pack: { select: { id: true, name: true } },
        convertedClient: { select: { id: true, company: true } },
        tasks: {
          where: { status: TaskStatus.A_FAIRE },
          orderBy: { dueAt: 'asc' },
          take: 1,
          select: { id: true, title: true, dueAt: true, priority: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return leads
      .map((lead) => this.withScore(lead))
      .sort(
        (a, b) =>
          b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime(),
      );
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        pack: true,
        convertedClient: {
          include: {
            devis: {
              select: { id: true, number: true, status: true, totalHT: true },
            },
            projects: true,
          },
        },
        devis: {
          select: { id: true, number: true, status: true, totalHT: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!lead) throw new NotFoundException('Prospect introuvable');
    return this.withScore(lead);
  }

  async create(dto: CreateLeadDto) {
    const data = this.prepareCreateData(dto, LeadSource.MANUEL);
    const lead = await this.prisma.lead.create({ data });
    await this.prisma.crmActivity.create({
      data: {
        type: ActivityType.CREATION,
        title: 'Prospect créé',
        description: lead.company || lead.name,
        leadId: lead.id,
      },
    });
    return this.withScore(lead);
  }

  async importCsv(dto: ImportLeadsDto) {
    const existing = await this.prisma.lead.findMany({
      select: { id: true, email: true, phone: true, website: true },
    });
    const seen = new Set(existing.flatMap((lead) => this.duplicateKeys(lead)));
    const prepared: Prisma.LeadUncheckedCreateInput[] = [];
    const skipped: Array<{ row: number; reason: string }> = [];

    dto.rows.forEach((row, index) => {
      try {
        const data = this.prepareCreateData(
          {
            ...row,
            campaign: row.campaign || dto.campaign,
            source: LeadSource.IMPORT_CSV,
          },
          LeadSource.IMPORT_CSV,
        );
        const keys = this.duplicateKeys(data);
        const duplicate = keys.some((key) => seen.has(key));
        if (duplicate) {
          skipped.push({ row: index + 2, reason: 'Doublon détecté' });
          return;
        }
        keys.forEach((key) => seen.add(key));
        prepared.push(data);
      } catch (error) {
        skipped.push({
          row: index + 2,
          reason:
            error instanceof BadRequestException
              ? String(error.message)
              : 'Données invalides',
        });
      }
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const imported: Prisma.LeadGetPayload<Record<string, never>>[] = [];
      for (const data of prepared) {
        const lead = await tx.lead.create({ data });
        await tx.crmActivity.create({
          data: {
            type: ActivityType.CREATION,
            title: 'Prospect importé par CSV',
            description: lead.campaign || lead.company || lead.name,
            leadId: lead.id,
          },
        });
        imported.push(lead);
      }
      return imported;
    });

    return {
      total: dto.rows.length,
      created: created.length,
      skipped: skipped.length,
      skippedRows: skipped.slice(0, 50),
      prospects: created.map((lead) => this.withScore(lead)),
    };
  }

  async update(id: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prospect introuvable');

    const normalized = this.normalizeUpdateData(dto);
    const merged = { ...existing, ...normalized } as LeadScoreInput;
    const contactDetailsChanged =
      dto.email !== undefined ||
      dto.phone !== undefined ||
      dto.website !== undefined;
    if (contactDetailsChanged) this.assertContactable(merged);
    const score = this.calculateScore(merged);
    const statusChanged = Boolean(dto.status && dto.status !== existing.status);
    const lastContactAt =
      statusChanged && dto.status && CONTACTED_STATUSES.has(dto.status)
        ? new Date()
        : undefined;

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        ...normalized,
        score,
        ...(lastContactAt && { lastContactAt }),
        ...(dto.status && dto.status !== LeadStatus.PERDU
          ? { lostReason: null }
          : {}),
      },
    });

    if (statusChanged) {
      await this.prisma.crmActivity.create({
        data: {
          type: ActivityType.STATUT,
          title: `Prospect : ${STATUS_LABELS[existing.status]} → ${STATUS_LABELS[updated.status]}`,
          description:
            updated.status === LeadStatus.PERDU
              ? updated.lostReason || undefined
              : undefined,
          leadId: id,
          clientId: updated.convertedClientId,
        },
      });
    }
    return this.withScore(updated);
  }

  async remove(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Prospect introuvable');
    if (lead.convertedClientId) {
      throw new BadRequestException(
        'Impossible de supprimer un prospect lié à une fiche client',
      );
    }
    await this.prisma.lead.delete({ where: { id } });
    return { message: 'Prospect supprimé' };
  }

  /** Lie le prospect à la fiche Client nécessaire aux devis, sans le marquer gagné. */
  async convert(id: string, dto: ConvertLeadDto = {}) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Prospect introuvable');
    if (lead.convertedClientId) {
      return {
        clientId: lead.convertedClientId,
        reused: true,
        lead: this.withScore(lead),
      };
    }
    if (lead.status === LeadStatus.PERDU) {
      throw new BadRequestException(
        'Impossible de convertir un prospect perdu',
      );
    }

    const simulatorData =
      lead.simulatorData && typeof lead.simulatorData === 'object'
        ? (lead.simulatorData as Record<string, unknown>)
        : {};

    return this.prisma.$transaction(async (tx) => {
      const contactFilters: Prisma.ClientWhereInput[] = [];
      if (lead.email) {
        contactFilters.push({
          email: { equals: lead.email, mode: 'insensitive' },
        });
      }
      if (lead.phone) contactFilters.push({ phone: lead.phone });

      const existingClient = dto.clientId
        ? await tx.client.findUnique({ where: { id: dto.clientId } })
        : contactFilters.length
          ? await tx.client.findFirst({
              where: { OR: contactFilters },
              orderBy: { createdAt: 'desc' },
            })
          : null;

      const client =
        existingClient ||
        (await tx.client.create({
          data: {
            company: lead.company || lead.name,
            trade:
              dto.trade ||
              lead.trade ||
              (typeof simulatorData.trade === 'string'
                ? simulatorData.trade
                : 'À préciser'),
            contactName: lead.name,
            email: lead.email,
            phone: lead.phone,
            address:
              typeof simulatorData.address === 'string'
                ? simulatorData.address
                : lead.city,
            website:
              lead.website ||
              (typeof simulatorData.website === 'string'
                ? simulatorData.website
                : undefined),
            status: 'CONTACTE',
            budget: lead.budget,
            contactDate: new Date(),
            notes: lead.notes ?? undefined,
            ...(lead.packId && { packId: lead.packId }),
          },
        }));

      const updatedLead = await tx.lead.update({
        where: { id },
        data: { convertedClientId: client.id },
      });

      await tx.crmActivity.create({
        data: {
          type: ActivityType.CONVERSION,
          title: existingClient
            ? 'Prospect rattaché à une fiche client existante'
            : 'Fiche client créée depuis le prospect',
          description: client.company,
          leadId: id,
          clientId: client.id,
        },
      });

      return {
        clientId: client.id,
        reused: Boolean(existingClient),
        lead: this.withScore(updatedLead),
      };
    });
  }

  private prepareCreateData(
    dto: CreateLeadDto,
    fallbackSource: LeadSource,
  ): Prisma.LeadUncheckedCreateInput {
    const name = this.clean(dto.name) || this.clean(dto.company);
    const company = this.clean(dto.company);
    const email = this.clean(dto.email)?.toLowerCase();
    const phone = this.clean(dto.phone);
    const website = this.clean(dto.website);
    if (!name) {
      throw new BadRequestException(
        'Un nom de contact ou une entreprise est nécessaire',
      );
    }
    if (email && !isEmail(email)) {
      throw new BadRequestException("L'adresse email n'est pas valide");
    }
    const prepared: Prisma.LeadUncheckedCreateInput = {
      name,
      email,
      phone,
      company,
      trade: this.clean(dto.trade),
      city: this.clean(dto.city),
      website,
      websiteStatus:
        dto.websiteStatus ||
        (website
          ? ProspectWebsiteStatus.INCONNU
          : ProspectWebsiteStatus.ABSENT),
      need: this.clean(dto.need),
      campaign: this.clean(dto.campaign),
      budget: dto.budget,
      delayMonths: dto.delayMonths,
      pageCount: dto.pageCount,
      source: dto.source || fallbackSource,
      status: dto.status || LeadStatus.NOUVEAU,
      notes: this.clean(dto.notes),
      packId: this.clean(dto.packId),
      score: 0,
    };
    this.assertContactable(prepared);
    prepared.score = this.calculateScore(prepared);
    return prepared;
  }

  private normalizeUpdateData(dto: UpdateLeadDto) {
    return {
      ...dto,
      ...(dto.name !== undefined && { name: this.clean(dto.name) }),
      ...(dto.email !== undefined && {
        email: this.clean(dto.email)?.toLowerCase() || null,
      }),
      ...(dto.phone !== undefined && { phone: this.clean(dto.phone) || null }),
      ...(dto.company !== undefined && {
        company: this.clean(dto.company) || null,
      }),
      ...(dto.trade !== undefined && { trade: this.clean(dto.trade) || null }),
      ...(dto.city !== undefined && { city: this.clean(dto.city) || null }),
      ...(dto.website !== undefined && {
        website: this.clean(dto.website) || null,
      }),
      ...(dto.need !== undefined && { need: this.clean(dto.need) || null }),
      ...(dto.campaign !== undefined && {
        campaign: this.clean(dto.campaign) || null,
      }),
      ...(dto.notes !== undefined && { notes: this.clean(dto.notes) || null }),
      ...(dto.lostReason !== undefined && {
        lostReason: this.clean(dto.lostReason) || null,
      }),
    };
  }

  private assertContactable(data: LeadScoreInput) {
    if (
      !this.clean(data.email) &&
      !this.clean(data.phone) &&
      !this.clean(data.website)
    ) {
      throw new BadRequestException(
        'Ajoutez au moins un email, un téléphone ou un site internet',
      );
    }
  }

  private duplicateKeys(data: {
    email?: string | null;
    phone?: string | null;
    website?: string | null;
  }) {
    const keys: string[] = [];
    const email = this.clean(data.email)?.toLowerCase();
    const phone = data.phone?.replace(/\D/g, '');
    const website = this.websiteKey(data.website);
    if (email) keys.push(`email:${email}`);
    if (phone && phone.length >= 8) keys.push(`phone:${phone}`);
    if (website) keys.push(`website:${website}`);
    return keys;
  }

  private websiteKey(value?: string | null) {
    const clean = this.clean(value);
    if (!clean) return undefined;
    try {
      return new URL(
        clean.includes('://') ? clean : `https://${clean}`,
      ).hostname
        .toLowerCase()
        .replace(/^www\./, '');
    } catch {
      return clean
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .split('/')[0];
    }
  }

  private clean(value?: string | null) {
    const clean = value?.trim();
    return clean || undefined;
  }
}
