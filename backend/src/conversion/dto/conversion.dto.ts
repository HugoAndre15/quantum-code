import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ConversionEventName } from '@prisma/client';

export class TrackConversionDto {
  @IsString()
  @MaxLength(100)
  sessionId: string;

  @IsEnum(ConversionEventName)
  name: ConversionEventName;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  landingPage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  medium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  term?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  device?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, string | number | boolean | null>;
}
