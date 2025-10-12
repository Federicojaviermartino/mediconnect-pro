/**
 * App Module
 * Root module of the Vitals Service
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { VitalsModule } from './vitals/vitals.module';
import { MqttModule } from './mqtt/mqtt.module';
import { WebsocketModule } from './websocket/websocket.module';
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

    // Database Module (MongoDB)
    DatabaseModule,

    // Feature Modules
    VitalsModule,
    MqttModule,
    WebsocketModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
