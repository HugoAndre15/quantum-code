import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { OffersModule } from './offers/offers.module';
import { DevisModule } from './devis/devis.module';
import { FacturesModule } from './factures/factures.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { ContactModule } from './contact/contact.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 3 },   // 3 req/sec
        { name: 'medium', ttl: 10000, limit: 20 }, // 20 req/10sec
        { name: 'long', ttl: 60000, limit: 100 },  // 100 req/min
      ],
    }),
    PrismaModule,
    AuthModule,
    ClientsModule,
    OffersModule,
    DevisModule,
    FacturesModule,
    DashboardModule,
    PortfolioModule,
    PromoCodesModule,
    ContactModule,
  ],
providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
