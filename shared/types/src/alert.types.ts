/**
 * Alert Types for MediConnect Pro
 * Defines all alert-related types including severity levels, statuses, and notifications
 */

import { VitalSignType } from './vitals.types';

/**
 * Alert Severity Levels
 */
export enum AlertSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

/**
 * Alert Status
 */
export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated',
}

/**
 * Alert Type/Category
 */
export enum AlertType {
  VITAL_SIGN_ABNORMAL = 'vital_sign_abnormal',
  VITAL_SIGN_CRITICAL = 'vital_sign_critical',
  MEDICATION_REMINDER = 'medication_reminder',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  DEVICE_OFFLINE = 'device_offline',
  DEVICE_LOW_BATTERY = 'device_low_battery',
  MISSED_READING = 'missed_reading',
  FALL_DETECTED = 'fall_detected',
  EMERGENCY_SOS = 'emergency_sos',
  SYSTEM_ALERT = 'system_alert',
  CUSTOM = 'custom',
}

/**
 * Alert Priority (for notification routing)
 */
export enum AlertPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4,
  IMMEDIATE = 5,
}

/**
 * Notification Channel
 */
export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  PHONE_CALL = 'phone_call',
  WEBSOCKET = 'websocket',
}

/**
 * Base Alert Interface
 */
export interface IAlert {
  id: string;
  patientId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  priority: AlertPriority;
  title: string;
  message: string;
  metadata?: IAlertMetadata;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string; // User ID
  resolvedAt?: Date;
  resolvedBy?: string; // User ID
  escalatedAt?: Date;
  escalatedTo?: string[]; // User IDs
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert Metadata (flexible structure for different alert types)
 */
export interface IAlertMetadata {
  vitalSignType?: VitalSignType;
  vitalSignValue?: number | string;
  vitalSignId?: string;
  deviceId?: string;
  deviceType?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  relatedAlertIds?: string[];
  actionRequired?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Vital Sign Alert (when vital signs are abnormal)
 */
export interface IVitalSignAlert extends IAlert {
  type: AlertType.VITAL_SIGN_ABNORMAL | AlertType.VITAL_SIGN_CRITICAL;
  metadata: IAlertMetadata & {
    vitalSignType: VitalSignType;
    vitalSignValue: number | string;
    vitalSignId: string;
    normalRange: {
      min: number;
      max: number;
    };
  };
}

/**
 * Medication Reminder Alert
 */
export interface IMedicationAlert extends IAlert {
  type: AlertType.MEDICATION_REMINDER;
  metadata: IAlertMetadata & {
    medicationName: string;
    dosage: string;
    scheduledTime: Date;
  };
}

/**
 * Device Alert (offline, low battery, etc.)
 */
export interface IDeviceAlert extends IAlert {
  type: AlertType.DEVICE_OFFLINE | AlertType.DEVICE_LOW_BATTERY;
  metadata: IAlertMetadata & {
    deviceId: string;
    deviceType: string;
    batteryLevel?: number;
    lastSeen?: Date;
  };
}

/**
 * Emergency Alert (SOS, fall detection)
 */
export interface IEmergencyAlert extends IAlert {
  type: AlertType.FALL_DETECTED | AlertType.EMERGENCY_SOS;
  severity: AlertSeverity.CRITICAL | AlertSeverity.EMERGENCY;
  priority: AlertPriority.IMMEDIATE;
  metadata: IAlertMetadata & {
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    emergencyContactsNotified: string[];
    autoDispatchRequested?: boolean;
  };
}

/**
 * Alert Rule Configuration
 * Defines when alerts should be triggered
 */
export interface IAlertRule {
  id: string;
  name: string;
  description: string;
  patientId?: string; // If null, applies globally
  isActive: boolean;
  type: AlertType;
  severity: AlertSeverity;
  conditions: IAlertCondition[];
  actions: IAlertAction[];
  cooldownPeriod?: number; // Minutes before same alert can trigger again
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert Condition
 */
export interface IAlertCondition {
  field: string; // e.g., 'heartRate', 'bloodPressure.systolic'
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'outside';
  value: number | string | number[];
  duration?: number; // Minutes the condition must persist
}

/**
 * Alert Action
 */
export interface IAlertAction {
  type: 'notify' | 'escalate' | 'auto_resolve' | 'webhook' | 'custom';
  channels: NotificationChannel[];
  recipients: string[]; // User IDs or email addresses
  delay?: number; // Minutes to wait before executing action
  webhookUrl?: string;
  customScript?: string;
}

/**
 * Notification
 */
export interface INotification {
  id: string;
  userId: string;
  alertId?: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  isSent: boolean;
  sentAt?: Date;
  readAt?: Date;
  failureReason?: string;
  createdAt: Date;
}

/**
 * Alert Statistics
 */
export interface IAlertStatistics {
  patientId?: string;
  startDate: Date;
  endDate: Date;
  totalAlerts: number;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByType: Record<AlertType, number>;
  alertsByStatus: Record<AlertStatus, number>;
  averageResponseTime: number; // In minutes
  averageResolutionTime: number; // In minutes
  escalationRate: number; // Percentage
}

/**
 * Alert Create DTO
 */
export interface IAlertCreate {
  patientId: string;
  type: AlertType;
  severity: AlertSeverity;
  priority: AlertPriority;
  title: string;
  message: string;
  metadata?: IAlertMetadata;
}

/**
 * Alert Update DTO
 */
export interface IAlertUpdate {
  status?: AlertStatus;
  acknowledgedBy?: string;
  resolvedBy?: string;
  escalatedTo?: string[];
  notes?: string;
}

/**
 * Alert Query Filters
 */
export interface IAlertQuery {
  patientId?: string;
  types?: AlertType[];
  severities?: AlertSeverity[];
  statuses?: AlertStatus[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'triggeredAt' | 'severity' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Real-time Alert Event (for WebSocket/Kafka)
 */
export interface IAlertEvent {
  eventType: 'alert_created' | 'alert_updated' | 'alert_acknowledged' | 'alert_resolved' | 'alert_escalated';
  alert: IAlert;
  timestamp: Date;
  triggeredBy?: string; // User ID or system
}

/**
 * Alert Escalation Policy
 */
export interface IEscalationPolicy {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  levels: IEscalationLevel[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Escalation Level
 */
export interface IEscalationLevel {
  level: number;
  delayMinutes: number; // Time before escalating to this level
  recipients: string[]; // User IDs
  channels: NotificationChannel[];
  requiresAcknowledgment: boolean;
}

/**
 * Helper function to determine alert priority based on severity
 */
export function getAlertPriority(severity: AlertSeverity): AlertPriority {
  switch (severity) {
    case AlertSeverity.INFO:
    case AlertSeverity.LOW:
      return AlertPriority.LOW;
    case AlertSeverity.MEDIUM:
      return AlertPriority.MEDIUM;
    case AlertSeverity.HIGH:
      return AlertPriority.HIGH;
    case AlertSeverity.CRITICAL:
      return AlertPriority.URGENT;
    case AlertSeverity.EMERGENCY:
      return AlertPriority.IMMEDIATE;
    default:
      return AlertPriority.MEDIUM;
  }
}

/**
 * Helper function to get notification channels based on priority
 */
export function getNotificationChannels(priority: AlertPriority): NotificationChannel[] {
  switch (priority) {
    case AlertPriority.LOW:
      return [NotificationChannel.IN_APP];
    case AlertPriority.MEDIUM:
      return [NotificationChannel.IN_APP, NotificationChannel.EMAIL];
    case AlertPriority.HIGH:
      return [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH];
    case AlertPriority.URGENT:
      return [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.SMS];
    case AlertPriority.IMMEDIATE:
      return [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
        NotificationChannel.PUSH,
        NotificationChannel.SMS,
        NotificationChannel.PHONE_CALL,
      ];
    default:
      return [NotificationChannel.IN_APP];
  }
}

/**
 * Helper function to check if alert requires immediate attention
 */
export function requiresImmediateAttention(alert: IAlert): boolean {
  return (
    alert.severity === AlertSeverity.CRITICAL ||
    alert.severity === AlertSeverity.EMERGENCY ||
    alert.priority === AlertPriority.IMMEDIATE
  );
}
