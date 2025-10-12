/**
 * Medical Records Controller
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { RecordType } from './entities/medical-record.entity';

@ApiTags('medical-records')
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new medical record' })
  @ApiResponse({ status: 201, description: 'Medical record created successfully' })
  create(
    @Body() createMedicalRecordDto: CreateMedicalRecordDto,
    @Body('createdBy') createdBy: string,
  ) {
    return this.medicalRecordsService.create(createMedicalRecordDto, createdBy);
  }

  @Get()
  @ApiOperation({ summary: 'Get all medical records with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'patientId', required: false, type: String })
  @ApiQuery({ name: 'doctorId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: RecordType })
  @ApiResponse({ status: 200, description: 'Medical records retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('type') type?: RecordType,
    @Query('isCritical') isCritical?: boolean,
  ) {
    return this.medicalRecordsService.findAll(page, limit, {
      patientId,
      doctorId,
      type,
      isCritical,
    });
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get all medical records for a patient' })
  @ApiResponse({ status: 200, description: 'Medical records retrieved successfully' })
  findByPatient(@Param('patientId') patientId: string) {
    return this.medicalRecordsService.findByPatient(patientId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get medical record by ID' })
  @ApiResponse({ status: 200, description: 'Medical record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Medical record not found' })
  findOne(@Param('id') id: string) {
    return this.medicalRecordsService.findOne(id);
  }
}
