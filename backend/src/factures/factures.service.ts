import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateFactureDto } from './dto/facture.dto';
import { PaymentStatus, PaymentType } from '@prisma/client';

@Injectable()
export class FacturesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const factures = await this.prisma.facture.findMany({
      include: {
        client: { select: { id: true, company: true, contactName: true, email: true } },
        devis: { select: { id: true, number: true, items: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return factures.map((facture) => this.withPaymentSummary(facture));
  }

  async findOne(id: string) {
    const facture = await this.prisma.facture.findUnique({
      where: { id },
      include: {
        client: true,
        devis: { include: { items: { include: { pack: true, serviceOption: true } }, promoCode: true } },
        payments: true,
      },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    return this.withPaymentSummary(facture);
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

  private withPaymentSummary<T extends { totalHT: number; payments: Array<{ amount: unknown; type: PaymentType; status: PaymentStatus }> }>(
    facture: T,
  ) {
    const paidAmount = facture.payments.reduce((sum, payment) => {
      const amount = Number(payment.amount);
      if (payment.type === PaymentType.REMBOURSEMENT) return sum - amount;
      return payment.status === PaymentStatus.PAYE ? sum + amount : sum;
    }, 0);

    const paymentStatus =
      paidAmount <= 0
        ? 'NON_PAYEE'
        : paidAmount >= facture.totalHT
          ? 'PAYEE'
          : 'ACOMPTE_RECU';

    return { ...facture, paidAmount, paymentStatus };
  }
}
