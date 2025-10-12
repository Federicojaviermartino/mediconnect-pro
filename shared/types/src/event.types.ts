/**
 * Event Types for MediConnect Pro
 * Defines all event types for Kafka message broker and event-driven architecture
 */

import { IVitalSign } from './vitals.types';
import { IAlert } from './alert.types';
import { IConsultation } from './consultation.types';

/**
 * Event Topics (Kafka topics)
 */
export enum EventTopic {
  // Vital Signs Events
  VITALS_RECORDED = 'vitals.recorded',
  VITALS_STREAM = 'vitals.stream',
  VITALS_BATCH = 'vitals.batch',

  // Alert Events
  ALERT_CREATED = 'alert.created',
  ALERT_UPDATED = 'alert.updated',
  ALERT_ACKNOWLEDGED = 'alert.acknowledged',
  ALERT_RESOLVED = 'alert.resolved',
  ALERT_ESCALATED = 'alert.escalated',

  // Consultation Events
  CONSULTATION_SCHEDULED = 'consultation.scheduled',
  CONSULTATION_STARTED = 'consultation.started',
  CONSULTATION_ENDED = 'consultation.ended',
  CONSULTATION_CANCELLED = 'consultation.cancelled',
  CONSULTATION_RESCHEDULED = 'consultation.rescheduled',

  // User Events
  USER_REGISTERED = 'user.registered',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',

  // Notification Events
  NOTIFICATION_SEND = 'notification.send',
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_FAILED = 'notification.failed',

  // Device Events
  DEVICE_REGISTERED = 'device.registered',
  DEVICE_CONNECTED = 'device.connected',
  DEVICE_DISCONNECTED = 'device.disconnected',
  DEVICE_BATTERY_LOW = 'device.battery_low',

  // System Events
  SYSTEM_ERROR = 'system.error',
  SYSTEM_AUDIT = 'system.audit',
}

/**
 * Event Priority
 */
export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Base Event Interface
 * All events must extend this interface
 */
export interface IBaseEvent<T = any> {
  eventId: string;
  eventType: EventTopic;
  eventVersion: string;
  timestamp: Date;
  source: string; // Service that emitted the event
  priority: EventPriority;
  payload: T;
  metadata?: IEventMetadata;
  correlationId?: string; // For tracking related events
  causationId?: string; // The event that caused this event
}

/**
 * Event Metadata
 */
export interface IEventMetadata {
  userId?: string;
  sessionId?: string;
  traceId?: string;
  environment?: string;
  version?: string;
  [key: string]: any;
}

/**
 * Vital Sign Recorded Event
 */
export interface IVitalSignRecordedEvent extends IBaseEvent<IVitalSign> {
  eventType: EventTopic.VITALS_RECORDED;
  payload: IVitalSign;
}

/**
 * Vital Sign Stream Event (real-time)
 */
export interface IVitalSignStreamEvent extends IBaseEvent {
  eventType: EventTopic.VITALS_STREAM;
  payload: {
    patientId: string;
    deviceId: string;
    vitals: IVitalSign[];
  };
}

/**
 * Alert Created Event
 */
export interface IAlertCreatedEvent extends IBaseEvent<IAlert> {
  eventType: EventTopic.ALERT_CREATED;
  payload: IAlert;
  priority: EventPriority.HIGH | EventPriority.CRITICAL;
}

/**
 * Alert Updated Event
 */
export interface IAlertUpdatedEvent extends IBaseEvent {
  eventType: EventTopic.ALERT_UPDATED;
  payload: {
    alertId: string;
    updates: Partial<IAlert>;
    updatedBy: string;
  };
}

/**
 * Alert Acknowledged Event
 */
export interface IAlertAcknowledgedEvent extends IBaseEvent {
  eventType: EventTopic.ALERT_ACKNOWLEDGED;
  payload: {
    alertId: string;
    acknowledgedBy: string;
    acknowledgedAt: Date;
    notes?: string;
  };
}

/**
 * Alert Resolved Event
 */
export interface IAlertResolvedEvent extends IBaseEvent {
  eventType: EventTopic.ALERT_RESOLVED;
  payload: {
    alertId: string;
    resolvedBy: string;
    resolvedAt: Date;
    resolution: string;
  };
}

/**
 * Consultation Scheduled Event
 */
export interface IConsultationScheduledEvent extends IBaseEvent<IConsultation> {
  eventType: EventTopic.CONSULTATION_SCHEDULED;
  payload: IConsultation;
}

/**
 * Consultation Started Event
 */
export interface IConsultationStartedEvent extends IBaseEvent {
  eventType: EventTopic.CONSULTATION_STARTED;
  payload: {
    consultationId: string;
    patientId: string;
    doctorId: string;
    roomId?: string;
    startedAt: Date;
  };
}

/**
 * Consultation Ended Event
 */
export interface IConsultationEndedEvent extends IBaseEvent {
  eventType: EventTopic.CONSULTATION_ENDED;
  payload: {
    consultationId: string;
    patientId: string;
    doctorId: string;
    startedAt: Date;
    endedAt: Date;
    duration: number;
    hasPrescriptions: boolean;
    hasFollowUp: boolean;
  };
}

/**
 * User Registered Event
 */
export interface IUserRegisteredEvent extends IBaseEvent {
  eventType: EventTopic.USER_REGISTERED;
  payload: {
    userId: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    registeredAt: Date;
  };
}

/**
 * User Login Event
 */
export interface IUserLoginEvent extends IBaseEvent {
  eventType: EventTopic.USER_LOGIN;
  payload: {
    userId: string;
    email: string;
    ipAddress?: string;
    userAgent?: string;
    loginAt: Date;
    sessionId: string;
  };
}

/**
 * Notification Send Event (request to send notification)
 */
export interface INotificationSendEvent extends IBaseEvent {
  eventType: EventTopic.NOTIFICATION_SEND;
  payload: {
    notificationId: string;
    userId: string;
    channel: string;
    title: string;
    message: string;
    priority: EventPriority;
    data?: Record<string, any>;
  };
}

/**
 * Notification Sent Event (confirmation)
 */
export interface INotificationSentEvent extends IBaseEvent {
  eventType: EventTopic.NOTIFICATION_SENT;
  payload: {
    notificationId: string;
    userId: string;
    channel: string;
    sentAt: Date;
    deliveryId?: string;
  };
}

/**
 * Notification Failed Event
 */
export interface INotificationFailedEvent extends IBaseEvent {
  eventType: EventTopic.NOTIFICATION_FAILED;
  payload: {
    notificationId: string;
    userId: string;
    channel: string;
    error: string;
    failedAt: Date;
    willRetry: boolean;
    retryCount?: number;
  };
}

/**
 * Device Connected Event
 */
export interface IDeviceConnectedEvent extends IBaseEvent {
  eventType: EventTopic.DEVICE_CONNECTED;
  payload: {
    deviceId: string;
    patientId: string;
    deviceType: string;
    connectedAt: Date;
    batteryLevel?: number;
    firmwareVersion?: string;
  };
}

/**
 * Device Disconnected Event
 */
export interface IDeviceDisconnectedEvent extends IBaseEvent {
  eventType: EventTopic.DEVICE_DISCONNECTED;
  payload: {
    deviceId: string;
    patientId: string;
    deviceType: string;
    disconnectedAt: Date;
    reason?: string;
  };
}

/**
 * System Error Event
 */
export interface ISystemErrorEvent extends IBaseEvent {
  eventType: EventTopic.SYSTEM_ERROR;
  priority: EventPriority.HIGH | EventPriority.CRITICAL;
  payload: {
    errorCode: string;
    errorMessage: string;
    stackTrace?: string;
    service: string;
    endpoint?: string;
    userId?: string;
    context?: Record<string, any>;
  };
}

/**
 * System Audit Event (for HIPAA compliance)
 */
export interface ISystemAuditEvent extends IBaseEvent {
  eventType: EventTopic.SYSTEM_AUDIT;
  payload: {
    action: string;
    resource: string;
    resourceId?: string;
    userId: string;
    userRole: string;
    ipAddress?: string;
    userAgent?: string;
    changes?: Record<string, any>;
    result: 'success' | 'failure';
    failureReason?: string;
  };
}

/**
 * Event Consumer Config
 */
export interface IEventConsumerConfig {
  groupId: string;
  topics: EventTopic[];
  autoCommit: boolean;
  fromBeginning: boolean;
}

/**
 * Event Producer Config
 */
export interface IEventProducerConfig {
  clientId: string;
  retries: number;
  timeout: number;
}

/**
 * Event Handler
 */
export type EventHandler<T extends IBaseEvent = IBaseEvent> = (event: T) => Promise<void>;

/**
 * Event Subscription
 */
export interface IEventSubscription {
  id: string;
  topic: EventTopic;
  handler: EventHandler;
  priority?: EventPriority;
  filter?: (event: IBaseEvent) => boolean;
}

/**
 * Helper function to create event
 */
export function createEvent<T>(
  eventType: EventTopic,
  payload: T,
  source: string,
  priority: EventPriority = EventPriority.NORMAL,
  metadata?: IEventMetadata
): IBaseEvent<T> {
  return {
    eventId: generateEventId(),
    eventType,
    eventVersion: '1.0',
    timestamp: new Date(),
    source,
    priority,
    payload,
    metadata,
  };
}

/**
 * Helper function to generate event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper function to validate event
 */
export function isValidEvent(event: any): event is IBaseEvent {
  return (
    event &&
    typeof event === 'object' &&
    'eventId' in event &&
    'eventType' in event &&
    'timestamp' in event &&
    'source' in event &&
    'payload' in event
  );
}
