/**
 * Registry Module
 * 
 * Main module for agent registration, deregistration, and lifecycle management.
 * Handles UEP agent registry operations with etcd backend storage.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { RegistryService } from './registry.service';
import { RegistryController } from './registry.controller';
import { RegistryGateway } from './registry.gateway';
import { AgentLifecycleService } from './agent-lifecycle.service';
import { RegistryValidationService } from './registry-validation.service';
import { RegistryCacheService } from './registry-cache.service';
import { RegistryCleanupProcessor } from './registry-cleanup.processor';
// import { AgentHealthMonitorService } from './agent-health-monitor.service';

@Module({
  imports: [
    // ConfigModule is global - no need to import here
    
    // Bull queue for async operations
    BullModule.registerQueue({
      name: 'registry-operations',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    
    // Bull queue for health monitoring - RE-ENABLED
    BullModule.registerQueue({
      name: 'health-monitoring',
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
    
    // Bull queue for cleanup operations
    BullModule.registerQueue({
      name: 'registry-cleanup',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: 1,
      },
    }),
  ],
  controllers: [RegistryController],
  providers: [
    // Order matters: ConfigService dependencies first
    RegistryValidationService,
    RegistryCacheService, // RE-ENABLED - ConfigService injection should work now
    RegistryService,
    RegistryGateway,
    AgentLifecycleService,
    RegistryCleanupProcessor,
    // AgentHealthMonitorService,
  ],
  exports: [
    RegistryService,
    AgentLifecycleService,
    RegistryValidationService,
    RegistryCacheService, // RE-ENABLED
  ],
})
export class RegistryModule {}