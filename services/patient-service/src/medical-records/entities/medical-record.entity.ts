/**
 * Medical Record Entity
 * Stores patient medical history, diagnoses, treatments, etc.
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

export enum RecordType {
  CONSULTATION = 'consultation',
  DIAGNOSIS = 'diagnosis',
  PRESCRIPTION = 'prescription',
  LAB_RESULT = 'lab_result',
  IMAGING = 'imaging',
  PROCEDURE = 'procedure',
  VACCINATION = 'vaccination',
  HOSPITALIZATION = 'hospitalization',
  NOTE = 'note',
}

export enum RecordStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}

@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  patientId: string;

  @ManyToOne(() => Patient, (patient) => patient.medicalRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({
    type: 'enum',
    enum: RecordType,
  })
  @Index()
  type: RecordType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: RecordStatus,
    default: RecordStatus.ACTIVE,
  })
  status: RecordStatus;

  @Column({ type: 'timestamp' })
  @Index()
  recordDate: Date;

  @Column({ nullable: true })
  doctorId?: string; // Reference to Doctor User

  @Column({ nullable: true })
  consultationId?: string; // Reference to Consultation

  @Column({ type: 'jsonb', nullable: true })
  diagnosis?: {
    code: string; // ICD-10 code
    name: string;
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
    notes?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  prescription?: {
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
    notes?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  labResults?: {
    testName: string;
    results: Array<{
      parameter: string;
      value: string;
      unit: string;
      normalRange: string;
      status: 'normal' | 'abnormal' | 'critical';
    }>;
    labName?: string;
    performedDate: Date;
  };

  @Column({ type: 'simple-array', default: [] })
  attachments: string[]; // URLs to files (S3, etc.)

  @Column({ type: 'simple-array', default: [] })
  tags: string[];

  @Column({ default: false })
  isCritical: boolean;

  @Column({ default: false })
  isConfidential: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy?: string; // User ID who created this record

  @Column({ nullable: true })
  updatedBy?: string; // User ID who last updated this record
}
