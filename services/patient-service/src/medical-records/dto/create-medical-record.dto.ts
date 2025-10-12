/**
 * Create Medical Record DTO
 */

import { IsString, IsEnum, IsDate, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RecordType } from '../entities/medical-record.entity';

class DiagnosisDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsEnum(['mild', 'moderate', 'severe', 'critical'])
  severity: 'mild' | 'moderate' | 'severe' | 'critical';

  @IsOptional()
  @IsString()
  notes?: string;
}

class MedicationDto {
  @IsString()
  name: string;

  @IsString()
  dosage: string;

  @IsString()
  frequency: string;

  @IsString()
  duration: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateMedicalRecordDto {
  @IsString()
  patientId: string;

  @IsEnum(RecordType)
  type: RecordType;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @Type(() => Date)
  @IsDate()
  recordDate: Date;

  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  consultationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DiagnosisDto)
  diagnosis?: DiagnosisDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications?: MedicationDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @IsOptional()
  @IsBoolean()
  isConfidential?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
