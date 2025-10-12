import { IsString, IsUUID, IsEnum, IsOptional, IsDateString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationType, ConsultationPriority } from '../entities/consultation.entity';

class SymptomDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['mild', 'moderate', 'severe'] })
  @IsEnum(['mild', 'moderate', 'severe'])
  severity: 'mild' | 'moderate' | 'severe';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateConsultationDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Doctor UUID' })
  @IsUUID()
  doctorId: string;

  @ApiPropertyOptional({ description: 'Appointment UUID reference' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiProperty({ enum: ConsultationType, default: ConsultationType.VIDEO })
  @IsEnum(ConsultationType)
  type: ConsultationType;

  @ApiPropertyOptional({ enum: ConsultationPriority, default: ConsultationPriority.ROUTINE })
  @IsOptional()
  @IsEnum(ConsultationPriority)
  priority?: ConsultationPriority;

  @ApiProperty({ description: 'Scheduled start time (ISO 8601)' })
  @IsDateString()
  scheduledStartTime: string;

  @ApiPropertyOptional({ description: 'Reason for visit' })
  @IsOptional()
  @IsString()
  reasonForVisit?: string;

  @ApiPropertyOptional({ description: 'Chief complaint' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional({ description: 'Patient symptoms', type: [SymptomDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SymptomDto)
  symptoms?: SymptomDto[];

  @ApiPropertyOptional({ description: 'Enable consultation recording', default: false })
  @IsOptional()
  @IsBoolean()
  isRecorded?: boolean;

  @ApiPropertyOptional({ description: 'Recording consent from patient', default: false })
  @IsOptional()
  @IsBoolean()
  recordingConsent?: boolean;

  @ApiPropertyOptional({ description: 'Patient notes before consultation' })
  @IsOptional()
  @IsString()
  patientNotes?: string;
}
