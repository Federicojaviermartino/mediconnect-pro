/**
 * Create Appointment DTO
 */

import { IsString, IsEnum, IsDate, IsOptional, MinDate } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentType } from '../entities/appointment.entity';

export class CreateAppointmentDto {
  @IsString()
  patientId: string;

  @IsString()
  doctorId: string;

  @IsEnum(AppointmentType)
  type: AppointmentType;

  @Type(() => Date)
  @IsDate()
  @MinDate(new Date())
  scheduledStart: Date;

  @Type(() => Date)
  @IsDate()
  scheduledEnd: Date;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
