/**
 * WebSocket Module
 */

import { Module } from '@nestjs/common';
import { VitalsGateway } from './vitals.gateway';

@Module({
  providers: [VitalsGateway],
  exports: [VitalsGateway],
})
export class WebsocketModule {}
