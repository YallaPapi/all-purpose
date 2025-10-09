/**
 * Watch Module
 * 
 * NestJS module configuration for real-time watch functionality.
 * Provides WebSocket and gRPC streaming capabilities for monitoring
 * agent registry changes and events.
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WatchService } from './watch.service';
import { WatchController } from './watch.controller';
import { WatchGateway } from './watch.gateway';
import { RegistryModule } from '../registry/registry.module';

@Module({
  imports: [
    ConfigModule,
    // Use forwardRef to avoid circular dependency with RegistryModule
    forwardRef(() => RegistryModule),
  ],
  controllers: [
    WatchController,
    WatchGateway,
  ],
  providers: [
    WatchService,
  ],
  exports: [
    WatchService,
  ],
})
export class WatchModule {}