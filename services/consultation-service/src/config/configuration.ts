export default () => ({
  port: parseInt(process.env.PORT, 10) || 3004,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'mediconnect_consultations',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    apiKey: process.env.TWILIO_API_KEY,
    apiSecret: process.env.TWILIO_API_SECRET,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  },

  webrtc: {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
      {
        urls: process.env.TURN_SERVER_URL || 'turn:turn.example.com:3478',
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      },
    ],
  },

  websocket: {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  },

  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'consultation-service',
    topics: {
      consultationCreated: 'consultation.created',
      consultationStarted: 'consultation.started',
      consultationEnded: 'consultation.ended',
      consultationCancelled: 'consultation.cancelled',
      messagesSent: 'consultation.messages',
    },
  },

  recording: {
    enabled: process.env.RECORDING_ENABLED === 'true',
    storage: {
      type: process.env.STORAGE_TYPE || 's3',
      bucket: process.env.S3_BUCKET || 'mediconnect-recordings',
      region: process.env.AWS_REGION || 'us-east-1',
    },
    maxDuration: parseInt(process.env.MAX_RECORDING_DURATION, 10) || 7200, // 2 hours
  },

  consultation: {
    defaultDuration: 30, // minutes
    maxDuration: 120, // minutes
    reminderMinutes: [15, 5], // Send reminders 15 and 5 minutes before
    autoEndAfterMinutes: 150, // Auto-end if exceeds max duration
    waitingRoomTimeout: 15, // minutes
  },
});
