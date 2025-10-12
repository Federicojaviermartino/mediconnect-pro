/**
 * Consultation Types for MediConnect Pro
 * Defines all consultation-related types including video calls, appointments, and medical records
 */

/**
 * Consultation Type
 */
export enum ConsultationType {
  VIDEO = 'video',
  AUDIO = 'audio',
  CHAT = 'chat',
  IN_PERSON = 'in_person',
}

/**
 * Consultation Status
 */
export enum ConsultationStatus {
  SCHEDULED = 'scheduled',
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
}

/**
 * Consultation Reason/Category
 */
export enum ConsultationReason {
  ROUTINE_CHECKUP = 'routine_checkup',
  FOLLOW_UP = 'follow_up',
  EMERGENCY = 'emergency',
  PRESCRIPTION_REFILL = 'prescription_refill',
  LAB_RESULTS = 'lab_results',
  SECOND_OPINION = 'second_opinion',
  CHRONIC_DISEASE_MANAGEMENT = 'chronic_disease_management',
  MENTAL_HEALTH = 'mental_health',
  OTHER = 'other',
}

/**
 * Prescription Status
 */
export enum PrescriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Base Consultation Interface
 */
export interface IConsultation {
  id: string;
  patientId: string;
  doctorId: string;
  type: ConsultationType;
  status: ConsultationStatus;
  reason: ConsultationReason;
  scheduledAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // in minutes
  chiefComplaint?: string;
  notes?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  prescriptions: IPrescription[];
  attachments: IAttachment[];
  followUpRequired: boolean;
  followUpDate?: Date;
  roomId?: string; // For video/audio consultations
  roomToken?: string;
  recordingUrl?: string;
  rating?: number; // 1-5
  feedback?: string;
  cost?: number;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prescription Interface
 */
export interface IPrescription {
  id: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string; // e.g., "7 days", "2 weeks"
  quantity: number;
  refills: number;
  instructions: string;
  status: PrescriptionStatus;
  startDate: Date;
  endDate?: Date;
  isPrinted: boolean;
  isSentToPharmacy: boolean;
  pharmacyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Attachment Interface (for medical documents, images, etc.)
 */
export interface IAttachment {
  id: string;
  consultationId?: string;
  patientId: string;
  uploadedBy: string; // User ID
  type: 'image' | 'pdf' | 'video' | 'audio' | 'document' | 'lab_result' | 'xray' | 'other';
  fileName: string;
  fileSize: number; // in bytes
  fileUrl: string;
  thumbnailUrl?: string;
  mimeType: string;
  description?: string;
  uploadedAt: Date;
}

/**
 * Video Room Configuration
 */
export interface IVideoRoomConfig {
  roomId: string;
  roomName: string;
  consultationId: string;
  maxParticipants: number;
  recordingEnabled: boolean;
  screenSharingEnabled: boolean;
  chatEnabled: boolean;
  waitingRoomEnabled: boolean;
  autoRecordOnStart: boolean;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Video Room Participant
 */
export interface IParticipant {
  id: string;
  userId: string;
  consultationId: string;
  role: 'patient' | 'doctor' | 'nurse' | 'observer';
  displayName: string;
  joinedAt: Date;
  leftAt?: Date;
  isHost: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  connectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
}

/**
 * Chat Message (during consultation)
 */
export interface IChatMessage {
  id: string;
  consultationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'patient' | 'doctor' | 'nurse';
  message: string;
  timestamp: Date;
  isRead: boolean;
  attachmentUrl?: string;
}

/**
 * Availability Slot (for doctor scheduling)
 */
export interface IAvailabilitySlot {
  id: string;
  doctorId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  duration: number; // minutes per consultation
  isAvailable: boolean;
  maxConsultations?: number;
  consultationType: ConsultationType[];
}

/**
 * Appointment Slot (specific date/time)
 */
export interface IAppointmentSlot {
  doctorId: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  consultationTypes: ConsultationType[];
}

/**
 * Medical History Entry
 */
export interface IMedicalHistoryEntry {
  id: string;
  patientId: string;
  consultationId?: string;
  entryDate: Date;
  category: 'diagnosis' | 'surgery' | 'allergy' | 'medication' | 'immunization' | 'family_history' | 'social_history' | 'other';
  title: string;
  description: string;
  doctor?: string;
  location?: string;
  attachments?: IAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lab Order
 */
export interface ILabOrder {
  id: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  testName: string;
  testCode?: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'sample_collected' | 'in_progress' | 'completed' | 'cancelled';
  instructions?: string;
  orderedAt: Date;
  scheduledAt?: Date;
  completedAt?: Date;
  resultUrl?: string;
  notes?: string;
}

/**
 * Consultation Create DTO
 */
export interface IConsultationCreate {
  patientId: string;
  doctorId: string;
  type: ConsultationType;
  reason: ConsultationReason;
  scheduledAt: Date;
  chiefComplaint?: string;
  notes?: string;
}

/**
 * Consultation Update DTO
 */
export interface IConsultationUpdate {
  status?: ConsultationStatus;
  startedAt?: Date;
  endedAt?: Date;
  diagnosis?: string;
  treatmentPlan?: string;
  notes?: string;
  followUpRequired?: boolean;
  followUpDate?: Date;
  rating?: number;
  feedback?: string;
}

/**
 * Consultation Query Filters
 */
export interface IConsultationQuery {
  patientId?: string;
  doctorId?: string;
  types?: ConsultationType[];
  statuses?: ConsultationStatus[];
  startDate?: Date;
  endDate?: Date;
  reason?: ConsultationReason;
  limit?: number;
  offset?: number;
  sortBy?: 'scheduledAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Prescription Create DTO
 */
export interface IPrescriptionCreate {
  consultationId: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions: string;
  startDate?: Date;
}

/**
 * Doctor Statistics
 */
export interface IDoctorStatistics {
  doctorId: string;
  totalConsultations: number;
  completedConsultations: number;
  cancelledConsultations: number;
  averageRating: number;
  totalRatings: number;
  averageConsultationDuration: number; // in minutes
  totalRevenue: number;
  consultationsByType: Record<ConsultationType, number>;
  consultationsByReason: Record<ConsultationReason, number>;
  upcomingConsultations: number;
}

/**
 * Patient Consultation History Summary
 */
export interface IPatientConsultationSummary {
  patientId: string;
  totalConsultations: number;
  lastConsultationDate?: Date;
  nextConsultationDate?: Date;
  totalPrescriptions: number;
  activePrescriptions: number;
  chronicConditions: string[];
  recentDiagnoses: string[];
}

/**
 * Video Call Event (for WebSocket/Kafka)
 */
export interface IVideoCallEvent {
  eventType: 'call_started' | 'call_ended' | 'participant_joined' | 'participant_left' | 'recording_started' | 'recording_stopped';
  consultationId: string;
  roomId: string;
  participant?: IParticipant;
  timestamp: Date;
}

/**
 * Helper function to calculate consultation duration
 */
export function calculateConsultationDuration(startedAt: Date, endedAt: Date): number {
  return Math.floor((endedAt.getTime() - startedAt.getTime()) / (1000 * 60));
}

/**
 * Helper function to check if consultation can be started
 */
export function canStartConsultation(consultation: IConsultation): boolean {
  const now = new Date();
  const scheduledTime = new Date(consultation.scheduledAt);
  const fifteenMinutesBefore = new Date(scheduledTime.getTime() - 15 * 60 * 1000);

  return (
    consultation.status === ConsultationStatus.SCHEDULED &&
    now >= fifteenMinutesBefore
  );
}

/**
 * Helper function to check if consultation is overdue
 */
export function isConsultationOverdue(consultation: IConsultation): boolean {
  if (consultation.status !== ConsultationStatus.SCHEDULED) {
    return false;
  }

  const now = new Date();
  const scheduledTime = new Date(consultation.scheduledAt);
  const thirtyMinutesAfter = new Date(scheduledTime.getTime() + 30 * 60 * 1000);

  return now > thirtyMinutesAfter;
}
