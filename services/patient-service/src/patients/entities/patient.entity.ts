/**
 * Patient Entity
 * Extended patient information linked to User from Auth Service
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BloodType, Gender } from '@mediconnect/types';
import { MedicalRecord } from '../../medical-records/entities/medical-record.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  userId: string; // Reference to User in Auth Service

  @Column({ unique: true })
  @Index()
  medicalRecordNumber: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column({ type: 'date' })
  dateOfBirth: Date;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ type: 'jsonb', nullable: true })
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  @Column({
    type: 'enum',
    enum: BloodType,
    default: BloodType.UNKNOWN,
  })
  bloodType: BloodType;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height?: number; // in cm

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight?: number; // in kg

  @Column({ type: 'jsonb', default: [] })
  allergies: Array<{
    id: string;
    name: string;
    severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
    reaction?: string;
    diagnosedDate?: Date;
    notes?: string;
  }>;

  @Column({ type: 'jsonb', default: [] })
  chronicConditions: Array<{
    id: string;
    name: string;
    diagnosedDate: Date;
    status: 'active' | 'controlled' | 'in_remission' | 'resolved';
    medications: string[];
    notes?: string;
  }>;

  @Column({ type: 'jsonb', default: [] })
  emergencyContacts: Array<{
    id: string;
    name: string;
    relationship: string;
    phoneNumber: string;
    email?: string;
    isPrimary: boolean;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
    validFrom: Date;
    validUntil: Date;
    coverageType: string;
  };

  @Column({ nullable: true })
  assignedDoctorId?: string; // Reference to Doctor User

  @Column({ type: 'simple-array', default: [] })
  deviceIds: string[]; // IoT devices registered

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => MedicalRecord, (record) => record.patient)
  medicalRecords: MedicalRecord[];

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments: Appointment[];

  /**
   * Get full name
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Calculate age from date of birth
   */
  get age(): number {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Calculate BMI if height and weight are available
   */
  get bmi(): number | null {
    if (!this.height || !this.weight) {
      return null;
    }
    const heightInMeters = this.height / 100;
    return Number((this.weight / (heightInMeters * heightInMeters)).toFixed(2));
  }
}
