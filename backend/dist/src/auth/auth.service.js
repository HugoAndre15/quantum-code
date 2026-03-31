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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwt;
    config;
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async register(dto) {
        const exists = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (exists) {
            throw new common_1.ConflictException('Un compte avec cet email existe déjà');
        }
        const hash = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hash,
                name: dto.name,
            },
        });
        return this.generateTokens(user.id, user.email, user.role);
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Email ou mot de passe incorrect');
        }
        const valid = await bcrypt.compare(dto.password, user.password);
        if (!valid) {
            throw new common_1.UnauthorizedException('Email ou mot de passe incorrect');
        }
        return this.generateTokens(user.id, user.email, user.role);
    }
    async refresh(userId, email, role) {
        return this.generateTokens(userId, email, role);
    }
    async logout(refreshToken) {
        await this.prisma.refreshToken.deleteMany({
            where: { token: refreshToken },
        });
        return { message: 'Déconnexion réussie' };
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException();
        }
        return user;
    }
    async generateTokens(userId, email, role) {
        const payload = { sub: userId, email, role };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.signAsync(payload, {
                secret: this.config.get('JWT_SECRET'),
                expiresIn: this.config.get('JWT_EXPIRES_IN'),
            }),
            this.jwt.signAsync(payload, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
                expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
            }),
        ]);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId,
                expiresAt,
            },
        });
        return {
            accessToken,
            refreshToken,
            user: { id: userId, email, role },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map