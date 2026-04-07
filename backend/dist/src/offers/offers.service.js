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
exports.OffersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OffersService = class OffersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
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
    async findAllPacks() {
        return this.prisma.pack.findMany({
            orderBy: { position: 'asc' },
        });
    }
    async createPack(dto) {
        return this.prisma.pack.create({ data: dto });
    }
    async updatePack(id, dto) {
        const pack = await this.prisma.pack.findUnique({ where: { id } });
        if (!pack)
            throw new common_1.NotFoundException('Pack introuvable');
        return this.prisma.pack.update({ where: { id }, data: dto });
    }
    async removePack(id) {
        const pack = await this.prisma.pack.findUnique({ where: { id } });
        if (!pack)
            throw new common_1.NotFoundException('Pack introuvable');
        await this.prisma.pack.delete({ where: { id } });
        return { message: 'Pack supprimé' };
    }
    async findAllOptions(category) {
        return this.prisma.serviceOption.findMany({
            where: category ? { category } : undefined,
            orderBy: { name: 'asc' },
        });
    }
    async createOption(dto) {
        return this.prisma.serviceOption.create({ data: dto });
    }
    async updateOption(id, dto) {
        const opt = await this.prisma.serviceOption.findUnique({ where: { id } });
        if (!opt)
            throw new common_1.NotFoundException('Option introuvable');
        return this.prisma.serviceOption.update({ where: { id }, data: dto });
    }
    async removeOption(id) {
        const opt = await this.prisma.serviceOption.findUnique({ where: { id } });
        if (!opt)
            throw new common_1.NotFoundException('Option introuvable');
        await this.prisma.serviceOption.delete({ where: { id } });
        return { message: 'Option supprimée' };
    }
};
exports.OffersService = OffersService;
exports.OffersService = OffersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OffersService);
//# sourceMappingURL=offers.service.js.map