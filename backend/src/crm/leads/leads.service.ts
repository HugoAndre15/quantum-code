import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConvertLeadDto,
  CreateLeadDto,
  UpdateLeadDto,
} from './dto/lead.dto';
import { ActivityType, LeadSource, LeadStatus } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  calculateScore(data: {
    budget?: number | null;
    delayMonths?: number | null;
    pageCount?: number | null;
    source?: LeadSource;
    phone?: string | null;
    company?: string | null;
  }): number {
    let score = 0;

    // Budget (0–30)
    if (data.budget !== undefined && data.budget !== null) {
      if (data.budget > 1000) score += 30;
      else if (data.budget >= 700) score += 20;
      else if (data.budget >= 400) score += 10;
    }

    // Délai (0–25)
    if (data.delayMonths !== undefined && data.delayMonths !== null) {
      if (data.delayMonths < 1) score += 25;
      else if (data.delayMonths <= 3) score += 20;
      else if (data.delayMonths <= 6) score += 10;
      else score += 5;
    }

    // Pages (0–20)
    if (data.pageCount !== undefined && data.pageCount !== null) {
      if (data.pageCount > 10) score += 20;
      else if (data.pageCount >= 5) score += 15;
      else if (data.pageCount >= 3) score += 10;
      else score += 5;
    }

    // Source (5–15)
    if (data.source === LeadSource.SIMULATOR) score += 15;
    else if (data.source === LeadSource.CONTACT) score += 10;
    else score += 5;

    // Bonus infos (0–10)
    if (data.phone) score += 5;
    if (data.company) score += 5;

    return Math.min(score, 100);
  }

  getScoreLabel(score: number): string {
    if (score >= 81) return 'Très chaud 🔥';
    if (score >= 61) return 'Chaud';
    if (score >= 31) return 'Tiède';
    return 'Froid';
  }

  private withLabel<T extends { score: number }>(lead: T) {
    return { ...lead, scoreLabel: this.getScoreLabel(lead.score) };
  }

  async findAll() {
    const leads = await this.prisma.lead.findMany({
      include: {
        pack: { select: { id: true, name: true } },
        convertedClient: { select: { id: true, company: true } },
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
    });
    return leads.map((l) => this.withLabel(l));
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        pack: true,
        convertedClient: {
          include: {
            devis: { select: { id: true, number: true, status: true, totalHT: true } },
            projects: true,
          },
        },
        devis: {
          select: { id: true, number: true, status: true, totalHT: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead introuvable');
    return this.withLabel(lead);
  }

  async create(dto: CreateLeadDto) {
    const score = this.calculateScore(dto);
    const lead = await this.prisma.lead.create({ data: { ...dto, score } });
    return this.withLabel(lead);
  }

  async update(id: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lead introuvable');

    // Recalculate score if relevant fields changed
    const merged = { ...existing, ...dto };
    const score = this.calculateScore(merged);

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { ...dto, score },
    });
    return this.withLabel(updated);
  }

  async remove(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead introuvable');
    if (lead.convertedClientId) {
      throw new BadRequestException('Impossible de supprimer un lead converti en client');
    }
    await this.prisma.lead.delete({ where: { id } });
    return { message: 'Lead supprimé' };
  }

  /**
   * Convertit un lead en client.
   * Crée le Client Prisma, lie-le au lead, passe le lead en CONVERTI.
   */
  async convert(id: string, dto: ConvertLeadDto = {}) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead introuvable');
    if (lead.convertedClientId) {
      return {
        clientId: lead.convertedClientId,
        reused: true,
        lead: this.withLabel(lead),
      };
    }
    if (lead.status === LeadStatus.PERDU) {
      throw new BadRequestException('Impossible de convertir un lead perdu');
    }

    const simulatorData =
      lead.simulatorData && typeof lead.simulatorData === 'object'
        ? (lead.simulatorData as Record<string, unknown>)
        : {};

    return this.prisma.$transaction(async (tx) => {
      const existingClient = dto.clientId
        ? await tx.client.findUnique({ where: { id: dto.clientId } })
        : await tx.client.findFirst({
            where: {
              email: { equals: lead.email, mode: 'insensitive' },
            },
            orderBy: { createdAt: 'desc' },
          });

      const client =
        existingClient ||
        (await tx.client.create({
          data: {
            company: lead.company || lead.name,
            trade:
              dto.trade ||
              (typeof simulatorData.trade === 'string'
                ? simulatorData.trade
                : 'À préciser'),
            contactName: lead.name,
            email: lead.email,
            phone: lead.phone,
            address:
              typeof simulatorData.address === 'string'
                ? simulatorData.address
                : undefined,
            website:
              typeof simulatorData.website === 'string'
                ? simulatorData.website
                : undefined,
            status: 'CONTACTE',
            budget: lead.budget,
            contactDate: new Date(),
            notes: lead.notes ?? undefined,
            ...(lead.packId && { packId: lead.packId }),
          },
        }));

      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          status: LeadStatus.CONVERTI,
          convertedClientId: client.id,
        },
      });

      await tx.crmActivity.create({
        data: {
          type: ActivityType.CONVERSION,
          title: existingClient
            ? 'Lead rattaché à un client existant'
            : 'Lead converti en client',
          description: client.company,
          leadId: id,
          clientId: client.id,
        },
      });

      return {
        clientId: client.id,
        reused: Boolean(existingClient),
        lead: this.withLabel(updatedLead),
      };
    });
  }
}
