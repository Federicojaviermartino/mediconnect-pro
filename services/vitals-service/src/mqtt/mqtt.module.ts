/**
 * MQTT Module
 */

import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { VitalsModule } from '../vitals/vitals.module';

@Module({
  imports: [VitalsModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
