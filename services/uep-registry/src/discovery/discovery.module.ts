/**
 * Discovery Module
 * 
 * NestJS module configuration for UEP agent discovery functionality.
 * Provides capability-based agent discovery, filtering, recommendations,
 * and performance optimization features.
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryService } from './discovery.service';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryGateway } from './discovery.gateway';
import { RegistryModule } from '../registry/registry.module';
import { EtcdModule } from '../etcd/etcd.module';

@Module({
  imports: [
    ConfigModule,
    // Use forwardRef to avoid circular dependency with RegistryModule
    forwardRef(() => RegistryModule),
    EtcdModule,
  ],
  controllers: [
    DiscoveryController,
    DiscoveryGateway,
  ],
  providers: [
    DiscoveryService,
  ],
  exports: [
    DiscoveryService,
  ],
})
export class DiscoveryModule {}