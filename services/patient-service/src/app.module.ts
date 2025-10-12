/**
 * App Module
 * Root module of the Patient Service
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { HealthModule } from './health/health.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [
        '../../.env', // Root .env file
        '.env',
      ],
    }),

    // Database Module
    DatabaseModule,

    // Feature Modules
    PatientsModule,
    AppointmentsModule,
    MedicalRecordsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
