import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import {
  ConvertLeadDto,
  CreateLeadDto,
  ImportLeadsDto,
  UpdateLeadDto,
} from './dto/lead.dto';
import { JwtAuthGuard, RoleGuard } from '../../auth/guards/jwt.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('crm/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll() {
    return this.leadsService.findAll();
  }

  @Post('import')
  importCsv(@Body() dto: ImportLeadsDto) {
    return this.leadsService.importCsv(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }

  /** Crée ou rattache la fiche Client nécessaire aux documents commerciaux. */
  @Post(':id/convert')
  convert(@Param('id') id: string, @Body() dto: ConvertLeadDto) {
    return this.leadsService.convert(id, dto);
  }
}
