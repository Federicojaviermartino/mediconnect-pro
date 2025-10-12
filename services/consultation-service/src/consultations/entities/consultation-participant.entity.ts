import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ParticipantRole {
  DOCTOR = 'doctor',
  PATIENT = 'patient',
  NURSE = 'nurse',
  OBSERVER = 'observer',
}

export enum ParticipantStatus {
  INVITED = 'invited',
  JOINED = 'joined',
  LEFT = 'left',
  DISCONNECTED = 'disconnected',
}

@Entity('consultation_participants')
export class ConsultationParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  consultationId: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
  })
  role: ParticipantRole;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.INVITED,
  })
  status: ParticipantStatus;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date;

  @Column({ type: 'int', default: 0 })
  durationSeconds: number; // Time spent in consultation

  @Column({ nullable: true })
  socketId: string; // Current WebSocket connection ID

  @Column({ nullable: true })
  peerId: string; // WebRTC peer ID

  @Column({ type: 'jsonb', nullable: true })
  mediaState: {
    audio: {
      enabled: boolean;
      muted: boolean;
      deviceId?: string;
    };
    video: {
      enabled: boolean;
      muted: boolean;
      deviceId?: string;
    };
    screenShare: {
      enabled: boolean;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  connectionInfo: {
    ip?: string;
    browser?: string;
    os?: string;
    device?: string;
    quality?: 'poor' | 'fair' | 'good' | 'excellent';
  };

  @Column({ type: 'jsonb', default: [] })
  disconnections: Array<{
    timestamp: Date;
    reason?: string;
    duration?: number; // seconds until reconnected
  }>;

  @Column({ default: false })
  hasAudioPermission: boolean;

  @Column({ default: false })
  hasVideoPermission: boolean;

  @Column({ default: false })
  hasScreenSharePermission: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
