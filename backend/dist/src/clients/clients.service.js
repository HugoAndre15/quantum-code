"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ClientsService = class ClientsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(status) {
        return this.prisma.client.findMany({
            where: status ? { status: status } : undefined,
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
    async findOne(id) {
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: {
                pack: true,
                options: { include: { serviceOption: true } },
            },
        });
        if (!client)
            throw new common_1.NotFoundException('Client introuvable');
        return client;
    }
    async create(dto) {
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
    async update(id, dto) {
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
    async remove(id) {
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
            byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
        };
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map