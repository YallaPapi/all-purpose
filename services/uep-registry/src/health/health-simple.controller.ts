/**
 * Simple Health Controller
 * 
 * Minimal health check controller that works with @nestjs/terminus.
 * This is a working implementation that can be used as a reference.
 */

import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health-simple')
export class HealthSimpleController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }
}