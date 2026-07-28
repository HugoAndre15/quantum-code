import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      leads,
      clients,
      quotes,
      invoices,
      projects,
      payments,
      subscriptions,
      visitors,
    ] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.client.count(),
      this.prisma.devis.count(),
      this.prisma.facture.count(),
      this.prisma.clientProject.count(),
      this.prisma.payment.count(),
      this.prisma.subscription.count(),
      this.prisma.conversionSession.count(),
    ]);

    return {
      leads,
      clients,
      quotes,
      invoices,
      projects,
      payments,
      subscriptions,
      visitors,
    };
  }

  async clearLeads(confirmation?: string) {
    this.assertConfirmation(confirmation, 'SUPPRIMER LES LEADS');
    const deleted = await this.prisma.lead.deleteMany();

    return {
      message: `${deleted.count} lead(s) supprimé(s)`,
      deleted: { leads: deleted.count },
    };
  }

  async clearQuotes(confirmation?: string) {
    this.assertConfirmation(confirmation, 'SUPPRIMER LES DEVIS');

    const [payments, detachedProjects, invoices, items, quotes] =
      await this.prisma.$transaction([
        this.prisma.payment.deleteMany({
          where: { factureId: { not: null } },
        }),
        this.prisma.clientProject.updateMany({
          where: { devisId: { not: null } },
          data: { devisId: null },
        }),
        this.prisma.facture.deleteMany(),
        this.prisma.devisItem.deleteMany(),
        this.prisma.devis.deleteMany(),
        this.prisma.promoCode.updateMany({
          data: { currentUses: 0 },
        }),
        this.prisma.client.updateMany({
          where: { status: { in: ['DEVIS', 'FACTURE'] } },
          data: { status: 'CONTACTE' },
        }),
      ]);

    return {
      message: `${quotes.count} devis supprimé(s)`,
      deleted: {
        quotes: quotes.count,
        invoices: invoices.count,
        invoicePayments: payments.count,
        quoteItems: items.count,
      },
      detachedProjects: detachedProjects.count,
    };
  }

  async clearClients(confirmation?: string) {
    this.assertConfirmation(confirmation, 'SUPPRIMER LES CLIENTS');

    const [
      detachedLeads,
      payments,
      subscriptions,
      reviews,
      projects,
      invoices,
      items,
      quotes,
      clientOptions,
      clients,
    ] = await this.prisma.$transaction([
      this.prisma.lead.updateMany({
        where: { convertedClientId: { not: null } },
        data: { convertedClientId: null, status: 'QUALIFIE' },
      }),
      this.prisma.payment.deleteMany(),
      this.prisma.subscription.deleteMany(),
      this.prisma.review.deleteMany({
        where: { clientId: { not: null } },
      }),
      this.prisma.clientProject.deleteMany(),
      this.prisma.facture.deleteMany(),
      this.prisma.devisItem.deleteMany(),
      this.prisma.devis.deleteMany(),
      this.prisma.clientOption.deleteMany(),
      this.prisma.client.deleteMany(),
      this.prisma.promoCode.updateMany({
        data: { currentUses: 0 },
      }),
    ]);

    return {
      message: `${clients.count} client(s) supprimé(s)`,
      deleted: {
        clients: clients.count,
        quotes: quotes.count,
        invoices: invoices.count,
        payments: payments.count,
        subscriptions: subscriptions.count,
        projects: projects.count,
        linkedReviews: reviews.count,
        quoteItems: items.count,
        clientOptions: clientOptions.count,
      },
      detachedLeads: detachedLeads.count,
    };
  }

  async resetCrm(confirmation?: string) {
    this.assertConfirmation(confirmation, 'RÉINITIALISER LE CRM');

    const [
      payments,
      subscriptions,
      reviews,
      projects,
      invoices,
      items,
      quotes,
      clientOptions,
      leads,
      clients,
      conversionSessions,
    ] = await this.prisma.$transaction([
      this.prisma.payment.deleteMany(),
      this.prisma.subscription.deleteMany(),
      this.prisma.review.deleteMany({
        where: { clientId: { not: null } },
      }),
      this.prisma.clientProject.deleteMany(),
      this.prisma.facture.deleteMany(),
      this.prisma.devisItem.deleteMany(),
      this.prisma.devis.deleteMany(),
      this.prisma.clientOption.deleteMany(),
      this.prisma.lead.deleteMany(),
      this.prisma.client.deleteMany(),
      this.prisma.conversionSession.deleteMany(),
      this.prisma.promoCode.updateMany({
        data: { currentUses: 0 },
      }),
    ]);

    return {
      message: 'Le CRM a été réinitialisé',
      deleted: {
        leads: leads.count,
        clients: clients.count,
        quotes: quotes.count,
        invoices: invoices.count,
        payments: payments.count,
        subscriptions: subscriptions.count,
        projects: projects.count,
        linkedReviews: reviews.count,
        quoteItems: items.count,
        clientOptions: clientOptions.count,
        conversionSessions: conversionSessions.count,
      },
    };
  }

  private assertConfirmation(received: string | undefined, expected: string) {
    if (received !== expected) {
      throw new BadRequestException(
        `Confirmation invalide. Saisissez exactement « ${expected} ».`,
      );
    }
  }
}
