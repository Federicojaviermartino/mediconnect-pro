/**
 * Vitals Controller
 */

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VitalsService } from './vitals.service';
import { CreateVitalSignDto } from './dto/create-vital-sign.dto';
import { VitalSignType, VitalSignStatus } from '@mediconnect/types';

@ApiTags('vitals')
@Controller('vitals')
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @Post()
  @ApiOperation({ summary: 'Record new vital sign' })
  @ApiResponse({ status: 201, description: 'Vital sign recorded successfully' })
  create(@Body() createVitalSignDto: CreateVitalSignDto) {
    return this.vitalsService.create(createVitalSignDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vital signs with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'patientId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: VitalSignType })
  @ApiQuery({ name: 'deviceId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: VitalSignStatus })
  @ApiResponse({ status: 200, description: 'Vital signs retrieved successfully' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('patientId') patientId?: string,
    @Query('type') type?: VitalSignType,
    @Query('deviceId') deviceId?: string,
    @Query('status') status?: VitalSignStatus,
    @Query('isAlertTriggered') isAlertTriggered?: boolean,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.vitalsService.findAll(
      { patientId, type, deviceId, status, isAlertTriggered, startDate, endDate },
      page,
      limit,
    );
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get all vital signs for a patient' })
  @ApiQuery({ name: 'type', required: false, enum: VitalSignType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Vital signs retrieved successfully' })
  findByPatient(
    @Param('patientId') patientId: string,
    @Query('type') type?: VitalSignType,
    @Query('limit') limit?: number,
  ) {
    return this.vitalsService.findByPatient(patientId, type, limit);
  }

  @Get('patient/:patientId/latest')
  @ApiOperation({ summary: 'Get latest vital signs for a patient (one per type)' })
  @ApiResponse({ status: 200, description: 'Latest vital signs retrieved successfully' })
  getLatestByPatient(@Param('patientId') patientId: string) {
    return this.vitalsService.getLatestByPatient(patientId);
  }

  @Get('patient/:patientId/trends/:type')
  @ApiOperation({ summary: 'Get vital sign trends and statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default: 7)' })
  @ApiResponse({ status: 200, description: 'Trends retrieved successfully' })
  getTrends(
    @Param('patientId') patientId: string,
    @Param('type') type: VitalSignType,
    @Query('days') days?: number,
  ) {
    return this.vitalsService.getTrends(patientId, type, days);
  }

  @Get('alerts/critical')
  @ApiOperation({ summary: 'Get critical alerts' })
  @ApiQuery({ name: 'patientId', required: false, type: String })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Hours to look back (default: 24)' })
  @ApiResponse({ status: 200, description: 'Critical alerts retrieved successfully' })
  getCriticalAlerts(
    @Query('patientId') patientId?: string,
    @Query('hours') hours?: number,
  ) {
    return this.vitalsService.getCriticalAlerts(patientId, hours);
  }
}
