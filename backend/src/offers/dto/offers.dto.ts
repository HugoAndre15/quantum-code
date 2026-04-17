import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsInt, IsEnum } from 'class-validator';
import { PackType } from '@prisma/client';
export { PackType };

// ─── Pricing Base ────────────────────────────

export class UpdatePricingBaseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  pagePrice?: number;

  @IsOptional()
  @IsInt()
  basePages?: number;

  @IsOptional()
  @IsNumber()
  devTimeBase?: number;

  @IsOptional()
  @IsNumber()
  devTimePage?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// ─── Pack ────────────────────────────────────

export class CreatePackDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsEnum(PackType)
  type?: PackType;

  @IsOptional()
  @IsNumber()
  devTime?: number;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsInt()
  includedPages?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includedOptionIds?: string[];
}

export class UpdatePackDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsEnum(PackType)
  type?: PackType;

  @IsOptional()
  @IsNumber()
  devTime?: number;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsInt()
  includedPages?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includedOptionIds?: string[];
}

// ─── Option ──────────────────────────────────

export class CreateOptionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  category?: string;

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
  @IsBoolean()
  active?: boolean;
}

export class UpdateOptionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  category?: string;

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
  @IsBoolean()
  active?: boolean;
}
