import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import {
  PaymentMethod,
  PaymentType,
  SubInterval,
  SubStatus,
  SubType,
} from '@prisma/client';

export class CreatePaymentDto {
  @IsString()
  invoiceId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(PaymentType)
  type: PaymentType;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsDateString()
  paidAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSubscriptionDto {
  @IsString()
  clientId: string;

  @IsEnum(SubType)
  type: SubType;

  @IsEnum(SubInterval)
  interval: SubInterval;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSubscriptionDto {
  @IsEnum(SubStatus)
  status: SubStatus;
}
