/**
 * Appointment Entity
 * Manages patient appointments with doctors
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
}

export enum AppointmentType {
  IN_PERSON = 'in_person',
  VIDEO_CALL = 'video_call',
  PHONE_CALL = 'phone_call',
  HOME_VISIT = 'home_visit',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  patientId: string;

  @ManyToOne(() => Patient, (patient) => patient.appointments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  @Index()
  doctorId: string; // Reference to Doctor User

  @Column({
    type: 'enum',
    enum: AppointmentType,
    default: AppointmentType.IN_PERSON,
  })
  type: AppointmentType;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  @Index()
  status: AppointmentStatus;

  @Column({ type: 'timestamp' })
  @Index()
  scheduledStart: Date;

  @Column({ type: 'timestamp' })
  scheduledEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStart?: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEnd?: Date;

  @Column()
  reason: string;

  @Column({ type: 'text', nullable: true })
  symptoms?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  doctorNotes?: string;

  @Column({ nullable: true })
  consultationId?: string; // Reference to Consultation (video call)

  @Column({ nullable: true })
  medicalRecordId?: string; // Reference to created medical record

  @Column({ type: 'jsonb', nullable: true })
  reminder?: {
    sentAt?: Date;
    sentVia: ('email' | 'sms' | 'push')[];
    confirmed: boolean;
  };

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({ nullable: true })
  cancelledBy?: string; // User ID

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Calculate duration in minutes
   */
  get durationMinutes(): number {
    const start = new Date(this.scheduledStart);
    const end = new Date(this.scheduledEnd);
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }

  /**
   * Check if appointment is upcoming
   */
  get isUpcoming(): boolean {
    return new Date(this.scheduledStart) > new Date() &&
           this.status === AppointmentStatus.SCHEDULED;
  }

  /**
   * Check if appointment is past
   */
  get isPast(): boolean {
    return new Date(this.scheduledEnd) < new Date();
  }
}
