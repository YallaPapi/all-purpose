/**
 * Health Module
 * 
 * Provides health check endpoints and monitoring for the UEP Registry Service.
 * Integrates with @nestjs/terminus for comprehensive health monitoring.
 */

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    TerminusModule,
  ],
  controllers: [
    HealthController,
  ],
  providers: [
    HealthService,
  ],
  exports: [
    HealthService,
  ],
})
export class HealthModule {}