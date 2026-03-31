import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';

export enum ClientStatus {
  A_CONTACTER = 'A_CONTACTER',
  CONTACTE = 'CONTACTE',
  DEVIS = 'DEVIS',
  FACTURE = 'FACTURE',
  EN_COURS = 'EN_COURS',
  TERMINE = 'TERMINE',
  REFUSE = 'REFUSE',
}

export class CreateClientDto {
  @IsString()
  company: string;

  @IsString()
  trade: string;

  @IsString()
  contactName: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsDateString()
  contactDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  onlinePresence?: string[];

  @IsOptional()
  @IsString()
  packId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionIds?: string[];
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  trade?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsDateString()
  contactDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  onlinePresence?: string[];

  @IsOptional()
  @IsString()
  packId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionIds?: string[];
}
