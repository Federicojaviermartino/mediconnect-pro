/**
 * Structured Logging with Winston
 *
 * Provides centralized logging with:
 * - Multiple log levels (error, warn, info, http, debug)
 * - Structured JSON format for production
 * - Pretty console output for development
 * - File rotation for production logs
 * - Request/user context tracking
 */

const winston = require('winston');
const path = require('path');

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Log colors for console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Sensitive fields that should never be logged
const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'oldPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'session',
  'csrfToken',
  '_csrf',
  'creditCard',
  'cvv',
  'ssn',
  'taxId'
];

/**
 * Sanitize object by removing sensitive fields
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // Deep clone and sanitize
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if field is sensitive
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Custom format for development (pretty, colorized)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
  })
);

// Custom format for production (JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: isDevelopment ? devFormat : prodFormat
  })
);

// File transports (only in production or if explicitly enabled)
if (isProduction || process.env.ENABLE_FILE_LOGGING === 'true') {
  const logsDir = path.join(__dirname, '../../logs');

  // Combined log (all levels)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Error log (errors only)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  levels,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Add helper methods for common logging patterns

/**
 * Log HTTP request
 */
logger.logRequest = (req, res, duration) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.session?.user?.id,
    // Never log request body in HTTP logs (may contain passwords)
  });
};

/**
 * Log authentication event
 */
logger.logAuth = (event, userId, email, success, metadata = {}) => {
  const level = success ? 'info' : 'warn';
  logger.log(level, `Auth: ${event}`, {
    userId,
    email,
    success,
    ...metadata
  });
};

/**
 * Log database operation
 */
logger.logDatabase = (operation, table, success, metadata = {}) => {
  const level = success ? 'debug' : 'error';
  logger.log(level, `Database: ${operation} on ${table}`, {
    operation,
    table,
    success,
    ...metadata
  });
};

/**
 * Log security event
 */
logger.logSecurity = (event, severity, metadata = {}) => {
  const level = severity === 'high' ? 'error' : 'warn';
  logger.log(level, `Security: ${event}`, {
    severity,
    ...metadata
  });
};

/**
 * Log API error with full context
 */
logger.logApiError = (error, req, metadata = {}) => {
  logger.error('API Error', {
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    userId: req.session?.user?.id,
    body: sanitizeObject(req.body),
    params: sanitizeObject(req.params),
    query: sanitizeObject(req.query),
    ...sanitizeObject(metadata)
  });
};

/**
 * Log business logic error
 */
logger.logBusinessError = (context, error, metadata = {}) => {
  logger.error(`Business Error: ${context}`, {
    message: error.message,
    stack: error.stack,
    ...metadata
  });
};

/**
 * Log performance metric
 */
logger.logPerformance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger.log(level, `Performance: ${operation}`, {
    duration: `${duration}ms`,
    ...metadata
  });
};

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.Console({
    format: devFormat
  })
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new winston.transports.Console({
    format: devFormat
  })
);

// Log startup
logger.info('Logger initialized', {
  environment: process.env.NODE_ENV || 'development',
  level: logger.level,
  transports: transports.map(t => t.constructor.name)
});

module.exports = logger;
