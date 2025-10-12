/**
 * Patients Service
 * Business logic for patient management
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  /**
   * Create new patient
   */
  async create(createPatientDto: CreatePatientDto): Promise<Patient> {
    // Check if patient with userId already exists
    const existing = await this.patientRepository.findOne({
      where: { userId: createPatientDto.userId },
    });

    if (existing) {
      throw new ConflictException('Patient already exists for this user');
    }

    // Generate medical record number
    const medicalRecordNumber = `MRN-${nanoid(10).toUpperCase()}`;

    const patient = this.patientRepository.create({
      ...createPatientDto,
      medicalRecordNumber,
    });

    return this.patientRepository.save(patient);
  }

  /**
   * Find all patients with pagination
   */
  async findAll(page: number = 1, limit: number = 10, filters?: any) {
    const skip = (page - 1) * limit;
    const queryBuilder = this.patientRepository.createQueryBuilder('patient');

    if (filters?.assignedDoctorId) {
      queryBuilder.andWhere('patient.assignedDoctorId = :doctorId', {
        doctorId: filters.assignedDoctorId,
      });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('patient.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(patient.firstName ILIKE :search OR patient.lastName ILIKE :search OR patient.email ILIKE :search OR patient.medicalRecordNumber ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const [patients, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('patient.createdAt', 'DESC')
      .getManyAndCount();

    return {
      patients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find patient by ID
   */
  async findOne(id: string): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { id },
      relations: ['medicalRecords', 'appointments'],
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }

  /**
   * Find patient by user ID
   */
  async findByUserId(userId: string): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { userId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient for user ${userId} not found`);
    }

    return patient;
  }

  /**
   * Find patient by medical record number
   */
  async findByMedicalRecordNumber(mrn: string): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { medicalRecordNumber: mrn },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with MRN ${mrn} not found`);
    }

    return patient;
  }

  /**
   * Update patient
   */
  async update(id: string, updatePatientDto: UpdatePatientDto): Promise<Patient> {
    await this.findOne(id); // Check if exists
    await this.patientRepository.update(id, updatePatientDto);
    return this.findOne(id);
  }

  /**
   * Soft delete patient (set isActive to false)
   */
  async remove(id: string): Promise<void> {
    const patient = await this.findOne(id);
    await this.patientRepository.update(id, { isActive: false });
  }

  /**
   * Assign doctor to patient
   */
  async assignDoctor(patientId: string, doctorId: string): Promise<Patient> {
    await this.findOne(patientId);
    await this.patientRepository.update(patientId, { assignedDoctorId: doctorId });
    return this.findOne(patientId);
  }

  /**
   * Add device to patient
   */
  async addDevice(patientId: string, deviceId: string): Promise<Patient> {
    const patient = await this.findOne(patientId);

    if (!patient.deviceIds.includes(deviceId)) {
      patient.deviceIds.push(deviceId);
      await this.patientRepository.save(patient);
    }

    return patient;
  }

  /**
   * Remove device from patient
   */
  async removeDevice(patientId: string, deviceId: string): Promise<Patient> {
    const patient = await this.findOne(patientId);
    patient.deviceIds = patient.deviceIds.filter((id) => id !== deviceId);
    await this.patientRepository.save(patient);
    return patient;
  }

  /**
   * Get patient statistics
   */
  async getStatistics() {
    const total = await this.patientRepository.count();
    const active = await this.patientRepository.count({ where: { isActive: true } });
    const inactive = total - active;

    return {
      total,
      active,
      inactive,
    };
  }
}
