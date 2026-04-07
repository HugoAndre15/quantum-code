import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard, RoleGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('portfolio')
export class PortfolioController {
  constructor(private portfolio: PortfolioService) {}

  @Get('public')
  findAllPublic() {
    return this.portfolio.findAllPublic();
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get()
  findAll() {
    return this.portfolio.findAll();
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.portfolio.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post()
  create(
    @Body()
    body: {
      name: string;
      description: string;
      tag: string;
      languages: string[];
      link?: string;
      image?: string;
      position?: number;
      active?: boolean;
    },
  ) {
    return this.portfolio.create(body);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      tag?: string;
      languages?: string[];
      link?: string;
      image?: string;
      position?: number;
      active?: boolean;
    },
  ) {
    return this.portfolio.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.portfolio.remove(id);
  }
}
