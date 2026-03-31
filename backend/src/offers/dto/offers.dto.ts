import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsInt, IsEnum } from 'class-validator';
import { PackType } from '@prisma/client';
export { PackType };

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
}

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
