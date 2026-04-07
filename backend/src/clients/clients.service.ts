import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    return this.prisma.client.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        pack: { select: { id: true, name: true, price: true } },
        options: {
          include: {
            serviceOption: { select: { id: true, name: true, price: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        pack: true,
        options: { include: { serviceOption: true } },
        devis: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
        factures: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!client) throw new NotFoundException('Client introuvable');
    return client;
  }

  async create(dto: CreateClientDto) {
    const { optionIds, contactDate, ...data } = dto;

    const client = await this.prisma.client.create({
      data: {
        ...data,
        contactDate: contactDate ? new Date(contactDate) : new Date(),
        ...(optionIds?.length && {
          options: {
            create: optionIds.map((serviceOptionId) => ({ serviceOptionId })),
          },
        }),
      },
      include: {
        pack: true,
        options: { include: { serviceOption: true } },
      },
    });

    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);

    const { optionIds, contactDate, ...data } = dto;

    if (optionIds !== undefined) {
      await this.prisma.clientOption.deleteMany({ where: { clientId: id } });
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...data,
        ...(contactDate && { contactDate: new Date(contactDate) }),
        ...(optionIds !== undefined && {
          options: {
            create: optionIds.map((serviceOptionId) => ({ serviceOptionId })),
          },
        }),
      },
      include: {
        pack: true,
        options: { include: { serviceOption: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.client.delete({ where: { id } });
    return { message: 'Client supprimé' };
  }

  async stats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.client.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count }),
        {},
      ),
    };
  }
}
