import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { WebRTCModule } from './webrtc/webrtc.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    DatabaseModule,
    ConsultationsModule,
    WebRTCModule,
    HealthModule,
  ],
})
export class AppModule {}
