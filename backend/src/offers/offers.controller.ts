import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import {
  CreatePackDto,
  UpdatePackDto,
  CreateOptionDto,
  UpdateOptionDto,
} from './dto/offers.dto';
import { JwtAuthGuard, RoleGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('offers')
export class OffersController {
  constructor(private offers: OffersService) {}

  // ─── Public (no auth) ───────────────────────

  @Get('packs/public')
  findPublicPacks() {
    return this.offers.findActivePacks();
  }

  @Get('options/public')
  findPublicOptions() {
    return this.offers.findActiveOptions();
  }

  // ─── Packs ──────────────────────────────────

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('packs')
  findAllPacks() {
    return this.offers.findAllPacks();
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('packs')
  createPack(@Body() dto: CreatePackDto) {
    return this.offers.createPack(dto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Put('packs/:id')
  updatePack(@Param('id') id: string, @Body() dto: UpdatePackDto) {
    return this.offers.updatePack(id, dto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete('packs/:id')
  removePack(@Param('id') id: string) {
    return this.offers.removePack(id);
  }

  // ─── Options ────────────────────────────────

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('options')
  findAllOptions(@Query('category') category?: string) {
    return this.offers.findAllOptions(category);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('options')
  createOption(@Body() dto: CreateOptionDto) {
    return this.offers.createOption(dto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Put('options/:id')
  updateOption(@Param('id') id: string, @Body() dto: UpdateOptionDto) {
    return this.offers.updateOption(id, dto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete('options/:id')
  removeOption(@Param('id') id: string) {
    return this.offers.removeOption(id);
  }
}
