/**
 * UEP Registry Application Module
 * 
 * Main application module that configures all services, controllers,
 * and integrations including etcd, monitoring, and health checks.
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { WinstonModule } from 'nest-winston';

// Core modules
import { EtcdModule } from './etcd/etcd.module';
import { RegistryModule } from './registry/registry.module';
// import { DiscoveryModule } from './discovery/discovery.module';
// import { HealthModule } from './health/health.module';
// import { MonitoringModule } from './monitoring/monitoring.module';

// Configuration
import { createWinstonConfig } from './config/winston.config';
import { validateConfig } from './config/config.validation';
// import { StartupService } from './startup/startup.service';

@Module({
  imports: [
    // Configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateConfig,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Logging module
    WinstonModule.forRootAsync({
      useFactory: () => createWinstonConfig(),
    }),

    // Task scheduling for health checks and cleanup
    ScheduleModule.forRoot(),

    // Event system for agent state changes
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Redis for caching and queues
    BullModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
          lazyConnect: true,
          keepAlive: 30000,
          family: 4,
          keyPrefix: 'uep-registry:',
          retryStrategy: (times: number) => {
            const delay = Math.min(100 + times * 2, 2000);
            return delay;
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Health check module
    TerminusModule,

    // Core business modules
    EtcdModule,
    RegistryModule,
    // DiscoveryModule,
    // HealthModule,
    // MonitoringModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}