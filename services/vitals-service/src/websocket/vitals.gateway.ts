/**
 * Vitals WebSocket Gateway
 * Real-time updates for vital signs
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/vitals',
})
export class VitalsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VitalsGateway.name);
  private connectedClients = new Map<string, string>(); // socketId -> patientId

  constructor(private configService: ConfigService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const patientId = this.connectedClients.get(client.id);
    if (patientId) {
      client.leave(`patient:${patientId}`);
      this.connectedClients.delete(client.id);
      this.logger.log(`Client ${client.id} disconnected from patient ${patientId}`);
    }
  }

  /**
   * Subscribe to patient's vital signs
   */
  @SubscribeMessage('subscribe:patient')
  handleSubscribePatient(client: Socket, patientId: string) {
    client.join(`patient:${patientId}`);
    this.connectedClients.set(client.id, patientId);
    this.logger.log(`Client ${client.id} subscribed to patient ${patientId}`);

    return {
      event: 'subscribed',
      data: { patientId, message: 'Successfully subscribed to patient vitals' },
    };
  }

  /**
   * Unsubscribe from patient's vital signs
   */
  @SubscribeMessage('unsubscribe:patient')
  handleUnsubscribePatient(client: Socket, patientId: string) {
    client.leave(`patient:${patientId}`);
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} unsubscribed from patient ${patientId}`);

    return {
      event: 'unsubscribed',
      data: { patientId, message: 'Successfully unsubscribed from patient vitals' },
    };
  }

  /**
   * Emit new vital sign to subscribed clients
   */
  emitVitalSign(patientId: string, vitalSign: any) {
    this.server.to(`patient:${patientId}`).emit('vital:new', vitalSign);
    this.logger.debug(`Emitted vital sign for patient ${patientId}`);
  }

  /**
   * Emit alert to subscribed clients
   */
  emitAlert(patientId: string, alert: any) {
    this.server.to(`patient:${patientId}`).emit('vital:alert', alert);
    this.logger.warn(`Emitted alert for patient ${patientId}: ${alert.message}`);
  }

  /**
   * Broadcast system message
   */
  broadcastSystemMessage(message: string) {
    this.server.emit('system:message', { message, timestamp: new Date() });
  }
}
