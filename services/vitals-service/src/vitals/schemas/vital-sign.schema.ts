/**
 * Vital Sign Schema
 * MongoDB document for storing vital signs data
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { VitalSignType, MeasurementUnit, VitalSignStatus, DeviceType } from '@mediconnect/types';

export type VitalSignDocument = VitalSign & Document;

@Schema({ timestamps: true, collection: 'vital_signs' })
export class VitalSign {
  @Prop({ required: true, index: true })
  patientId: string;

  @Prop({ required: true, enum: VitalSignType, index: true })
  type: VitalSignType;

  @Prop({ required: true, type: Object })
  value: number | { systolic: number; diastolic: number; unit: string };

  @Prop({ required: true, enum: MeasurementUnit })
  unit: MeasurementUnit;

  @Prop({ required: true, enum: VitalSignStatus, default: VitalSignStatus.NORMAL })
  status: VitalSignStatus;

  @Prop({ required: true, type: Date, index: true })
  timestamp: Date;

  @Prop({ index: true })
  deviceId?: string;

  @Prop({ enum: DeviceType })
  deviceType?: DeviceType;

  @Prop()
  notes?: string;

  @Prop()
  measuredBy?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  isAlertTriggered: boolean;

  @Prop()
  alertLevel?: 'warning' | 'critical';

  @Prop()
  alertMessage?: string;

  // For ECG data
  @Prop({ type: Object })
  ecgData?: {
    waveform: number[];
    duration: number;
    samplingRate: number;
    leads?: string[];
  };

  // For temperature
  @Prop()
  measurementLocation?: 'oral' | 'rectal' | 'axillary' | 'tympanic' | 'temporal';

  // For glucose
  @Prop()
  measurementContext?: 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime' | 'random';

  // BMI category
  @Prop()
  bmiCategory?: 'underweight' | 'normal' | 'overweight' | 'obese';
}

export const VitalSignSchema = SchemaFactory.createForClass(VitalSign);

// Indexes for better query performance
VitalSignSchema.index({ patientId: 1, timestamp: -1 });
VitalSignSchema.index({ patientId: 1, type: 1, timestamp: -1 });
VitalSignSchema.index({ deviceId: 1, timestamp: -1 });
VitalSignSchema.index({ isAlertTriggered: 1, timestamp: -1 });
