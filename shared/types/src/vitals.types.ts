/**
 * Vital Signs Types for MediConnect Pro
 * Defines all vital sign measurements and related data structures
 */

/**
 * Vital Sign Types
 */
export enum VitalSignType {
  HEART_RATE = 'heart_rate',
  BLOOD_PRESSURE = 'blood_pressure',
  OXYGEN_SATURATION = 'oxygen_saturation',
  BODY_TEMPERATURE = 'body_temperature',
  RESPIRATORY_RATE = 'respiratory_rate',
  BLOOD_GLUCOSE = 'blood_glucose',
  WEIGHT = 'weight',
  BMI = 'bmi',
  ECG = 'ecg',
}

/**
 * Measurement Units
 */
export enum MeasurementUnit {
  // Heart Rate
  BPM = 'bpm', // beats per minute

  // Blood Pressure
  MMHG = 'mmHg', // millimeters of mercury

  // Oxygen Saturation
  PERCENT = '%',

  // Temperature
  CELSIUS = '°C',
  FAHRENHEIT = '°F',

  // Respiratory Rate
  BREATHS_PER_MIN = 'breaths/min',

  // Blood Glucose
  MG_DL = 'mg/dL', // milligrams per deciliter
  MMOL_L = 'mmol/L', // millimoles per liter

  // Weight
  KG = 'kg',
  LBS = 'lbs',

  // BMI
  KG_M2 = 'kg/m²',
}

/**
 * Vital Sign Status
 */
export enum VitalSignStatus {
  NORMAL = 'normal',
  ABNORMAL = 'abnormal',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

/**
 * Device Types for IoT integration
 */
export enum DeviceType {
  SMARTWATCH = 'smartwatch',
  BLOOD_PRESSURE_MONITOR = 'blood_pressure_monitor',
  PULSE_OXIMETER = 'pulse_oximeter',
  THERMOMETER = 'thermometer',
  GLUCOSE_METER = 'glucose_meter',
  WEIGHT_SCALE = 'weight_scale',
  ECG_MONITOR = 'ecg_monitor',
  FITNESS_TRACKER = 'fitness_tracker',
  CONTINUOUS_GLUCOSE_MONITOR = 'continuous_glucose_monitor',
}

/**
 * Base Vital Sign Interface
 */
export interface IVitalSign {
  id: string;
  patientId: string;
  type: VitalSignType;
  value: number | IBloodPressure | IECGData;
  unit: MeasurementUnit;
  status: VitalSignStatus;
  timestamp: Date;
  deviceId?: string;
  deviceType?: DeviceType;
  notes?: string;
  measuredBy?: string; // User ID who took the measurement
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Blood Pressure Specific Interface
 */
export interface IBloodPressure {
  systolic: number; // Upper number
  diastolic: number; // Lower number
  unit: MeasurementUnit.MMHG;
}

/**
 * ECG Data Interface
 */
export interface IECGData {
  waveform: number[]; // Array of voltage readings
  duration: number; // Duration in seconds
  samplingRate: number; // Hz
  leads?: string[]; // ECG leads (e.g., ['I', 'II', 'III'])
}

/**
 * Heart Rate Vital Sign
 */
export interface IHeartRate extends IVitalSign {
  type: VitalSignType.HEART_RATE;
  value: number;
  unit: MeasurementUnit.BPM;
}

/**
 * Blood Pressure Vital Sign
 */
export interface IBloodPressureVital extends IVitalSign {
  type: VitalSignType.BLOOD_PRESSURE;
  value: IBloodPressure;
  unit: MeasurementUnit.MMHG;
}

/**
 * Oxygen Saturation Vital Sign (SpO2)
 */
export interface IOxygenSaturation extends IVitalSign {
  type: VitalSignType.OXYGEN_SATURATION;
  value: number;
  unit: MeasurementUnit.PERCENT;
}

/**
 * Body Temperature Vital Sign
 */
export interface IBodyTemperature extends IVitalSign {
  type: VitalSignType.BODY_TEMPERATURE;
  value: number;
  unit: MeasurementUnit.CELSIUS | MeasurementUnit.FAHRENHEIT;
  measurementLocation?: 'oral' | 'rectal' | 'axillary' | 'tympanic' | 'temporal';
}

/**
 * Respiratory Rate Vital Sign
 */
export interface IRespiratoryRate extends IVitalSign {
  type: VitalSignType.RESPIRATORY_RATE;
  value: number;
  unit: MeasurementUnit.BREATHS_PER_MIN;
}

/**
 * Blood Glucose Vital Sign
 */
export interface IBloodGlucose extends IVitalSign {
  type: VitalSignType.BLOOD_GLUCOSE;
  value: number;
  unit: MeasurementUnit.MG_DL | MeasurementUnit.MMOL_L;
  measurementContext?: 'fasting' | 'pre_meal' | 'post_meal' | 'bedtime' | 'random';
}

/**
 * Weight Vital Sign
 */
export interface IWeight extends IVitalSign {
  type: VitalSignType.WEIGHT;
  value: number;
  unit: MeasurementUnit.KG | MeasurementUnit.LBS;
}

/**
 * BMI Vital Sign
 */
export interface IBMI extends IVitalSign {
  type: VitalSignType.BMI;
  value: number;
  unit: MeasurementUnit.KG_M2;
  category?: 'underweight' | 'normal' | 'overweight' | 'obese';
}

/**
 * ECG Vital Sign
 */
export interface IECG extends IVitalSign {
  type: VitalSignType.ECG;
  value: IECGData;
  unit: MeasurementUnit;
  interpretation?: string;
}

/**
 * Vital Signs Batch (multiple readings at once)
 */
export interface IVitalSignsBatch {
  patientId: string;
  timestamp: Date;
  deviceId?: string;
  vitals: IVitalSign[];
}

/**
 * Vital Signs Range (Normal ranges for alerts)
 */
export interface IVitalSignRange {
  type: VitalSignType;
  minValue: number;
  maxValue: number;
  unit: MeasurementUnit;
  ageGroup?: 'infant' | 'child' | 'adult' | 'senior';
  condition?: string; // e.g., 'diabetes', 'hypertension'
}

/**
 * Normal Vital Sign Ranges (defaults)
 */
export const NORMAL_VITAL_RANGES: Record<VitalSignType, IVitalSignRange> = {
  [VitalSignType.HEART_RATE]: {
    type: VitalSignType.HEART_RATE,
    minValue: 60,
    maxValue: 100,
    unit: MeasurementUnit.BPM,
  },
  [VitalSignType.BLOOD_PRESSURE]: {
    type: VitalSignType.BLOOD_PRESSURE,
    minValue: 90, // systolic
    maxValue: 120, // systolic
    unit: MeasurementUnit.MMHG,
  },
  [VitalSignType.OXYGEN_SATURATION]: {
    type: VitalSignType.OXYGEN_SATURATION,
    minValue: 95,
    maxValue: 100,
    unit: MeasurementUnit.PERCENT,
  },
  [VitalSignType.BODY_TEMPERATURE]: {
    type: VitalSignType.BODY_TEMPERATURE,
    minValue: 36.5,
    maxValue: 37.5,
    unit: MeasurementUnit.CELSIUS,
  },
  [VitalSignType.RESPIRATORY_RATE]: {
    type: VitalSignType.RESPIRATORY_RATE,
    minValue: 12,
    maxValue: 20,
    unit: MeasurementUnit.BREATHS_PER_MIN,
  },
  [VitalSignType.BLOOD_GLUCOSE]: {
    type: VitalSignType.BLOOD_GLUCOSE,
    minValue: 70,
    maxValue: 100,
    unit: MeasurementUnit.MG_DL,
  },
  [VitalSignType.WEIGHT]: {
    type: VitalSignType.WEIGHT,
    minValue: 40,
    maxValue: 120,
    unit: MeasurementUnit.KG,
  },
  [VitalSignType.BMI]: {
    type: VitalSignType.BMI,
    minValue: 18.5,
    maxValue: 24.9,
    unit: MeasurementUnit.KG_M2,
  },
  [VitalSignType.ECG]: {
    type: VitalSignType.ECG,
    minValue: 0,
    maxValue: 0,
    unit: MeasurementUnit.BPM,
  },
};

/**
 * Vital Sign Trend Analysis
 */
export interface IVitalSignTrend {
  patientId: string;
  vitalType: VitalSignType;
  startDate: Date;
  endDate: Date;
  dataPoints: IVitalSign[];
  averageValue: number;
  minValue: number;
  maxValue: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  concernLevel: 'low' | 'medium' | 'high';
}

/**
 * IoT Device Registration
 */
export interface IDeviceRegistration {
  id: string;
  patientId: string;
  deviceType: DeviceType;
  manufacturer: string;
  model: string;
  serialNumber: string;
  firmwareVersion?: string;
  registeredAt: Date;
  lastSync?: Date;
  isActive: boolean;
  calibrationDate?: Date;
  nextCalibrationDate?: Date;
}

/**
 * Real-time Vital Sign Stream
 */
export interface IVitalSignStream {
  patientId: string;
  deviceId: string;
  vitalType: VitalSignType;
  value: number | IBloodPressure;
  timestamp: Date;
  isRealtime: true;
}

/**
 * Vital Sign Create DTO
 */
export interface IVitalSignCreate {
  patientId: string;
  type: VitalSignType;
  value: number | IBloodPressure | IECGData;
  unit: MeasurementUnit;
  deviceId?: string;
  deviceType?: DeviceType;
  notes?: string;
  timestamp?: Date;
}

/**
 * Vital Sign Query Filters
 */
export interface IVitalSignQuery {
  patientId: string;
  types?: VitalSignType[];
  startDate?: Date;
  endDate?: Date;
  status?: VitalSignStatus;
  deviceId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Helper function to determine vital sign status
 */
export function determineVitalStatus(
  vitalType: VitalSignType,
  value: number,
  range?: IVitalSignRange
): VitalSignStatus {
  const normalRange = range || NORMAL_VITAL_RANGES[vitalType];

  if (!normalRange) {
    return VitalSignStatus.UNKNOWN;
  }

  // Handle blood pressure separately
  if (vitalType === VitalSignType.BLOOD_PRESSURE) {
    return VitalSignStatus.NORMAL; // Simplified, would need systolic/diastolic check
  }

  if (value < normalRange.minValue * 0.9 || value > normalRange.maxValue * 1.1) {
    return VitalSignStatus.CRITICAL;
  } else if (value < normalRange.minValue || value > normalRange.maxValue) {
    return VitalSignStatus.ABNORMAL;
  }

  return VitalSignStatus.NORMAL;
}

/**
 * Helper function to calculate BMI
 */
export function calculateBMI(weightKg: number, heightM: number): number {
  return Number((weightKg / (heightM * heightM)).toFixed(2));
}

/**
 * Helper function to convert temperature units
 */
export function convertTemperature(
  value: number,
  from: MeasurementUnit.CELSIUS | MeasurementUnit.FAHRENHEIT,
  to: MeasurementUnit.CELSIUS | MeasurementUnit.FAHRENHEIT
): number {
  if (from === to) return value;

  if (from === MeasurementUnit.CELSIUS && to === MeasurementUnit.FAHRENHEIT) {
    return (value * 9/5) + 32;
  } else {
    return (value - 32) * 5/9;
  }
}
