import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDevisDto,
  CreateDevisItemDto,
  UpdateDevisDto,
  SignContractDto,
} from './dto/devis.dto';
import { ContractOffer, freezeOffer, offerDigest, signatureDeadline } from './contract';
import { renderContractPdf } from './contract-pdf';
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

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private calculateTotals(
    items: Array<{
      quantity?: number;
      unitPrice: number;
      devTime?: number;
      recurring?: boolean;
    }>,
  ) {
    let subtotalHT = 0;
    let devTime = 0;

    for (const item of items) {
      const quantity = item.quantity ?? 1;
      if (!item.recurring) {
        subtotalHT += item.unitPrice * quantity;
      }
      devTime += (item.devTime ?? 0) * quantity;
    }

    return {
      subtotalHT: this.roundMoney(subtotalHT),
      devTime: this.roundMoney(devTime),
    };
  }

  private calculateDiscount(
    promo: {
      discountType: string;
      discountValue: number;
      minAmount: number | null;
    } | null,
    subtotalHT: number,
  ) {
    if (!promo) return 0;
    if (promo.minAmount && subtotalHT < promo.minAmount) {
      throw new BadRequestException(
        `Cette promotion nécessite un montant minimum de ${promo.minAmount} €`,
      );
    }

    return promo.discountType === 'PERCENTAGE'
      ? this.roundMoney(subtotalHT * (promo.discountValue / 100))
      : Math.min(promo.discountValue, subtotalHT);
  }

  private async resolvePromotion(
    code: string | null | undefined,
    subtotalHT: number,
    currentPromoCodeId?: string | null,
  ) {
    if (!code?.trim()) return null;

    const promo = await this.prisma.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!promo) throw new BadRequestException('Code promo introuvable');
    if (!promo.active) throw new BadRequestException('Code promo désactivé');

    const now = new Date();
    if (promo.startDate && promo.startDate > now) {
      throw new BadRequestException('Code promo pas encore actif');
    }
    if (promo.endDate && promo.endDate < now) {
      throw new BadRequestException('Code promo expiré');
    }
    if (
      promo.maxUses !== null &&
      promo.currentUses >= promo.maxUses &&
      promo.id !== currentPromoCodeId
    ) {
      throw new BadRequestException("Limite d'utilisation atteinte");
    }

    this.calculateDiscount(promo, subtotalHT);
    return promo;
  }

  private async syncPromotionUsage(
    previousPromoCodeId: string | null | undefined,
    nextPromoCodeId: string | null | undefined,
  ) {
    if (previousPromoCodeId === nextPromoCodeId) return;

    if (previousPromoCodeId) {
      await this.prisma.promoCode.updateMany({
        where: { id: previousPromoCodeId, currentUses: { gt: 0 } },
        data: { currentUses: { decrement: 1 } },
      });
    }
    if (nextPromoCodeId) {
      await this.prisma.promoCode.update({
        where: { id: nextPromoCodeId },
        data: { currentUses: { increment: 1 } },
      });
    }
  }

  /**
   * Les lignes issues du catalogue sont toujours recalculées côté serveur.
   * Seules les lignes sans packId/serviceOptionId restent librement éditables.
   */
  private async resolveManualItems(items: CreateDevisItemDto[]) {
    const packIds = [
      ...new Set(items.flatMap((item) => (item.packId ? [item.packId] : []))),
    ];
    const optionIds = [
      ...new Set(
        items.flatMap((item) =>
          item.serviceOptionId ? [item.serviceOptionId] : [],
        ),
      ),
    ];

    const [packs, options] = await Promise.all([
      this.prisma.pack.findMany({ where: { id: { in: packIds } } }),
      this.prisma.serviceOption.findMany({
        where: { id: { in: optionIds } },
      }),
    ]);
    const packsById = new Map(packs.map((pack) => [pack.id, pack]));
    const optionsById = new Map(options.map((option) => [option.id, option]));

    return items.map((item) => {
      if (item.packId && item.serviceOptionId) {
        throw new BadRequestException(
          'Une ligne ne peut pas référencer un pack et une option',
        );
      }

      if (item.packId) {
        const pack = packsById.get(item.packId);
        if (!pack) throw new BadRequestException('Pack introuvable');
        return {
          label: `Pack ${pack.name}`,
          description: pack.description,
          quantity: item.quantity ?? 1,
          unitPrice: pack.price,
          devTime: pack.devTime,
          recurring: false,
          recurringUnit: undefined,
          packId: pack.id,
          serviceOptionId: undefined,
        };
      }

      if (item.serviceOptionId) {
        const option = optionsById.get(item.serviceOptionId);
        if (!option) throw new BadRequestException('Option introuvable');
        return {
          label: option.name,
          description: option.description,
          quantity: item.quantity ?? 1,
          unitPrice: option.price,
          devTime: option.devTime,
          recurring: option.recurring,
          recurringUnit: option.recurring
            ? option.recurringUnit || 'mois'
            : undefined,
          packId: undefined,
          serviceOptionId: option.id,
        };
      }

      return {
        label: item.label.trim(),
        description: item.description?.trim() || undefined,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice,
        devTime: item.devTime ?? 0,
        recurring: item.recurring ?? false,
        recurringUnit: item.recurring
          ? item.recurringUnit?.trim() || 'mois'
          : undefined,
        packId: undefined,
        serviceOptionId: undefined,
      };
    });
  }

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
      omit: { contractOffer: true },
      include: {
        client: {
          select: { id: true, company: true, contactName: true, email: true },
        },
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
        promoCode: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
      include: {
        client: true,
        signature: { select: { signerName: true, signerRole: true, signedAt: true, version: true, offerDigest: true } },
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
    // Manual mode: catalog prices are still trusted from the database.
    if (dto.items && dto.items.length > 0) {
      return this.resolveManualItems(dto.items);
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
        const [base, pageOption] = await Promise.all([
          this.prisma.pricingBase.findFirst(),
          this.prisma.serviceOption.findUnique({
            where: { name: 'Page supplémentaire' },
          }),
        ]);
        const pagePrice = pageOption?.price ?? base?.pagePrice ?? 70;
        const devTimePage = pageOption?.devTime ?? base?.devTimePage ?? 2;
        items.push({
          label: pageOption?.name || 'Pages supplémentaires',
          description: `${extraPages} page(s) en plus des ${pack.includedPages} incluse(s)`,
          unitPrice: pagePrice,
          devTime: devTimePage,
          quantity: extraPages,
          serviceOptionId: pageOption?.id,
        });
      }

      // Extra options (not included in pack)
      if (dto.optionIds?.length) {
        const includedIds = pack.includedOptions.map(
          (po) => po.serviceOptionId,
        );
        const extraOptionIds = dto.optionIds.filter(
          (id) => !includedIds.includes(id),
        );

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
      if (!base)
        throw new BadRequestException('Configuration de base introuvable');

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
        const pageOption = await this.prisma.serviceOption.findUnique({
          where: { name: 'Page supplémentaire' },
        });
        items.push({
          label: pageOption?.name || 'Pages supplémentaires',
          description: `${extraPages} page(s) en plus de la base (${base.basePages} incluse(s))`,
          unitPrice: pageOption?.price ?? base.pagePrice,
          devTime: pageOption?.devTime ?? base.devTimePage ?? 0,
          quantity: extraPages,
          serviceOptionId: pageOption?.id,
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
    const { subtotalHT, devTime } = this.calculateTotals(items);
    const promo = await this.resolvePromotion(dto.promoCode, subtotalHT);
    const discountAmount = this.calculateDiscount(promo, subtotalHT);
    const totalHT = this.roundMoney(subtotalHT - discountAmount);

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
        promoCodeId: promo?.id,
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

    await this.syncPromotionUsage(null, promo?.id);

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
    const devis = await this.prisma.devis.findUnique({
      where: { id },
      include: { items: true, promoCode: true },
    });
    if (!devis) throw new NotFoundException('Devis introuvable');
    if (devis.status === 'ACCEPTE' && devis.contractOffer) {
      throw new BadRequestException('Le contrat signé est figé. Créez un avenant ou un nouveau devis.');
    }
    if (dto.status === 'ACCEPTE' && devis.status !== 'ACCEPTE') {
      throw new BadRequestException('Le client doit signer le contrat depuis son invitation.');
    }
    // On a revised or withdrawn offer, the old token must never authorize a signature.
    const revoke = devis.acceptToken && (
      dto.items !== undefined || dto.promoCode !== undefined ||
      (dto.notes !== undefined && dto.notes !== devis.notes) ||
      (dto.validUntil !== undefined && new Date(dto.validUntil).getTime() !== devis.validUntil?.getTime()) ||
      (dto.status !== undefined && dto.status !== devis.status)
    ) ? { acceptToken: null, acceptTokenExpiresAt: null, contractOffer: null } : {};

    const pricingChanged =
      dto.items !== undefined || dto.promoCode !== undefined;
    if (pricingChanged && devis.status !== 'BROUILLON') {
      throw new BadRequestException(
        'Les lignes et promotions sont modifiables uniquement sur un brouillon',
      );
    }

    if (pricingChanged) {
      const items = dto.items
        ? await this.resolveManualItems(dto.items)
        : devis.items;
      const { subtotalHT, devTime } = this.calculateTotals(items);
      const promo =
        dto.promoCode !== undefined
          ? await this.resolvePromotion(
              dto.promoCode,
              subtotalHT,
              devis.promoCodeId,
            )
          : devis.promoCode;
      const discountAmount = this.calculateDiscount(promo, subtotalHT);
      const totalHT = this.roundMoney(subtotalHT - discountAmount);

      const updated = await this.prisma.devis.update({
        where: { id, status: devis.status, updatedAt: devis.updatedAt },
        data: {
          ...revoke,
          status: dto.status as any,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          notes: dto.notes,
          totalHT,
          devTime,
          discountAmount,
          promoCodeId: promo?.id || null,
          ...(dto.items && {
            items: {
              deleteMany: {},
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
          }),
        },
        include: { client: true, items: true, promoCode: true },
      });

      await this.syncPromotionUsage(devis.promoCodeId, promo?.id);
      if (dto.status && dto.status !== devis.status) {
        await this.recordStatusChange(updated, devis.status);
      }
      return updated;
    }

    const updated = await this.prisma.devis.update({
      where: { id, status: devis.status, updatedAt: devis.updatedAt },
      data: {
        ...revoke,
        status: dto.status as any,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: dto.notes,
      },
      include: { client: true, items: true, promoCode: true },
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
      throw new BadRequestException(
        'Impossible de supprimer un devis lié à une facture',
      );
    }
    if (devis.status === 'ACCEPTE' && devis.contractOffer) {
      throw new BadRequestException('Un contrat signé ne peut pas être supprimé.');
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
      throw new BadRequestException(
        'Seuls les devis acceptés peuvent être transformés en facture',
      );
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

  async getAcceptancePreview(token: string) {
    const devis = await this.findAcceptanceDocument(token);
    const expired = Boolean(
      devis.status !== 'ACCEPTE' &&
      devis.acceptTokenExpiresAt &&
      devis.acceptTokenExpiresAt < new Date(),
    );
    if (devis.contractOffer) {
      const offer: ContractOffer = JSON.parse(devis.contractOffer);
      return {
        number: offer.number, createdAt: offer.createdAt, validUntil: offer.validUntil,
        items: offer.items, notes: offer.notes, totalHT: offer.totalHT,
        discountAmount: offer.discountAmount, promoCode: offer.promoCode,
        client: { company: offer.client.company, contactName: offer.client.contactName },
        status: expired ? 'EXPIRE' : devis.status, acceptedAt: devis.acceptedAt,
        contract: { version: offer.version, digest: offerDigest(devis.contractOffer), clauses: offer.clauses, scope: offer.scope, consent: offer.consent },
        signature: devis.signature,
      };
    }
    return {
      contract: null, signature: null,
      number: devis.number,
      status: expired ? 'EXPIRE' : devis.status,
      createdAt: devis.createdAt,
      validUntil: devis.validUntil,
      acceptedAt: devis.acceptedAt,
      totalHT: devis.totalHT,
      discountAmount: devis.discountAmount,
      promoCode: devis.promoCode?.code,
      client: {
        company: devis.client.company,
        contactName: devis.client.contactName,
      },
      items: devis.items.map((item) => ({
        label: item.label,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        recurring: item.recurring,
        recurringUnit: item.recurringUnit,
      })),
    };
  }

  async findAcceptanceDocument(token: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { acceptToken: token },
      include: {
        client: true,
        items: true,
        promoCode: true,
        signature: { select: { signerName: true, signerRole: true, signedAt: true, version: true } },
      },
    });
    if (!devis) throw new NotFoundException('Lien invalide ou expiré');
    return devis;
  }

  /**
   * Fige le contenu à envoyer, sans enregistrer un envoi qui n'a pas encore eu lieu.
   */
  async generateAcceptToken(id: string, issuerAddress: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
      include: { client: true, items: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }, promoCode: true },
    });
    if (!devis) throw new NotFoundException('Devis introuvable');
    if (!devis.client.email) {
      throw new BadRequestException("Le client n'a pas d'adresse email");
    }
    if (!issuerAddress.trim() || !devis.client.address?.trim()) {
      throw new BadRequestException(!issuerAddress.trim()
        ? 'Configurez CONTRACT_ISSUER_ADDRESS (adresse professionnelle complète) avant l’envoi pour signature.'
        : 'Renseignez l’adresse de facturation du client avant l’envoi pour signature.');
    }
    if (devis.status === 'ACCEPTE') {
      throw new BadRequestException('Ce devis est déjà accepté');
    }
    if (devis.status === 'REFUSE' || devis.status === 'EXPIRE') {
      throw new BadRequestException(
        `Impossible d'envoyer un devis ${devis.status}`,
      );
    }

    const now = new Date();
    const expiresAt = devis.validUntil || !devis.acceptTokenExpiresAt || devis.acceptTokenExpiresAt <= now
      ? signatureDeadline(devis.validUntil, now) : devis.acceptTokenExpiresAt;
    if (expiresAt <= now) throw new BadRequestException('Le devis a expiré : révisez sa validité avant envoi.');
    const snapshot = freezeOffer(devis, issuerAddress.trim(), expiresAt);
    if (devis.acceptToken && devis.contractOffer === snapshot) return devis;
    return this.prisma.devis.update({
      where: { id, status: devis.status, updatedAt: devis.updatedAt },
      data: {
        contractOffer: snapshot, acceptToken: randomUUID(),
        acceptTokenExpiresAt: expiresAt,
      },
      include: { client: true, items: true, promoCode: true },
    });
  }

  async markInvitationSent(id: string, token: string) {
    const result = await this.prisma.devis.updateMany({
      where: { id, acceptToken: token, status: 'BROUILLON' }, data: { status: 'ENVOYE' },
    });
    if (result.count) {
      await this.recordStatusChange(await this.findOne(id), 'BROUILLON');
      return;
    }
    const current = await this.prisma.devis.findUnique({
      where: { id }, select: { status: true, acceptToken: true },
    });
    if (current?.acceptToken !== token || (current.status !== 'ENVOYE' && current.status !== 'ACCEPTE')) {
      throw new ConflictException('Le devis a changé pendant l’envoi. Vérifiez le devis et renvoyez la dernière invitation.');
    }
  }

  async archivedPdf(devisId: string) {
    const signature = await this.prisma.devisSignature.findUniqueOrThrow({
      where: { devisId }, select: { signedPdf: true },
    });
    return Buffer.from(signature.signedPdf);
  }

  /**
   * Accepte un devis via token public (lien reçu par email).
   * La finalisation reste volontairement confirmée dans l'administration.
   */
  async acceptByToken(token: string, dto?: SignContractDto) {
    const devis = await this.prisma.devis.findUnique({
      where: { acceptToken: token },
      include: { client: true, project: true },
    });

    if (!devis) throw new NotFoundException('Lien invalide ou expiré');
    if (devis.status === 'ACCEPTE') {
      return {
        message: 'Devis déjà accepté',
        devisId: devis.id,
        clientId: devis.clientId,
        alreadyAccepted: true,
        requiresFinalization: !devis.project,
      };
    }
    if (devis.status !== 'ENVOYE') {
      throw new BadRequestException('Ce devis ne peut plus être accepté');
    }
    if (!devis.acceptTokenExpiresAt || devis.acceptTokenExpiresAt <= new Date()) {
      throw new BadRequestException(
        'Ce lien a expiré. Contactez-nous pour un nouveau devis.',
      );
    }
    const snapshot = devis.contractOffer;
    if (!snapshot) throw new BadRequestException('Cette ancienne invitation doit être réémise avec le contrat.');
    if (!dto || dto.acceptsContract !== true || dto.confirmsB2BRemote !== true ||
        !dto.signerName?.trim() || !dto.signerRole?.trim()) {
      throw new BadRequestException('Renseignez le signataire et confirmez les deux déclarations.');
    }
    const digest = offerDigest(snapshot);
    if (dto.digest !== digest) throw new ConflictException('Le document a changé. Rouvrez l’invitation avant de signer.');
    const offer: ContractOffer = JSON.parse(snapshot);
    const signer = { signerName: dto.signerName.trim(), signerRole: dto.signerRole.trim(), signedAt: new Date() };
    const signedPdf = await renderContractPdf(snapshot, signer);
    const firstSignature = await this.prisma.$transaction(async (tx) => {
      // Only one request can claim this live, unexpired invitation. All effects roll back together.
      const claimed = await tx.devis.updateMany({
        where: { id: devis.id, status: 'ENVOYE', acceptToken: token, contractOffer: snapshot, acceptTokenExpiresAt: { gt: new Date() } },
        data: {
          status: 'ACCEPTE',
          acceptedAt: signer.signedAt,
        },
      });
      if (claimed.count !== 1) {
        const current = await tx.devis.findUnique({ where: { id: devis.id }, select: { status: true, acceptToken: true } });
        if (current?.status === 'ACCEPTE' && current.acceptToken === token) return false;
        throw new ConflictException('Cette invitation a changé ou expiré. Demandez un nouveau lien.');
      }
      await tx.devisSignature.create({ data: { devisId: devis.id, version: offer.version, offerDigest: digest, ...signer, signedPdf: new Uint8Array(signedPdf) } });

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
          title: `Contrat ${devis.number} signé par ${signer.signerName}`,
          clientId: devis.clientId,
          devisId: devis.id,
          leadId: devis.sourceLeadId,
        },
      });

      if (devis.sourceLeadId) {
        await tx.lead.update({
          where: { id: devis.sourceLeadId },
          data: { status: 'GAGNE', lastContactAt: new Date() },
        });
      }

      return true;
    });

    return {
      message: 'Devis accepté avec succès',
      devisId: devis.id,
      clientId: devis.clientId,
      alreadyAccepted: !firstSignature,
      requiresFinalization: true,
    };
  }

  private async recordStatusChange(
    devis: {
      id: string;
      number: string;
      clientId: string;
      status: string;
      sourceLeadId?: string | null;
    },
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
      if (devis.sourceLeadId) {
        await this.prisma.lead.update({
          where: { id: devis.sourceLeadId },
          data: { status: 'DEVIS_ENVOYE', lastContactAt: new Date() },
        });
      }
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

    if (devis.sourceLeadId && devis.status === 'ACCEPTE') {
      await this.prisma.lead.update({
        where: { id: devis.sourceLeadId },
        data: { status: 'GAGNE', lastContactAt: new Date() },
      });
    }

    if (
      devis.sourceLeadId &&
      (devis.status === 'REFUSE' || devis.status === 'EXPIRE')
    ) {
      const otherOpenQuote = await this.prisma.devis.findFirst({
        where: {
          sourceLeadId: devis.sourceLeadId,
          id: { not: devis.id },
          status: { notIn: ['REFUSE', 'EXPIRE'] },
        },
        select: { id: true },
      });
      if (!otherOpenQuote) {
        await this.prisma.lead.update({
          where: { id: devis.sourceLeadId },
          data: {
            status: 'PERDU',
            lastContactAt: new Date(),
            lostReason:
              devis.status === 'REFUSE'
                ? `Devis ${devis.number} refusé`
                : `Devis ${devis.number} expiré`,
          },
        });
      }
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
