import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConversionService } from './conversion.service';
import { TrackConversionDto } from './dto/conversion.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard, RoleGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('conversion')
export class ConversionController {
  constructor(private readonly conversion: ConversionService) {}

  @Public()
  @Post('track')
  @Throttle({ medium: { ttl: 60000, limit: 60 } })
  track(@Body() dto: TrackConversionDto) {
    return this.conversion.track(dto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('stats')
  stats(@Query('days') days?: string) {
    return this.conversion.stats(Number(days) || 30);
  }
}
