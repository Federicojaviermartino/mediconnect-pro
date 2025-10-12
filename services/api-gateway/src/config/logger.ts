/**
 * Logger Configuration using Winston
 * Provides structured logging for the API Gateway
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

import { config, isDevelopment } from './index';

/**
 * Custom log format
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console format for development (human-readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }

    return msg;
  })
);

/**
 * Create logs directory if it doesn't exist
 */
const logsDir = path.resolve(process.cwd(), config.logging.logDir);

/**
 * Transport for rotating error logs
 */
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
});

/**
 * Transport for rotating combined logs
 */
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
});

/**
 * Console transport for development
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

/**
 * Configure transports based on environment
 */
const transports: winston.transport[] = [];

// Always log to console in development
if (isDevelopment()) {
  transports.push(consoleTransport);
}

// Always log to files
transports.push(errorFileTransport, combinedFileTransport);

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
});

/**
 * Create a child logger with additional context
 * @param context - Context name (e.g., 'AuthMiddleware', 'UserService')
 */
export function createLogger(context: string): winston.Logger {
  return logger.child({ context });
}

/**
 * Log stream for Morgan HTTP request logging
 */
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

/**
 * Error logging helper
 */
export function logError(error: Error, context?: string): void {
  logger.error({
    message: error.message,
    stack: error.stack,
    context: context || 'Unknown',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Request logging helper
 */
export function logRequest(
  method: string,
  url: string,
  statusCode: number,
  responseTime: number,
  userId?: string
): void {
  logger.info({
    type: 'http_request',
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    userId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Database query logging helper (for debugging)
 */
export function logQuery(query: string, duration: number): void {
  if (isDevelopment()) {
    logger.debug({
      type: 'database_query',
      query,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Security event logging (for audit trail)
 */
export function logSecurityEvent(
  event: string,
  userId?: string,
  ipAddress?: string,
  details?: Record<string, any>
): void {
  logger.warn({
    type: 'security_event',
    event,
    userId,
    ipAddress,
    details,
    timestamp: new Date().toISOString(),
  });
}

export default logger;
