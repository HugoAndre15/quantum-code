import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { LeadSource, LeadStatus } from '@prisma/client';

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
  async convert(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead introuvable');
    if (lead.convertedClientId) {
      throw new BadRequestException('Ce lead est déjà converti en client');
    }
    if (lead.status === LeadStatus.PERDU) {
      throw new BadRequestException('Impossible de convertir un lead perdu');
    }

    const client = await this.prisma.client.create({
      data: {
        company: lead.company || lead.name,
        trade: 'À préciser',
        contactName: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: 'CONTACTE',
        budget: lead.budget,
        contactDate: new Date(),
        notes: lead.notes ?? undefined,
        ...(lead.packId && { packId: lead.packId }),
      },
    });

    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data: { status: LeadStatus.CONVERTI, convertedClientId: client.id },
    });

    return { clientId: client.id, lead: this.withLabel(updatedLead) };
  }
}
