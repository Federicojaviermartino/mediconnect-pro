/**
 * Create Patient DTO
 */

import { IsString, IsEmail, IsEnum, IsOptional, IsArray, IsObject, IsDate, IsNumber, Min, Max, IsBoolean, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BloodType, Gender } from '@mediconnect/types';

class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  zipCode: string;

  @IsString()
  country: string;
}

class AllergyDto {
  @IsString()
  name: string;

  @IsEnum(['mild', 'moderate', 'severe', 'life-threatening'])
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';

  @IsOptional()
  @IsString()
  reaction?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class EmergencyContactDto {
  @IsString()
  name: string;

  @IsString()
  relationship: string;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsBoolean()
  isPrimary: boolean;
}

export class CreatePatientDto {
  @IsString()
  userId: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @Type(() => Date)
  @IsDate()
  dateOfBirth: Date;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(300)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(500)
  weight?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllergyDto)
  allergies?: AllergyDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[];

  @IsOptional()
  @IsString()
  assignedDoctorId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
