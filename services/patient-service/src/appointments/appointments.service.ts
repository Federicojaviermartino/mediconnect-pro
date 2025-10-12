/**
 * Appointments Service
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  async create(createAppointmentDto: CreateAppointmentDto): Promise<Appointment> {
    // Validate that end time is after start time
    if (createAppointmentDto.scheduledEnd <= createAppointmentDto.scheduledStart) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for conflicts
    const conflicts = await this.checkConflicts(
      createAppointmentDto.doctorId,
      createAppointmentDto.scheduledStart,
      createAppointmentDto.scheduledEnd,
    );

    if (conflicts.length > 0) {
      throw new BadRequestException('Doctor has conflicting appointments at this time');
    }

    const appointment = this.appointmentRepository.create(createAppointmentDto);
    return this.appointmentRepository.save(appointment);
  }

  async findAll(page: number = 1, limit: number = 10, filters?: any) {
    const skip = (page - 1) * limit;
    const queryBuilder = this.appointmentRepository.createQueryBuilder('appointment');

    if (filters?.patientId) {
      queryBuilder.andWhere('appointment.patientId = :patientId', {
        patientId: filters.patientId,
      });
    }

    if (filters?.doctorId) {
      queryBuilder.andWhere('appointment.doctorId = :doctorId', {
        doctorId: filters.doctorId,
      });
    }

    if (filters?.status) {
      queryBuilder.andWhere('appointment.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('appointment.scheduledStart BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const [appointments, total] = await queryBuilder
      .leftJoinAndSelect('appointment.patient', 'patient')
      .skip(skip)
      .take(limit)
      .orderBy('appointment.scheduledStart', 'ASC')
      .getManyAndCount();

    return {
      appointments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['patient'],
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    await this.findOne(id);
    await this.appointmentRepository.update(id, { status });
    return this.findOne(id);
  }

  async cancel(id: string, reason: string, cancelledBy: string): Promise<Appointment> {
    await this.findOne(id);
    await this.appointmentRepository.update(id, {
      status: AppointmentStatus.CANCELLED,
      cancellationReason: reason,
      cancelledBy,
      cancelledAt: new Date(),
    });
    return this.findOne(id);
  }

  async checkConflicts(doctorId: string, start: Date, end: Date): Promise<Appointment[]> {
    return this.appointmentRepository
      .createQueryBuilder('appointment')
      .where('appointment.doctorId = :doctorId', { doctorId })
      .andWhere('appointment.status NOT IN (:...statuses)', {
        statuses: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED],
      })
      .andWhere(
        '(appointment.scheduledStart < :end AND appointment.scheduledEnd > :start)',
        { start, end },
      )
      .getMany();
  }
}
