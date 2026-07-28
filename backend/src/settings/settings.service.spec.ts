import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const result = (count: number) => Promise.resolve({ count });

  const prisma = {
    lead: {
      count: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    client: {
      count: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    devis: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    facture: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    clientProject: {
      count: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    payment: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    subscription: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    conversionSession: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    review: {
      deleteMany: jest.fn(),
    },
    devisItem: {
      deleteMany: jest.fn(),
    },
    clientOption: {
      deleteMany: jest.fn(),
    },
    promoCode: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };

  const service = new SettingsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current CRM summary', async () => {
    prisma.lead.count.mockResolvedValue(2);
    prisma.client.count.mockResolvedValue(3);
    prisma.devis.count.mockResolvedValue(4);
    prisma.facture.count.mockResolvedValue(5);
    prisma.clientProject.count.mockResolvedValue(6);
    prisma.payment.count.mockResolvedValue(7);
    prisma.subscription.count.mockResolvedValue(8);
    prisma.conversionSession.count.mockResolvedValue(9);

    await expect(service.getSummary()).resolves.toEqual({
      leads: 2,
      clients: 3,
      quotes: 4,
      invoices: 5,
      projects: 6,
      payments: 7,
      subscriptions: 8,
      visitors: 9,
    });
  });

  it('rejects a destructive action without the exact confirmation', async () => {
    await expect(service.clearQuotes('supprimer')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('clears quotes and their dependent commercial records atomically', async () => {
    prisma.payment.deleteMany.mockReturnValue(result(2));
    prisma.clientProject.updateMany.mockReturnValue(result(1));
    prisma.facture.deleteMany.mockReturnValue(result(3));
    prisma.devisItem.deleteMany.mockReturnValue(result(8));
    prisma.devis.deleteMany.mockReturnValue(result(4));
    prisma.promoCode.updateMany.mockReturnValue(result(1));
    prisma.client.updateMany.mockReturnValue(result(2));

    await expect(service.clearQuotes('SUPPRIMER LES DEVIS')).resolves.toEqual({
      message: '4 devis supprimé(s)',
      deleted: {
        quotes: 4,
        invoices: 3,
        invoicePayments: 2,
        quoteItems: 8,
      },
      detachedProjects: 1,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
