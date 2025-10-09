/**
 * etcd Integration Module
 * 
 * Provides etcd client configuration and services for the UEP Registry.
 * Handles connection management, configuration, and health monitoring.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EtcdService } from './etcd.service';
import { EtcdHealthIndicator } from './etcd-health.indicator';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'ETCD_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const { Etcd3 } = await import('etcd3');
        
        const endpoints = configService
          .get<string>('ETCD_ENDPOINTS', 'localhost:2379')
          .split(',')
          .map(endpoint => endpoint.trim());

        const username = configService.get<string>('ETCD_USERNAME');
        const password = configService.get<string>('ETCD_PASSWORD');
        const rootCertificate = configService.get<string>('ETCD_ROOT_CERT_PATH');
        const privateKey = configService.get<string>('ETCD_PRIVATE_KEY_PATH');
        const certChain = configService.get<string>('ETCD_CERT_CHAIN_PATH');

        const etcdOptions: any = {
          hosts: endpoints,
          dialTimeout: 10000,
          requestTimeout: 30000,
        };

        // Add authentication if provided
        if (username && password) {
          etcdOptions.auth = {
            username,
            password,
          };
        }

        // Add TLS configuration if provided
        if (rootCertificate || privateKey || certChain) {
          etcdOptions.credentials = {};
          
          if (rootCertificate) {
            const fs = await import('fs');
            etcdOptions.credentials.rootCertificate = fs.readFileSync(rootCertificate);
          }
          
          if (privateKey) {
            const fs = await import('fs');
            etcdOptions.credentials.privateKey = fs.readFileSync(privateKey);
          }
          
          if (certChain) {
            const fs = await import('fs');
            etcdOptions.credentials.certChain = fs.readFileSync(certChain);
          }
        }

        const client = new Etcd3(etcdOptions);

        // Test connection on startup
        try {
          await client.get('health-check').string();
          console.log(`✅ Connected to etcd cluster: ${endpoints.join(', ')}`);
        } catch (error) {
          console.error(`❌ Failed to connect to etcd cluster: ${error.message}`);
          throw error;
        }

        return client;
      },
      inject: [ConfigService],
    },
    EtcdService,
    EtcdHealthIndicator,
  ],
  exports: ['ETCD_CLIENT', EtcdService, EtcdHealthIndicator],
})
export class EtcdModule {}