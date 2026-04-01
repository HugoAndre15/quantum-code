import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { OffersModule } from './offers/offers.module';
import { DevisModule } from './devis/devis.module';
import { FacturesModule } from './factures/factures.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ClientsModule,
    OffersModule,
    DevisModule,
    FacturesModule,
    DashboardModule,
    PortfolioModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
