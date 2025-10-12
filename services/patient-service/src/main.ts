/**
 * Patient Service Bootstrap
 * Entry point for the patient management microservice
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create NestJS application
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get configuration service
  const configService = app.get(ConfigService);
  const port = configService.get('port');
  const nodeEnv = configService.get('nodeEnv');

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation (only in development)
  if (nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('MediConnect Pro - Patient Service')
      .setDescription('Patient management, medical records, and appointments API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('patients', 'Patient management endpoints')
      .addTag('appointments', 'Appointment management endpoints')
      .addTag('medical-records', 'Medical records management endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Start server
  await app.listen(port);

  logger.log('═══════════════════════════════════════════════════════');
  logger.log('🏥 MediConnect Pro - Patient Service');
  logger.log('═══════════════════════════════════════════════════════');
  logger.log(`Environment:    ${nodeEnv}`);
  logger.log(`Server:         http://localhost:${port}`);
  logger.log(`API:            http://localhost:${port}/api/v1`);
  logger.log(`Health:         http://localhost:${port}/health`);
  if (nodeEnv === 'development') {
    logger.log(`Swagger Docs:   http://localhost:${port}/api/docs`);
  }
  logger.log(`Process ID:     ${process.pid}`);
  logger.log('═══════════════════════════════════════════════════════');
  logger.log('✅ Patient Service is ready');
  logger.log('');
}

bootstrap().catch((error) => {
  console.error('Failed to start Patient Service:', error);
  process.exit(1);
});
