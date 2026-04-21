import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { MailModule } from '../mail/mail.module';
import { DevisModule } from '../devis/devis.module';

@Module({
  imports: [MailModule, DevisModule],
  controllers: [SimulatorController],
  providers: [SimulatorService],
})
export class SimulatorModule {}
