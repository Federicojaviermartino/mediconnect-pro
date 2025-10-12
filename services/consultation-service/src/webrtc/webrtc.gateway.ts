import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsultationsService } from '../consultations/consultations.service';

interface RoomParticipant {
  socketId: string;
  userId: string;
  role: string;
  peerId?: string;
}

@WebSocketGateway({
  namespace: '/consultation',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebRTCGateway.name);
  private rooms: Map<string, Map<string, RoomParticipant>> = new Map();

  constructor(
    private configService: ConfigService,
    private consultationsService: ConsultationsService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Find and remove from all rooms
    for (const [roomId, participants] of this.rooms.entries()) {
      for (const [userId, participant] of participants.entries()) {
        if (participant.socketId === client.id) {
          participants.delete(userId);

          // Notify other participants
          this.server.to(roomId).emit('user-left', {
            userId,
            roomId,
          });

          // Clean up empty rooms
          if (participants.size === 0) {
            this.rooms.delete(roomId);
          }

          this.logger.log(`User ${userId} left room ${roomId}`);
        }
      }
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; role: string },
  ) {
    const { roomId, userId, role } = data;

    try {
      // Verify consultation exists
      const consultation = await this.consultationsService.findByRoomId(roomId);

      // Join socket.io room
      client.join(roomId);

      // Initialize room if doesn't exist
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Map());
      }

      const room = this.rooms.get(roomId);
      const participant: RoomParticipant = {
        socketId: client.id,
        userId,
        role,
      };

      room.set(userId, participant);

      // Update participant status in database
      await this.consultationsService.updateParticipantJoined(
        consultation.id,
        userId,
      );

      // Get all participants in room
      const participants = Array.from(room.values()).map(p => ({
        userId: p.userId,
        role: p.role,
        peerId: p.peerId,
      }));

      // Send current participants to the new user
      client.emit('room-joined', {
        roomId,
        participants: participants.filter(p => p.userId !== userId),
      });

      // Notify others about the new user
      client.to(roomId).emit('user-joined', {
        userId,
        role,
        roomId,
      });

      this.logger.log(`User ${userId} (${role}) joined room ${roomId}`);

      return {
        success: true,
        roomId,
        participants,
      };
    } catch (error) {
      this.logger.error(`Failed to join room: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const { roomId, userId } = data;

    client.leave(roomId);

    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(userId);

      // Notify others
      this.server.to(roomId).emit('user-left', {
        userId,
        roomId,
      });

      // Clean up empty rooms
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    this.logger.log(`User ${userId} left room ${roomId}`);

    return { success: true };
  }

  @SubscribeMessage('webrtc-offer')
  handleWebRTCOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string; offer: any },
  ) {
    const { roomId, targetUserId, offer } = data;

    const room = this.rooms.get(roomId);
    if (room) {
      const targetParticipant = room.get(targetUserId);
      if (targetParticipant) {
        // Send offer to specific user
        this.server.to(targetParticipant.socketId).emit('webrtc-offer', {
          offer,
          fromUserId: this.getUserIdBySocket(client.id, roomId),
        });

        this.logger.log(`WebRTC offer sent in room ${roomId}`);
      }
    }

    return { success: true };
  }

  @SubscribeMessage('webrtc-answer')
  handleWebRTCAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string; answer: any },
  ) {
    const { roomId, targetUserId, answer } = data;

    const room = this.rooms.get(roomId);
    if (room) {
      const targetParticipant = room.get(targetUserId);
      if (targetParticipant) {
        // Send answer to specific user
        this.server.to(targetParticipant.socketId).emit('webrtc-answer', {
          answer,
          fromUserId: this.getUserIdBySocket(client.id, roomId),
        });

        this.logger.log(`WebRTC answer sent in room ${roomId}`);
      }
    }

    return { success: true };
  }

  @SubscribeMessage('webrtc-ice-candidate')
  handleICECandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; targetUserId: string; candidate: any },
  ) {
    const { roomId, targetUserId, candidate } = data;

    const room = this.rooms.get(roomId);
    if (room) {
      const targetParticipant = room.get(targetUserId);
      if (targetParticipant) {
        // Send ICE candidate to specific user
        this.server.to(targetParticipant.socketId).emit('webrtc-ice-candidate', {
          candidate,
          fromUserId: this.getUserIdBySocket(client.id, roomId),
        });
      }
    }

    return { success: true };
  }

  @SubscribeMessage('media-state-changed')
  async handleMediaStateChanged(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      roomId: string;
      userId: string;
      mediaState: {
        audio: { enabled: boolean; muted: boolean };
        video: { enabled: boolean; muted: boolean };
        screenShare: { enabled: boolean };
      };
    },
  ) {
    const { roomId, userId, mediaState } = data;

    try {
      const consultation = await this.consultationsService.findByRoomId(roomId);

      // Update in database
      await this.consultationsService.updateParticipantMedia(
        consultation.id,
        userId,
        mediaState,
      );

      // Broadcast to room
      this.server.to(roomId).emit('user-media-changed', {
        userId,
        mediaState,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update media state: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('send-chat-message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      roomId: string;
      senderId: string;
      senderRole: string;
      message: string;
    },
  ) {
    const { roomId, senderId, senderRole, message } = data;

    try {
      const consultation = await this.consultationsService.findByRoomId(roomId);

      // Save message to database
      const savedMessage = await this.consultationsService.sendMessage(
        consultation.id,
        senderId,
        senderRole,
        {
          type: 'text',
          content: message,
        },
      );

      // Broadcast to room
      this.server.to(roomId).emit('chat-message', {
        id: savedMessage.id,
        senderId,
        senderRole,
        message,
        timestamp: savedMessage.createdAt,
      });

      return { success: true, messageId: savedMessage.id };
    } catch (error) {
      this.logger.error(`Failed to send chat message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('start-screen-share')
  handleStartScreenShare(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const { roomId, userId } = data;

    // Notify all participants
    this.server.to(roomId).emit('user-screen-share-started', {
      userId,
    });

    this.logger.log(`User ${userId} started screen sharing in room ${roomId}`);

    return { success: true };
  }

  @SubscribeMessage('stop-screen-share')
  handleStopScreenShare(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const { roomId, userId } = data;

    // Notify all participants
    this.server.to(roomId).emit('user-screen-share-stopped', {
      userId,
    });

    this.logger.log(`User ${userId} stopped screen sharing in room ${roomId}`);

    return { success: true };
  }

  // Helper methods
  private getUserIdBySocket(socketId: string, roomId: string): string | null {
    const room = this.rooms.get(roomId);
    if (room) {
      for (const [userId, participant] of room.entries()) {
        if (participant.socketId === socketId) {
          return userId;
        }
      }
    }
    return null;
  }

  // Public method to emit events from services
  emitToRoom(roomId: string, event: string, data: any) {
    this.server.to(roomId).emit(event, data);
  }

  getRoomParticipants(roomId: string): RoomParticipant[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.values()) : [];
  }
}
