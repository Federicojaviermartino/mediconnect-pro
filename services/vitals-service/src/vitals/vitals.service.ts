/**
 * Vitals Service
 * Business logic for vital signs management
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { VitalSign, VitalSignDocument } from './schemas/vital-sign.schema';
import { CreateVitalSignDto } from './dto/create-vital-sign.dto';
import { VitalSignType, VitalSignStatus, determineVitalStatus } from '@mediconnect/types';

@Injectable()
export class VitalsService {
  constructor(
    @InjectModel(VitalSign.name)
    private vitalSignModel: Model<VitalSignDocument>,
    private configService: ConfigService,
  ) {}

  /**
   * Create new vital sign record
   */
  async create(createVitalSignDto: CreateVitalSignDto): Promise<VitalSign> {
    const timestamp = createVitalSignDto.timestamp || new Date();

    // Determine status based on thresholds
    const status = this.calculateStatus(
      createVitalSignDto.type,
      createVitalSignDto.value,
    );

    // Check if alert should be triggered
    const alertInfo = this.checkAlertThreshold(
      createVitalSignDto.type,
      createVitalSignDto.value,
    );

    const vitalSign = new this.vitalSignModel({
      ...createVitalSignDto,
      timestamp,
      status,
      isAlertTriggered: alertInfo.isAlert,
      alertLevel: alertInfo.level,
      alertMessage: alertInfo.message,
    });

    const saved = await vitalSign.save();

    // TODO: Emit event via Kafka if alert triggered
    // TODO: Send WebSocket notification

    return saved;
  }

  /**
   * Find all vital signs with filters
   */
  async findAll(filters: any, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.patientId) {
      query.patientId = filters.patientId;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.deviceId) {
      query.deviceId = filters.deviceId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.isAlertTriggered !== undefined) {
      query.isAlertTriggered = filters.isAlertTriggered;
    }

    if (filters.startDate && filters.endDate) {
      query.timestamp = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const [vitals, total] = await Promise.all([
      this.vitalSignModel
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.vitalSignModel.countDocuments(query).exec(),
    ]);

    return {
      vitals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get vital signs for a patient
   */
  async findByPatient(patientId: string, type?: VitalSignType, limit: number = 100) {
    const query: any = { patientId };
    if (type) {
      query.type = type;
    }

    return this.vitalSignModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get latest vital signs for a patient (one per type)
   */
  async getLatestByPatient(patientId: string) {
    const types = Object.values(VitalSignType);
    const latestVitals = await Promise.all(
      types.map((type) =>
        this.vitalSignModel
          .findOne({ patientId, type })
          .sort({ timestamp: -1 })
          .exec(),
      ),
    );

    return latestVitals.filter((v) => v !== null);
  }

  /**
   * Get vital sign trends/statistics
   */
  async getTrends(patientId: string, type: VitalSignType, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const vitals = await this.vitalSignModel
      .find({
        patientId,
        type,
        timestamp: { $gte: startDate },
      })
      .sort({ timestamp: 1 })
      .exec();

    if (vitals.length === 0) {
      return null;
    }

    // Calculate statistics
    const values = vitals.map((v) => {
      if (typeof v.value === 'number') {
        return v.value;
      }
      // For blood pressure, use systolic
      return (v.value as any).systolic;
    });

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      patientId,
      type,
      startDate,
      endDate: new Date(),
      dataPoints: vitals,
      count: vitals.length,
      average: Math.round(avg * 100) / 100,
      min,
      max,
      trend: this.calculateTrend(values),
    };
  }

  /**
   * Get critical alerts
   */
  async getCriticalAlerts(patientId?: string, hours: number = 24) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const query: any = {
      isAlertTriggered: true,
      alertLevel: 'critical',
      timestamp: { $gte: startDate },
    };

    if (patientId) {
      query.patientId = patientId;
    }

    return this.vitalSignModel.find(query).sort({ timestamp: -1 }).exec();
  }

  /**
   * Calculate vital sign status
   */
  private calculateStatus(type: VitalSignType, value: any): VitalSignStatus {
    if (type === VitalSignType.BLOOD_PRESSURE) {
      const systolic = value.systolic;
      if (systolic < 90 || systolic > 140) {
        return VitalSignStatus.ABNORMAL;
      }
      if (systolic < 70 || systolic > 180) {
        return VitalSignStatus.CRITICAL;
      }
      return VitalSignStatus.NORMAL;
    }

    return determineVitalStatus(type, value as number);
  }

  /**
   * Check if value triggers alert
   */
  private checkAlertThreshold(type: VitalSignType, value: any): {
    isAlert: boolean;
    level?: 'warning' | 'critical';
    message?: string;
  } {
    const thresholds = this.configService.get(`alertThresholds.${this.getThresholdKey(type)}`);

    if (!thresholds) {
      return { isAlert: false };
    }

    const numValue = typeof value === 'number' ? value : value.systolic;

    if (numValue < thresholds.critical.min || numValue > thresholds.critical.max) {
      return {
        isAlert: true,
        level: 'critical',
        message: `Critical ${type}: ${numValue} (normal: ${thresholds.min}-${thresholds.max})`,
      };
    }

    if (numValue < thresholds.min || numValue > thresholds.max) {
      return {
        isAlert: true,
        level: 'warning',
        message: `Abnormal ${type}: ${numValue} (normal: ${thresholds.min}-${thresholds.max})`,
      };
    }

    return { isAlert: false };
  }

  /**
   * Get threshold key for config
   */
  private getThresholdKey(type: VitalSignType): string {
    const map: Record<string, string> = {
      [VitalSignType.HEART_RATE]: 'heartRate',
      [VitalSignType.BLOOD_PRESSURE]: 'bloodPressureSystolic',
      [VitalSignType.OXYGEN_SATURATION]: 'oxygenSaturation',
      [VitalSignType.BODY_TEMPERATURE]: 'temperature',
      [VitalSignType.RESPIRATORY_RATE]: 'respiratoryRate',
      [VitalSignType.BLOOD_GLUCOSE]: 'bloodGlucose',
    };
    return map[type] || 'heartRate';
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = Math.abs(avgSecond - avgFirst);
    const threshold = avgFirst * 0.05; // 5% threshold

    if (diff < threshold) return 'stable';
    return avgSecond > avgFirst ? 'increasing' : 'decreasing';
  }
}
