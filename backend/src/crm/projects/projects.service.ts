import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ActivityType } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.clientProject.findMany({
      include: {
        client: { select: { id: true, company: true, contactName: true, email: true } },
        devis: { select: { id: true, number: true, totalHT: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Vue Kanban : projects groupés par statut */
  async findByStatus() {
    const projects = await this.prisma.clientProject.findMany({
      include: {
        client: { select: { id: true, company: true, contactName: true } },
        devis: { select: { id: true, number: true, totalHT: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const statuses = ['EN_ATTENTE', 'EN_COURS', 'EN_LIGNE', 'LIVRE', 'ARCHIVE'] as const;
    const kanban: Record<string, typeof projects> = {};
    for (const s of statuses) kanban[s] = [];
    for (const p of projects) {
      if (kanban[p.status]) kanban[p.status].push(p);
    }
    return kanban;
  }

  async findOne(id: string) {
    const project = await this.prisma.clientProject.findUnique({
      where: { id },
      include: {
        client: true,
        devis: { include: { items: true, factures: true } },
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  async create(dto: CreateProjectDto) {
    return this.prisma.clientProject.create({
      data: {
        clientId: dto.clientId,
        name: dto.name,
        status: dto.status,
        productionUrl: dto.productionUrl,
        notes: dto.notes,
        ...(dto.devisId && { devisId: dto.devisId }),
      },
      include: {
        client: { select: { id: true, company: true, contactName: true } },
      },
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.prisma.clientProject.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Projet introuvable');
    const updated = await this.prisma.clientProject.update({
      where: { id },
      data: dto,
      include: {
        client: { select: { id: true, company: true, contactName: true } },
      },
    });
    if (dto.status && dto.status !== project.status) {
      await this.prisma.crmActivity.create({
        data: {
          type: ActivityType.STATUT,
          title: `Projet : ${project.status} → ${dto.status}`,
          clientId: project.clientId,
          devisId: project.devisId,
          projectId: project.id,
        },
      });
    }
    return updated;
  }

  async remove(id: string) {
    const project = await this.prisma.clientProject.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Projet introuvable');
    await this.prisma.clientProject.delete({ where: { id } });
    return { message: 'Projet supprimé' };
  }
}
