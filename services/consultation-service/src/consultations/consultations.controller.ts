import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConsultationStatus } from './entities/consultation.entity';

@ApiTags('Consultations')
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new consultation' })
  @ApiResponse({ status: 201, description: 'Consultation created successfully' })
  create(@Body() createDto: CreateConsultationDto) {
    return this.consultationsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all consultations with filters' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ConsultationStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: ConsultationStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.consultationsService.findAll({
      patientId,
      doctorId,
      status,
      page,
      limit,
    });
  }

  @Get('active/:doctorId')
  @ApiOperation({ summary: 'Get active consultations for a doctor' })
  getActiveConsultations(@Param('doctorId', ParseUUIDPipe) doctorId: string) {
    return this.consultationsService.getActiveConsultations(doctorId);
  }

  @Get('upcoming/:userId')
  @ApiOperation({ summary: 'Get upcoming consultations for a user' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  getUpcomingConsultations(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('hours') hours?: number,
  ) {
    return this.consultationsService.getUpcomingConsultations(userId, hours);
  }

  @Get('room/:roomId')
  @ApiOperation({ summary: 'Get consultation by room ID' })
  findByRoomId(@Param('roomId') roomId: string) {
    return this.consultationsService.findByRoomId(roomId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get consultation by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update consultation' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateConsultationDto,
  ) {
    return this.consultationsService.update(id, updateDto);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a consultation' })
  @HttpCode(HttpStatus.OK)
  startConsultation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userId') userId: string,
  ) {
    return this.consultationsService.startConsultation(id, userId);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a consultation' })
  @HttpCode(HttpStatus.OK)
  endConsultation(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultationsService.endConsultation(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a consultation' })
  @HttpCode(HttpStatus.OK)
  cancelConsultation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Body('cancelledBy') cancelledBy: string,
  ) {
    return this.consultationsService.cancelConsultation(id, reason, cancelledBy);
  }

  // Messaging endpoints
  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message in consultation' })
  sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() messageDto: SendMessageDto,
    @Query('senderId') senderId: string,
    @Query('senderRole') senderRole: string,
  ) {
    return this.consultationsService.sendMessage(id, senderId, senderRole, messageDto);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get all messages in consultation' })
  getMessages(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultationsService.getMessages(id);
  }

  @Patch('messages/:messageId/read')
  @ApiOperation({ summary: 'Mark message as read' })
  markMessageAsRead(@Param('messageId', ParseUUIDPipe) messageId: string) {
    return this.consultationsService.markMessageAsRead(messageId);
  }

  // Participant endpoints
  @Get(':id/participants')
  @ApiOperation({ summary: 'Get consultation participants' })
  getParticipants(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultationsService.getParticipants(id);
  }
}
