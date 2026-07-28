import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard, RoleGuard } from '../../auth/guards/jwt.guard';
import {
  ConvertLeadDto,
  FinalizeQuoteDto,
} from '../commercial/dto/commercial.dto';
import { WorkflowService } from './workflow.service';

@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('crm/workflow')
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Post('leads/:id/convert')
  convertLead(@Param('id') id: string, @Body() dto: ConvertLeadDto) {
    return this.workflow.convertLead(id, dto);
  }

  @Post('leads/:id/quote')
  createQuoteFromLead(@Param('id') id: string) {
    return this.workflow.createQuoteFromLead(id);
  }

  @Post('quotes/:id/finalize')
  finalizeQuote(@Param('id') id: string, @Body() dto: FinalizeQuoteDto) {
    return this.workflow.finalizeQuote(id, dto);
  }
}
