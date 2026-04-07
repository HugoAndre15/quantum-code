import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard, JwtRefreshGuard, RoleGuard } from './guards/jwt.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('SUPER_ADMIN')
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.auth.register(dto);
    this.setCookies(res, data.accessToken, data.refreshToken);
    return { user: data.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.auth.login(dto);
    this.setCookies(res, data.accessToken, data.refreshToken);
    return { user: data.user };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefreshToken = req.cookies?.refreshToken;
    const data = await this.auth.refresh(
      req.user.id,
      req.user.email,
      req.user.role,
      oldRefreshToken,
    );
    this.setCookies(res, data.accessToken, data.refreshToken);
    return { user: data.user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await this.auth.logout(refreshToken);
    }
    this.clearCookies(res);
    return { message: 'Déconnexion réussie' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return this.auth.getProfile(req.user.id);
  }

  private setCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
  }
}
