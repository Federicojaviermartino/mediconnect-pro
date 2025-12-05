// MediConnect Pro Demo Server with Authentication
const express = require('express');
const session = require('express-session');
const { default: RedisStore } = require('connect-redis');
const { createClient } = require('redis');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./demo-app/utils/logger');
const { requestLogger, errorLogger } = require('./demo-app/middleware/request-logger');
const { performHealthCheck, livenessProbe, readinessProbe } = require('./demo-app/utils/health-check');
const { initDatabase } = require('./demo-app/database/init');
const { apiCache } = require('./demo-app/utils/cache');
const { setupAuthRoutes } = require('./demo-app/routes/auth');
const { setupApiRoutes } = require('./demo-app/routes/api');
const { setupAppointmentRoutes } = require('./demo-app/routes/appointments');
const { setupPrescriptionRoutes } = require('./demo-app/routes/prescriptions');
const { setupAIRoutes } = require('./demo-app/routes/ai');
const { setupVitalsRoutes } = require('./demo-app/routes/vitals');
const { setupInsuranceRoutes } = require('./demo-app/routes/insurance');
const { setupPharmacyRoutes } = require('./demo-app/routes/pharmacy');
const { setupCsrfEndpoint } = require('./demo-app/middleware/csrf');

const app = express();
const PORT = process.env.PORT || 3000;

// Disable X-Powered-By header for security
app.disable('x-powered-by');

// Database will be initialized in async startup
let db = null;

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

// Compression middleware - gzip responses for better performance
app.use(compression({
  level: 6, // Balanced compression level (1-9)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress responses with no-transform header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter (compresses text, json, etc.)
    return compression.filter(req, res);
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// JSON parse error handler (must come after express.json())
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON format in request body'
    });
  }
  next(err);
});

// Request logging middleware
app.use(requestLogger);

// Redis client configuration
let redisClient;
let sessionStore;

// Temporarily disable Redis due to connect-redis 9.x compatibility issues
// TODO: Fix RedisStore import/initialization for connect-redis 9.x
const useRedis = false; // process.env.REDIS_URL || process.env.REDIS_HOST;

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
    logger.error('❌ Redis Client Error:', err);
    logger.warn('⚠️  Falling back to memory sessions');
  });

  redisClient.on('connect', () => {
    logger.info('✅ Redis connected successfully');
  });

  redisClient.on('ready', () => {
    logger.info('✅ Redis client ready');
  });

  // Connect to Redis
  redisClient.connect().catch((err) => {
    logger.error('❌ Failed to connect to Redis:', err);
    logger.warn('⚠️  Will use memory sessions instead');
    redisClient = null;
  });

  // Create Redis store if client connected
  if (redisClient) {
    sessionStore = new RedisStore({
      client: redisClient,
      prefix: 'mediconnect:sess:',
      ttl: 24 * 60 * 60 // 24 hours in seconds
    });
    logger.info('✅ Redis session store configured');
  }
} else {
  logger.warn('⚠️  Redis not configured. Using in-memory sessions.');
  logger.warn('⚠️  Sessions will be lost on server restart.');
  logger.warn('💡 Tip: Set REDIS_HOST or REDIS_URL in environment to enable persistent sessions.');
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

// Static file serving with caching and ETag support
const staticOptions = {
  etag: true, // Enable ETag for conditional requests
  lastModified: true, // Enable Last-Modified header
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0, // Cache for 1 day in production
  setHeaders: (res, filePath) => {
    // Set appropriate cache headers based on file type
    if (filePath.endsWith('.html')) {
      // HTML files: no cache (always check for updates)
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (filePath.match(/\.(css|js)$/)) {
      // CSS/JS: cache for 1 week in production, allow revalidation
      res.setHeader('Cache-Control',
        process.env.NODE_ENV === 'production'
          ? 'public, max-age=604800, stale-while-revalidate=86400'
          : 'no-cache'
      );
    } else if (filePath.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
      // Images: cache for 1 month in production
      res.setHeader('Cache-Control',
        process.env.NODE_ENV === 'production'
          ? 'public, max-age=2592000, immutable'
          : 'no-cache'
      );
    } else if (filePath.match(/\.(woff|woff2|ttf|eot)$/)) {
      // Fonts: cache for 1 year in production
      res.setHeader('Cache-Control',
        process.env.NODE_ENV === 'production'
          ? 'public, max-age=31536000, immutable'
          : 'no-cache'
      );
    }
  }
};

app.use(express.static(path.join(__dirname, 'public'), staticOptions));

// Health check endpoints
// Comprehensive health check (includes all system metrics)
app.get('/health', async (req, res) => {
  const health = await performHealthCheck(db, redisClient);

  // Return 503 if system is unhealthy, 200 otherwise
  const statusCode = health.status === 'unhealthy' ? 503 : 200;

  res.status(statusCode).json(health);
});

// Liveness probe (for Kubernetes/Docker)
// Returns 200 if process is alive
app.get('/health/live', (req, res) => {
  const liveness = livenessProbe();
  res.status(200).json(liveness);
});

// Readiness probe (for Kubernetes/Docker)
// Returns 200 if system is ready to accept traffic
app.get('/health/ready', async (req, res) => {
  const readiness = await readinessProbe(db, redisClient);

  // Return 503 if not ready, 200 if ready
  const statusCode = readiness.status === 'ready' ? 200 : 503;

  res.status(statusCode).json(readiness);
});

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
});

// Routes will be setup after database initialization in startServer()

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

// Cache statistics endpoint (for monitoring)
app.get('/api/cache/stats', (req, res) => {
  res.json({
    success: true,
    cache: apiCache.getStats()
  });
});

// Error logging middleware (logs errors before handling them)
app.use(errorLogger);

// Global error handling middleware (must be last)
app.use((err, req, res, next) => {
  // Error already logged by errorLogger middleware
  // Just handle the response

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // In production, don't expose error details
  const message = process.env.NODE_ENV === 'production'
    ? 'An error occurred while processing your request'
    : err.message;

  // Send error response
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server with async database initialization
async function startServer() {
  try {
    // Initialize database
    db = await initDatabase();
    logger.info('✅ Database initialized');

    // Setup routes (after database is ready)
    setupAuthRoutes(app, db, authLimiter);
    setupApiRoutes(app, db);
    setupAppointmentRoutes(app, db);
    setupPrescriptionRoutes(app, db);
    setupAIRoutes(app, db);
    setupVitalsRoutes(app);
    setupInsuranceRoutes(app, db);
    setupPharmacyRoutes(app, db);

    // CSRF token endpoint (for AJAX requests)
    setupCsrfEndpoint(app);
    logger.info('✅ Routes configured');

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🏥 MediConnect Pro running on port ${PORT}`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔐 Login page: http://localhost:${PORT}/login.html`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');

  // Stop cache cleanup timer
  apiCache.stop();
  logger.info('✅ Cache cleanup timer stopped');

  // Close Redis connection
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('✅ Redis connection closed');
    } catch (error) {
      logger.error('❌ Error closing Redis connection:', error);
    }
  }

  // Close database connection if available
  if (db && typeof db.close === 'function') {
    try {
      await db.close();
      logger.info('✅ Database connection closed');
    } catch (error) {
      logger.error('❌ Error closing database connection:', error);
    }
  }

  process.exit(0);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  logger.info('\nSIGINT signal received: closing HTTP server');

  // Stop cache cleanup timer
  apiCache.stop();
  logger.info('✅ Cache cleanup timer stopped');

  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('✅ Redis connection closed');
    } catch (error) {
      logger.error('❌ Error closing Redis connection:', error);
    }
  }

  // Close database connection if available
  if (db && typeof db.close === 'function') {
    try {
      await db.close();
      logger.info('✅ Database connection closed');
    } catch (error) {
      logger.error('❌ Error closing database connection:', error);
    }
  }

  process.exit(0);
});
