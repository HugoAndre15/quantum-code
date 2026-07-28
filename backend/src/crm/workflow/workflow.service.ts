import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  FactureType,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DevisService } from '../../devis/devis.service';
import { LeadsService } from '../leads/leads.service';
import {
  ConvertLeadDto,
  FinalizeQuoteDto,
} from '../commercial/dto/commercial.dto';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: LeadsService,
    private readonly devis: DevisService,
  ) {}

  async convertLead(id: string, dto: ConvertLeadDto) {
    return this.leads.convert(id, dto);
  }

  async createQuoteFromLead(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        devis: {
          where: { status: { notIn: ['REFUSE', 'EXPIRE'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead introuvable');
    if (lead.status === 'PERDU') {
      throw new BadRequestException(
        'Impossible de créer un devis depuis un lead perdu',
      );
    }

    const existingQuote = lead.devis[0];
    if (existingQuote) {
      return {
        quoteId: existingQuote.id,
        clientId: existingQuote.clientId,
        reused: true,
      };
    }

    const conversion = await this.leads.convert(id);
    const simulatorData =
      lead.simulatorData && typeof lead.simulatorData === 'object'
        ? (lead.simulatorData as Record<string, unknown>)
        : {};
    const optionIds = Array.isArray(simulatorData.optionIds)
      ? simulatorData.optionIds.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quote = await this.devis.create({
      clientId: conversion.clientId,
      sourceLeadId: id,
      validUntil: validUntil.toISOString(),
      notes: lead.notes || undefined,
      packId: lead.packId || undefined,
      optionIds,
      pages: lead.pageCount || undefined,
    });

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 1);
    await this.prisma.crmTask.create({
      data: {
        title: `Personnaliser et envoyer ${quote.number}`,
        type: TaskType.EMAIL,
        priority: TaskPriority.HAUTE,
        dueAt,
        leadId: id,
        clientId: conversion.clientId,
        devisId: quote.id,
      },
    });

    await this.prisma.client.update({
      where: { id: conversion.clientId },
      data: { status: 'DEVIS' },
    });

    return {
      quoteId: quote.id,
      clientId: conversion.clientId,
      reused: false,
    };
  }

  async finalizeQuote(id: string, dto: FinalizeQuoteDto) {
    const quote = await this.prisma.devis.findUnique({
      where: { id },
      include: {
        client: true,
        project: true,
        factures: true,
      },
    });
    if (!quote) throw new NotFoundException('Devis introuvable');
    if (quote.status !== 'ACCEPTE') {
      throw new BadRequestException(
        'Le devis doit être accepté avant la finalisation',
      );
    }

    const percentage = dto.depositPercentage ?? 30;
    const existingDeposit = quote.factures.find(
      (invoice) => invoice.type === FactureType.ACOMPTE,
    );
    const existingComplete = quote.factures.find(
      (invoice) => invoice.type === FactureType.COMPLETE,
    );
    if (percentage > 0 && existingComplete) {
      throw new BadRequestException(
        'Une facture complète existe déjà pour ce devis',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const project =
        quote.project ||
        (await tx.clientProject.create({
          data: {
            clientId: quote.clientId,
            devisId: quote.id,
            name:
              dto.projectName?.trim() ||
              `Site web — ${quote.client.company}`,
            status: 'EN_ATTENTE',
          },
        }));

      let depositInvoice = existingDeposit;
      if (percentage > 0 && !depositInvoice) {
        const year = new Date().getFullYear();
        const count = await tx.facture.count({
          where: { number: { startsWith: `FAC-${year}` } },
        });
        depositInvoice = await tx.facture.create({
          data: {
            number: `FAC-${year}-${String(count + 1).padStart(3, '0')}`,
            devisId: quote.id,
            clientId: quote.clientId,
            type: FactureType.ACOMPTE,
            percentage,
            totalHT:
              Math.round(quote.totalHT * (percentage / 100) * 100) / 100,
            notes: `Acompte de ${percentage}% sur le devis ${quote.number}`,
          },
        });
      }

      await tx.client.update({
        where: { id: quote.clientId },
        data: { status: 'EN_COURS' },
      });
      await tx.lead.updateMany({
        where: { convertedClientId: quote.clientId },
        data: { status: 'CONVERTI' },
      });
      await tx.crmTask.updateMany({
        where: {
          devisId: quote.id,
          status: TaskStatus.A_FAIRE,
          OR: [
            { type: TaskType.RELANCE_DEVIS },
            { title: { startsWith: 'Finaliser le devis' } },
          ],
        },
        data: { status: TaskStatus.TERMINEE, completedAt: new Date() },
      });

      const kickoffDueAt = new Date();
      kickoffDueAt.setDate(kickoffDueAt.getDate() + 2);
      let kickoffTask = await tx.crmTask.findFirst({
        where: {
          projectId: project.id,
          status: TaskStatus.A_FAIRE,
          type: TaskType.RENDEZ_VOUS,
        },
      });
      if (!kickoffTask) {
        kickoffTask = await tx.crmTask.create({
          data: {
            title: 'Organiser le rendez-vous de lancement',
            description:
              'Valider le planning, les contenus attendus et les interlocuteurs.',
            type: TaskType.RENDEZ_VOUS,
            priority: TaskPriority.HAUTE,
            dueAt: kickoffDueAt,
            clientId: quote.clientId,
            devisId: quote.id,
            projectId: project.id,
            factureId: depositInvoice?.id,
          },
        });
      }

      await tx.crmActivity.create({
        data: {
          type: ActivityType.CONVERSION,
          title: `Parcours commercial finalisé pour ${quote.number}`,
          description: depositInvoice
            ? `Projet créé et acompte de ${percentage}% préparé.`
            : 'Projet créé sans facture d’acompte.',
          clientId: quote.clientId,
          devisId: quote.id,
          projectId: project.id,
          factureId: depositInvoice?.id,
          leadId: quote.sourceLeadId,
        },
      });

      return {
        project,
        depositInvoice,
        kickoffTask,
      };
    });
  }
}
