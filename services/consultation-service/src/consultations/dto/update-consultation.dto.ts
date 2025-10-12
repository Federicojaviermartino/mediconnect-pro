import { IsString, IsOptional, IsInt, IsArray, ValidateNested, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationStatus } from '../entities/consultation.entity';

class PrescriptionDto {
  @ApiPropertyOptional()
  @IsString()
  medication: string;

  @ApiPropertyOptional()
  @IsString()
  dosage: string;

  @ApiPropertyOptional()
  @IsString()
  frequency: string;

  @ApiPropertyOptional()
  @IsString()
  duration: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;
}

class FollowUpDto {
  @ApiPropertyOptional()
  @IsOptional()
  required: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;
}

class VitalsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  heartRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  bloodPressure?: { systolic: number; diastolic: number };

  @ApiPropertyOptional()
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  oxygenSaturation?: number;

  @ApiPropertyOptional()
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  height?: number;
}

export class UpdateConsultationDto {
  @ApiPropertyOptional({ enum: ConsultationStatus })
  @IsOptional()
  @IsEnum(ConsultationStatus)
  status?: ConsultationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiPropertyOptional({ type: [PrescriptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionDto)
  prescriptions?: PrescriptionDto[];

  @ApiPropertyOptional({ type: FollowUpDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FollowUpDto)
  followUp?: FollowUpDto;

  @ApiPropertyOptional({ type: VitalsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VitalsDto)
  vitals?: VitalsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doctorPrivateNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doctorSharedNotes?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  patientRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientFeedback?: string;
}
