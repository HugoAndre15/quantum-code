import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePackDto,
  UpdatePackDto,
  CreateOptionDto,
  UpdateOptionDto,
  UpdatePricingBaseDto,
} from './dto/offers.dto';

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  // ─── Pricing Base ──────────────────────────

  async getPricingBase() {
    let base = await this.prisma.pricingBase.findFirst();
    if (!base) {
      base = await this.prisma.pricingBase.create({
        data: {
          name: 'Base site web',
          basePrice: 300,
          pagePrice: 70,
          basePages: 1,
          devTimeBase: 8,
          devTimePage: 2,
        },
      });
    }
    return base;
  }

  async updatePricingBase(dto: UpdatePricingBaseDto) {
    const base = await this.getPricingBase();
    return this.prisma.pricingBase.update({
      where: { id: base.id },
      data: dto,
    });
  }

  // ─── Public ─────────────────────────────────

  async findActivePacks() {
    return this.prisma.pack.findMany({
      where: { active: true },
      orderBy: { position: 'asc' },
      include: {
        includedOptions: {
          include: { serviceOption: true },
        },
      },
    });
  }

  async findActiveOptions() {
    return this.prisma.serviceOption.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async getPublicPricing() {
    const [base, packs, options] = await Promise.all([
      this.getPricingBase(),
      this.findActivePacks(),
      this.findActiveOptions(),
    ]);
    return { base, packs, options };
  }

  // ─── Packs ──────────────────────────────────

  async findAllPacks() {
    return this.prisma.pack.findMany({
      orderBy: { position: 'asc' },
      include: {
        includedOptions: {
          include: { serviceOption: true },
        },
      },
    });
  }

  async createPack(dto: CreatePackDto) {
    const { includedOptionIds, ...packData } = dto;
    return this.prisma.pack.create({
      data: {
        ...packData,
        includedOptions: includedOptionIds?.length
          ? {
              create: includedOptionIds.map((id) => ({
                serviceOptionId: id,
              })),
            }
          : undefined,
      },
      include: {
        includedOptions: { include: { serviceOption: true } },
      },
    });
  }

  async updatePack(id: string, dto: UpdatePackDto) {
    const pack = await this.prisma.pack.findUnique({ where: { id } });
    if (!pack) throw new NotFoundException('Pack introuvable');

    const { includedOptionIds, ...packData } = dto;

    // If includedOptionIds is provided, replace all included options
    if (includedOptionIds !== undefined) {
      await this.prisma.packOption.deleteMany({ where: { packId: id } });
      if (includedOptionIds.length > 0) {
        await this.prisma.packOption.createMany({
          data: includedOptionIds.map((optId) => ({
            packId: id,
            serviceOptionId: optId,
          })),
        });
      }
    }

    return this.prisma.pack.update({
      where: { id },
      data: packData,
      include: {
        includedOptions: { include: { serviceOption: true } },
      },
    });
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
