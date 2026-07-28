import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SimulatorLeadDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

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
  @IsArray()
  @IsString({ each: true })
  recurringOptionIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  pages?: number;

  /** Prix final estimé côté front, à titre indicatif (TVA non applicable) */
  @IsOptional()
  @IsNumber()
  estimatedTotal?: number;

  @IsOptional()
  @IsNumber()
  estimatedMin?: number;

  @IsOptional()
  @IsNumber()
  estimatedMax?: number;

  // ─── Brief métier ──────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(50)
  projectType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  primaryGoal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contentScale?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedFeatures?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(30)
  timeline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contentReadiness?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  supportChoice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  recommendationName?: string;
}
