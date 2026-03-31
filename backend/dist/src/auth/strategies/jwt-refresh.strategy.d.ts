import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
declare const JwtRefreshStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtRefreshStrategy extends JwtRefreshStrategy_base {
    private prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: {
        sub: string;
        email: string;
    }): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
    }>;
}
export {};
