import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({ orderBy: { position: 'asc' } });
  }

  findAllPublic() {
    return this.prisma.project.findMany({
      where: { active: true },
      orderBy: { position: 'asc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  create(data: {
    name: string;
    description: string;
    tag: string;
    languages: string[];
    link?: string;
    image?: string;
    position?: number;
    active?: boolean;
  }) {
    return this.prisma.project.create({ data });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      tag?: string;
      languages?: string[];
      link?: string;
      image?: string;
      position?: number;
      active?: boolean;
    },
  ) {
    await this.findOne(id);
    return this.prisma.project.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Projet supprimé' };
  }
}
