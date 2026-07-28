import { Module } from '@nestjs/common';
import { DevisModule } from '../../devis/devis.module';
import { LeadsModule } from '../leads/leads.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [LeadsModule, DevisModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
})
export class WorkflowModule {}
