import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const followUpThreshold = new Date(now);
    followUpThreshold.setDate(followUpThreshold.getDate() - 3);
    const expiresSoon = new Date(now);
    expiresSoon.setDate(expiresSoon.getDate() + 7);

    const [
      clientsTotal,
      clientsByStatus,
      devisTotal,
      devisByStatus,
      devisRevenue,
      facturesTotal,
      facturesByStatus,
      facturesRevenue,
      recentDevis,
      recentFactures,
      dueTasks,
      quoteFollowUps,
      expiringQuotes,
      unpaidInvoices,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.groupBy({ by: ['status'], _count: true }),
      this.prisma.devis.count(),
      this.prisma.devis.groupBy({ by: ['status'], _count: true, _sum: { totalHT: true } }),
      this.prisma.devis.aggregate({ _sum: { totalHT: true } }),
      this.prisma.facture.count(),
      this.prisma.facture.groupBy({ by: ['status'], _count: true, _sum: { totalHT: true } }),
      this.prisma.facture.aggregate({
        where: { status: 'PAYEE' },
        _sum: { totalHT: true },
      }),
      this.prisma.devis.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { company: true } } },
      }),
      this.prisma.facture.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { company: true } } },
      }),
      this.prisma.crmTask.findMany({
        where: {
          status: 'A_FAIRE',
          dueAt: { lte: endOfToday },
        },
        include: {
          lead: { select: { id: true, name: true, company: true } },
          client: { select: { id: true, company: true } },
          devis: { select: { id: true, number: true } },
          project: { select: { id: true, name: true } },
          facture: { select: { id: true, number: true } },
        },
        orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
        take: 12,
      }),
      this.prisma.devis.findMany({
        where: {
          status: 'ENVOYE',
          updatedAt: { lte: followUpThreshold },
        },
        select: {
          id: true,
          number: true,
          updatedAt: true,
          client: { select: { id: true, company: true } },
        },
        orderBy: { updatedAt: 'asc' },
        take: 6,
      }),
      this.prisma.devis.findMany({
        where: {
          status: 'ENVOYE',
          validUntil: { gte: now, lte: expiresSoon },
        },
        select: {
          id: true,
          number: true,
          validUntil: true,
          client: { select: { id: true, company: true } },
        },
        orderBy: { validUntil: 'asc' },
        take: 6,
      }),
      this.prisma.facture.findMany({
        where: { status: 'ENVOYEE' },
        include: {
          payments: true,
          client: { select: { id: true, company: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
    ]);

    const devisStatusMap: Record<string, { count: number; total: number }> = {};
    for (const s of devisByStatus) {
      devisStatusMap[s.status] = { count: s._count, total: s._sum.totalHT ?? 0 };
    }

    const facturesStatusMap: Record<string, { count: number; total: number }> = {};
    for (const s of facturesByStatus) {
      facturesStatusMap[s.status] = { count: s._count, total: s._sum.totalHT ?? 0 };
    }

    const clientsStatusMap: Record<string, number> = {};
    for (const s of clientsByStatus) {
      clientsStatusMap[s.status] = s._count;
    }

    return {
      clients: {
        total: clientsTotal,
        byStatus: clientsStatusMap,
      },
      devis: {
        total: devisTotal,
        totalRevenue: devisRevenue._sum.totalHT ?? 0,
        byStatus: devisStatusMap,
        recent: recentDevis,
      },
      factures: {
        total: facturesTotal,
        totalPaid: facturesRevenue._sum.totalHT ?? 0,
        byStatus: facturesStatusMap,
        recent: recentFactures,
      },
      tasks: {
        overdue: dueTasks.filter((task) => task.dueAt < startOfToday),
        today: dueTasks.filter((task) => task.dueAt >= startOfToday),
      },
      commercialAlerts: {
        quoteFollowUps,
        expiringQuotes,
        unpaidInvoices: unpaidInvoices
          .map((invoice) => {
            const paidAmount = invoice.payments.reduce((sum, payment) => {
              const amount = Number(payment.amount);
              if (payment.type === 'REMBOURSEMENT') return sum - amount;
              return payment.status === 'PAYE' ? sum + amount : sum;
            }, 0);
            return {
              id: invoice.id,
              number: invoice.number,
              totalHT: invoice.totalHT,
              remaining: Math.max(0, invoice.totalHT - paidAmount),
              client: invoice.client,
            };
          })
          .filter((invoice) => invoice.remaining > 0),
      },
    };
  }
}
