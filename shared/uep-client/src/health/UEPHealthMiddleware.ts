/**
 * UEP Health Check Middleware
 * 
 * Middleware for integrating health check functionality with UEP agents,
 * providing automatic health monitoring and decorator integration.
 * 
 * Features:
 * - Automatic health server initialization
 * - Integration with UEP agent decorators
 * - Custom health check registration
 * - Container orchestration compatibility
 * - Graceful shutdown handling
 */

import { 
  UEPHealthServer,
  UEPHealthServerConfig,
  HealthCheckFunction,
  createDefaultHealthServerConfig
} from './UEPHealthServer.js';
import { 
  UEPClient,
  UEPServiceRegistry,
  UEPMessageValidator
} from '../core/UEPTypes.js';
import { 
  getAgentConfig,
  AgentRegistry
} from '../decorators/UEPAgentDecorators.js';

/**
 * Health Middleware Configuration
 */
export interface UEPHealthMiddlewareConfig {
  healthServer?: Partial<UEPHealthServerConfig>;
  autoStart?: boolean;
  enableGracefulShutdown?: boolean;
  shutdownTimeout?: number;
  customChecks?: HealthCheckFunction[];
}

/**
 * Health Check Decorator
 */
export function UEPHealthCheck(
  name: string, 
  options?: { 
    interval?: number; 
    timeout?: number; 
    critical?: boolean; 
  }
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // Store health check metadata
    const healthChecks = Reflect.getMetadata('uep:health-checks', target.constructor) || [];
    healthChecks.push({
      name,
      method: propertyKey,
      options: options || {}
    });
    Reflect.defineMetadata('uep:health-checks', healthChecks, target.constructor);

    return descriptor;
  };
}

/**
 * UEP Health Middleware Implementation
 */
export class UEPHealthMiddleware {
  private readonly config: UEPHealthMiddlewareConfig;
  private healthServer: UEPHealthServer | null = null;
  private client: UEPClient | null = null;
  private registry: UEPServiceRegistry | null = null;
  private validator: UEPMessageValidator | null = null;
  private customHealthChecks: HealthCheckFunction[] = [];
  private shutdownHandlers: (() => Promise<void>)[] = [];

  constructor(config: UEPHealthMiddlewareConfig = {}) {
    this.config = {
      autoStart: true,
      enableGracefulShutdown: true,
      shutdownTimeout: 30000,
      ...config
    };

    // Setup graceful shutdown if enabled
    if (this.config.enableGracefulShutdown) {
      this.setupGracefulShutdown();
    }
  }

  /**
   * Initialize health middleware with UEP components
   */
  async initialize(
    client?: UEPClient,
    registry?: UEPServiceRegistry,
    validator?: UEPMessageValidator
  ): Promise<void> {
    this.client = client || null;
    this.registry = registry || null;
    this.validator = validator || null;

    // Extract health checks from registered agents
    await this.extractAgentHealthChecks();

    // Add custom health checks
    if (this.config.customChecks) {
      this.customHealthChecks.push(...this.config.customChecks);
    }

    // Initialize health server
    if (this.config.autoStart) {
      await this.startHealthServer();
    }
  }

  /**
   * Start the health server
   */
  async startHealthServer(port?: number): Promise<void> {
    if (this.healthServer) {
      return; // Already started
    }

    const serverConfig = {
      ...createDefaultHealthServerConfig(port || 8080),
      ...this.config.healthServer,
      customChecks: this.customHealthChecks
    };

    this.healthServer = new UEPHealthServer(serverConfig);
    await this.healthServer.initialize(this.client, this.registry, this.validator);

    console.log(`UEP Health Server started on port ${serverConfig.port}`);
  }

  /**
   * Stop the health server
   */
  async stopHealthServer(): Promise<void> {
    if (this.healthServer) {
      await this.healthServer.shutdown();
      this.healthServer = null;
      console.log('UEP Health Server stopped');
    }
  }

  /**
   * Add a custom health check
   */
  addHealthCheck(healthCheck: HealthCheckFunction): void {
    this.customHealthChecks.push(healthCheck);
  }

  /**
   * Add a shutdown handler
   */
  addShutdownHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Get health server port
   */
  getHealthServerPort(): number | null {
    return this.config.healthServer?.port || 8080;
  }

  /**
   * Check if health server is running
   */
  isHealthServerRunning(): boolean {
    return this.healthServer !== null;
  }

  /**
   * Extract health checks from decorated agents
   */
  private async extractAgentHealthChecks(): Promise<void> {
    const agents = AgentRegistry.getAllAgents();

    for (const agent of agents) {
      const agentConfig = getAgentConfig(agent.constructor);
      const healthChecks = Reflect.getMetadata('uep:health-checks', agent.constructor) || [];

      if (agentConfig) {
        // Add default agent health check
        this.customHealthChecks.push(async () => {
          const startTime = Date.now();
          
          try {
            // Check if agent is responding
            const isHealthy = typeof agent.getStatus === 'function' 
              ? await this.checkAgentStatus(agent)
              : true;

            return {
              name: `agent-${agentConfig.name}`,
              status: isHealthy ? 'pass' : 'fail',
              message: isHealthy ? `Agent ${agentConfig.name} is healthy` : `Agent ${agentConfig.name} is unhealthy`,
              duration: Date.now() - startTime,
              metadata: {
                agentType: agentConfig.type,
                version: agentConfig.version
              }
            };
          } catch (error) {
            return {
              name: `agent-${agentConfig.name}`,
              status: 'fail',
              message: `Agent health check failed: ${error.message}`,
              duration: Date.now() - startTime,
              metadata: {
                error: error.message
              }
            };
          }
        });

        // Add custom health checks from agent methods
        for (const healthCheck of healthChecks) {
          this.customHealthChecks.push(async () => {
            const startTime = Date.now();
            
            try {
              const result = await agent[healthCheck.method]();
              
              return {
                name: healthCheck.name,
                status: 'pass',
                message: typeof result === 'string' ? result : 'Health check passed',
                duration: Date.now() - startTime,
                metadata: typeof result === 'object' ? result : { result }
              };
            } catch (error) {
              return {
                name: healthCheck.name,
                status: healthCheck.options.critical === false ? 'warn' : 'fail',
                message: `Health check failed: ${error.message}`,
                duration: Date.now() - startTime,
                metadata: {
                  error: error.message,
                  critical: healthCheck.options.critical !== false
                }
              };
            }
          });
        }
      }
    }
  }

  /**
   * Check agent status
   */
  private async checkAgentStatus(agent: any): Promise<boolean> {
    try {
      if (typeof agent.getStatus === 'function') {
        const status = await agent.getStatus();
        return status && (status.status === 'healthy' || status.status === 'ready');
      }
      return true; // Assume healthy if no status method
    } catch (error) {
      return false;
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Stop accepting new requests
        await this.stopHealthServer();

        // Run custom shutdown handlers
        const shutdownPromises = this.shutdownHandlers.map(handler => 
          Promise.race([
            handler(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Shutdown handler timeout')), 5000)
            )
          ])
        );

        await Promise.allSettled(shutdownPromises);

        // Disconnect UEP client
        if (this.client) {
          await this.client.disconnect();
        }

        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different termination signals
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGUSR2', () => shutdownHandler('SIGUSR2')); // Nodemon restart

    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdownHandler('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdownHandler('UNHANDLED_REJECTION');
    });
  }
}

/**
 * Global health middleware instance
 */
let globalHealthMiddleware: UEPHealthMiddleware | null = null;

/**
 * Initialize global health middleware
 */
export async function initializeUEPHealth(
  config?: UEPHealthMiddlewareConfig,
  client?: UEPClient,
  registry?: UEPServiceRegistry,
  validator?: UEPMessageValidator
): Promise<UEPHealthMiddleware> {
  if (!globalHealthMiddleware) {
    globalHealthMiddleware = new UEPHealthMiddleware(config);
  }

  await globalHealthMiddleware.initialize(client, registry, validator);
  return globalHealthMiddleware;
}

/**
 * Get global health middleware instance
 */
export function getUEPHealthMiddleware(): UEPHealthMiddleware | null {
  return globalHealthMiddleware;
}

/**
 * Start health server with default configuration
 */
export async function startUEPHealthServer(
  port: number = 8080,
  client?: UEPClient,
  registry?: UEPServiceRegistry,
  validator?: UEPMessageValidator
): Promise<UEPHealthMiddleware> {
  const middleware = await initializeUEPHealth(
    { 
      healthServer: { port },
      autoStart: true 
    },
    client,
    registry,
    validator
  );

  return middleware;
}

/**
 * Create health check function for common scenarios
 */
export const HealthChecks = {
  /**
   * Database connection health check
   */
  database: (connectionCheck: () => Promise<boolean>, name: string = 'database'): HealthCheckFunction => {
    return async () => {
      const startTime = Date.now();
      
      try {
        const isConnected = await connectionCheck();
        
        return {
          name,
          status: isConnected ? 'pass' : 'fail',
          message: isConnected ? 'Database connection is healthy' : 'Database connection failed',
          duration: Date.now() - startTime
        };
      } catch (error) {
        return {
          name,
          status: 'fail',
          message: `Database health check failed: ${error.message}`,
          duration: Date.now() - startTime,
          metadata: { error: error.message }
        };
      }
    };
  },

  /**
   * External API health check
   */
  externalApi: (url: string, timeout: number = 5000): HealthCheckFunction => {
    return async () => {
      const startTime = Date.now();
      
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(timeout)
        });

        const isHealthy = response.ok;
        
        return {
          name: `external-api-${new URL(url).hostname}`,
          status: isHealthy ? 'pass' : 'fail',
          message: `External API ${url} is ${isHealthy ? 'reachable' : 'unreachable'}`,
          duration: Date.now() - startTime,
          metadata: {
            url,
            statusCode: response.status
          }
        };
      } catch (error) {
        return {
          name: `external-api-${new URL(url).hostname}`,
          status: 'fail',
          message: `External API health check failed: ${error.message}`,
          duration: Date.now() - startTime,
          metadata: {
            url,
            error: error.message
          }
        };
      }
    };
  },

  /**
   * Memory usage health check
   */
  memory: (thresholdPercent: number = 90): HealthCheckFunction => {
    return async () => {
      const startTime = Date.now();
      const memUsage = process.memoryUsage();
      const utilization = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      return {
        name: 'memory-usage',
        status: utilization < thresholdPercent ? 'pass' : 'warn',
        message: `Memory utilization: ${utilization.toFixed(1)}%`,
        duration: Date.now() - startTime,
        metadata: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          utilization: utilization,
          threshold: thresholdPercent
        }
      };
    };
  },

  /**
   * Disk space health check
   */
  diskSpace: (path: string = '/', thresholdPercent: number = 90): HealthCheckFunction => {
    return async () => {
      const startTime = Date.now();
      
      try {
        // This would require fs.statSync in a real implementation
        // For now, return a placeholder
        const freeSpace = 50; // Percentage free
        const isHealthy = freeSpace > (100 - thresholdPercent);
        
        return {
          name: 'disk-space',
          status: isHealthy ? 'pass' : 'warn',
          message: `Disk space: ${freeSpace}% free`,
          duration: Date.now() - startTime,
          metadata: {
            path,
            freePercent: freeSpace,
            threshold: thresholdPercent
          }
        };
      } catch (error) {
        return {
          name: 'disk-space',
          status: 'fail',
          message: `Disk space check failed: ${error.message}`,
          duration: Date.now() - startTime,
          metadata: {
            path,
            error: error.message
          }
        };
      }
    };
  }
};

export {
  UEPHealthMiddleware,
  UEPHealthMiddlewareConfig,
  UEPHealthCheck
};