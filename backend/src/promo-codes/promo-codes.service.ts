import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/promo-code.dto';

@Injectable()
export class PromoCodesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Code promo introuvable');
    return promo;
  }

  async findByCode(code: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { code } });
    if (!promo) throw new NotFoundException('Code promo introuvable');
    return promo;
  }

  async validate(code: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { code } });
    if (!promo) return { valid: false, message: 'Code promo introuvable' };
    if (!promo.active) return { valid: false, message: 'Code promo désactivé' };
    const now = new Date();
    if (promo.startDate && now < promo.startDate)
      return { valid: false, message: 'Code promo pas encore actif' };
    if (promo.endDate && now > promo.endDate)
      return { valid: false, message: 'Code promo expiré' };
    if (promo.maxUses && promo.currentUses >= promo.maxUses)
      return { valid: false, message: "Limite d'utilisation atteinte" };
    return { valid: true, promo };
  }

  async create(dto: CreatePromoCodeDto) {
    return this.prisma.promoCode.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        discountType: dto.discountType || 'PERCENTAGE',
        discountValue: dto.discountValue,
        minAmount: dto.minAmount,
        maxUses: dto.maxUses,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePromoCodeDto) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Code promo introuvable');

    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) data.code = dto.code.toUpperCase();
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.discountValue !== undefined) data.discountValue = dto.discountValue;
    if (dto.minAmount !== undefined) data.minAmount = dto.minAmount;
    if (dto.maxUses !== undefined) data.maxUses = dto.maxUses;
    if (dto.startDate !== undefined)
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.active !== undefined) data.active = dto.active;

    return this.prisma.promoCode.update({ where: { id }, data });
  }

  async remove(id: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Code promo introuvable');
    await this.prisma.promoCode.delete({ where: { id } });
    return { message: 'Code promo supprimé' };
  }

  async incrementUsage(id: string) {
    return this.prisma.promoCode.update({
      where: { id },
      data: { currentUses: { increment: 1 } },
    });
  }
}
