import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import * as dayjs from 'dayjs';
import { Consultation, ConsultationStatus } from './entities/consultation.entity';
import { ConsultationMessage, MessageStatus } from './entities/consultation-message.entity';
import { ConsultationParticipant, ParticipantStatus } from './entities/consultation-participant.entity';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(
    @InjectRepository(Consultation)
    private consultationRepository: Repository<Consultation>,
    @InjectRepository(ConsultationMessage)
    private messageRepository: Repository<ConsultationMessage>,
    @InjectRepository(ConsultationParticipant)
    private participantRepository: Repository<ConsultationParticipant>,
    private configService: ConfigService,
  ) {}

  async create(createDto: CreateConsultationDto): Promise<Consultation> {
    // Generate consultation number
    const consultationNumber = `CON-${nanoid(10).toUpperCase()}`;

    // Generate room ID
    const roomId = `room-${nanoid(16)}`;

    const consultation = this.consultationRepository.create({
      ...createDto,
      consultationNumber,
      roomId,
      scheduledStartTime: new Date(createDto.scheduledStartTime),
      symptoms: createDto.symptoms || [],
      patientNotes: createDto.patientNotes
        ? { beforeConsultation: createDto.patientNotes }
        : null,
    });

    const saved = await this.consultationRepository.save(consultation);

    // Create participant records
    await this.createParticipants(saved.id, saved.patientId, saved.doctorId);

    this.logger.log(`Consultation created: ${saved.consultationNumber}`);
    return saved;
  }

  private async createParticipants(
    consultationId: string,
    patientId: string,
    doctorId: string,
  ) {
    const participants = [
      this.participantRepository.create({
        consultationId,
        userId: patientId,
        role: 'patient',
        status: ParticipantStatus.INVITED,
        hasAudioPermission: true,
        hasVideoPermission: true,
      }),
      this.participantRepository.create({
        consultationId,
        userId: doctorId,
        role: 'doctor',
        status: ParticipantStatus.INVITED,
        hasAudioPermission: true,
        hasVideoPermission: true,
        hasScreenSharePermission: true,
      }),
    ];

    await this.participantRepository.save(participants);
  }

  async findAll(filters?: {
    patientId?: string;
    doctorId?: string;
    status?: ConsultationStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ data: Consultation[]; total: number; page: number; limit: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.consultationRepository.createQueryBuilder('consultation');

    if (filters?.patientId) {
      query.andWhere('consultation.patientId = :patientId', {
        patientId: filters.patientId,
      });
    }

    if (filters?.doctorId) {
      query.andWhere('consultation.doctorId = :doctorId', {
        doctorId: filters.doctorId,
      });
    }

    if (filters?.status) {
      query.andWhere('consultation.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere(
        'consultation.scheduledStartTime BETWEEN :startDate AND :endDate',
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      );
    }

    query.orderBy('consultation.scheduledStartTime', 'DESC');
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Consultation> {
    const consultation = await this.consultationRepository.findOne({
      where: { id },
      relations: ['messages'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${id} not found`);
    }

    return consultation;
  }

  async findByRoomId(roomId: string): Promise<Consultation> {
    const consultation = await this.consultationRepository.findOne({
      where: { roomId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation with room ID ${roomId} not found`);
    }

    return consultation;
  }

  async update(id: string, updateDto: UpdateConsultationDto): Promise<Consultation> {
    const consultation = await this.findOne(id);

    // Update doctor notes if provided
    if (updateDto.doctorPrivateNotes || updateDto.doctorSharedNotes) {
      consultation.doctorNotes = {
        ...consultation.doctorNotes,
        privateNotes: updateDto.doctorPrivateNotes || consultation.doctorNotes?.privateNotes,
        sharedNotes: updateDto.doctorSharedNotes || consultation.doctorNotes?.sharedNotes,
      };
    }

    Object.assign(consultation, updateDto);

    return this.consultationRepository.save(consultation);
  }

  async startConsultation(id: string, userId: string): Promise<Consultation> {
    const consultation = await this.findOne(id);

    if (!consultation.canStart) {
      throw new BadRequestException(
        `Cannot start consultation in status: ${consultation.status}`,
      );
    }

    consultation.status = ConsultationStatus.IN_PROGRESS;
    consultation.actualStartTime = new Date();

    // Update participant joined time
    await this.updateParticipantJoined(id, userId);

    return this.consultationRepository.save(consultation);
  }

  async endConsultation(id: string): Promise<Consultation> {
    const consultation = await this.findOne(id);

    if (!consultation.canEnd) {
      throw new BadRequestException(
        `Cannot end consultation in status: ${consultation.status}`,
      );
    }

    consultation.status = ConsultationStatus.COMPLETED;
    consultation.actualEndTime = new Date();

    // Calculate duration
    if (consultation.actualStartTime) {
      const start = dayjs(consultation.actualStartTime);
      const end = dayjs(consultation.actualEndTime);
      consultation.durationMinutes = end.diff(start, 'minute');
    }

    // Update all participants to LEFT status
    await this.participantRepository.update(
      { consultationId: id, status: ParticipantStatus.JOINED },
      { status: ParticipantStatus.LEFT, leftAt: new Date() },
    );

    this.logger.log(`Consultation ${consultation.consultationNumber} ended`);
    return this.consultationRepository.save(consultation);
  }

  async cancelConsultation(
    id: string,
    reason: string,
    cancelledBy: string,
  ): Promise<Consultation> {
    const consultation = await this.findOne(id);

    if (!consultation.canCancel) {
      throw new BadRequestException(
        `Cannot cancel consultation in status: ${consultation.status}`,
      );
    }

    consultation.status = ConsultationStatus.CANCELLED;
    consultation.cancellationReason = reason;
    consultation.cancelledBy = cancelledBy;
    consultation.cancelledAt = new Date();

    this.logger.log(`Consultation ${consultation.consultationNumber} cancelled`);
    return this.consultationRepository.save(consultation);
  }

  // Messaging methods
  async sendMessage(
    consultationId: string,
    senderId: string,
    senderRole: string,
    messageDto: SendMessageDto,
  ): Promise<ConsultationMessage> {
    const consultation = await this.findOne(consultationId);

    const message = this.messageRepository.create({
      consultationId,
      senderId,
      senderRole,
      type: messageDto.type,
      content: messageDto.content,
      attachments: messageDto.attachments || [],
      status: MessageStatus.SENT,
      metadata: messageDto.replyTo ? { replyTo: messageDto.replyTo } : null,
    });

    return this.messageRepository.save(message);
  }

  async getMessages(consultationId: string): Promise<ConsultationMessage[]> {
    return this.messageRepository.find({
      where: { consultationId, isDeleted: false },
      order: { createdAt: 'ASC' },
    });
  }

  async markMessageAsRead(messageId: string): Promise<ConsultationMessage> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    message.status = MessageStatus.READ;
    message.readAt = new Date();

    return this.messageRepository.save(message);
  }

  // Participant methods
  async updateParticipantJoined(
    consultationId: string,
    userId: string,
  ): Promise<ConsultationParticipant> {
    const participant = await this.participantRepository.findOne({
      where: { consultationId, userId },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.status = ParticipantStatus.JOINED;
    participant.joinedAt = new Date();

    return this.participantRepository.save(participant);
  }

  async updateParticipantMedia(
    consultationId: string,
    userId: string,
    mediaState: any,
  ): Promise<ConsultationParticipant> {
    const participant = await this.participantRepository.findOne({
      where: { consultationId, userId },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.mediaState = mediaState;

    return this.participantRepository.save(participant);
  }

  async getParticipants(consultationId: string): Promise<ConsultationParticipant[]> {
    return this.participantRepository.find({
      where: { consultationId },
    });
  }

  async getActiveConsultations(doctorId: string): Promise<Consultation[]> {
    return this.consultationRepository.find({
      where: {
        doctorId,
        status: In([ConsultationStatus.IN_PROGRESS, ConsultationStatus.WAITING]),
      },
      order: { scheduledStartTime: 'ASC' },
    });
  }

  async getUpcomingConsultations(
    userId: string,
    hours: number = 24,
  ): Promise<Consultation[]> {
    const now = new Date();
    const future = dayjs(now).add(hours, 'hour').toDate();

    return this.consultationRepository.find({
      where: [
        {
          patientId: userId,
          status: ConsultationStatus.SCHEDULED,
          scheduledStartTime: Between(now, future),
        },
        {
          doctorId: userId,
          status: ConsultationStatus.SCHEDULED,
          scheduledStartTime: Between(now, future),
        },
      ],
      order: { scheduledStartTime: 'ASC' },
    });
  }
}
