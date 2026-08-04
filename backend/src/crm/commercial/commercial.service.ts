import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityType,
  Prisma,
  TaskStatus,
  TaskType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateNoteDto,
  CreateTaskDto,
  CrmContextDto,
  UpdateTaskDto,
} from './dto/commercial.dto';

type ContextIds = {
  leadIds: Set<string>;
  clientIds: Set<string>;
  devisIds: Set<string>;
  projectIds: Set<string>;
  factureIds: Set<string>;
};

@Injectable()
export class CommercialService {
  constructor(private readonly prisma: PrismaService) {}

  async timeline(context: CrmContextDto) {
    const ids = await this.expandContext(context);
    const filters = this.contextFilters(ids);
    if (!filters.length) return [];

    const [activities, leads, devis, projects, factures] = await Promise.all([
      this.prisma.crmActivity.findMany({
        where: { OR: filters },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.findMany({
        where: { id: { in: [...ids.leadIds] } },
        select: { id: true, name: true, company: true, createdAt: true },
      }),
      this.prisma.devis.findMany({
        where: { id: { in: [...ids.devisIds] } },
        select: {
          id: true,
          number: true,
          status: true,
          createdAt: true,
          acceptedAt: true,
        },
      }),
      this.prisma.clientProject.findMany({
        where: { id: { in: [...ids.projectIds] } },
        select: { id: true, name: true, createdAt: true },
      }),
      this.prisma.facture.findMany({
        where: { id: { in: [...ids.factureIds] } },
        select: {
          id: true,
          number: true,
          type: true,
          createdAt: true,
          paidAt: true,
        },
      }),
    ]);

    const historical = [
      ...leads.map((lead) => ({
        id: `lead-created-${lead.id}`,
        type: ActivityType.CREATION,
        title: 'Prospect créé',
        description: lead.company || lead.name,
        leadId: lead.id,
        createdAt: lead.createdAt,
        virtual: true,
      })),
      ...devis.flatMap((quote) => [
        {
          id: `devis-created-${quote.id}`,
          type: ActivityType.DEVIS,
          title: `Devis ${quote.number} créé`,
          description: null,
          devisId: quote.id,
          createdAt: quote.createdAt,
          virtual: true,
        },
        ...(quote.acceptedAt
          ? [
              {
                id: `devis-accepted-${quote.id}`,
                type: ActivityType.DEVIS,
                title: `Devis ${quote.number} accepté`,
                description: null,
                devisId: quote.id,
                createdAt: quote.acceptedAt,
                virtual: true,
              },
            ]
          : []),
      ]),
      ...projects.map((project) => ({
        id: `project-created-${project.id}`,
        type: ActivityType.PROJET,
        title: `Projet « ${project.name} » créé`,
        description: null,
        projectId: project.id,
        createdAt: project.createdAt,
        virtual: true,
      })),
      ...factures.flatMap((invoice) => [
        {
          id: `invoice-created-${invoice.id}`,
          type: ActivityType.FACTURE,
          title: `Facture ${invoice.number} créée`,
          description:
            invoice.type === 'ACOMPTE'
              ? "Facture d'acompte"
              : invoice.type === 'SOLDE'
                ? 'Facture de solde'
                : 'Facture complète',
          factureId: invoice.id,
          createdAt: invoice.createdAt,
          virtual: true,
        },
        ...(invoice.paidAt
          ? [
              {
                id: `invoice-paid-${invoice.id}`,
                type: ActivityType.PAIEMENT,
                title: `Facture ${invoice.number} payée`,
                description: null,
                factureId: invoice.id,
                createdAt: invoice.paidAt,
                virtual: true,
              },
            ]
          : []),
      ]),
    ];

    const historicalWithoutDuplicates = historical.filter((item) => {
      return !activities.some((activity) => {
        if (
          item.id.startsWith('devis-created-') &&
          'devisId' in item &&
          activity.devisId === item.devisId
        ) {
          return activity.type === ActivityType.DEVIS &&
            activity.title.toLowerCase().includes('créé');
        }
        if (
          item.id.startsWith('devis-accepted-') &&
          'devisId' in item &&
          activity.devisId === item.devisId
        ) {
          return activity.title.toLowerCase().includes('accept');
        }
        if (
          item.id.startsWith('invoice-created-') &&
          'factureId' in item &&
          activity.factureId === item.factureId
        ) {
          return activity.type === ActivityType.FACTURE;
        }
        if (
          item.id.startsWith('invoice-paid-') &&
          'factureId' in item &&
          activity.factureId === item.factureId
        ) {
          return activity.type === ActivityType.PAIEMENT;
        }
        return false;
      });
    });

    return [...activities, ...historicalWithoutDuplicates].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async addNote(dto: CreateNoteDto) {
    return this.prisma.crmActivity.create({
      data: {
        type: ActivityType.NOTE,
        title: 'Note ajoutée',
        description: dto.body.trim(),
        ...this.directContext(dto),
      },
    });
  }

  async findTasks(context: CrmContextDto, status?: TaskStatus) {
    const hasContext = Object.values(context).some(Boolean);
    const ids = hasContext ? await this.expandContext(context) : null;
    const filters = ids ? this.contextFilters(ids) : [];

    return this.prisma.crmTask.findMany({
      where: {
        ...(status && { status }),
        ...(filters.length && { OR: filters }),
      },
      include: {
        lead: { select: { id: true, name: true, company: true } },
        client: { select: { id: true, company: true, contactName: true } },
        devis: { select: { id: true, number: true } },
        project: { select: { id: true, name: true } },
        facture: { select: { id: true, number: true } },
      },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
    });
  }

  async createTask(dto: CreateTaskDto) {
    const task = await this.prisma.crmTask.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        type: dto.type,
        priority: dto.priority,
        dueAt: new Date(dto.dueAt),
        ...this.directContext(dto),
      },
    });
    await this.prisma.crmActivity.create({
      data: {
        type: ActivityType.TACHE,
        title: `Tâche créée : ${task.title}`,
        description: `Échéance le ${task.dueAt.toLocaleDateString('fr-FR')}`,
        ...this.directContext(dto),
      },
    });
    return task;
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    const existing = await this.prisma.crmTask.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tâche introuvable');

    const completedAt =
      dto.status === TaskStatus.TERMINEE
        ? new Date()
        : dto.status !== undefined
          ? null
          : undefined;

    const task = await this.prisma.crmTask.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        priority: dto.priority,
        status: dto.status,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        completedAt,
      },
    });

    if (
      dto.status === TaskStatus.TERMINEE &&
      existing.status !== TaskStatus.TERMINEE
    ) {
      await this.prisma.crmActivity.create({
        data: {
          type: ActivityType.TACHE,
          title: `Tâche terminée : ${task.title}`,
          leadId: task.leadId,
          clientId: task.clientId,
          devisId: task.devisId,
          projectId: task.projectId,
          factureId: task.factureId,
        },
      });
    }
    return task;
  }

  async removeTask(id: string) {
    const task = await this.prisma.crmTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Tâche introuvable');
    await this.prisma.crmTask.delete({ where: { id } });
    return { message: 'Tâche supprimée' };
  }

  async record(data: {
    type: ActivityType;
    title: string;
    description?: string;
    metadata?: Prisma.InputJsonValue;
  } & CrmContextDto) {
    return this.prisma.crmActivity.create({
      data: {
        type: data.type,
        title: data.title,
        description: data.description,
        metadata: data.metadata,
        ...this.directContext(data),
      },
    });
  }

  async ensureTask(data: {
    title: string;
    type: TaskType;
    dueAt: Date;
    description?: string;
  } & CrmContextDto) {
    const existing = await this.prisma.crmTask.findFirst({
      where: {
        status: TaskStatus.A_FAIRE,
        title: data.title,
        ...this.directContext(data),
      },
    });
    if (existing) return existing;
    return this.prisma.crmTask.create({
      data: {
        title: data.title,
        type: data.type,
        dueAt: data.dueAt,
        description: data.description,
        ...this.directContext(data),
      },
    });
  }

  private directContext(context: CrmContextDto) {
    return {
      leadId: context.leadId || null,
      clientId: context.clientId || null,
      devisId: context.devisId || null,
      projectId: context.projectId || null,
      factureId: context.factureId || null,
    };
  }

  private contextFilters(ids: ContextIds) {
    return [
      ...[...ids.leadIds].map((leadId) => ({ leadId })),
      ...[...ids.clientIds].map((clientId) => ({ clientId })),
      ...[...ids.devisIds].map((devisId) => ({ devisId })),
      ...[...ids.projectIds].map((projectId) => ({ projectId })),
      ...[...ids.factureIds].map((factureId) => ({ factureId })),
    ];
  }

  private async expandContext(context: CrmContextDto): Promise<ContextIds> {
    const ids: ContextIds = {
      leadIds: new Set(context.leadId ? [context.leadId] : []),
      clientIds: new Set(context.clientId ? [context.clientId] : []),
      devisIds: new Set(context.devisId ? [context.devisId] : []),
      projectIds: new Set(context.projectId ? [context.projectId] : []),
      factureIds: new Set(context.factureId ? [context.factureId] : []),
    };

    if (context.leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: context.leadId },
        select: { convertedClientId: true },
      });
      if (lead?.convertedClientId) ids.clientIds.add(lead.convertedClientId);
    }

    if (context.devisId) {
      const quote = await this.prisma.devis.findUnique({
        where: { id: context.devisId },
        select: { clientId: true, sourceLeadId: true },
      });
      if (quote) {
        ids.clientIds.add(quote.clientId);
        if (quote.sourceLeadId) ids.leadIds.add(quote.sourceLeadId);
      }
    }

    if (context.projectId) {
      const project = await this.prisma.clientProject.findUnique({
        where: { id: context.projectId },
        select: { clientId: true, devisId: true },
      });
      if (project) {
        ids.clientIds.add(project.clientId);
        if (project.devisId) ids.devisIds.add(project.devisId);
      }
    }

    if (context.factureId) {
      const invoice = await this.prisma.facture.findUnique({
        where: { id: context.factureId },
        select: { clientId: true, devisId: true },
      });
      if (invoice) {
        ids.clientIds.add(invoice.clientId);
        ids.devisIds.add(invoice.devisId);
      }
    }

    if (ids.clientIds.size) {
      const clientIds = [...ids.clientIds];
      const [leads, quotes, projects, invoices] = await Promise.all([
        this.prisma.lead.findMany({
          where: { convertedClientId: { in: clientIds } },
          select: { id: true },
        }),
        this.prisma.devis.findMany({
          where: { clientId: { in: clientIds } },
          select: { id: true, sourceLeadId: true },
        }),
        this.prisma.clientProject.findMany({
          where: { clientId: { in: clientIds } },
          select: { id: true },
        }),
        this.prisma.facture.findMany({
          where: { clientId: { in: clientIds } },
          select: { id: true },
        }),
      ]);
      leads.forEach((lead) => ids.leadIds.add(lead.id));
      quotes.forEach((quote) => {
        ids.devisIds.add(quote.id);
        if (quote.sourceLeadId) ids.leadIds.add(quote.sourceLeadId);
      });
      projects.forEach((project) => ids.projectIds.add(project.id));
      invoices.forEach((invoice) => ids.factureIds.add(invoice.id));
    }

    if (ids.devisIds.size) {
      const [projects, invoices] = await Promise.all([
        this.prisma.clientProject.findMany({
          where: { devisId: { in: [...ids.devisIds] } },
          select: { id: true },
        }),
        this.prisma.facture.findMany({
          where: { devisId: { in: [...ids.devisIds] } },
          select: { id: true },
        }),
      ]);
      projects.forEach((project) => ids.projectIds.add(project.id));
      invoices.forEach((invoice) => ids.factureIds.add(invoice.id));
    }

    return ids;
  }
}
