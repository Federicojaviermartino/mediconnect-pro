# MediConnect Pro - Consultation Service

Real-time video consultation service with WebRTC, chat messaging, and Twilio integration for enterprise-grade telemedicine.

## Features

- **Video Consultations** - High-quality video calls using WebRTC or Twilio
- **Real-time Chat** - In-consultation messaging with file attachments
- **Screen Sharing** - Share medical records and images during consultation
- **Multi-participant Support** - Doctor, patient, nurses, and observers
- **Consultation Management** - Schedule, start, end, and cancel consultations
- **Medical Records Integration** - Document diagnosis, prescriptions, and treatment plans
- **Recording Support** - Optional consultation recording with consent
- **Participant Tracking** - Monitor join/leave times, media state, and connection quality
- **WebSocket Communication** - Real-time signaling for WebRTC connections
- **Flexible Backend** - Supports both P2P WebRTC and Twilio Video Rooms

## Architecture

```
┌─────────────────────┐
│   Web/Mobile App    │
│  (Doctor/Patient)   │
└──────────┬──────────┘
           │ HTTPS REST API
           │ WebSocket (/consultation)
           ▼
┌──────────────────────────────────────────┐
│       Consultation Service (NestJS)       │
│  ┌────────────┐      ┌────────────────┐  │
│  │ REST API   │      │  WebRTC        │  │
│  │ Controller │      │  Gateway       │  │
│  └─────┬──────┘      └────────┬───────┘  │
│        │                      │           │
│        ▼                      ▼           │
│  ┌─────────────────────────────────────┐ │
│  │    Consultations Service            │ │
│  │  - Create/manage consultations      │ │
│  │  - Messaging                        │ │
│  │  - Participant management           │ │
│  └──────┬──────────────────────────────┘ │
│         │                                 │
│  ┌──────▼──────────┐  ┌───────────────┐  │
│  │   PostgreSQL    │  │ Twilio Video  │  │
│  │   (TypeORM)     │  │   (Optional)  │  │
│  └─────────────────┘  └───────────────┘  │
└──────────────────────────────────────────┘
           │
           │ Kafka Events
           ▼
┌─────────────────────┐
│ Notification Service│
└─────────────────────┘
```

## Technologies

- **NestJS** - Progressive Node.js framework
- **TypeORM + PostgreSQL** - Relational database for consultations
- **Socket.IO** - WebSocket communication
- **WebRTC** - Peer-to-peer video/audio
- **Twilio Video** - Enterprise video infrastructure (optional)
- **Swagger** - API documentation
- **Kafka** - Event streaming for notifications

## Installation

```bash
# Navigate to service directory
cd services/consultation-service

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

### Environment Variables

```env
# Server
NODE_ENV=development
PORT=3004

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=mediconnect_consultations

# Twilio (Optional - if not provided, uses P2P WebRTC)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret
TWILIO_AUTH_TOKEN=your_auth_token

# TURN Server (for WebRTC NAT traversal)
TURN_SERVER_URL=turn:turn.example.com:3478
TURN_USERNAME=username
TURN_CREDENTIAL=password

# Kafka
KAFKA_BROKERS=localhost:9092

# Recording (Optional)
RECORDING_ENABLED=false
STORAGE_TYPE=s3
S3_BUCKET=mediconnect-recordings
AWS_REGION=us-east-1

# CORS
CORS_ORIGIN=*
```

## Running the Service

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

### Docker

```bash
# From project root
docker-compose up consultation-service
```

## API Documentation

Once running, access Swagger documentation at:
```
http://localhost:3004/api/docs
```

### REST API Endpoints

#### Consultations

**Create Consultation**
```http
POST /api/v1/consultations
Content-Type: application/json

{
  "patientId": "uuid",
  "doctorId": "uuid",
  "appointmentId": "uuid",
  "type": "video",
  "priority": "routine",
  "scheduledStartTime": "2025-10-11T14:00:00Z",
  "reasonForVisit": "Follow-up consultation",
  "chiefComplaint": "Persistent headaches",
  "symptoms": [
    {
      "name": "Headache",
      "severity": "moderate",
      "duration": "3 days",
      "notes": "Worse in the morning"
    }
  ],
  "isRecorded": false,
  "recordingConsent": false
}
```

Response:
```json
{
  "id": "uuid",
  "consultationNumber": "CON-ABC1234567",
  "roomId": "room-xyz789abc123",
  "status": "scheduled",
  "...": "..."
}
```

**List Consultations with Filters**
```http
GET /api/v1/consultations?patientId=uuid&status=scheduled&page=1&limit=20
```

Query parameters:
- `patientId` - Filter by patient
- `doctorId` - Filter by doctor
- `status` - Filter by status (scheduled, in_progress, completed, cancelled)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Get Consultation by ID**
```http
GET /api/v1/consultations/:id
```

**Get Consultation by Room ID**
```http
GET /api/v1/consultations/room/:roomId
```

**Get Active Consultations (Doctor)**
```http
GET /api/v1/consultations/active/:doctorId
```

**Get Upcoming Consultations**
```http
GET /api/v1/consultations/upcoming/:userId?hours=24
```

**Start Consultation**
```http
POST /api/v1/consultations/:id/start
Content-Type: application/json

{
  "userId": "uuid"
}
```

**End Consultation**
```http
POST /api/v1/consultations/:id/end
```

**Cancel Consultation**
```http
POST /api/v1/consultations/:id/cancel
Content-Type: application/json

{
  "reason": "Patient requested cancellation",
  "cancelledBy": "uuid"
}
```

**Update Consultation (Add Diagnosis/Prescriptions)**
```http
PATCH /api/v1/consultations/:id
Content-Type: application/json

{
  "diagnosis": "Tension headaches",
  "treatmentPlan": "Rest, hydration, OTC pain relief",
  "prescriptions": [
    {
      "medication": "Ibuprofen",
      "dosage": "400mg",
      "frequency": "Every 6 hours",
      "duration": "5 days",
      "instructions": "Take with food"
    }
  ],
  "followUp": {
    "required": true,
    "scheduledDate": "2025-10-25T14:00:00Z",
    "instructions": "Monitor symptoms, return if worsening"
  },
  "vitals": {
    "heartRate": 75,
    "bloodPressure": { "systolic": 120, "diastolic": 80 },
    "temperature": 36.8
  },
  "doctorPrivateNotes": "Consider neurological consult if symptoms persist",
  "doctorSharedNotes": "Recommend stress reduction techniques"
}
```

#### Messaging

**Send Message**
```http
POST /api/v1/consultations/:id/messages?senderId=uuid&senderRole=doctor
Content-Type: application/json

{
  "type": "text",
  "content": "Please describe your symptoms in detail",
  "attachments": [
    {
      "name": "test-results.pdf",
      "url": "https://storage.example.com/files/abc123.pdf",
      "type": "application/pdf",
      "size": 524288
    }
  ],
  "replyTo": "message-uuid"
}
```

**Get Messages**
```http
GET /api/v1/consultations/:id/messages
```

**Mark Message as Read**
```http
PATCH /api/v1/consultations/messages/:messageId/read
```

#### Participants

**Get Consultation Participants**
```http
GET /api/v1/consultations/:id/participants
```

Response:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "role": "doctor",
    "status": "joined",
    "joinedAt": "2025-10-11T14:05:00Z",
    "mediaState": {
      "audio": { "enabled": true, "muted": false },
      "video": { "enabled": true, "muted": false },
      "screenShare": { "enabled": false }
    }
  }
]
```

### WebSocket Events

Connect to the WebSocket namespace:
```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3004/consultation');
```

#### Join Room

```javascript
socket.emit('join-room', {
  roomId: 'room-xyz789abc123',
  userId: 'user-uuid',
  role: 'doctor' // or 'patient', 'nurse', 'observer'
});

socket.on('room-joined', (data) => {
  console.log('Joined room:', data);
  // { roomId, participants: [...] }
});

socket.on('user-joined', (data) => {
  console.log('User joined:', data);
  // { userId, role, roomId }
});
```

#### Leave Room

```javascript
socket.emit('leave-room', {
  roomId: 'room-xyz789abc123',
  userId: 'user-uuid'
});

socket.on('user-left', (data) => {
  console.log('User left:', data);
  // { userId, roomId }
});
```

#### WebRTC Signaling

**Send Offer**
```javascript
socket.emit('webrtc-offer', {
  roomId: 'room-xyz789abc123',
  targetUserId: 'target-user-uuid',
  offer: rtcPeerConnection.localDescription
});

socket.on('webrtc-offer', (data) => {
  console.log('Received offer from:', data.fromUserId);
  // Handle offer and create answer
});
```

**Send Answer**
```javascript
socket.emit('webrtc-answer', {
  roomId: 'room-xyz789abc123',
  targetUserId: 'target-user-uuid',
  answer: rtcPeerConnection.localDescription
});

socket.on('webrtc-answer', (data) => {
  console.log('Received answer from:', data.fromUserId);
  // Set remote description
});
```

**ICE Candidates**
```javascript
socket.emit('webrtc-ice-candidate', {
  roomId: 'room-xyz789abc123',
  targetUserId: 'target-user-uuid',
  candidate: event.candidate
});

socket.on('webrtc-ice-candidate', (data) => {
  console.log('Received ICE candidate from:', data.fromUserId);
  // Add ICE candidate to peer connection
});
```

#### Media State

```javascript
socket.emit('media-state-changed', {
  roomId: 'room-xyz789abc123',
  userId: 'user-uuid',
  mediaState: {
    audio: { enabled: true, muted: false },
    video: { enabled: true, muted: false },
    screenShare: { enabled: false }
  }
});

socket.on('user-media-changed', (data) => {
  console.log('User media changed:', data);
  // Update UI to show muted/unmuted state
});
```

#### Chat Messaging

```javascript
socket.emit('send-chat-message', {
  roomId: 'room-xyz789abc123',
  senderId: 'user-uuid',
  senderRole: 'doctor',
  message: 'How are you feeling today?'
});

socket.on('chat-message', (data) => {
  console.log('New chat message:', data);
  // { id, senderId, senderRole, message, timestamp }
});
```

#### Screen Sharing

```javascript
socket.emit('start-screen-share', {
  roomId: 'room-xyz789abc123',
  userId: 'user-uuid'
});

socket.on('user-screen-share-started', (data) => {
  console.log('User started screen sharing:', data.userId);
});

socket.emit('stop-screen-share', {
  roomId: 'room-xyz789abc123',
  userId: 'user-uuid'
});

socket.on('user-screen-share-stopped', (data) => {
  console.log('User stopped screen sharing:', data.userId);
});
```

## Database Schema

### Consultations Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| consultationNumber | VARCHAR | Unique identifier (CON-XXXXXXXXXX) |
| patientId | UUID | Patient reference |
| doctorId | UUID | Doctor reference |
| appointmentId | UUID | Appointment reference (optional) |
| type | ENUM | video, audio, chat |
| status | ENUM | scheduled, waiting, in_progress, completed, cancelled, no_show |
| priority | ENUM | routine, urgent, emergency |
| scheduledStartTime | TIMESTAMP | Scheduled start |
| actualStartTime | TIMESTAMP | Actual start time |
| actualEndTime | TIMESTAMP | Actual end time |
| durationMinutes | INT | Calculated duration |
| roomId | VARCHAR | Virtual room identifier |
| twilioRoomSid | VARCHAR | Twilio room SID (if using Twilio) |
| reasonForVisit | TEXT | Patient's reason |
| chiefComplaint | TEXT | Main complaint |
| diagnosis | TEXT | Doctor's diagnosis |
| treatmentPlan | TEXT | Treatment recommendations |
| prescriptions | JSONB | Array of prescriptions |
| followUp | JSONB | Follow-up information |
| vitals | JSONB | Vital signs taken during consultation |
| symptoms | JSONB | Array of symptoms |
| patientNotes | JSONB | Patient's notes |
| doctorNotes | JSONB | Doctor's notes (private/shared) |
| recordingUrl | VARCHAR | Recording storage URL |
| isRecorded | BOOLEAN | Recording flag |
| recordingConsent | BOOLEAN | Consent for recording |
| patientRating | INT | 1-5 stars |
| patientFeedback | TEXT | Feedback from patient |
| technicalIssues | JSONB | Array of technical issues |
| metadata | JSONB | Device and network info |
| cancellationReason | TEXT | Reason if cancelled |
| cancelledBy | UUID | User who cancelled |
| cancelledAt | TIMESTAMP | Cancellation time |
| createdAt | TIMESTAMP | Created timestamp |
| updatedAt | TIMESTAMP | Updated timestamp |

### Consultation Messages Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| consultationId | UUID | Foreign key to consultation |
| senderId | UUID | Sender's user ID |
| senderRole | VARCHAR | doctor, patient, nurse |
| type | ENUM | text, file, image, system |
| content | TEXT | Message content |
| attachments | JSONB | File attachments |
| status | ENUM | sent, delivered, read, failed |
| readAt | TIMESTAMP | Read timestamp |
| deliveredAt | TIMESTAMP | Delivered timestamp |
| isEdited | BOOLEAN | Edit flag |
| editedAt | TIMESTAMP | Edit timestamp |
| isDeleted | BOOLEAN | Soft delete flag |
| metadata | JSONB | Reply info, reactions |
| createdAt | TIMESTAMP | Created timestamp |

### Consultation Participants Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| consultationId | UUID | Foreign key to consultation |
| userId | UUID | User ID |
| role | ENUM | doctor, patient, nurse, observer |
| status | ENUM | invited, joined, left, disconnected |
| joinedAt | TIMESTAMP | Join time |
| leftAt | TIMESTAMP | Leave time |
| durationSeconds | INT | Time spent in consultation |
| socketId | VARCHAR | Current WebSocket connection |
| peerId | VARCHAR | WebRTC peer ID |
| mediaState | JSONB | Audio/video/screen share state |
| connectionInfo | JSONB | Browser, OS, quality |
| disconnections | JSONB | Array of disconnection events |
| hasAudioPermission | BOOLEAN | Permission flag |
| hasVideoPermission | BOOLEAN | Permission flag |
| hasScreenSharePermission | BOOLEAN | Permission flag |
| createdAt | TIMESTAMP | Created timestamp |
| updatedAt | TIMESTAMP | Updated timestamp |

## WebRTC Implementation

### Client-Side Example (React/TypeScript)

```typescript
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

function VideoConsultation({ roomId, userId, role }) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [socket, setSocket] = useState(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection>(null);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('ws://localhost:3004/consultation');
    setSocket(newSocket);

    // Get local media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create RTCPeerConnection
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        });

        // Add local tracks
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            newSocket.emit('webrtc-ice-candidate', {
              roomId,
              targetUserId: 'other-user-id',
              candidate: event.candidate
            });
          }
        };

        setPeerConnection(pc);
      });

    // Join room
    newSocket.emit('join-room', { roomId, userId, role });

    // Listen for events
    newSocket.on('user-joined', handleUserJoined);
    newSocket.on('webrtc-offer', handleOffer);
    newSocket.on('webrtc-answer', handleAnswer);
    newSocket.on('webrtc-ice-candidate', handleICECandidate);

    return () => {
      newSocket.disconnect();
      peerConnection?.close();
    };
  }, []);

  const handleUserJoined = async (data) => {
    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('webrtc-offer', {
      roomId,
      targetUserId: data.userId,
      offer
    });
  };

  const handleOffer = async (data) => {
    await peerConnection.setRemoteDescription(data.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('webrtc-answer', {
      roomId,
      targetUserId: data.fromUserId,
      answer
    });
  };

  const handleAnswer = async (data) => {
    await peerConnection.setRemoteDescription(data.answer);
  };

  const handleICECandidate = async (data) => {
    await peerConnection.addIceCandidate(data.candidate);
  };

  return (
    <div>
      <video ref={localVideoRef} autoPlay muted />
      <video ref={remoteVideoRef} autoPlay />
    </div>
  );
}
```

## Twilio Integration

If Twilio credentials are configured, the service will use Twilio Video Rooms instead of P2P WebRTC.

### Get Twilio Access Token

The service can generate Twilio access tokens for clients:

```typescript
import { TwilioService } from './webrtc/twilio.service';

// In your service
const token = await this.twilioService.generateAccessToken(
  roomName,
  userIdentity,
  3600 // expires in 1 hour
);

// Send token to client
return { token };
```

### Client connects to Twilio

```javascript
import Video from 'twilio-video';

const token = 'eyJxxx...'; // From server

Video.connect(token, {
  name: 'room-xyz789abc123',
  audio: true,
  video: true
}).then(room => {
  console.log('Connected to Room:', room.name);

  // Handle remote participants
  room.participants.forEach(participant => {
    participant.tracks.forEach(publication => {
      if (publication.track) {
        document.getElementById('remote-media').appendChild(publication.track.attach());
      }
    });
  });
});
```

## Health Checks

**Health Endpoint**
```http
GET /health
```

**Readiness Check** (Kubernetes)
```http
GET /health/ready
```

**Liveness Check** (Kubernetes)
```http
GET /health/live
```

## Testing

### Manual Testing

**Create a consultation:**
```bash
curl -X POST http://localhost:3004/api/v1/consultations \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test-patient-001",
    "doctorId": "test-doctor-001",
    "type": "video",
    "scheduledStartTime": "2025-10-11T14:00:00Z",
    "reasonForVisit": "Test consultation"
  }'
```

**Start consultation:**
```bash
curl -X POST http://localhost:3004/api/v1/consultations/{id}/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-doctor-001"}'
```

### WebSocket Testing

Use Socket.IO client to test WebSocket events:

```javascript
const io = require('socket.io-client');
const socket = io('ws://localhost:3004/consultation');

socket.on('connect', () => {
  console.log('Connected');

  socket.emit('join-room', {
    roomId: 'room-xyz',
    userId: 'test-user',
    role: 'doctor'
  });
});

socket.on('room-joined', (data) => {
  console.log('Joined:', data);
});
```

## Integration with Other Services

### Patient Service
- Fetch patient details for consultation
- Link consultation to appointment

### Vitals Service
- Import real-time vitals during consultation
- Display vital signs in doctor's interface

### Notification Service
- Send consultation reminders
- Notify participants when consultation starts
- Alert about missed consultations

## Kafka Events

The service publishes events to Kafka:

### Topics

- `consultation.created` - New consultation scheduled
- `consultation.started` - Consultation began
- `consultation.ended` - Consultation completed
- `consultation.cancelled` - Consultation cancelled
- `consultation.messages` - New messages sent

## Deployment

### Docker Compose

```yaml
consultation-service:
  build: ./services/consultation-service
  ports:
    - "3004:3004"
  environment:
    - DB_HOST=postgres
    - KAFKA_BROKERS=kafka:9092
    - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
  depends_on:
    - postgres
    - kafka
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: consultation-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: consultation-service
        image: mediconnect/consultation-service:1.0.0
        ports:
        - containerPort: 3004
        env:
        - name: DB_HOST
          value: postgres-service
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3004
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3004
```

## Performance Considerations

- **WebSocket Scaling**: Use Redis adapter for Socket.IO when scaling horizontally
- **Connection Pooling**: Configure TypeORM connection pool size
- **Media Quality**: Adjust video bitrate based on network conditions
- **Recording Storage**: Use CDN for recorded consultations
- **Database Indexing**: Index on patientId, doctorId, status, scheduledStartTime

## Security

- Enable JWT authentication for REST endpoints
- Validate room access before joining
- Encrypt recordings at rest
- Use HTTPS/WSS in production
- Implement rate limiting on WebSocket connections
- Sanitize user input in messages

## Troubleshooting

### WebRTC Connection Issues

```bash
# Check STUN/TURN server connectivity
# Use browser console to debug ICE candidates

# Enable verbose logging
NODE_ENV=development npm run start:dev
```

### Database Connection

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d mediconnect_consultations

# Check TypeORM logs
# Enable logging: true in database.module.ts
```

## License

Proprietary - MediConnect Pro

## Support

For issues and questions, contact the development team.
