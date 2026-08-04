import { DevisService } from './devis.service';

describe('DevisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps prefilled extra pages linked to the catalog option', async () => {
    const prisma = {
      pack: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pack-vitrine',
          name: 'Vitrine',
          description: 'Site vitrine',
          price: 890,
          devTime: 16,
          includedPages: 4,
          includedOptions: [],
        }),
      },
      pricingBase: {
        findFirst: jest.fn().mockResolvedValue({
          pagePrice: 90,
          devTimePage: 1.5,
        }),
      },
      serviceOption: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'extra-page',
          name: 'Page supplémentaire',
          price: 90,
          devTime: 1.5,
        }),
      },
    };
    const service = new DevisService(prisma as never);

    const items = await service.buildDevisItems({
      clientId: 'client-1',
      packId: 'pack-vitrine',
      pages: 6,
    });

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Page supplémentaire',
          quantity: 2,
          unitPrice: 90,
          serviceOptionId: 'extra-page',
        }),
      ]),
    );
  });

  it('uses trusted catalog prices, separates recurring fees and applies a promotion', async () => {
    const prisma = {
      devis: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'quote-1',
          ...data,
          items: data.items.create,
        })),
      },
      pack: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'pack-shop',
            name: 'Boutique',
            description: 'Boutique complète',
            price: 2490,
            devTime: 50,
          },
        ]),
      },
      serviceOption: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'maintenance',
            name: 'Maintenance classic',
            description: 'Suivi mensuel',
            price: 19,
            devTime: 0,
            recurring: true,
            recurringUnit: 'mois',
          },
        ]),
      },
      promoCode: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'promo-10',
          code: 'BIENVENUE10',
          active: true,
          startDate: null,
          endDate: null,
          maxUses: null,
          currentUses: 0,
          minAmount: null,
          discountType: 'PERCENTAGE',
          discountValue: 10,
        }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      crmActivity: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new DevisService(prisma as never);

    const quote = await service.create({
      clientId: 'client-1',
      promoCode: 'bienvenue10',
      items: [
        {
          label: 'Prix manipulé',
          quantity: 1,
          unitPrice: 1,
          packId: 'pack-shop',
        },
        {
          label: 'Maintenance manipulée',
          quantity: 1,
          unitPrice: 1,
          serviceOptionId: 'maintenance',
        },
      ],
    });

    expect(quote).toEqual(
      expect.objectContaining({
        totalHT: 2241,
        discountAmount: 249,
        promoCodeId: 'promo-10',
      }),
    );
    expect(prisma.devis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalHT: 2241,
          items: {
            create: expect.arrayContaining([
              expect.objectContaining({
                label: 'Pack Boutique',
                unitPrice: 2490,
                recurring: false,
              }),
              expect.objectContaining({
                label: 'Maintenance classic',
                unitPrice: 19,
                recurring: true,
                recurringUnit: 'mois',
              }),
            ]),
          },
        }),
      }),
    );
    expect(prisma.promoCode.update).toHaveBeenCalledWith({
      where: { id: 'promo-10' },
      data: { currentUses: { increment: 1 } },
    });
  });

  it('replaces draft items atomically and removes an existing promotion', async () => {
    const prisma = {
      devis: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'quote-1',
          status: 'BROUILLON',
          promoCodeId: 'promo-old',
          promoCode: {
            id: 'promo-old',
            minAmount: null,
            discountType: 'PERCENTAGE',
            discountValue: 10,
          },
          items: [],
        }),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: 'quote-1',
          status: 'BROUILLON',
          ...data,
        })),
      },
      pack: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      serviceOption: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      promoCode: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
    };
    const service = new DevisService(prisma as never);

    await service.update('quote-1', {
      promoCode: null,
      items: [
        {
          label: 'Audit personnalisé',
          quantity: 2,
          unitPrice: 125,
          recurring: false,
        },
      ],
    });

    expect(prisma.devis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalHT: 250,
          discountAmount: 0,
          promoCodeId: null,
          items: {
            deleteMany: {},
            create: [
              expect.objectContaining({
                label: 'Audit personnalisé',
                quantity: 2,
                unitPrice: 125,
              }),
            ],
          },
        }),
      }),
    );
    expect(prisma.promoCode.updateMany).toHaveBeenCalledWith({
      where: { id: 'promo-old', currentUses: { gt: 0 } },
      data: { currentUses: { decrement: 1 } },
    });
  });

  it('keeps an accepted quote accessible through its acceptance link', async () => {
    const prisma = {
      devis: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'quote-accepted',
          number: 'DEV-2026-042',
          status: 'ACCEPTE',
          createdAt: new Date('2026-07-30T08:00:00.000Z'),
          validUntil: new Date('2026-08-29T08:00:00.000Z'),
          acceptedAt: new Date('2026-07-31T08:00:00.000Z'),
          acceptTokenExpiresAt: new Date('2026-07-30T09:00:00.000Z'),
          totalHT: 890,
          discountAmount: 0,
          client: { company: 'Atelier', contactName: 'Camille Martin' },
          items: [],
          promoCode: null,
        }),
      },
    };
    const service = new DevisService(prisma as never);

    const preview = await service.getAcceptancePreview('accepted-token');

    expect(preview.status).toBe('ACCEPTE');
    expect(preview.acceptedAt).toEqual(new Date('2026-07-31T08:00:00.000Z'));
  });

  it('treats a repeated acceptance as an idempotent success', async () => {
    const prisma = {
      devis: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'quote-accepted',
          clientId: 'client-1',
          status: 'ACCEPTE',
          project: null,
        }),
      },
    };
    const service = new DevisService(prisma as never);

    await expect(service.acceptByToken('accepted-token')).resolves.toEqual({
      message: 'Devis déjà accepté',
      devisId: 'quote-accepted',
      clientId: 'client-1',
      alreadyAccepted: true,
      requiresFinalization: true,
    });
  });

  it('does not mark a prospect as lost when another quote is still open', async () => {
    const prisma = {
      devis: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'quote-refused',
          number: 'DEV-2026-043',
          clientId: 'client-1',
          sourceLeadId: 'lead-1',
          status: 'ENVOYE',
          promoCodeId: null,
          promoCode: null,
          items: [],
        }),
        update: jest.fn().mockResolvedValue({
          id: 'quote-refused',
          number: 'DEV-2026-043',
          clientId: 'client-1',
          sourceLeadId: 'lead-1',
          status: 'REFUSE',
        }),
        findFirst: jest.fn().mockResolvedValue({ id: 'quote-open' }),
      },
      crmActivity: { create: jest.fn().mockResolvedValue({}) },
      crmTask: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      lead: { update: jest.fn().mockResolvedValue({}) },
    };
    const service = new DevisService(prisma as never);

    await service.update('quote-refused', { status: 'REFUSE' });

    expect(prisma.devis.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        sourceLeadId: 'lead-1',
        id: { not: 'quote-refused' },
      }),
      select: { id: true },
    });
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });
});
