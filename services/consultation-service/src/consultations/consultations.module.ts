import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { Consultation } from './entities/consultation.entity';
import { ConsultationMessage } from './entities/consultation-message.entity';
import { ConsultationParticipant } from './entities/consultation-participant.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Consultation,
      ConsultationMessage,
      ConsultationParticipant,
    ]),
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
