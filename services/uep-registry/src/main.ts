/**
 * UEP Registry Service Main Entry Point
 * 
 * Bootstrap the NestJS application with gRPC and HTTP servers,
 * etcd integration, health checks, monitoring capabilities, and distributed tracing.
 */

// Initialize tracing first - MUST be before any other imports
import { uepRegistryTracingService } from './tracing/tracing.service';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import helmet from 'helmet';
import compression from 'compression';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { createWinstonConfig } from './config/winston.config';
import { setupPrometheusMetrics } from './monitoring/prometheus.setup';

async function bootstrap() {
  const logger = new Logger('UEPRegistryBootstrap');
  
  try {
    logger.log('🚀 Starting UEP Registry Service...');

    // Create the main HTTP application
    const app = await NestFactory.create(AppModule, {
      logger: WinstonModule.createLogger(createWinstonConfig()),
    });

    const configService = app.get(ConfigService);
    const httpPort = configService.get<number>('HTTP_PORT', 3001);
    const grpcPort = configService.get<number>('GRPC_PORT', 50051);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
    }));
    
    // Performance middleware
    app.use(compression());

    // Distributed tracing middleware
    app.use(uepRegistryTracingService.getExpressMiddleware());

    // Global validation pipe
    app.use(ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }));

    // CORS configuration
    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN', '*'),
      credentials: true,
    });

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Swagger documentation
    if (nodeEnv !== 'production') {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('UEP Registry Service')
        .setDescription('Service Discovery and Registry for UEP Agents')
        .setVersion('1.0.0')
        .addTag('registry', 'Agent registration and discovery')
        .addTag('capabilities', 'Agent capability management')
        .addTag('health', 'Health checks and monitoring')
        .addBearerAuth()
        .addServer(`http://localhost:${httpPort}`, 'Local Development')
        .addServer('https://registry.uep.dev', 'Production')
        .build();

      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });

      logger.log(`📚 Swagger documentation available at http://localhost:${httpPort}/docs`);
    }

    // Setup Prometheus metrics
    setupPrometheusMetrics(app);

    // Create gRPC microservice
    const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.GRPC,
        options: {
          package: ['uep.registry.v1', 'uep.discovery.v1'],
          protoPath: [
            join(__dirname, '../proto/registry.proto'),
            join(__dirname, '../proto/discovery.proto'),
          ],
          url: `0.0.0.0:${grpcPort}`,
          maxReceiveMessageLength: 1024 * 1024 * 4, // 4MB
          maxSendMessageLength: 1024 * 1024 * 4, // 4MB
          keepalive: {
            keepaliveTimeMs: 30000,
            keepaliveTimeoutMs: 5000,
            keepalivePermitWithoutCalls: true,
            http2MaxPingsWithoutData: 0,
            http2MinTimeBetweenPingsMs: 10000,
            http2MaxPingStrikes: 1,
          },
        },
      },
    );

    // Start both servers
    await Promise.all([
      app.listen(httpPort),
      grpcApp.listen(),
    ]);

    logger.log(`🌐 HTTP Server listening on port ${httpPort}`);
    logger.log(`🔌 gRPC Server listening on port ${grpcPort}`);
    logger.log(`🏥 Health checks available at http://localhost:${httpPort}/health`);
    logger.log(`📊 Metrics available at http://localhost:${httpPort}/metrics`);
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.log(`📡 Received ${signal}. Starting graceful shutdown...`);
      
      try {
        await Promise.all([
          app.close(),
          grpcApp.close(),
          uepRegistryTracingService.shutdown(),
        ]);
        
        logger.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('🚫 Unhandled rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    logger.log('🎉 UEP Registry Service started successfully!');
    
  } catch (error) {
    logger.error('💥 Failed to start UEP Registry Service:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();