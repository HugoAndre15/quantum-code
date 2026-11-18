import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsInt,
  IsBoolean,
  IsDateString,
  Min,
  IsNotEmpty,
  ArrayMinSize,
  Equals,
  Matches,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SignContractDto {
  @IsString() @Length(2, 100) @Matches(/^\S[^\r\n\u0000-\u001f\u007f]*\S$/u)
  signerName: string;

  @IsString() @Length(2, 100) @Matches(/^\S[^\r\n\u0000-\u001f\u007f]*\S$/u)
  signerRole: string;

  @Equals(true) acceptsContract: boolean;
  @Equals(true) confirmsB2BRemote: boolean;
  @IsString() @Matches(/^[a-f0-9]{64}$/)
  digest: string;
}

export class CreateDevisItemDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
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
  @IsString()
  sourceLeadId?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // New pricing fields
  @IsOptional()
  @IsString()
  packId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionIds?: string[];

  @IsOptional()
  @IsInt()
  pages?: number;

  @IsOptional()
  @IsString()
  promoCode?: string;

  // Legacy: direct items (for manual/edit mode)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDevisItemDto)
  items?: CreateDevisItemDto[];
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
  @IsString()
  promoCode?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDevisItemDto)
  items?: CreateDevisItemDto[];
}
