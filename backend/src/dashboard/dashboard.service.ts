import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
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
    };
  }
}
