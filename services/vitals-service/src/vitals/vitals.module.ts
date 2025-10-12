/**
 * Vitals Module
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VitalsController } from './vitals.controller';
import { VitalsService } from './vitals.service';
import { VitalSign, VitalSignSchema } from './schemas/vital-sign.schema';
import { Device, DeviceSchema } from './schemas/device.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VitalSign.name, schema: VitalSignSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
  ],
  controllers: [VitalsController],
  providers: [VitalsService],
  exports: [VitalsService],
})
export class VitalsModule {}
