// MediConnect Pro Demo Server with Authentication
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDatabase } = require('./demo-app/database/init');
const { setupAuthRoutes } = require('./demo-app/routes/auth');
const { setupApiRoutes } = require('./demo-app/routes/api');
const { setupAppointmentRoutes } = require('./demo-app/routes/appointments');
const { setupPrescriptionRoutes } = require('./demo-app/routes/prescriptions');
const { setupAIRoutes } = require('./demo-app/routes/ai');
const { setupVitalsRoutes } = require('./demo-app/routes/vitals');
const { setupInsuranceRoutes } = require('./demo-app/routes/insurance');
const { setupPharmacyRoutes } = require('./demo-app/routes/pharmacy');

const app = express();
const PORT = process.env.PORT || 3000;

// Disable X-Powered-By header for security
app.disable('x-powered-by');

// Initialize database
const db = initDatabase();
console.log('✅ Database initialized');

// Trust proxy (required for Render)
app.set('trust proxy', 1);

// Security headers middleware
app.use((req, res, next) => {
  // Remove X-Powered-By header to hide Express.js
  res.removeHeader('X-Powered-By');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');

  // HTTP Strict Transport Security (HSTS) - only in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Redis client configuration
let redisClient;
let sessionStore;

const useRedis = process.env.REDIS_URL || process.env.REDIS_HOST;

if (useRedis) {
  // Configure Redis client
  const redisConfig = process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379')
        }
      };

  if (process.env.REDIS_PASSWORD) {
    redisConfig.password = process.env.REDIS_PASSWORD;
  }

  redisClient = createClient(redisConfig);

  redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
    console.warn('⚠️  Falling back to memory sessions');
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis client ready');
  });

  // Connect to Redis
  redisClient.connect().catch((err) => {
    console.error('❌ Failed to connect to Redis:', err);
    console.warn('⚠️  Will use memory sessions instead');
    redisClient = null;
  });

  // Create Redis store if client connected
  if (redisClient) {
    sessionStore = new RedisStore({
      client: redisClient,
      prefix: 'mediconnect:sess:',
      ttl: 24 * 60 * 60 // 24 hours in seconds
    });
    console.log('✅ Redis session store configured');
  }
} else {
  console.warn('⚠️  Redis not configured. Using in-memory sessions.');
  console.warn('⚠️  Sessions will be lost on server restart.');
  console.warn('💡 Tip: Set REDIS_HOST or REDIS_URL in environment to enable persistent sessions.');
}

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'mediconnect-demo-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Add Redis store if available
if (sessionStore) {
  sessionConfig.store = sessionStore;
}

app.use(session(sessionConfig));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    message: 'MediConnect Pro is running',
    timestamp: new Date().toISOString(),
    database: 'connected',
    sessions: redisClient && redisClient.isOpen ? 'redis' : 'memory'
  };

  // Check Redis connection
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.ping();
      health.redis = 'connected';
    } catch (error) {
      health.redis = 'disconnected';
      health.status = 'degraded';
    }
  }

  res.status(200).json(health);
});

// Setup routes
setupAuthRoutes(app, db);
setupApiRoutes(app, db);
setupAppointmentRoutes(app, db);
setupPrescriptionRoutes(app, db);
setupAIRoutes(app, db);
setupVitalsRoutes(app);
setupInsuranceRoutes(app, db);
setupPharmacyRoutes(app, db);

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'MediConnect Pro',
    version: '1.0.0',
    description: 'Enterprise-grade telemedicine platform',
    endpoints: {
      health: '/health',
      login: '/login.html',
      api: '/api',
      docs: '/api-docs'
    },
    demo: {
      message: 'This is a live demo of MediConnect Pro',
      credentials: {
        admin: 'admin@mediconnect.demo / Demo2024!Admin',
        doctor: 'dr.smith@mediconnect.demo / Demo2024!Doctor',
        patient: 'john.doe@mediconnect.demo / Demo2024!Patient'
      }
    }
  });
});

// API placeholder
app.get('/api', (req, res) => {
  res.json({
    message: 'MediConnect Pro API',
    version: 'v1',
    status: 'operational',
    endpoints: [
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET /api/auth/me',
      'GET /api/vitals',
      'GET /api/patients',
      'GET /api/patients/:id',
      'GET /api/stats',
      'GET /api/appointments',
      'POST /api/appointments',
      'GET /api/prescriptions',
      'POST /api/prescriptions'
    ],
    aiEndpoints: [
      'POST /api/ai/transcribe',
      'POST /api/ai/generate-notes',
      'POST /api/ai/generate-report',
      'POST /api/ai/triage',
      'GET /api/ai/status'
    ],
    insuranceEndpoints: [
      'GET /api/insurance/providers',
      'POST /api/insurance/verify-eligibility',
      'POST /api/insurance/pre-authorization',
      'POST /api/insurance/submit-claim',
      'GET /api/insurance/claim-status/:claimId',
      'POST /api/insurance/calculate-cost',
      'GET /api/insurance/status'
    ],
    pharmacyEndpoints: [
      'GET /api/pharmacy/network',
      'GET /api/pharmacy/:pharmacyId',
      'POST /api/pharmacy/check-stock',
      'POST /api/pharmacy/send-prescription',
      'GET /api/pharmacy/track-order/:orderId',
      'POST /api/pharmacy/calculate-cost',
      'GET /api/pharmacy/status'
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏥 MediConnect Pro running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login page: http://localhost:${PORT}/login.html`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');

  // Close Redis connection
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error);
    }
  }

  db.close();
  process.exit(0);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: closing HTTP server');

  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error);
    }
  }

  db.close();
  process.exit(0);
});
