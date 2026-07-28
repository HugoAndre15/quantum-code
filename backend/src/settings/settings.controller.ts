import { Body, Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard, RoleGuard } from '../auth/guards/jwt.guard';
import { SettingsService } from './settings.service';

interface ConfirmationBody {
  confirmation?: string;
}

@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('settings/crm')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('summary')
  summary() {
    return this.settings.getSummary();
  }

  @Delete('leads')
  clearLeads(@Body() body: ConfirmationBody) {
    return this.settings.clearLeads(body.confirmation);
  }

  @Delete('quotes')
  clearQuotes(@Body() body: ConfirmationBody) {
    return this.settings.clearQuotes(body.confirmation);
  }

  @Delete('clients')
  clearClients(@Body() body: ConfirmationBody) {
    return this.settings.clearClients(body.confirmation);
  }

  @Delete('reset')
  resetCrm(@Body() body: ConfirmationBody) {
    return this.settings.resetCrm(body.confirmation);
  }
}
