/**
 * Medical Records Service
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicalRecord, RecordType } from './entities/medical-record.entity';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly medicalRecordRepository: Repository<MedicalRecord>,
  ) {}

  async create(createMedicalRecordDto: CreateMedicalRecordDto, createdBy: string): Promise<MedicalRecord> {
    const record = this.medicalRecordRepository.create({
      ...createMedicalRecordDto,
      createdBy,
    });

    // Handle prescription format
    if (createMedicalRecordDto.medications) {
      record.prescription = {
        medications: createMedicalRecordDto.medications,
      };
    }

    return this.medicalRecordRepository.save(record);
  }

  async findAll(page: number = 1, limit: number = 10, filters?: any) {
    const skip = (page - 1) * limit;
    const queryBuilder = this.medicalRecordRepository.createQueryBuilder('record');

    if (filters?.patientId) {
      queryBuilder.andWhere('record.patientId = :patientId', {
        patientId: filters.patientId,
      });
    }

    if (filters?.doctorId) {
      queryBuilder.andWhere('record.doctorId = :doctorId', {
        doctorId: filters.doctorId,
      });
    }

    if (filters?.type) {
      queryBuilder.andWhere('record.type = :type', {
        type: filters.type,
      });
    }

    if (filters?.isCritical !== undefined) {
      queryBuilder.andWhere('record.isCritical = :isCritical', {
        isCritical: filters.isCritical,
      });
    }

    const [records, total] = await queryBuilder
      .leftJoinAndSelect('record.patient', 'patient')
      .skip(skip)
      .take(limit)
      .orderBy('record.recordDate', 'DESC')
      .getManyAndCount();

    return {
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<MedicalRecord> {
    const record = await this.medicalRecordRepository.findOne({
      where: { id },
      relations: ['patient'],
    });

    if (!record) {
      throw new NotFoundException(`Medical record with ID ${id} not found`);
    }

    return record;
  }

  async findByPatient(patientId: string): Promise<MedicalRecord[]> {
    return this.medicalRecordRepository.find({
      where: { patientId },
      relations: ['patient'],
      order: { recordDate: 'DESC' },
    });
  }
}
