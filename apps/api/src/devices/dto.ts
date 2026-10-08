import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateDeviceDto {
  @IsOptional() @IsString() @MaxLength(60) name?: string;
  @IsOptional() @IsString() @MaxLength(60) location?: string;
  @IsOptional() @IsString() @MaxLength(30) icon?: string;
  /** null remove a regra */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsNumber() @Min(1) @Max(10000) maxPowerW?: number | null;
}

export class RelayDto {
  @IsIn(['ON', 'OFF', 'TOGGLE']) state: 'ON' | 'OFF' | 'TOGGLE';
}

export class RangeQuery {
  @IsOptional() @IsIn(['1h', '6h', '24h', '7d']) range: '1h' | '6h' | '24h' | '7d' = '1h';
}

export class PeriodQuery {
  @IsOptional() @IsIn(['day', 'week', 'month']) period: 'day' | 'week' | 'month' = 'day';
}

export class LimitQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit = 50;
}
