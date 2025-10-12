import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client: twilio.Twilio;
  private accountSid: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(private configService: ConfigService) {
    this.accountSid = this.configService.get('twilio.accountSid');
    this.apiKey = this.configService.get('twilio.apiKey');
    this.apiSecret = this.configService.get('twilio.apiSecret');

    if (this.accountSid && this.apiKey && this.apiSecret) {
      this.client = twilio(this.apiKey, this.apiSecret, {
        accountSid: this.accountSid,
      });
      this.logger.log('Twilio client initialized');
    } else {
      this.logger.warn(
        'Twilio credentials not configured. Video rooms will use WebRTC P2P only.',
      );
    }
  }

  async createRoom(roomName: string, options?: any): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const room = await this.client.video.v1.rooms.create({
        uniqueName: roomName,
        type: options?.type || 'group', // 'group', 'peer-to-peer', 'group-small'
        maxParticipants: options?.maxParticipants || 10,
        recordParticipantsOnConnect: options?.recordParticipantsOnConnect || false,
        statusCallback: options?.statusCallback,
        statusCallbackMethod: 'POST',
      });

      this.logger.log(`Twilio room created: ${room.sid}`);
      return room;
    } catch (error) {
      this.logger.error(`Failed to create Twilio room: ${error.message}`);
      throw error;
    }
  }

  async generateAccessToken(
    roomName: string,
    identity: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const AccessToken = twilio.jwt.AccessToken;
      const VideoGrant = AccessToken.VideoGrant;

      const token = new AccessToken(
        this.accountSid,
        this.apiKey,
        this.apiSecret,
        {
          identity,
          ttl: expiresIn,
        },
      );

      const videoGrant = new VideoGrant({
        room: roomName,
      });

      token.addGrant(videoGrant);

      const jwt = token.toJwt();
      this.logger.log(`Access token generated for ${identity} in room ${roomName}`);

      return jwt;
    } catch (error) {
      this.logger.error(`Failed to generate access token: ${error.message}`);
      throw error;
    }
  }

  async getRoomDetails(roomSid: string): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const room = await this.client.video.v1.rooms(roomSid).fetch();
      return room;
    } catch (error) {
      this.logger.error(`Failed to get room details: ${error.message}`);
      throw error;
    }
  }

  async endRoom(roomSid: string): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const room = await this.client.video.v1
        .rooms(roomSid)
        .update({ status: 'completed' });

      this.logger.log(`Twilio room ended: ${roomSid}`);
      return room;
    } catch (error) {
      this.logger.error(`Failed to end Twilio room: ${error.message}`);
      throw error;
    }
  }

  async getParticipants(roomSid: string): Promise<any[]> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const participants = await this.client.video.v1
        .rooms(roomSid)
        .participants.list();

      return participants;
    } catch (error) {
      this.logger.error(`Failed to get participants: ${error.message}`);
      throw error;
    }
  }

  async removeParticipant(roomSid: string, participantSid: string): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const participant = await this.client.video.v1
        .rooms(roomSid)
        .participants(participantSid)
        .update({ status: 'disconnected' });

      this.logger.log(`Participant ${participantSid} removed from room ${roomSid}`);
      return participant;
    } catch (error) {
      this.logger.error(`Failed to remove participant: ${error.message}`);
      throw error;
    }
  }

  async getRoomRecordings(roomSid: string): Promise<any[]> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const recordings = await this.client.video.v1
        .rooms(roomSid)
        .recordings.list();

      return recordings;
    } catch (error) {
      this.logger.error(`Failed to get recordings: ${error.message}`);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }
}
