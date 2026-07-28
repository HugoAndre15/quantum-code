import { SimulatorService } from './simulator.service';

describe('SimulatorService', () => {
  const conversion = { attachLead: jest.fn() };
  const mail = { sendMail: jest.fn() };
  const config = {
    get: jest.fn((_key: string, fallback: string) => fallback),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    conversion.attachLead.mockResolvedValue(undefined);
    mail.sendMail.mockResolvedValue(undefined);
  });

  it('recalculates the trusted price and stores the complete commercial brief', async () => {
    const prisma = {
      pack: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'pack-vitrine',
          name: 'Vitrine',
          price: 890,
          includedPages: 4,
          includedOptions: [{ serviceOptionId: 'gallery' }],
        }),
      },
      pricingBase: {
        findFirst: jest.fn().mockResolvedValue({
          basePrice: 590,
          basePages: 1,
          pagePrice: 90,
        }),
      },
      serviceOption: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'gallery',
            name: 'Galerie',
            price: 160,
            recurring: false,
          },
          {
            id: 'booking',
            name: 'Réservation',
            price: 290,
            recurring: false,
          },
          {
            id: 'maintenance',
            name: 'Maintenance classic',
            price: 19,
            recurring: true,
            recurringUnit: 'mois',
          },
        ]),
      },
      lead: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'lead-1',
          ...data,
          pack: { name: 'Vitrine' },
        })),
      },
    };
    const service = new SimulatorService(
      prisma as never,
      mail as never,
      config as never,
      conversion as never,
    );

    const result = await service.submitLead({
      sessionId: 'session-1',
      contactName: 'Marie Dupont',
      email: 'marie@example.com',
      company: 'Restaurant Marie',
      phone: '0600000000',
      mode: 'recommended',
      packId: 'pack-vitrine',
      optionIds: ['gallery', 'booking'],
      recurringOptionIds: ['maintenance'],
      pages: 5,
      estimatedTotal: 1,
      projectType: 'booking',
      sector: 'restaurant',
      primaryGoal: 'Prendre des rendez-vous',
      contentScale: 'standard',
      selectedFeatures: ['Galerie', 'Réservation', 'Avis Google'],
      timeline: 'asap',
      contentReadiness: 'ready',
      supportChoice: 'essential',
      recommendationName: 'Vitrine',
    });

    expect(prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          budget: 1270,
          delayMonths: 0,
          packId: 'pack-vitrine',
          simulatorData: expect.objectContaining({
            version: 2,
            recommendationName: 'Vitrine',
            optionIds: ['gallery', 'booking', 'maintenance'],
            pricingSnapshot: expect.objectContaining({
              oneTimeTotal: 1270,
              recurring: [
                {
                  name: 'Maintenance classic',
                  price: 19,
                  unit: 'mois',
                },
              ],
            }),
          }),
        }),
      }),
    );
    expect(conversion.attachLead).toHaveBeenCalledWith('session-1', 'lead-1');
    expect(result).toEqual(
      expect.objectContaining({ leadId: 'lead-1', score: 80 }),
    );
  });

  it('uses the active base pricing when no pack is supplied', async () => {
    const prisma = {
      pack: { findFirst: jest.fn() },
      pricingBase: {
        findFirst: jest.fn().mockResolvedValue({
          basePrice: 590,
          basePages: 1,
          pagePrice: 90,
        }),
      },
      serviceOption: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      lead: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'lead-2',
          ...data,
          pack: null,
        })),
      },
    };
    const service = new SimulatorService(
      prisma as never,
      mail as never,
      config as never,
      conversion as never,
    );

    await service.submitLead({
      contactName: 'Jean Martin',
      email: 'jean@example.com',
      company: 'Martin',
      pages: 3,
      estimatedTotal: 0,
    });

    expect(prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ budget: 770 }),
      }),
    );
  });
});
