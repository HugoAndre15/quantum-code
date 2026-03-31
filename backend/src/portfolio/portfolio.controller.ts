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
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@Controller('portfolio')
export class PortfolioController {
  constructor(private portfolio: PortfolioService) {}

  @Get('public')
  findAllPublic() {
    return this.portfolio.findAllPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.portfolio.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.portfolio.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.portfolio.remove(id);
  }
}
