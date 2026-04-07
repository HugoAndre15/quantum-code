import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
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
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/portfolio',
        filename: (_req, file, cb) => {
          const unique = randomUUID();
          const ext = extname(file.originalname);
          cb(null, `${unique}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg)$/i)) {
          cb(new BadRequestException("Format d'image non supporté"), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier envoyé');
    return { url: `/uploads/portfolio/${file.filename}` };
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
