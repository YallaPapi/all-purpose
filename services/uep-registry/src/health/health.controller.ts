/**
 * Health Controller
 * 
 * Provides health check endpoints for the UEP Registry Service.
 * Integrates with Kubernetes health probes and monitoring systems.
 */

import { Controller, Get } from '@nestjs/common';
import { 
  HealthCheckService, 
  HealthCheck, 
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Memory health check - 150MB heap limit
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      // RSS memory check - 200MB limit
      () => this.memory.checkRSS('memory_rss', 200 * 1024 * 1024),
      // Disk space check - 80% threshold
      () => this.disk.checkStorage('storage', { 
        path: '/', 
        thresholdPercent: 0.8 
      }),
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    return this.health.check([
      // Basic memory check for readiness
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
    ]);
  }

  @Get('liveness')
  @HealthCheck()
  liveness() {
    return this.health.check([
      // Minimal liveness check
      () => this.memory.checkHeap('memory_heap', 400 * 1024 * 1024),
    ]);
  }
}