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
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('offers')
export class OffersController {
  constructor(private offers: OffersService) {}

  // ─── Packs ──────────────────────────────────

  @Get('packs')
  findAllPacks() {
    return this.offers.findAllPacks();
  }

  @Post('packs')
  createPack(@Body() dto: CreatePackDto) {
    return this.offers.createPack(dto);
  }

  @Put('packs/:id')
  updatePack(@Param('id') id: string, @Body() dto: UpdatePackDto) {
    return this.offers.updatePack(id, dto);
  }

  @Delete('packs/:id')
  removePack(@Param('id') id: string) {
    return this.offers.removePack(id);
  }

  // ─── Options ────────────────────────────────

  @Get('options')
  findAllOptions(@Query('category') category?: string) {
    return this.offers.findAllOptions(category);
  }

  @Post('options')
  createOption(@Body() dto: CreateOptionDto) {
    return this.offers.createOption(dto);
  }

  @Put('options/:id')
  updateOption(@Param('id') id: string, @Body() dto: UpdateOptionDto) {
    return this.offers.updateOption(id, dto);
  }

  @Delete('options/:id')
  removeOption(@Param('id') id: string) {
    return this.offers.removeOption(id);
  }
}
