import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDevisDto, UpdateDevisDto } from './dto/devis.dto';

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
        facture: { select: { id: true, number: true, status: true } },
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
        facture: true,
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

    return this.prisma.devis.create({
      data: {
        number,
        clientId: dto.clientId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        notes: dto.notes,
        totalHT,
        devTime,
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

      return this.prisma.devis.update({
        where: { id },
        data: {
          status: dto.status as any,
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
    }

    return this.prisma.devis.update({
      where: { id },
      data: {
        status: dto.status as any,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: dto.notes,
      },
      include: { client: true, items: true },
    });
  }

  async remove(id: string) {
    const devis = await this.prisma.devis.findUnique({ where: { id }, include: { facture: true } });
    if (!devis) throw new NotFoundException('Devis introuvable');
    if (devis.facture) {
      throw new BadRequestException('Impossible de supprimer un devis lié à une facture');
    }
    await this.prisma.devis.delete({ where: { id } });
    return { message: 'Devis supprimé' };
  }

  async transformToFacture(id: string) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
      include: { facture: true, items: true },
    });
    if (!devis) throw new NotFoundException('Devis introuvable');
    if (devis.facture) throw new BadRequestException('Ce devis a déjà une facture');
    if (devis.status !== 'ACCEPTE') {
      throw new BadRequestException('Seuls les devis acceptés peuvent être transformés en facture');
    }

    const year = new Date().getFullYear();
    const count = await this.prisma.facture.count({
      where: { number: { startsWith: `FAC-${year}` } },
    });
    const factureNumber = `FAC-${year}-${String(count + 1).padStart(3, '0')}`;

    const facture = await this.prisma.facture.create({
      data: {
        number: factureNumber,
        devisId: devis.id,
        clientId: devis.clientId,
        totalHT: devis.totalHT,
      },
      include: {
        devis: { include: { items: true } },
        client: true,
      },
    });

    // Update devis status to FACTURE in client
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
}
