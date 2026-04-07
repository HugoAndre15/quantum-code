import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePackDto,
  UpdatePackDto,
  CreateOptionDto,
  UpdateOptionDto,
} from './dto/offers.dto';

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  // ─── Public ─────────────────────────────────

  async findActivePacks() {
    return this.prisma.pack.findMany({
      where: { active: true },
      orderBy: { position: 'asc' },
    });
  }

  async findActiveOptions() {
    return this.prisma.serviceOption.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Packs ──────────────────────────────────

  async findAllPacks() {
    return this.prisma.pack.findMany({
      orderBy: { position: 'asc' },
    });
  }

  async createPack(dto: CreatePackDto) {
    return this.prisma.pack.create({ data: dto });
  }

  async updatePack(id: string, dto: UpdatePackDto) {
    const pack = await this.prisma.pack.findUnique({ where: { id } });
    if (!pack) throw new NotFoundException('Pack introuvable');
    return this.prisma.pack.update({ where: { id }, data: dto });
  }

  async removePack(id: string) {
    const pack = await this.prisma.pack.findUnique({ where: { id } });
    if (!pack) throw new NotFoundException('Pack introuvable');
    await this.prisma.pack.delete({ where: { id } });
    return { message: 'Pack supprimé' };
  }

  // ─── Options ────────────────────────────────

  async findAllOptions(category?: string) {
    return this.prisma.serviceOption.findMany({
      where: category ? { category } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createOption(dto: CreateOptionDto) {
    return this.prisma.serviceOption.create({ data: dto });
  }

  async updateOption(id: string, dto: UpdateOptionDto) {
    const opt = await this.prisma.serviceOption.findUnique({ where: { id } });
    if (!opt) throw new NotFoundException('Option introuvable');
    return this.prisma.serviceOption.update({ where: { id }, data: dto });
  }

  async removeOption(id: string) {
    const opt = await this.prisma.serviceOption.findUnique({ where: { id } });
    if (!opt) throw new NotFoundException('Option introuvable');
    await this.prisma.serviceOption.delete({ where: { id } });
    return { message: 'Option supprimée' };
  }
}
