# MediConnect Pro - Vitals Service

Real-time vital signs monitoring microservice with IoT device integration, WebSocket streaming, and intelligent alert system.

## Features

- **Real-time Vital Signs Monitoring** - Continuous tracking of patient vitals
- **IoT Device Integration** - MQTT protocol for medical device communication
- **WebSocket Streaming** - Real-time vital signs updates to connected clients
- **Intelligent Alert System** - Automatic threshold-based warnings and critical alerts
- **Trend Analysis** - Statistical analysis of vital signs over time
- **MongoDB Time-Series Storage** - Optimized for high-frequency vital sign data
- **Device Management** - Track and manage connected medical devices
- **RESTful API** - Complete CRUD operations with filtering and pagination

## Architecture

```
┌─────────────────┐
│  IoT Devices    │
│ (Heart Monitor, │
│  Pulse Oximeter,│
│  BP Monitor)    │
└────────┬────────┘
         │ MQTT
         │ devices/{deviceId}/vitals
         ▼
┌─────────────────────────────────────────┐
│         Vitals Service (NestJS)         │
│  ┌────────────┐      ┌──────────────┐  │
│  │ MQTT       │──────│ Vitals       │  │
│  │ Service    │      │ Service      │  │
│  └────────────┘      └──────┬───────┘  │
│                             │           │
│  ┌────────────┐      ┌──────▼───────┐  │
│  │ WebSocket  │◄─────│  Alert       │  │
│  │ Gateway    │      │  System      │  │
│  └──────┬─────┘      └──────────────┘  │
│         │                               │
│  ┌──────▼──────────────────────────┐   │
│  │      MongoDB (Mongoose)          │   │
│  │  - vital_signs collection        │   │
│  │  - devices collection            │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
         │ WebSocket
         │ ws://host:3003/vitals
         ▼
┌─────────────────┐
│  Web Clients    │
│ (Nurse Station, │
│  Doctor Panel)  │
└─────────────────┘
```

## Technologies

- **NestJS** - Progressive Node.js framework
- **MongoDB + Mongoose** - Time-series data storage
- **MQTT** - IoT device communication protocol
- **Socket.IO** - WebSocket real-time communication
- **TypeScript** - Type-safe development
- **Swagger** - API documentation
- **Docker** - Containerization

## Installation

```bash
# Navigate to service directory
cd services/vitals-service

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
PORT=3003

# MongoDB
MONGODB_URI=mongodb://localhost:27017/mediconnect_vitals

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_CLIENT_ID=vitals-service
MQTT_USERNAME=mediconnect
MQTT_PASSWORD=your-mqtt-password

# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=vitals-service

# Alert Thresholds (configured in config/configuration.ts)
```

### Alert Thresholds

Default thresholds are configured in [src/config/configuration.ts](src/config/configuration.ts):

| Vital Sign | Normal Min | Normal Max | Critical Min | Critical Max |
|------------|-----------|-----------|--------------|--------------|
| Heart Rate | 60 bpm | 100 bpm | 40 bpm | 150 bpm |
| Blood Pressure (Systolic) | 90 mmHg | 120 mmHg | 70 mmHg | 180 mmHg |
| Blood Pressure (Diastolic) | 60 mmHg | 80 mmHg | 40 mmHg | 110 mmHg |
| Oxygen Saturation | 95% | 100% | 90% | 100% |
| Temperature | 36.5°C | 37.5°C | 35°C | 40°C |
| Respiratory Rate | 12 brpm | 20 brpm | 8 brpm | 30 brpm |
| Blood Glucose | 70 mg/dL | 140 mg/dL | 50 mg/dL | 250 mg/dL |

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
docker-compose up vitals-service mongodb mqtt-broker
```

## API Documentation

Once running, access Swagger documentation at:
```
http://localhost:3003/api/docs
```

### REST API Endpoints

#### Vital Signs

**Create Vital Sign**
```http
POST /api/v1/vitals
Content-Type: application/json

{
  "patientId": "uuid",
  "type": "heartRate",
  "value": 75,
  "unit": "bpm",
  "deviceId": "device-001",
  "timestamp": "2025-10-11T10:30:00Z"
}
```

**List Vital Signs with Filtering**
```http
GET /api/v1/vitals?patientId=uuid&type=heartRate&page=1&limit=20
```

Query Parameters:
- `patientId` (optional) - Filter by patient
- `type` (optional) - Filter by vital sign type
- `deviceId` (optional) - Filter by device
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Get Patient's Vital Signs**
```http
GET /api/v1/vitals/patient/:patientId
```

**Get Latest Vital Sign**
```http
GET /api/v1/vitals/patient/:patientId/latest/:type
```

**Get Trends**
```http
GET /api/v1/vitals/patient/:patientId/trends/:type?days=7
```

Response:
```json
{
  "patientId": "uuid",
  "type": "heartRate",
  "period": {
    "start": "2025-10-04T00:00:00Z",
    "end": "2025-10-11T00:00:00Z",
    "days": 7
  },
  "statistics": {
    "average": 72.5,
    "min": 58,
    "max": 88,
    "count": 168,
    "trend": "stable"
  },
  "dataPoints": [...]
}
```

**Get Critical Alerts**
```http
GET /api/v1/vitals/patient/:patientId/critical
```

#### Devices

**Register Device**
```http
POST /api/v1/devices
Content-Type: application/json

{
  "deviceId": "HR-MONITOR-001",
  "type": "heartRateMonitor",
  "manufacturer": "Philips",
  "model": "IntelliVue MP5",
  "patientId": "uuid",
  "location": "Room 302-B"
}
```

**Get Patient's Devices**
```http
GET /api/v1/devices/patient/:patientId
```

**Update Device Status**
```http
PATCH /api/v1/devices/:id
Content-Type: application/json

{
  "status": "active",
  "batteryLevel": 85
}
```

### WebSocket Events

Connect to WebSocket namespace:
```javascript
const socket = io('ws://localhost:3003/vitals');
```

**Subscribe to Patient's Vitals**
```javascript
socket.emit('subscribe:patient', 'patient-uuid');

// Response
socket.on('subscribed', (data) => {
  console.log(data);
  // { patientId: 'uuid', message: 'Successfully subscribed...' }
});
```

**Receive New Vital Signs**
```javascript
socket.on('vital:new', (vitalSign) => {
  console.log('New vital sign:', vitalSign);
  // {
  //   id: 'xxx',
  //   patientId: 'uuid',
  //   type: 'heartRate',
  //   value: 75,
  //   timestamp: '2025-10-11T10:30:00Z',
  //   status: 'normal',
  //   ...
  // }
});
```

**Receive Alerts**
```javascript
socket.on('vital:alert', (alert) => {
  console.log('ALERT:', alert);
  // {
  //   id: 'xxx',
  //   patientId: 'uuid',
  //   type: 'heartRate',
  //   value: 155,
  //   alertLevel: 'critical',
  //   message: 'Critical heart rate detected',
  //   ...
  // }
});
```

**Unsubscribe**
```javascript
socket.emit('unsubscribe:patient', 'patient-uuid');
```

### MQTT Topics

IoT devices publish to these topics:

**Vital Signs Data**
```
Topic: devices/{deviceId}/vitals

Payload:
{
  "deviceId": "HR-MONITOR-001",
  "patientId": "uuid",
  "type": "heartRate",
  "value": 75,
  "unit": "bpm",
  "timestamp": "2025-10-11T10:30:00Z",
  "quality": "good"
}
```

**Device Status**
```
Topic: devices/{deviceId}/status

Payload:
{
  "deviceId": "HR-MONITOR-001",
  "status": "online",
  "batteryLevel": 85,
  "signalStrength": 95,
  "lastCalibratedAt": "2025-10-10T08:00:00Z"
}
```

## MongoDB Schemas

### VitalSign Collection

```typescript
{
  _id: ObjectId,
  patientId: string,           // Patient UUID
  type: VitalSignType,         // heartRate, bloodPressure, etc.
  value: number | object,      // Single value or complex (BP)
  unit: string,                // bpm, mmHg, %, °C, etc.
  status: 'normal' | 'warning' | 'critical',
  isAlertTriggered: boolean,
  alertLevel?: 'warning' | 'critical',
  deviceId?: string,
  metadata?: object,
  recordedBy?: string,
  notes?: string,
  timestamp: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ patientId: 1, timestamp: -1 }
{ patientId: 1, type: 1, timestamp: -1 }
{ type: 1, timestamp: -1 }
{ deviceId: 1, timestamp: -1 }
{ isAlertTriggered: 1, alertLevel: 1, timestamp: -1 }
```

### Device Collection

```typescript
{
  _id: ObjectId,
  deviceId: string,            // Unique device identifier
  type: DeviceType,            // heartRateMonitor, pulseOximeter, etc.
  manufacturer?: string,
  model?: string,
  serialNumber?: string,
  firmwareVersion?: string,
  patientId?: string,
  assignedAt?: Date,
  status: 'active' | 'inactive' | 'maintenance' | 'error',
  batteryLevel?: number,
  signalStrength?: number,
  location?: string,
  lastCalibrationDate?: Date,
  lastMaintenanceDate?: Date,
  lastCommunicationAt?: Date,
  metadata?: object,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ deviceId: 1 } - unique
{ patientId: 1 }
{ status: 1 }
```

## Health Checks

**Health Check**
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "vitals-service",
  "version": "1.0.0",
  "uptime": 3600.5,
  "timestamp": "2025-10-11T10:30:00Z",
  "checks": {
    "mongodb": {
      "status": "up",
      "responseTime": "5ms"
    },
    "memory": {
      "heapUsed": "128MB"
    }
  },
  "responseTime": "7ms"
}
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

### Manual Testing with curl

**Create a vital sign:**
```bash
curl -X POST http://localhost:3003/api/v1/vitals \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test-patient-001",
    "type": "heartRate",
    "value": 75,
    "unit": "bpm"
  }'
```

**Get trends:**
```bash
curl http://localhost:3003/api/v1/vitals/patient/test-patient-001/trends/heartRate?days=7
```

### MQTT Testing with mosquitto_pub

```bash
# Publish vital sign
mosquitto_pub -h localhost -p 1883 \
  -t "devices/HR-MONITOR-001/vitals" \
  -m '{
    "deviceId": "HR-MONITOR-001",
    "patientId": "test-patient-001",
    "type": "heartRate",
    "value": 88,
    "unit": "bpm",
    "timestamp": "2025-10-11T10:30:00Z"
  }'

# Publish device status
mosquitto_pub -h localhost -p 1883 \
  -t "devices/HR-MONITOR-001/status" \
  -m '{
    "deviceId": "HR-MONITOR-001",
    "status": "online",
    "batteryLevel": 85
  }'
```

### WebSocket Testing with Socket.IO Client

```javascript
// test-websocket.js
const io = require('socket.io-client');

const socket = io('ws://localhost:3003/vitals');

socket.on('connect', () => {
  console.log('Connected to Vitals WebSocket');
  socket.emit('subscribe:patient', 'test-patient-001');
});

socket.on('subscribed', (data) => {
  console.log('Subscribed:', data);
});

socket.on('vital:new', (vital) => {
  console.log('New Vital Sign:', vital);
});

socket.on('vital:alert', (alert) => {
  console.log('⚠️ ALERT:', alert);
});
```

## Integration with Other Services

### Auth Service Integration

Protect endpoints with JWT authentication:

```typescript
// Add JWT guard to controller
@UseGuards(JwtAuthGuard)
@Controller('vitals')
export class VitalsController {
  // Protected endpoints
}
```

### Patient Service Integration

Validate patient existence before creating vital signs:

```typescript
// Call Patient Service API
const response = await axios.get(
  `http://patient-service:3002/api/v1/patients/${patientId}`
);
```

### Kafka Event Publishing

Publish alerts to Kafka for notification service:

```typescript
await this.kafkaProducer.send({
  topic: 'vital-alerts',
  messages: [{
    key: patientId,
    value: JSON.stringify(alert)
  }]
});
```

## Deployment

### Docker Compose (Development)

```yaml
vitals-service:
  build: ./services/vitals-service
  ports:
    - "3003:3003"
  environment:
    - NODE_ENV=development
    - MONGODB_URI=mongodb://mongodb:27017/mediconnect_vitals
    - MQTT_BROKER_URL=mqtt://mqtt-broker:1883
  depends_on:
    - mongodb
    - mqtt-broker
```

### Kubernetes (Production)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vitals-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: vitals-service
        image: mediconnect/vitals-service:1.0.0
        ports:
        - containerPort: 3003
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: vitals-secrets
              key: mongodb-uri
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3003
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3003
          initialDelaySeconds: 10
```

## Troubleshooting

### MQTT Connection Issues

```bash
# Check MQTT broker is running
docker ps | grep mqtt

# Test MQTT connection
mosquitto_sub -h localhost -p 1883 -t "devices/+/vitals" -v

# Check service logs
docker logs vitals-service
```

### MongoDB Connection Issues

```bash
# Verify MongoDB is accessible
mongosh mongodb://localhost:27017/mediconnect_vitals

# Check indexes
db.vital_signs.getIndexes()
```

### WebSocket Connection Issues

```bash
# Check if WebSocket port is open
netstat -an | grep 3003

# Test WebSocket endpoint
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:3003/socket.io/
```

## Performance Considerations

- **Indexes**: Compound indexes on `patientId + type + timestamp` optimize queries
- **TTL**: Consider setting TTL indexes for old vital signs (e.g., archive after 1 year)
- **Aggregation**: Use MongoDB aggregation pipeline for complex statistics
- **WebSocket Scaling**: Use Redis adapter for Socket.IO when scaling horizontally
- **MQTT QoS**: Use QoS level 1 for reliable delivery without duplication

## Security

- Enable authentication on MQTT broker
- Use TLS/SSL for MQTT connections in production
- Implement rate limiting on WebSocket connections
- Validate all device messages before processing
- Encrypt sensitive vital sign data at rest

## License

Proprietary - MediConnect Pro

## Support

For issues and questions, contact the development team.
