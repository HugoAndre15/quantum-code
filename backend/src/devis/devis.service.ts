import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDevisDto, UpdateDevisDto } from './dto/devis.dto';
import { randomUUID } from 'crypto';
import {
  ActivityType,
  FactureType,
  TaskStatus,
  TaskType,
} from '@prisma/client';

@Injectable()
export class DevisService {
  constructor(private prisma: PrismaService) {}

  private async generateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.devis.count({
      where: {
        number: { startsWith: `DEV-${year}` },
      },
    });
    return `DEV-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  async findAll() {
    return this.prisma.devis.findMany({
      include: {
        client: { select: { id: true, company: true, contactName: true, email: true } },
        items: true,
        factures: {
          select: {
            id: true,
            number: true,
            status: true,
            type: true,
            totalHT: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        promoCode: { select: { id: true, code: true, discountType: true, discountValue: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
      include: {
        client: true,
        items: { include: { pack: true, serviceOption: true } },
        factures: { orderBy: { createdAt: 'asc' } },
        project: true,
        tasks: {
          where: { status: TaskStatus.A_FAIRE },
          orderBy: { dueAt: 'asc' },
        },
        promoCode: true,
      },
    });
    if (!devis) throw new NotFoundException('Devis introuvable');
    return devis;
  }

  /**
   * Build devis items from the new pricing logic:
   * - packId provided: use pack price, add extra options & extra pages
   * - no packId: use base price + pages + options à la carte
   */
  async buildDevisItems(dto: CreateDevisDto) {
    // If items are provided directly (manual mode), use them as-is
    if (dto.items && dto.items.length > 0) {
      return dto.items;
    }

    const items: any[] = [];

    if (dto.packId) {
      // ── Pack mode ──
      const pack = await this.prisma.pack.findUnique({
        where: { id: dto.packId },
        include: { includedOptions: { include: { serviceOption: true } } },
      });
      if (!pack) throw new BadRequestException('Pack introuvable');

      items.push({
        label: `Pack ${pack.name}`,
        description: pack.description,
        unitPrice: pack.price,
        devTime: pack.devTime || 0,
        packId: pack.id,
        quantity: 1,
      });

      // Extra pages beyond what the pack includes
      const extraPages = (dto.pages || 0) - (pack.includedPages || 0);
      if (extraPages > 0) {
        const base = await this.prisma.pricingBase.findFirst();
        const pagePrice = base?.pagePrice || 70;
        const devTimePage = base?.devTimePage || 2;
        items.push({
          label: 'Pages supplémentaires',
          description: `${extraPages} page(s) en plus des ${pack.includedPages} incluse(s)`,
          unitPrice: pagePrice,
          devTime: devTimePage,
          quantity: extraPages,
        });
      }

      // Extra options (not included in pack)
      if (dto.optionIds?.length) {
        const includedIds = pack.includedOptions.map((po) => po.serviceOptionId);
        const extraOptionIds = dto.optionIds.filter((id) => !includedIds.includes(id));

        if (extraOptionIds.length > 0) {
          const extraOptions = await this.prisma.serviceOption.findMany({
            where: { id: { in: extraOptionIds } },
          });
          for (const opt of extraOptions) {
            items.push({
              label: opt.name,
              description: opt.description,
              unitPrice: opt.price,
              devTime: opt.devTime || 0,
              serviceOptionId: opt.id,
              quantity: 1,
              recurring: opt.recurring || false,
              recurringUnit: opt.recurring ? opt.recurringUnit : undefined,
            });
          }
        }
      }
    } else {
      // ── Base + sur mesure mode ──
      const base = await this.prisma.pricingBase.findFirst();
      if (!base) throw new BadRequestException('Configuration de base introuvable');

      items.push({
        label: base.name || 'Base site web',
        description: base.description || 'Configuration de base du site',
        unitPrice: base.basePrice,
        devTime: base.devTimeBase || 0,
        quantity: 1,
      });

      // Pages (beyond the base pages included)
      const totalPages = dto.pages || base.basePages || 1;
      const extraPages = totalPages - (base.basePages || 1);
      if (extraPages > 0) {
        items.push({
          label: 'Pages supplémentaires',
          description: `${extraPages} page(s) en plus de la base (${base.basePages} incluse(s))`,
          unitPrice: base.pagePrice,
          devTime: base.devTimePage || 0,
          quantity: extraPages,
        });
      }

      // Options à la carte
      if (dto.optionIds?.length) {
        const selectedOptions = await this.prisma.serviceOption.findMany({
          where: { id: { in: dto.optionIds } },
        });
        for (const opt of selectedOptions) {
          items.push({
            label: opt.name,
            description: opt.description,
            unitPrice: opt.price,
            devTime: opt.devTime || 0,
            serviceOptionId: opt.id,
            quantity: 1,
            recurring: opt.recurring || false,
            recurringUnit: opt.recurring ? opt.recurringUnit : undefined,
          });
        }
      }
    }

    return items;
  }

  async create(dto: CreateDevisDto) {
    const number = await this.generateNumber();
    const items = await this.buildDevisItems(dto);

    // Calculate totals
    let totalHT = 0;
    let devTime = 0;
    for (const item of items) {
      const qty = item.quantity ?? 1;
      if (!item.recurring) {
        totalHT += item.unitPrice * qty;
      }
      devTime += (item.devTime ?? 0) * qty;
    }

    // Promo code validation
    let discountAmount = 0;
    let promoCodeId: string | undefined;

    if (dto.promoCode) {
      const promo = await this.prisma.promoCode.findUnique({
        where: { code: dto.promoCode.toUpperCase() },
      });

      if (promo && promo.active) {
        const now = new Date();
        const validStart = !promo.startDate || promo.startDate <= now;
        const validEnd = !promo.endDate || promo.endDate >= now;
        const validUses = promo.maxUses === null || promo.currentUses < promo.maxUses;
        const validMin = !promo.minAmount || totalHT >= promo.minAmount;

        if (validStart && validEnd && validUses && validMin) {
          if (promo.discountType === 'PERCENTAGE') {
            discountAmount = Math.round(totalHT * (promo.discountValue / 100) * 100) / 100;
          } else {
            discountAmount = Math.min(promo.discountValue, totalHT);
          }
          promoCodeId = promo.id;
          totalHT = Math.round((totalHT - discountAmount) * 100) / 100;

          // Increment usage
          await this.prisma.promoCode.update({
            where: { id: promo.id },
            data: { currentUses: { increment: 1 } },
          });
        }
      }
    }

    const quote = await this.prisma.devis.create({
      data: {
        number,
        clientId: dto.clientId,
        sourceLeadId: dto.sourceLeadId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notes: dto.notes,
        totalHT,
        devTime,
        discountAmount,
        promoCodeId,
        items: {
          create: items.map((item) => ({
            label: item.label,
            description: item.description,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice,
            devTime: item.devTime ?? 0,
            recurring: item.recurring ?? false,
            recurringUnit: item.recurringUnit,
            packId: item.packId,
            serviceOptionId: item.serviceOptionId,
          })),
        },
      },
      include: {
        client: { select: { id: true, company: true, contactName: true } },
        items: true,
      },
    });

    await this.prisma.crmActivity.create({
      data: {
        type: ActivityType.DEVIS,
        title: `Devis ${quote.number} créé`,
        clientId: quote.clientId,
        devisId: quote.id,
        leadId: dto.sourceLeadId,
      },
    });

    return quote;
  }

  async update(id: string, dto: UpdateDevisDto) {
    const devis = await this.prisma.devis.findUnique({ where: { id } });
    if (!devis) throw new NotFoundException('Devis introuvable');

    // Items can only be edited in BROUILLON
    if (dto.items && devis.status !== 'BROUILLON') {
      throw new BadRequestException('Seuls les devis en brouillon peuvent être modifiés');
    }

    // If items are provided, recalculate totals and replace items
    if (dto.items) {
      let totalHT = 0;
      let devTime = 0;
      for (const item of dto.items) {
        const qty = item.quantity ?? 1;
        if (!item.recurring) {
          totalHT += item.unitPrice * qty;
        }
        devTime += (item.devTime ?? 0) * qty;
      }

      // Delete existing items and recreate
      await this.prisma.devisItem.deleteMany({ where: { devisId: id } });

      const updated = await this.prisma.devis.update({
        where: { id },
        data: {
          status: dto.status as any,
          acceptedAt:
            dto.status === 'ACCEPTE' && devis.status !== 'ACCEPTE'
              ? new Date()
              : undefined,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          notes: dto.notes,
          totalHT,
          devTime,
          items: {
            create: dto.items.map((item) => ({
              label: item.label,
              description: item.description,
              quantity: item.quantity ?? 1,
              unitPrice: item.unitPrice,
              devTime: item.devTime ?? 0,
              recurring: item.recurring ?? false,
              recurringUnit: item.recurringUnit,
              packId: item.packId,
              serviceOptionId: item.serviceOptionId,
            })),
          },
        },
        include: { client: true, items: true },
      });
      if (dto.status && dto.status !== devis.status) {
        await this.recordStatusChange(updated, devis.status);
      }
      return updated;
    }

    const updated = await this.prisma.devis.update({
      where: { id },
      data: {
        status: dto.status as any,
        acceptedAt:
          dto.status === 'ACCEPTE' && devis.status !== 'ACCEPTE'
            ? new Date()
            : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: dto.notes,
      },
      include: { client: true, items: true },
    });
    if (dto.status && dto.status !== devis.status) {
      await this.recordStatusChange(updated, devis.status);
    }
    return updated;
  }

  async remove(id: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
      include: { factures: true },
    });
    if (!devis) throw new NotFoundException('Devis introuvable');
    if (devis.factures.length) {
      throw new BadRequestException('Impossible de supprimer un devis lié à une facture');
    }
    await this.prisma.devis.delete({ where: { id } });
    return { message: 'Devis supprimé' };
  }

  async transformToFacture(id: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
      include: { factures: true, items: true },
    });
    if (!devis) throw new NotFoundException('Devis introuvable');
    if (devis.status !== 'ACCEPTE') {
      throw new BadRequestException('Seuls les devis acceptés peuvent être transformés en facture');
    }

    const deposit = devis.factures.find(
      (invoice) => invoice.type === FactureType.ACOMPTE,
    );
    const existingFinal = devis.factures.find(
      (invoice) =>
        invoice.type === FactureType.SOLDE ||
        invoice.type === FactureType.COMPLETE,
    );
    if (existingFinal) {
      throw new BadRequestException('La facture finale existe déjà');
    }

    const year = new Date().getFullYear();
    const count = await this.prisma.facture.count({
      where: { number: { startsWith: `FAC-${year}` } },
    });
    const factureNumber = `FAC-${year}-${String(count + 1).padStart(3, '0')}`;

    const totalHT = deposit
      ? Math.max(0, Math.round((devis.totalHT - deposit.totalHT) * 100) / 100)
      : devis.totalHT;
    const type = deposit ? FactureType.SOLDE : FactureType.COMPLETE;

    const facture = await this.prisma.facture.create({
      data: {
        number: factureNumber,
        devisId: devis.id,
        clientId: devis.clientId,
        type,
        percentage: deposit
          ? Math.max(0, 100 - (deposit.percentage || 0))
          : 100,
        totalHT,
      },
      include: {
        devis: { include: { items: true } },
        client: true,
      },
    });

    await this.prisma.crmActivity.create({
      data: {
        type: ActivityType.FACTURE,
        title:
          type === FactureType.SOLDE
            ? `Facture de solde ${facture.number} créée`
            : `Facture ${facture.number} créée`,
        clientId: devis.clientId,
        devisId: devis.id,
        factureId: facture.id,
      },
    });

    await this.prisma.client.update({
      where: { id: devis.clientId },
      data: { status: 'FACTURE' },
    });

    return facture;
  }

  async getStats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.devis.count(),
      this.prisma.devis.groupBy({
        by: ['status'],
        _count: true,
        _sum: { totalHT: true },
      }),
    ]);

    const statusMap: Record<string, { count: number; total: number }> = {};
    for (const s of byStatus) {
      statusMap[s.status] = { count: s._count, total: s._sum.totalHT ?? 0 };
    }

    return { total, byStatus: statusMap };
  }

  /**
   * Génère un token d'acceptation et passe le devis en ENVOYE.
   * Retourne le devis mis à jour avec le client (pour l'email).
   */
  async generateAcceptToken(id: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!devis) throw new NotFoundException('Devis introuvable');
    if (!devis.client.email) {
      throw new BadRequestException("Le client n'a pas d'adresse email");
    }
    if (devis.status === 'ACCEPTE') {
      throw new BadRequestException('Ce devis est déjà accepté');
    }
    if (devis.status === 'REFUSE' || devis.status === 'EXPIRE') {
      throw new BadRequestException(`Impossible d'envoyer un devis ${devis.status}`);
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const updated = await this.prisma.devis.update({
      where: { id },
      data: {
        acceptToken: token,
        acceptTokenExpiresAt: expiresAt,
        status: 'ENVOYE',
      },
      include: { client: true, items: true },
    });
    if (devis.status !== 'ENVOYE') {
      await this.recordStatusChange(updated, devis.status);
    }
    return updated;
  }

  /**
   * Accepte un devis via token public (lien reçu par email).
   * La finalisation reste volontairement confirmée dans l'administration.
   */
  async acceptByToken(token: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { acceptToken: token },
      include: { client: true, project: true },
    });

    if (!devis) throw new NotFoundException('Lien invalide ou expiré');
    if (devis.status === 'ACCEPTE') {
      return { message: 'Devis déjà accepté', devisId: devis.id };
    }
    if (devis.status === 'REFUSE' || devis.status === 'EXPIRE') {
      throw new BadRequestException('Ce devis ne peut plus être accepté');
    }
    if (devis.acceptTokenExpiresAt && devis.acceptTokenExpiresAt < new Date()) {
      await this.prisma.devis.update({
        where: { id: devis.id },
        data: { status: 'EXPIRE', acceptToken: null, acceptTokenExpiresAt: null },
      });
      throw new BadRequestException('Ce lien a expiré. Contactez-nous pour un nouveau devis.');
    }

    const updatedDevis = await this.prisma.$transaction(async (tx) => {
      const accepted = await tx.devis.update({
        where: { id: devis.id },
        data: {
          status: 'ACCEPTE',
          acceptedAt: new Date(),
          acceptToken: null,
          acceptTokenExpiresAt: null,
        },
      });

      await tx.crmTask.updateMany({
        where: {
          devisId: devis.id,
          type: TaskType.RELANCE_DEVIS,
          status: TaskStatus.A_FAIRE,
        },
        data: { status: TaskStatus.TERMINEE, completedAt: new Date() },
      });

      const finalizeTask = await tx.crmTask.findFirst({
        where: {
          devisId: devis.id,
          status: TaskStatus.A_FAIRE,
          title: { startsWith: 'Finaliser le devis' },
        },
      });
      if (!finalizeTask) {
        await tx.crmTask.create({
          data: {
            title: `Finaliser le devis ${devis.number}`,
            description:
              "Créer le projet et la facture d'acompte après vérification.",
            type: TaskType.AUTRE,
            priority: 'HAUTE',
            dueAt: new Date(),
            clientId: devis.clientId,
            devisId: devis.id,
            leadId: devis.sourceLeadId,
          },
        });
      }

      await tx.crmActivity.create({
        data: {
          type: ActivityType.DEVIS,
          title: `Devis ${devis.number} accepté par le client`,
          clientId: devis.clientId,
          devisId: devis.id,
          leadId: devis.sourceLeadId,
        },
      });

      return accepted;
    });

    return {
      message: 'Devis accepté avec succès',
      devisId: updatedDevis.id,
      clientId: devis.clientId,
      requiresFinalization: true,
    };
  }

  private async recordStatusChange(
    devis: { id: string; number: string; clientId: string; status: string },
    previousStatus: string,
  ) {
    await this.prisma.crmActivity.create({
      data: {
        type: ActivityType.STATUT,
        title: `Devis ${devis.number} : ${previousStatus} → ${devis.status}`,
        clientId: devis.clientId,
        devisId: devis.id,
      },
    });

    if (devis.status === 'ENVOYE') {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 4);
      const existing = await this.prisma.crmTask.findFirst({
        where: {
          devisId: devis.id,
          type: TaskType.RELANCE_DEVIS,
          status: TaskStatus.A_FAIRE,
        },
      });
      if (!existing) {
        await this.prisma.crmTask.create({
          data: {
            title: `Relancer le devis ${devis.number}`,
            type: TaskType.RELANCE_DEVIS,
            dueAt,
            clientId: devis.clientId,
            devisId: devis.id,
          },
        });
      }
    }

    if (
      devis.status === 'ACCEPTE' ||
      devis.status === 'REFUSE' ||
      devis.status === 'EXPIRE'
    ) {
      await this.prisma.crmTask.updateMany({
        where: {
          devisId: devis.id,
          type: TaskType.RELANCE_DEVIS,
          status: TaskStatus.A_FAIRE,
        },
        data: { status: TaskStatus.TERMINEE, completedAt: new Date() },
      });
    }

    if (devis.status === 'ACCEPTE') {
      const finalizeTask = await this.prisma.crmTask.findFirst({
        where: {
          devisId: devis.id,
          status: TaskStatus.A_FAIRE,
          title: { startsWith: 'Finaliser le devis' },
        },
      });
      if (!finalizeTask) {
        await this.prisma.crmTask.create({
          data: {
            title: `Finaliser le devis ${devis.number}`,
            description:
              "Créer le projet et la facture d'acompte après vérification.",
            type: TaskType.AUTRE,
            priority: 'HAUTE',
            dueAt: new Date(),
            clientId: devis.clientId,
            devisId: devis.id,
          },
        });
      }
    }
  }
}
