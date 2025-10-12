import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Consultation } from './consultation.entity';

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM = 'system',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('consultation_messages')
export class ConsultationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  consultationId: string;

  @ManyToOne(() => Consultation, (consultation) => consultation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation;

  @Column('uuid')
  senderId: string; // User ID (doctor or patient)

  @Column()
  senderRole: string; // 'doctor' | 'patient'

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string; // mime type
    size: number;
  }>;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  editedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    replyTo?: string; // Message ID
    reactions?: Array<{ userId: string; emoji: string }>;
  };

  @CreateDateColumn()
  createdAt: Date;
}
