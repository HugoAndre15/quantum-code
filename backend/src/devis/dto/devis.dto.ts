import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsInt,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDevisItemDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  devTime?: number;

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @IsOptional()
  @IsString()
  recurringUnit?: string;

  @IsOptional()
  @IsString()
  packId?: string;

  @IsOptional()
  @IsString()
  serviceOptionId?: string;
}

export class CreateDevisDto {
  @IsString()
  clientId: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDevisItemDto)
  items: CreateDevisItemDto[];
}

export class UpdateDevisDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDevisItemDto)
  items?: CreateDevisItemDto[];
}
