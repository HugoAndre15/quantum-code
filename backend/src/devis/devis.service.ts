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

  async create(dto: CreateDevisDto) {
    const number = await this.generateNumber();

    // Calculate totals
    let totalHT = 0;
    let devTime = 0;
    for (const item of dto.items) {
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
