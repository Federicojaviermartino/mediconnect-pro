/**
 * Create Vital Sign DTO
 */

import { IsString, IsEnum, IsNumber, IsOptional, IsDate, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VitalSignType, MeasurementUnit, DeviceType } from '@mediconnect/types';

class BloodPressureDto {
  @IsNumber()
  systolic: number;

  @IsNumber()
  diastolic: number;

  @IsEnum(MeasurementUnit)
  unit: MeasurementUnit;
}

export class CreateVitalSignDto {
  @IsString()
  patientId: string;

  @IsEnum(VitalSignType)
  type: VitalSignType;

  // Can be a number or blood pressure object
  @IsOptional()
  value?: number | BloodPressureDto;

  @IsEnum(MeasurementUnit)
  unit: MeasurementUnit;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  timestamp?: Date;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  measuredBy?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  measurementLocation?: 'oral' | 'rectal' | 'axillary' | 'tympanic' | 'temporal';

  @IsOptional()
  @IsString()
  measurementContext?: 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime' | 'random';
}
