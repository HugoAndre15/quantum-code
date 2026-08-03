import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { StripeModule } from '../stripe/stripe.module';
import { SalesService } from './sales.service';

@Module({
  imports: [StripeModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
