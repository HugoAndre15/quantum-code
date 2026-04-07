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
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/promo-code.dto';
import { JwtAuthGuard, RoleGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('promo-codes')
export class PromoCodesController {
  constructor(private promoCodesService: PromoCodesService) {}

  // Public: validate a promo code
  @Get('validate')
  validate(@Query('code') code: string) {
    return this.promoCodesService.validate(code);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get()
  findAll() {
    return this.promoCodesService.findAll();
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promoCodesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post()
  create(@Body() dto: CreatePromoCodeDto) {
    return this.promoCodesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromoCodeDto) {
    return this.promoCodesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promoCodesService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post(':id/increment')
  incrementUsage(@Param('id') id: string) {
    return this.promoCodesService.incrementUsage(id);
  }
}
