import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeadSource, LeadStatus, ProspectWebsiteStatus } from '@prisma/client';
import { ConvertLeadDto } from '../../commercial/dto/commercial.dto';

export { ConvertLeadDto };

export class CreateLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  trade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsEnum(ProspectWebsiteStatus)
  websiteStatus?: ProspectWebsiteStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  need?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  campaign?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  delayMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageCount?: number;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  packId?: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  delayMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  trade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsEnum(ProspectWebsiteStatus)
  websiteStatus?: ProspectWebsiteStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  need?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lostReason?: string;
}

export class ImportLeadsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateLeadDto)
  rows: CreateLeadDto[];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  campaign?: string;
}
