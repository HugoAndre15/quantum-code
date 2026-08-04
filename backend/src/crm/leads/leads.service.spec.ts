import { LeadSource, LeadStatus, ProspectWebsiteStatus } from '@prisma/client';
import { LeadsService } from './leads.service';

function lead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    name: 'Martin Plomberie',
    email: null,
    phone: '0600000000',
    company: 'Martin Plomberie',
    trade: null,
    city: null,
    website: null,
    websiteStatus: ProspectWebsiteStatus.ABSENT,
    need: null,
    campaign: null,
    lostReason: null,
    budget: null,
    delayMonths: null,
    pageCount: null,
    source: LeadSource.MANUEL,
    status: LeadStatus.NOUVEAU,
    score: 0,
    simulatorData: null,
    notes: null,
    packId: null,
    convertedClientId: null,
    lastContactAt: null,
    createdAt: new Date('2026-08-04T10:00:00.000Z'),
    updatedAt: new Date('2026-08-04T10:00:00.000Z'),
    ...overrides,
  };
}

describe('LeadsService prospecting', () => {
  it('creates a prospect from a company name and records the activity', async () => {
    const prisma = {
      lead: {
        create: jest.fn(({ data }) => Promise.resolve(lead(data))),
      },
      crmActivity: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new LeadsService(prisma as never);

    const result = await service.create({
      company: '  Martin Plomberie  ',
      phone: ' 06 00 00 00 00 ',
    });

    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Martin Plomberie',
        company: 'Martin Plomberie',
        phone: '06 00 00 00 00',
        websiteStatus: ProspectWebsiteStatus.ABSENT,
        source: LeadSource.MANUEL,
      }),
    });
    expect(prisma.crmActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Prospect créé',
        leadId: 'lead-1',
      }),
    });
    expect(result.score).toBeGreaterThan(0);
  });

  it('skips duplicates during a CSV import while creating valid rows', async () => {
    const tx = {
      lead: {
        create: jest.fn(({ data }) =>
          Promise.resolve(lead({ ...data, id: 'lead-imported' })),
        ),
      },
      crmActivity: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      lead: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'existing',
            email: 'contact@example.com',
            phone: null,
            website: null,
          },
        ]),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new LeadsService(prisma as never);

    const result = await service.importCsv({
      campaign: 'Artisans Oise',
      rows: [
        { company: 'Doublon', email: 'CONTACT@example.com' },
        { company: 'Nouveau', phone: '0611223344' },
      ],
    });

    expect(result).toEqual(
      expect.objectContaining({ total: 2, created: 1, skipped: 1 }),
    );
    expect(result.skippedRows[0]).toEqual({
      row: 2,
      reason: 'Doublon détecté',
    });
    expect(tx.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company: 'Nouveau',
        campaign: 'Artisans Oise',
        source: LeadSource.IMPORT_CSV,
      }),
    });
  });

  it('does not change the last contact date when editing without a pipeline transition', async () => {
    const existing = lead({
      status: LeadStatus.CONTACTE,
      lastContactAt: new Date('2026-08-01T10:00:00.000Z'),
    });
    const prisma = {
      lead: {
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn(({ data }) =>
          Promise.resolve({ ...existing, ...data }),
        ),
      },
      crmActivity: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new LeadsService(prisma as never);

    await service.update('lead-1', {
      status: LeadStatus.CONTACTE,
      notes: 'Nouvelle information',
    });

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: expect.not.objectContaining({ lastContactAt: expect.anything() }),
    });
    expect(prisma.crmActivity.create).not.toHaveBeenCalled();
  });

  it('records a real pipeline transition and its contact date', async () => {
    const existing = lead({ status: LeadStatus.A_CONTACTER });
    const prisma = {
      lead: {
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn(({ data }) =>
          Promise.resolve({ ...existing, ...data }),
        ),
      },
      crmActivity: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new LeadsService(prisma as never);

    await service.update('lead-1', { status: LeadStatus.RENDEZ_VOUS });

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: expect.objectContaining({ lastContactAt: expect.any(Date) }),
    });
    expect(prisma.crmActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Prospect : À contacter → Rendez-vous',
        leadId: 'lead-1',
      }),
    });
  });
});
