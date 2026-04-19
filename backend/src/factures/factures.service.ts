import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateFactureDto } from './dto/facture.dto';

@Injectable()
export class FacturesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.facture.findMany({
      include: {
        client: { select: { id: true, company: true, contactName: true, email: true } },
        devis: { select: { id: true, number: true, items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const facture = await this.prisma.facture.findUnique({
      where: { id },
      include: {
        client: true,
        devis: { include: { items: { include: { pack: true, serviceOption: true } }, promoCode: true } },
      },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    return facture;
  }

  async update(id: string, dto: UpdateFactureDto) {
    const facture = await this.prisma.facture.findUnique({ where: { id } });
    if (!facture) throw new NotFoundException('Facture introuvable');

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (dto.status === 'PAYEE') {
      data.paidAt = new Date();
      // Update client status
      await this.prisma.client.update({
        where: { id: facture.clientId },
        data: { status: 'EN_COURS' },
      });
    }

    return this.prisma.facture.update({
      where: { id },
      data,
      include: {
        client: true,
        devis: { include: { items: true } },
      },
    });
  }

  async remove(id: string) {
    const facture = await this.prisma.facture.findUnique({ where: { id } });
    if (!facture) throw new NotFoundException('Facture introuvable');
    if (facture.status === 'PAYEE') {
      throw new BadRequestException('Impossible de supprimer une facture payée');
    }
    await this.prisma.facture.delete({ where: { id } });
    return { message: 'Facture supprimée' };
  }

  async getStats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.facture.count(),
      this.prisma.facture.groupBy({
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
