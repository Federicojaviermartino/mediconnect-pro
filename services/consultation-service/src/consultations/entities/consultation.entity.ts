import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ConsultationMessage } from './consultation-message.entity';

export enum ConsultationType {
  VIDEO = 'video',
  AUDIO = 'audio',
  CHAT = 'chat',
}

export enum ConsultationStatus {
  SCHEDULED = 'scheduled',
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum ConsultationPriority {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  EMERGENCY = 'emergency',
}

@Entity('consultations')
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  consultationNumber: string; // CON-XXXXXXXXXX

  @Column('uuid')
  patientId: string;

  @Column('uuid')
  doctorId: string;

  @Column('uuid', { nullable: true })
  appointmentId: string; // Reference to appointment in patient-service

  @Column({
    type: 'enum',
    enum: ConsultationType,
    default: ConsultationType.VIDEO,
  })
  type: ConsultationType;

  @Column({
    type: 'enum',
    enum: ConsultationStatus,
    default: ConsultationStatus.SCHEDULED,
  })
  status: ConsultationStatus;

  @Column({
    type: 'enum',
    enum: ConsultationPriority,
    default: ConsultationPriority.ROUTINE,
  })
  priority: ConsultationPriority;

  @Column({ type: 'timestamp' })
  scheduledStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEndTime: Date;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number; // Calculated duration

  @Column({ nullable: true })
  roomId: string; // Virtual room identifier

  @Column({ nullable: true })
  twilioRoomSid: string; // Twilio room SID if using Twilio

  @Column({ type: 'text', nullable: true })
  reasonForVisit: string;

  @Column({ type: 'text', nullable: true })
  chiefComplaint: string;

  @Column({ type: 'text', nullable: true })
  diagnosis: string;

  @Column({ type: 'text', nullable: true })
  treatmentPlan: string;

  @Column({ type: 'jsonb', nullable: true })
  prescriptions: Array<{
    id: string;
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  followUp: {
    required: boolean;
    scheduledDate?: Date;
    instructions?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  vitals: {
    heartRate?: number;
    bloodPressure?: { systolic: number; diastolic: number };
    temperature?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
  };

  @Column({ type: 'jsonb', default: [] })
  symptoms: Array<{
    name: string;
    severity: 'mild' | 'moderate' | 'severe';
    duration?: string;
    notes?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  patientNotes: {
    beforeConsultation?: string;
    duringConsultation?: string;
    afterConsultation?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  doctorNotes: {
    privateNotes?: string; // Not visible to patient
    sharedNotes?: string; // Visible to patient
    internalComments?: string;
  };

  @Column({ nullable: true })
  recordingUrl: string;

  @Column({ default: false })
  isRecorded: boolean;

  @Column({ default: false })
  recordingConsent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  patientJoinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  doctorJoinedAt: Date;

  @Column({ type: 'int', default: 0 })
  patientRating: number; // 1-5 stars

  @Column({ type: 'text', nullable: true })
  patientFeedback: string;

  @Column({ type: 'jsonb', nullable: true })
  technicalIssues: Array<{
    timestamp: Date;
    issue: string;
    severity: 'minor' | 'major' | 'critical';
    resolved: boolean;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    deviceInfo?: {
      browser?: string;
      os?: string;
      platform?: string;
    };
    networkInfo?: {
      connectionType?: string;
      quality?: 'poor' | 'fair' | 'good' | 'excellent';
    };
  };

  @OneToMany(() => ConsultationMessage, (message) => message.consultation, {
    cascade: true,
  })
  messages: ConsultationMessage[];

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column('uuid', { nullable: true })
  cancelledBy: string;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isActive(): boolean {
    return this.status === ConsultationStatus.IN_PROGRESS;
  }

  get isScheduled(): boolean {
    return this.status === ConsultationStatus.SCHEDULED;
  }

  get canStart(): boolean {
    return (
      this.status === ConsultationStatus.SCHEDULED ||
      this.status === ConsultationStatus.WAITING
    );
  }

  get canEnd(): boolean {
    return (
      this.status === ConsultationStatus.IN_PROGRESS ||
      this.status === ConsultationStatus.WAITING
    );
  }

  get canCancel(): boolean {
    return (
      this.status === ConsultationStatus.SCHEDULED ||
      this.status === ConsultationStatus.WAITING
    );
  }
}
