/**
 * Request Logger Middleware
 * Logs all incoming HTTP requests with detailed information
 */

import type { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { nanoid } from 'nanoid';

import { logger, morganStream, logRequest } from '../config/logger';
import { isDevelopment } from '../config';

/**
 * Add request ID to all requests
 * Useful for tracking requests across services
 */
export function requestId(req: Request, _res: Response, next: NextFunction): void {
  // Check if request ID already exists (from load balancer or proxy)
  const existingId = req.headers['x-request-id'] as string;

  // Generate new ID if not present
  const id = existingId || nanoid(10);

  // Attach to request
  req.requestId = id;

  // Add to response headers
  _res.setHeader('X-Request-ID', id);

  next();
}

/**
 * Custom Morgan token for user ID
 */
morgan.token('user-id', (req: Request) => {
  return req.user?.userId || 'anonymous';
});

/**
 * Custom Morgan token for request ID
 */
morgan.token('request-id', (req: Request) => {
  return req.requestId || 'unknown';
});

/**
 * Custom Morgan token for response time in milliseconds
 */
morgan.token('response-time-ms', (_req: Request, res: Response) => {
  const startTime = res.locals.startTime;
  if (!startTime) {
    return '0';
  }
  const duration = Date.now() - startTime;
  return duration.toString();
});

/**
 * Request timing middleware
 * Tracks request start time
 */
export function requestTiming(req: Request, res: Response, next: NextFunction): void {
  res.locals.startTime = Date.now();
  next();
}

/**
 * Morgan format for development
 * Includes colors and detailed info
 */
const devFormat = ':method :url :status :response-time ms - :res[content-length] [:user-id]';

/**
 * Morgan format for production
 * JSON format for log aggregation
 */
const prodFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time-ms ms',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  userId: ':user-id',
  requestId: ':request-id',
  remoteAddr: ':remote-addr',
});

/**
 * Morgan HTTP request logger
 */
export const httpLogger = morgan(isDevelopment() ? devFormat : prodFormat, {
  stream: morganStream,
  skip: (req: Request) => {
    // Skip health check and metrics endpoints
    return req.url === '/health' || req.url === '/metrics';
  },
});

/**
 * Detailed request logger middleware
 * Logs additional request details
 */
export function detailedRequestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request received
  if (isDevelopment()) {
    logger.debug('Request received', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
      body: sanitizeBody(req.body),
      userId: req.user?.userId,
      ip: req.ip,
    });
  }

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logRequest(
      req.method,
      req.url,
      res.statusCode,
      duration,
      req.user?.userId
    );

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        userId: req.user?.userId,
      });
    }
  });

  next();
}

/**
 * Sanitize request body for logging
 * Removes sensitive fields like passwords
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'confirmPassword',
    'token',
    'refreshToken',
    'accessToken',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Log request errors
 */
export function requestErrorLogger(
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    userId: req.user?.userId,
    ip: req.ip,
  });

  next(err);
}

/**
 * Skip logging for specific routes
 */
export function skipLogging(routes: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (routes.includes(req.path)) {
      // Skip to next middleware without logging
      return next();
    }
    next();
  };
}
