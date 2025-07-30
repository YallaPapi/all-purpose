#!/usr/bin/env node

/**
 * UEP Capability Registry Server
 * 
 * Entry point for the Capability Registry Service server application.
 * Configures and starts the registry service with production-ready settings.
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.2
 */

import { CapabilityRegistryService } from './services/CapabilityRegistryService.js';
import { CapabilityRegistryConfig } from './types/CapabilitySchema.js';
import chalk from 'chalk';

/**
 * Load configuration from environment variables
 */
function loadConfiguration(): CapabilityRegistryConfig {
  return {
    // Storage configuration
    storage: {
      type: 'redis',
      connectionString: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'uep:',
      ttl: parseInt(process.env.DEFAULT_TTL || '3600')
    },

    // Versioning configuration
    versioning: {
      strictSemVer: process.env.STRICT_SEMVER === 'true',
      allowPrerelease: process.env.ALLOW_PRERELEASE !== 'false',
      deprecationWarningPeriod: parseInt(process.env.DEPRECATION_WARNING_PERIOD || '90')
    },

    // Validation configuration
    validation: {
      enableSchemaValidation: process.env.ENABLE_SCHEMA_VALIDATION !== 'false',
      customValidators: process.env.CUSTOM_VALIDATORS?.split(',') || [],
      strictCompatibilityChecking: process.env.STRICT_COMPATIBILITY === 'true'
    },

    // Performance configuration
    performance: {
      cacheEnabled: process.env.CACHE_ENABLED !== 'false',
      cacheTtl: parseInt(process.env.CACHE_TTL || '300'),
      indexingEnabled: process.env.INDEXING_ENABLED !== 'false',
      batchSize: parseInt(process.env.BATCH_SIZE || '100')
    },

    // Monitoring configuration
    monitoring: {
      metricsEnabled: process.env.METRICS_ENABLED !== 'false',
      auditEnabled: process.env.AUDIT_ENABLED === 'true',
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30')
    }
  };
}

/**
 * Setup graceful shutdown handlers
 */
function setupShutdownHandlers(registry: CapabilityRegistryService): void {
  const shutdown = async (signal: string) => {
    console.log(chalk.yellow(`\n🔄 Received ${signal}, initiating graceful shutdown...`));
    
    try {
      await registry.shutdown();
      console.log(chalk.green('✅ Graceful shutdown completed'));
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('❌ Error during shutdown:'), error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'), error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

/**
 * Main server startup function
 */
async function startServer(): Promise<void> {
  try {
    console.log(chalk.blue('🚀 Starting UEP Capability Registry Service...'));
    
    // Load configuration
    const config = loadConfiguration();
    console.log(chalk.cyan('📋 Configuration loaded'));
    
    // Create registry service
    const registry = new CapabilityRegistryService(config);
    
    // Setup shutdown handlers
    setupShutdownHandlers(registry);
    
    // Initialize service
    await registry.initialize();
    
    // Start HTTP server
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || 'localhost';
    
    await registry.start(port, host);
    
    console.log(chalk.green(`✅ UEP Capability Registry Service started successfully`));
    console.log(chalk.blue(`📡 API Documentation: http://${host}:${port}/api`));
    console.log(chalk.blue(`🔍 Health Check: http://${host}:${port}/health`));
    console.log(chalk.blue(`📊 Metrics: http://${host}:${port}/api/v1/metrics`));
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to start Capability Registry Service:'), error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error(chalk.red('❌ Server startup failed:'), error);
    process.exit(1);
  });
}

export { startServer, loadConfiguration };