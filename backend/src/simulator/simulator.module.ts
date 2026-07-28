import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { MailModule } from '../mail/mail.module';
import { ConversionModule } from '../conversion/conversion.module';

@Module({
  imports: [MailModule, ConversionModule],
  controllers: [SimulatorController],
  providers: [SimulatorService],
})
export class SimulatorModule {}
