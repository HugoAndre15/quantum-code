import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard, RoleGuard } from '../auth/guards/jwt.guard';
import {
  CreatePaymentDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from './dto/sales.dto';
import { SalesService } from './sales.service';

@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get('payments')
  findPayments() {
    return this.sales.findPayments();
  }

  @Post('payments')
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.sales.createPayment(dto);
  }

  @Get('subscriptions')
  findSubscriptions() {
    return this.sales.findSubscriptions();
  }

  @Post('subscriptions')
  createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.sales.createSubscription(dto);
  }

  @Patch('subscriptions/:id')
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.sales.updateSubscription(id, dto);
  }
}
