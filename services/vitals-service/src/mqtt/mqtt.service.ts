/**
 * MQTT Service
 * Handles communication with IoT devices via MQTT protocol
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { VitalsService } from '../vitals/vitals.service';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;

  constructor(
    private configService: ConfigService,
    private vitalsService: VitalsService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.endAsync();
    }
  }

  private async connect() {
    const broker = this.configService.get('mqtt.broker');
    const username = this.configService.get('mqtt.username');
    const password = this.configService.get('mqtt.password');
    const clientId = this.configService.get('mqtt.clientId');

    this.logger.log(`Connecting to MQTT broker: ${broker}`);

    this.client = mqtt.connect(broker, {
      clientId: `${clientId}-${Date.now()}`,
      username,
      password,
      clean: true,
      reconnectPeriod: 5000,
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to MQTT broker');
      this.subscribeToTopics();
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });

    this.client.on('error', (error) => {
      this.logger.error(`MQTT error: ${error.message}`);
    });

    this.client.on('close', () => {
      this.logger.warn('MQTT connection closed');
    });

    this.client.on('reconnect', () => {
      this.logger.log('Reconnecting to MQTT broker...');
    });
  }

  private subscribeToTopics() {
    const vitalsIncoming = this.configService.get('mqtt.topics.vitalsIncoming');
    const deviceStatus = this.configService.get('mqtt.topics.deviceStatus');

    this.client.subscribe([vitalsIncoming, deviceStatus], (err) => {
      if (err) {
        this.logger.error(`Subscription error: ${err.message}`);
      } else {
        this.logger.log(`Subscribed to topics: ${vitalsIncoming}, ${deviceStatus}`);
      }
    });
  }

  private async handleMessage(topic: string, message: Buffer) {
    try {
      const payload = JSON.parse(message.toString());
      this.logger.debug(`Received message on ${topic}: ${JSON.stringify(payload)}`);

      if (topic.includes('/vitals')) {
        await this.handleVitalsMessage(payload);
      } else if (topic.includes('/status')) {
        await this.handleDeviceStatus(payload);
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`);
    }
  }

  private async handleVitalsMessage(payload: any) {
    try {
      // Extract device ID from payload
      const deviceId = payload.deviceId;
      const patientId = payload.patientId;

      // Create vital sign record
      await this.vitalsService.create({
        patientId,
        type: payload.type,
        value: payload.value,
        unit: payload.unit,
        deviceId,
        deviceType: payload.deviceType,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        metadata: payload.metadata,
      });

      this.logger.log(`Vital sign recorded from device ${deviceId} for patient ${patientId}`);
    } catch (error) {
      this.logger.error(`Error processing vitals message: ${error.message}`);
    }
  }

  private async handleDeviceStatus(payload: any) {
    this.logger.log(`Device status update: ${JSON.stringify(payload)}`);
    // TODO: Update device status in database
  }

  /**
   * Publish message to device
   */
  async publishToDevice(deviceId: string, command: any) {
    const topic = `devices/${deviceId}/commands`;
    const message = JSON.stringify(command);

    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Error publishing to ${topic}: ${error.message}`);
          reject(error);
        } else {
          this.logger.log(`Command sent to device ${deviceId}`);
          resolve(true);
        }
      });
    });
  }
}
