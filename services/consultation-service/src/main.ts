import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get('port');

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('MediConnect Pro - Consultation Service')
    .setDescription('Video consultation and real-time communication API')
    .setVersion('1.0')
    .addTag('Consultations')
    .addTag('Health')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  logger.log(`🎥 MediConnect Pro - Consultation Service`);
  logger.log(`🚀 Server running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🔌 WebSocket Namespace: ws://localhost:${port}/consultation`);
  logger.log(`🎬 Twilio Integration: ${configService.get('twilio.accountSid') ? 'Enabled' : 'Disabled (using P2P WebRTC)'}`);
  logger.log(`📝 Environment: ${configService.get('nodeEnv')}`);
}

bootstrap();
