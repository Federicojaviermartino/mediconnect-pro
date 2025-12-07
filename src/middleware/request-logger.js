/**
 * HTTP Request Logging Middleware
 *
 * Logs all HTTP requests with timing, user context, and response details
 */

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('crypto');

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  // Generate unique request ID
  const requestId = generateRequestId();
  req.requestId = requestId;

  // Record start time
  const startTime = Date.now();

  // Log request start (debug level)
  logger.debug('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.session?.user?.id
  });

  // Capture original end function
  const originalEnd = res.end;

  // Override res.end to log when response is sent
  res.end = function(...args) {
    // Calculate duration
    const duration = Date.now() - startTime;

    // Log request completion
    logger.logRequest(req, res, duration);

    // Log slow requests separately
    if (duration > 1000) {
      logger.logPerformance('Slow Request', duration, {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode
      });
    }

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Error logging middleware
 * Should be placed after all routes but before global error handler
 */
function errorLogger(err, req, res, next) {
  // Log the error with full context
  logger.logApiError(err, req, {
    requestId: req.requestId
  });

  // Pass error to next error handler
  next(err);
}

module.exports = {
  requestLogger,
  errorLogger
};
