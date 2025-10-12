import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebRTCGateway } from './webrtc.gateway';
import { TwilioService } from './twilio.service';
import { Consultation } from '../consultations/entities/consultation.entity';
import { ConsultationParticipant } from '../consultations/entities/consultation-participant.entity';
import { ConsultationMessage } from '../consultations/entities/consultation-message.entity';
import { ConsultationsService } from '../consultations/consultations.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Consultation,
      ConsultationParticipant,
      ConsultationMessage,
    ]),
  ],
  providers: [WebRTCGateway, TwilioService, ConsultationsService],
  exports: [WebRTCGateway, TwilioService],
})
export class WebRTCModule {}
