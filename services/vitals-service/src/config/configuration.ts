/**
 * Configuration Factory for Vitals Service
 */

export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.VITALS_SERVICE_PORT || '3003', 10),

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mediconnect_vitals',
  },

  // MQTT (for IoT devices)
  mqtt: {
    broker: process.env.IOT_MQTT_BROKER || 'mqtt://localhost:1883',
    username: process.env.IOT_MQTT_USERNAME || 'mediconnect_iot',
    password: process.env.IOT_MQTT_PASSWORD || 'dev_password_123',
    clientId: 'vitals-service',
    topics: {
      vitalsIncoming: 'devices/+/vitals',
      deviceStatus: 'devices/+/status',
      deviceCommands: 'devices/+/commands',
    },
  },

  // Kafka
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'vitals-service',
    groupId: 'vitals-consumer-group',
    topics: {
      vitalsEvents: 'vitals-events',
      alertsEvents: 'alert-events',
    },
  },

  // WebSocket
  websocket: {
    port: parseInt(process.env.WS_PORT || '3005', 10),
    path: process.env.WS_PATH || '/socket.io',
    cors: {
      origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
  },

  // Alerts thresholds (can be overridden per patient)
  alertThresholds: {
    heartRate: { min: 60, max: 100, critical: { min: 40, max: 150 } },
    bloodPressureSystolic: { min: 90, max: 120, critical: { min: 70, max: 180 } },
    bloodPressureDiastolic: { min: 60, max: 80, critical: { min: 40, max: 120 } },
    oxygenSaturation: { min: 95, max: 100, critical: { min: 90, max: 100 } },
    temperature: { min: 36.5, max: 37.5, critical: { min: 35, max: 40 } },
    respiratoryRate: { min: 12, max: 20, critical: { min: 8, max: 30 } },
    bloodGlucose: { min: 70, max: 100, critical: { min: 50, max: 200 } },
  },

  // Other services
  patientServiceUrl: process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
});
