/**
 * API Gateway Entry Point
 * Starts the Express server and handles graceful shutdown
 */

import http from 'http';

import { createApp } from './app';
import { config } from './config';
import { logger } from './config/logger';

/**
 * Create Express application
 */
const app = createApp();

/**
 * Create HTTP server
 */
const server = http.createServer(app);

/**
 * Graceful shutdown handler
 */
function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }

    logger.info('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

/**
 * Handle process signals for graceful shutdown
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Start server
 */
function startServer(): void {
  try {
    server.listen(config.port, config.host, () => {
      logger.info('═══════════════════════════════════════════════════════');
      logger.info('🚀 MediConnect Pro - API Gateway');
      logger.info('═══════════════════════════════════════════════════════');
      logger.info(`Environment:    ${config.env}`);
      logger.info(`Server:         http://${config.host}:${config.port}`);
      logger.info(`API Endpoint:   http://${config.host}:${config.port}${config.apiPrefix}`);
      logger.info(`Health Check:   http://${config.host}:${config.port}/health`);
      logger.info(`Process ID:     ${process.pid}`);
      logger.info(`Node Version:   ${process.version}`);
      logger.info('═══════════════════════════════════════════════════════');
      logger.info('');
      logger.info('📡 Microservices:');
      logger.info(`  Auth Service:         ${config.services.auth}`);
      logger.info(`  Patient Service:      ${config.services.patient}`);
      logger.info(`  Vitals Service:       ${config.services.vitals}`);
      logger.info(`  Consultation Service: ${config.services.consultation}`);
      logger.info(`  ML Service:           ${config.services.ml}`);
      logger.info('═══════════════════════════════════════════════════════');
      logger.info('');
      logger.info('✅ Server is ready to accept connections');
      logger.info('');
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
        process.exit(1);
      } else if (error.code === 'EACCES') {
        logger.error(`Port ${config.port} requires elevated privileges`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Export for testing
export { app, server };
