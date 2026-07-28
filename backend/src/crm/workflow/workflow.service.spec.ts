import { FactureType } from '@prisma/client';
import { WorkflowService } from './workflow.service';

describe('WorkflowService', () => {
  const leads = {
    convert: jest.fn(),
  };
  const devis = {
    create: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the active quote already created from a lead', async () => {
    const prisma = {
      lead: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lead-1',
          status: 'QUALIFIE',
          devis: [
            {
              id: 'devis-1',
              clientId: 'client-1',
              status: 'BROUILLON',
            },
          ],
        }),
      },
    };
    const service = new WorkflowService(
      prisma as never,
      leads as never,
      devis as never,
    );

    await expect(service.createQuoteFromLead('lead-1')).resolves.toEqual({
      quoteId: 'devis-1',
      clientId: 'client-1',
      reused: true,
    });
    expect(leads.convert).not.toHaveBeenCalled();
    expect(devis.create).not.toHaveBeenCalled();
  });

  it('converts the lead and creates a prefilled draft quote', async () => {
    const prisma = {
      lead: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'lead-1',
          status: 'QUALIFIE',
          notes: 'Réservation en ligne',
          packId: 'pack-1',
          pageCount: 5,
          simulatorData: { optionIds: ['option-1'] },
          devis: [],
        }),
      },
      crmTask: { create: jest.fn().mockResolvedValue({ id: 'task-1' }) },
      client: { update: jest.fn().mockResolvedValue({}) },
    };
    leads.convert.mockResolvedValue({ clientId: 'client-1' });
    devis.create.mockResolvedValue({ id: 'devis-1', number: 'DEV-2026-001' });

    const service = new WorkflowService(
      prisma as never,
      leads as never,
      devis as never,
    );
    const result = await service.createQuoteFromLead('lead-1');

    expect(devis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        sourceLeadId: 'lead-1',
        packId: 'pack-1',
        optionIds: ['option-1'],
        pages: 5,
      }),
    );
    expect(prisma.crmTask.create).toHaveBeenCalled();
    expect(result).toEqual({
      quoteId: 'devis-1',
      clientId: 'client-1',
      reused: false,
    });
  });

  it('finalizes an accepted quote with a project and a 30% deposit', async () => {
    const tx = {
      clientProject: {
        create: jest.fn().mockResolvedValue({
          id: 'project-1',
          name: 'Site web — Restaurant',
        }),
      },
      facture: {
        count: jest.fn().mockResolvedValue(4),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'invoice-1',
          ...data,
        })),
      },
      client: { update: jest.fn().mockResolvedValue({}) },
      lead: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      crmTask: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'task-1' }),
      },
      crmActivity: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      devis: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'devis-1',
          number: 'DEV-2026-001',
          status: 'ACCEPTE',
          totalHT: 2000,
          clientId: 'client-1',
          sourceLeadId: 'lead-1',
          client: { company: 'Restaurant' },
          project: null,
          factures: [],
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const service = new WorkflowService(
      prisma as never,
      leads as never,
      devis as never,
    );

    const result = await service.finalizeQuote('devis-1', {
      depositPercentage: 30,
    });

    expect(tx.facture.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: FactureType.ACOMPTE,
        percentage: 30,
        totalHT: 600,
      }),
    });
    expect(tx.clientProject.create).toHaveBeenCalled();
    expect(tx.crmTask.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Organiser le rendez-vous de lancement',
        projectId: 'project-1',
      }),
    });
    expect(result.depositInvoice?.totalHT).toBe(600);
  });
});
