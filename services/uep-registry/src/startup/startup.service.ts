/**
 * Startup Service
 * 
 * Handles application startup logic including configuration logging.
 * Uses OnModuleInit to ensure ConfigService is available.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StartupService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Log configuration on startup
    const etcdEndpoints = this.configService.get<string>('ETCD_ENDPOINTS', 'localhost:2379');
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    console.log('🔧 UEP Registry Configuration:');
    console.log(`   Environment: ${nodeEnv}`);
    console.log(`   etcd Endpoints: ${etcdEndpoints}`);
    console.log(`   Redis Host: ${redisHost}`);
    console.log(`   Metrics Enabled: ${this.configService.get<boolean>('METRICS_ENABLED', true)}`);
    console.log(`   Health Checks Enabled: ${this.configService.get<boolean>('HEALTH_CHECKS_ENABLED', true)}`);
  }
}