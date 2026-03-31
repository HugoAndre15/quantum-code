import { IsOptional, IsString } from 'class-validator';

export class UpdateFactureDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
