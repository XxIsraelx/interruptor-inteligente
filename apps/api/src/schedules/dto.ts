import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class CreateScheduleDto {
  @IsIn(['ON', 'OFF']) action: 'ON' | 'OFF';
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time deve ser HH:mm' }) time: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true })
  daysOfWeek: number[];
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class UpdateScheduleDto {
  @IsOptional() @IsIn(['ON', 'OFF']) action?: 'ON' | 'OFF';
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) time?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true })
  daysOfWeek?: number[];
  @IsOptional() @IsBoolean() enabled?: boolean;
}
