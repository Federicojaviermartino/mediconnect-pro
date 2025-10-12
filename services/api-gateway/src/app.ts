/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

import express from 'express';
import type { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import { config, validateConfig } from './config';
import { logger } from './config/logger';
import routes from './routes';
import {
  errorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
} from './middleware/error.middleware';
import {
  requestId,
  requestTiming,
  httpLogger,
  detailedRequestLogger,
} from './middleware/requestLogger.middleware';
import { generalLimiter } from './middleware/rateLimit.middleware';
import { sanitizeInput } from './middleware/validation.middleware';

/**
 * Create Express application
 */
export function createApp(): Application {
  // Validate configuration
  validateConfig();

  // Create Express app
  const app = express();

  // Setup error handlers for process
  handleUncaughtException();
  handleUnhandledRejection();

  // ============================================
  // SECURITY MIDDLEWARE
  // ============================================

  // Helmet - sets various HTTP headers for security
  app.use(
    helmet({
      contentSecurityPolicy: config.env === 'production',
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS - Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
      exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
      maxAge: 86400, // 24 hours
    })
  );

  // ============================================
  // GENERAL MIDDLEWARE
  // ============================================

  // Compression - compress response bodies
  app.use(compression());

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request ID - assign unique ID to each request
  app.use(requestId);

  // Request timing - track request duration
  app.use(requestTiming);

  // HTTP request logging
  app.use(httpLogger);

  // Detailed request logging (only in development)
  if (config.env === 'development') {
    app.use(detailedRequestLogger);
  }

  // Rate limiting - prevent abuse
  app.use(generalLimiter);

  // Input sanitization - prevent XSS
  app.use(sanitizeInput);

  // ============================================
  // HEALTH CHECK (No rate limiting)
  // ============================================

  // Simple health check for load balancers
  app.get('/ping', (_req, res) => {
    res.status(200).send('pong');
  });

  // ============================================
  // API ROUTES
  // ============================================

  // Mount API routes with prefix
  app.use(config.apiPrefix, routes);

  // Health routes (no prefix)
  app.use('/health', routes);

  // ============================================
  // ERROR HANDLING
  // ============================================

  // 404 Not Found handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  // Log successful initialization
  logger.info('Express application initialized', {
    env: config.env,
    port: config.port,
    apiPrefix: config.apiPrefix,
    cors: config.cors.origin,
  });

  return app;
}

export default createApp;
