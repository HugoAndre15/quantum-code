import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  PaymentStatus,
  PaymentType,
  SubInterval,
  TaskStatus,
  TaskType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripePaymentsService } from '../stripe/stripe-payments.service';
import {
  CreatePaymentDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from './dto/sales.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripePayments: StripePaymentsService,
  ) {}

  async findPayments() {
    const payments = await this.prisma.payment.findMany({
      include: {
        client: { select: { id: true, company: true } },
        facture: {
          select: { id: true, number: true, totalHT: true },
        },
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    });

    return payments.map(({ facture, amount, ...payment }) => ({
      ...payment,
      amount: Number(amount),
      invoice: facture,
    }));
  }

  async createPayment(dto: CreatePaymentDto) {
    const facture = await this.prisma.facture.findUnique({
      where: { id: dto.invoiceId },
      include: { payments: true },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    if (facture.status === 'ANNULEE') {
      throw new BadRequestException(
        'Impossible d’enregistrer un paiement sur une facture annulée',
      );
    }

    if (dto.type !== PaymentType.REMBOURSEMENT) {
      const alreadyPaid = facture.payments.reduce((sum, payment) => {
        const amount = Number(payment.amount);
        if (payment.type === PaymentType.REMBOURSEMENT) return sum - amount;
        return payment.status === PaymentStatus.PAYE ? sum + amount : sum;
      }, 0);
      const remainingAmount = Math.max(0, facture.totalHT - alreadyPaid);
      if (remainingAmount <= 0.005) {
        throw new BadRequestException('Cette facture est déjà intégralement payée');
      }
      if (dto.amount > remainingAmount + 0.005) {
        throw new BadRequestException(
          `Le montant dépasse le reste à payer (${remainingAmount.toFixed(2)} €)`,
        );
      }
      await this.stripePayments.invalidatePendingSessions(facture.id);
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          clientId: facture.clientId,
          factureId: facture.id,
          type: dto.type,
          amount: dto.amount,
          method: dto.method,
          notes: dto.notes || null,
          paidAt: new Date(dto.paidAt),
          status:
            dto.type === PaymentType.REMBOURSEMENT
              ? PaymentStatus.REMBOURSE
              : PaymentStatus.PAYE,
        },
        include: {
          client: { select: { id: true, company: true } },
          facture: {
            select: { id: true, number: true, totalHT: true },
          },
        },
      });

      const allPayments = [...facture.payments, payment];
      const paidAmount = allPayments.reduce((sum, item) => {
        const amount = Number(item.amount);
        return item.type === PaymentType.REMBOURSEMENT
          ? sum - amount
          : item.status === PaymentStatus.PAYE
            ? sum + amount
            : sum;
      }, 0);

      if (paidAmount >= facture.totalHT) {
        await tx.facture.update({
          where: { id: facture.id },
          data: { status: 'PAYEE', paidAt: new Date(dto.paidAt) },
        });
        await tx.client.update({
          where: { id: facture.clientId },
          data: { status: 'EN_COURS' },
        });
        await tx.crmTask.updateMany({
          where: {
            factureId: facture.id,
            type: TaskType.PAIEMENT,
            status: TaskStatus.A_FAIRE,
          },
          data: { status: TaskStatus.TERMINEE, completedAt: new Date() },
        });
      }

      await tx.crmActivity.create({
        data: {
          type: ActivityType.PAIEMENT,
          title:
            dto.type === PaymentType.REMBOURSEMENT
              ? `Remboursement de ${dto.amount.toFixed(2)} € enregistré`
              : `Paiement de ${dto.amount.toFixed(2)} € enregistré`,
          description: `${dto.method} · ${facture.number}`,
          clientId: facture.clientId,
          devisId: facture.devisId,
          factureId: facture.id,
        },
      });

      const { facture: invoice, amount, ...rest } = payment;
      return { ...rest, amount: Number(amount), invoice };
    });
  }

  async findSubscriptions() {
    const subscriptions = await this.prisma.subscription.findMany({
      include: {
        client: {
          select: { id: true, company: true, contactName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map(
      ({ monthlyAmount, nextBillingDate, ...subscription }) => ({
        ...subscription,
        amount: Number(monthlyAmount),
        nextBillingAt: nextBillingDate,
      }),
    );
  }

  async createSubscription(dto: CreateSubscriptionDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client introuvable');

    const startDate = new Date(dto.startDate);
    const subscription = await this.prisma.subscription.create({
      data: {
        clientId: dto.clientId,
        type: dto.type,
        interval: dto.interval,
        monthlyAmount: dto.amount,
        startDate,
        nextBillingDate: this.nextBillingDate(startDate, dto.interval),
        notes: dto.notes || null,
      },
      include: {
        client: {
          select: { id: true, company: true, contactName: true },
        },
      },
    });

    const { monthlyAmount, nextBillingDate, ...rest } = subscription;
    return {
      ...rest,
      amount: Number(monthlyAmount),
      nextBillingAt: nextBillingDate,
    };
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Abonnement introuvable');

    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: dto.status,
        canceledAt: dto.status === 'RESILIE' ? new Date() : null,
      },
      include: {
        client: {
          select: { id: true, company: true, contactName: true },
        },
      },
    });

    const { monthlyAmount, nextBillingDate, ...rest } = subscription;
    return {
      ...rest,
      amount: Number(monthlyAmount),
      nextBillingAt: nextBillingDate,
    };
  }

  private nextBillingDate(startDate: Date, interval: SubInterval) {
    const date = new Date(startDate);
    const months =
      interval === SubInterval.ANNUEL
        ? 12
        : interval === SubInterval.TRIMESTRIEL
          ? 3
          : 1;
    date.setMonth(date.getMonth() + months);
    return date;
  }
}
