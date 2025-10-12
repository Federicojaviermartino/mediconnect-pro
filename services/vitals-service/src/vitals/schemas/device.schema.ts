/**
 * Device Schema
 * MongoDB document for IoT device management
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DeviceType } from '@mediconnect/types';

export type DeviceDocument = Device & Document;

@Schema({ timestamps: true, collection: 'devices' })
export class Device {
  @Prop({ required: true, unique: true, index: true })
  deviceId: string;

  @Prop({ required: true, index: true })
  patientId: string;

  @Prop({ required: true, enum: DeviceType })
  deviceType: DeviceType;

  @Prop({ required: true })
  manufacturer: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  serialNumber: string;

  @Prop()
  firmwareVersion?: string;

  @Prop({ type: Date })
  registeredAt: Date;

  @Prop({ type: Date })
  lastSync?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ type: Date })
  lastOnline?: Date;

  @Prop({ type: Date })
  calibrationDate?: Date;

  @Prop({ type: Date })
  nextCalibrationDate?: Date;

  @Prop({ type: Number, min: 0, max: 100 })
  batteryLevel?: number;

  @Prop({ type: Object })
  settings?: {
    measurementInterval?: number; // seconds
    autoSync?: boolean;
    alertsEnabled?: boolean;
  };

  @Prop({ type: Object })
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };

  @Prop()
  notes?: string;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);

// Indexes
DeviceSchema.index({ patientId: 1, isActive: 1 });
DeviceSchema.index({ deviceType: 1, isActive: 1 });
