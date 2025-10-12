/**
 * Patients Controller
 * Handles patient management endpoints
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@ApiTags('patients')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new patient' })
  @ApiResponse({ status: 201, description: 'Patient created successfully' })
  @ApiResponse({ status: 409, description: 'Patient already exists' })
  create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.create(createPatientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all patients with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'assignedDoctorId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Patients retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('assignedDoctorId') assignedDoctorId?: string,
    @Query('search') search?: string,
  ) {
    return this.patientsService.findAll(page, limit, { assignedDoctorId, search });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get patient statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics() {
    return this.patientsService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID' })
  @ApiResponse({ status: 200, description: 'Patient retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get patient by user ID' })
  @ApiResponse({ status: 200, description: 'Patient retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  findByUserId(@Param('userId') userId: string) {
    return this.patientsService.findByUserId(userId);
  }

  @Get('mrn/:mrn')
  @ApiOperation({ summary: 'Get patient by medical record number' })
  @ApiResponse({ status: 200, description: 'Patient retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  findByMRN(@Param('mrn') mrn: string) {
    return this.patientsService.findByMedicalRecordNumber(mrn);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update patient' })
  @ApiResponse({ status: 200, description: 'Patient updated successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientsService.update(id, updatePatientDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete patient (soft delete)' })
  @ApiResponse({ status: 204, description: 'Patient deleted successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  }

  @Patch(':id/assign-doctor/:doctorId')
  @ApiOperation({ summary: 'Assign doctor to patient' })
  @ApiResponse({ status: 200, description: 'Doctor assigned successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  assignDoctor(
    @Param('id') id: string,
    @Param('doctorId') doctorId: string,
  ) {
    return this.patientsService.assignDoctor(id, doctorId);
  }

  @Post(':id/devices/:deviceId')
  @ApiOperation({ summary: 'Add device to patient' })
  @ApiResponse({ status: 200, description: 'Device added successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  addDevice(
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.patientsService.addDevice(id, deviceId);
  }

  @Delete(':id/devices/:deviceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove device from patient' })
  @ApiResponse({ status: 200, description: 'Device removed successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  removeDevice(
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.patientsService.removeDevice(id, deviceId);
  }
}
