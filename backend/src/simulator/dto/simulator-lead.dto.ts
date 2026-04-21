import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SimulatorLeadDto {
  // ─── Coordonnées client ─────────────────────
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsOptional()
  @IsString()
  trade?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  message?: string;

  // ─── Choix de simulation ────────────────────
  /** "pack" | "custom" */
  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  packId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  pages?: number;

  /** Total estimé (HT) calculé côté front, à titre indicatif */
  @IsOptional()
  @IsNumber()
  estimatedTotal?: number;
}
