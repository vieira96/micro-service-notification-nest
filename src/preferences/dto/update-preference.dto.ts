import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PreferenceType } from '@/generated/prisma/client';

export class UpdatePreferenceDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsEnum(PreferenceType)
  type?: PreferenceType;
}
