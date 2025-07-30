/**
 * UEP Agent Wrapper Library
 * 
 * A comprehensive TypeScript library that provides UEP protocol enforcement,
 * automatic service registration, health check endpoints, and OpenTelemetry
 * integration for Node.js microservices.
 * 
 * Based on TaskMaster research findings:
 * - Decorator patterns for protocol enforcement and telemetry
 * - Higher-order functions for agent lifecycle management
 * - Middleware approach for HTTP endpoints and health checks
 * - OpenTelemetry integration with Context7 methodology
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import axios from 'axios';
import { EventEmitter } from 'events';

// =============================================================================
// Core Types and Interfaces
// =============================================================================

export interface UEPConfig {
  agentId: string;
  agentType: string;
  agentName: string;
  version: string;
  protocolVersion: string;
  port: number;
  hostname?: string;
  registryUrl: string;
  serviceUrl: string;
  otelCollectorUrl: string;
  autoRegister: boolean;
  validationEnabled: boolean;
  healthCheckPath: string;
  metricsPath: string;
  capabilities: string[];
  metadata?: Record<string, any>;
}

export interface UEPRegistrationPayload {
  agentId: string;
  agentType: string;
  agentName: string;
  version: string;
  protocolVersion: string;
  hostname: string;
  port: number;
  healthCheckPath: string;
  metricsPath: string;
  capabilities: string[];
  metadata: Record<string, any>;
}

export interface UEPHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  agent: {
    type: string;
    name: string;
    id: string;
  };
  uep: {
    protocolVersion: string;
    registered: boolean;
    registryConnected: boolean;
    validationEnabled: boolean;
  };
  memory?: {
    used: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
  };
  dependencies?: Array<{
    name: string;
    status: 'connected' | 'disconnected';
    lastCheck: string;
  }>;
}

export interface UEPProtocolMessage {
  messageId: string;
  messageType: string;
  version: string;
  timestamp: string;
  source: {
    agentId: string;
    agentType: string;
  };
  target?: {
    agentId: string;
    agentType: string;
  };
  payload: any;
  headers?: Record<string, string>;
}

// =============================================================================
// UEP Agent Wrapper Core Class
// =============================================================================

export class UEPAgentWrapper extends EventEmitter {
  private config: UEPConfig;
  private otelSdk: NodeSDK | null = null;
  private tracer = trace.getTracer('uep-agent-wrapper', '1.0.0');
  private registrationStatus: 'registered' | 'unregistered' | 'failed' = 'unregistered';
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private startTime: Date = new Date();
  private registrationRetryCount = 0;
  private readonly maxRetryAttempts = 5;
  private readonly retryDelayMs = 5000;

  constructor(config: Partial<UEPConfig>) {
    super();
    
    this.config = {
      agentId: config.agentId || `${process.env.HOSTNAME || 'unknown'}-${config.agentType || 'uep-agent'}`,
      agentType: config.agentType || 'uep-agent',
      agentName: config.agentName || 'UEP Agent',
      version: config.version || '1.0.0',
      protocolVersion: config.protocolVersion || '2.0.0',
      port: config.port || 3000,
      hostname: config.hostname || process.env.HOSTNAME || 'localhost',
      registryUrl: config.registryUrl || process.env.UEP_REGISTRY_URL || 'http://uep-registry:3000',
      serviceUrl: config.serviceUrl || process.env.UEP_SERVICE_URL || 'http://uep-service:3001',
      otelCollectorUrl: config.otelCollectorUrl || process.env.OTEL_COLLECTOR_URL || 'http://otel-collector:4318',
      autoRegister: config.autoRegister !== false,
      validationEnabled: config.validationEnabled !== false,
      healthCheckPath: config.healthCheckPath || '/health',
      metricsPath: config.metricsPath || '/metrics',
      capabilities: config.capabilities || ['http', 'health', 'metrics', 'tracing'],
      metadata: config.metadata || {},
      ...config
    };

    this.initializeOpenTelemetry();
    this.setupEventHandlers();
  }

  // =============================================================================
  // OpenTelemetry Integration
  // =============================================================================

  private initializeOpenTelemetry(): void {
    this.otelSdk = new NodeSDK({
      resource: Resource.default().merge(
        new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.config.agentType,
          [SemanticResourceAttributes.SERVICE_VERSION]: this.config.version,
          [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: this.config.agentId,
          'uep.agent.type': this.config.agentType,
          'uep.agent.name': this.config.agentName,
          'uep.protocol.version': this.config.protocolVersion,
        }),
      ),
      traceExporter: new OTLPTraceExporter({
        url: `${this.config.otelCollectorUrl}/v1/traces`,
      }),
    });

    this.otelSdk.start();
    console.log(`OpenTelemetry initialized for ${this.config.agentType}`);
  }

  // =============================================================================
  // Service Registration Management
  // =============================================================================

  public async initialize(): Promise<void> {
    return this.tracer.startActiveSpan('uep.agent.initialize', async (span) => {
      try {
        span.setAttributes({
          'uep.agent.id': this.config.agentId,
          'uep.agent.type': this.config.agentType,
          'uep.auto.register': this.config.autoRegister,
        });

        if (this.config.autoRegister) {
          await this.registerWithRetry();
        }

        this.startHealthCheckInterval();
        this.emit('initialized', { agentId: this.config.agentId });
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      }
    });
  }

  private async registerWithRetry(): Promise<void> {
    return this.tracer.startActiveSpan('uep.agent.register', async (span) => {
      const registrationPayload: UEPRegistrationPayload = {
        agentId: this.config.agentId,
        agentType: this.config.agentType,
        agentName: this.config.agentName,
        version: this.config.version,
        protocolVersion: this.config.protocolVersion,
        hostname: this.config.hostname!,
        port: this.config.port,
        healthCheckPath: this.config.healthCheckPath,
        metricsPath: this.config.metricsPath,
        capabilities: this.config.capabilities,
        metadata: {
          ...this.config.metadata,
          startTime: this.startTime.toISOString(),
          nodeVersion: process.version,
          platform: process.platform,
        },
      };

      span.setAttributes({
        'uep.registration.attempt': this.registrationRetryCount + 1,
        'uep.registration.max_attempts': this.maxRetryAttempts,
        'uep.registry.url': this.config.registryUrl,
      });

      for (this.registrationRetryCount = 0; this.registrationRetryCount < this.maxRetryAttempts; this.registrationRetryCount++) {
        try {
          const response = await axios.post(
            `${this.config.registryUrl}/api/registry/register`,
            registrationPayload,
            {
              timeout: 10000,
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': `UEP-Agent/${this.config.version}`,
              }
            }
          );

          this.registrationStatus = 'registered';
          this.emit('registered', { 
            agentId: this.config.agentId, 
            response: response.data 
          });
          
          span.setStatus({ code: SpanStatusCode.OK });
          console.log(`Successfully registered ${this.config.agentId} with UEP Registry`);
          return;

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Registration attempt ${this.registrationRetryCount + 1} failed: ${errorMsg}`);
          
          if (this.registrationRetryCount < this.maxRetryAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
          }
        }
      }

      this.registrationStatus = 'failed';
      const error = new Error(`Failed to register after ${this.maxRetryAttempts} attempts`);
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      this.emit('registrationFailed', { agentId: this.config.agentId });
      throw error;
    });
  }

  public async deregister(): Promise<void> {
    return this.tracer.startActiveSpan('uep.agent.deregister', async (span) => {
      try {
        span.setAttributes({
          'uep.agent.id': this.config.agentId,
          'uep.registry.url': this.config.registryUrl,
        });

        if (this.registrationStatus === 'registered') {
          await axios.delete(
            `${this.config.registryUrl}/api/registry/deregister/${this.config.agentId}`,
            { timeout: 10000 }
          );
        }

        this.registrationStatus = 'unregistered';
        this.emit('deregistered', { agentId: this.config.agentId });
        span.setStatus({ code: SpanStatusCode.OK });
        console.log(`Successfully deregistered ${this.config.agentId} from UEP Registry`);
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        console.error(`Deregistration failed: ${(error as Error).message}`);
      }
    });
  }

  // =============================================================================
  // Health Check Management
  // =============================================================================

  private startHealthCheckInterval(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthStatus = await this.getHealthStatus();
        this.emit('healthCheck', healthStatus);
      } catch (error) {
        console.error('Health check failed:', (error as Error).message);
        this.emit('healthCheckFailed', { error: (error as Error).message });
      }
    }, 30000); // Every 30 seconds
  }

  public async getHealthStatus(): Promise<UEPHealthStatus> {
    return this.tracer.startActiveSpan('uep.agent.health_check', async (span) => {
      const memUsage = process.memoryUsage();
      
      // Check registry connectivity
      let registryConnected = false;
      try {
        await axios.get(`${this.config.registryUrl}/health`, { timeout: 3000 });
        registryConnected = true;
      } catch (error) {
        // Registry not accessible, but this doesn't necessarily mean unhealthy
      }

      const healthStatus: UEPHealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: this.config.version,
        agent: {
          type: this.config.agentType,
          name: this.config.agentName,
          id: this.config.agentId,
        },
        uep: {
          protocolVersion: this.config.protocolVersion,
          registered: this.registrationStatus === 'registered',
          registryConnected,
          validationEnabled: this.config.validationEnabled,
        },
        memory: {
          used: memUsage.rss,
          total: memUsage.rss + memUsage.external,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
        },
      };

      // Determine health status based on various factors
      if (this.registrationStatus === 'failed' || (!registryConnected && this.config.autoRegister)) {
        healthStatus.status = 'degraded';
      }

      span.setAttributes({
        'health.status': healthStatus.status,
        'health.uptime': healthStatus.uptime,
        'health.registered': healthStatus.uep.registered,
        'health.registry_connected': healthStatus.uep.registryConnected,
      });

      return healthStatus;
    });
  }

  // =============================================================================
  // UEP Protocol Validation
  // =============================================================================

  public validateUEPMessage(message: any): UEPProtocolMessage | null {
    return this.tracer.startActiveSpan('uep.protocol.validate', (span) => {
      try {
        // Basic structure validation
        if (!message || typeof message !== 'object') {
          throw new Error('Invalid message format');
        }

        const required = ['messageId', 'messageType', 'version', 'timestamp', 'source', 'payload'];
        for (const field of required) {
          if (!(field in message)) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        // Validate source
        if (!message.source?.agentId || !message.source?.agentType) {
          throw new Error('Invalid source format');
        }

        // Version compatibility check
        if (message.version !== this.config.protocolVersion) {
          console.warn(`Protocol version mismatch: expected ${this.config.protocolVersion}, got ${message.version}`);
        }

        span.setAttributes({
          'uep.message.id': message.messageId,
          'uep.message.type': message.messageType,
          'uep.message.version': message.version,
          'uep.source.agent_id': message.source.agentId,
          'uep.source.agent_type': message.source.agentType,
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return message as UEPProtocolMessage;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        return null;
      }
    });
  }

  // =============================================================================
  // Express Middleware Integration
  // =============================================================================

  public getExpressMiddleware() {
    return {
      // UEP Protocol Validation Middleware
      validateUEP: (req: Request, res: Response, next: NextFunction) => {
        return this.tracer.startActiveSpan('uep.middleware.validate', (span) => {
          span.setAttributes({
            'http.method': req.method,
            'http.url': req.url,
            'http.user_agent': req.get('User-Agent') || '',
          });

          if (this.config.validationEnabled && req.body) {
            const validatedMessage = this.validateUEPMessage(req.body);
            if (!validatedMessage) {
              span.setStatus({ code: SpanStatusCode.ERROR, message: 'UEP validation failed' });
              return res.status(400).json({
                error: 'Invalid UEP protocol message',
                timestamp: new Date().toISOString(),
                agentId: this.config.agentId,
              });
            }
            req.body = validatedMessage;
          }

          span.setStatus({ code: SpanStatusCode.OK });
          next();
        });
      },

      // Health Check Endpoint
      healthCheck: async (req: Request, res: Response) => {
        return this.tracer.startActiveSpan('uep.endpoint.health', async (span) => {
          try {
            const healthStatus = await this.getHealthStatus();
            span.setAttributes({
              'health.status': healthStatus.status,
              'health.uptime': healthStatus.uptime,
            });

            const statusCode = healthStatus.status === 'healthy' ? 200 : 
                              healthStatus.status === 'degraded' ? 200 : 503;
            
            res.status(statusCode).json(healthStatus);
            span.setStatus({ code: SpanStatusCode.OK });
          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
            res.status(503).json({
              status: 'unhealthy',
              error: (error as Error).message,
              timestamp: new Date().toISOString(),
              agentId: this.config.agentId,
            });
          }
        });
      },

      // OpenTelemetry Tracing Middleware
      tracing: (req: Request, res: Response, next: NextFunction) => {
        const span = this.tracer.startActiveSpan(`HTTP ${req.method} ${req.route?.path || req.path}`, {
          kind: SpanKind.SERVER,
          attributes: {
            'http.method': req.method,
            'http.url': req.url,
            'http.scheme': req.protocol,
            'http.host': req.get('Host') || '',
            'http.user_agent': req.get('User-Agent') || '',
            'uep.agent.id': this.config.agentId,
            'uep.agent.type': this.config.agentType,
          },
        });

        // Add span to request context
        (req as any).span = span;

        res.on('finish', () => {
          span.setAttributes({
            'http.status_code': res.statusCode,
            'http.response.size': res.get('Content-Length') || 0,
          });

          if (res.statusCode >= 400) {
            span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${res.statusCode}` });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
          }

          span.end();
        });

        context.with(trace.setSpan(context.active(), span), () => {
          next();
        });
      },
    };
  }

  // =============================================================================
  // Graceful Shutdown
  // =============================================================================

  public async shutdown(): Promise<void> {
    return this.tracer.startActiveSpan('uep.agent.shutdown', async (span) => {
      try {
        console.log(`Initiating graceful shutdown for ${this.config.agentId}`);
        
        // Clear health check interval
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
          this.healthCheckInterval = null;
        }

        // Deregister from UEP registry
        if (this.config.autoRegister) {
          await this.deregister();
        }

        // Shutdown OpenTelemetry SDK
        if (this.otelSdk) {
          await this.otelSdk.shutdown();
        }

        this.emit('shutdown', { agentId: this.config.agentId });
        span.setStatus({ code: SpanStatusCode.OK });
        console.log(`Graceful shutdown completed for ${this.config.agentId}`);
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        console.error(`Shutdown error: ${(error as Error).message}`);
      }
    });
  }

  // =============================================================================
  // Event Handlers and Utilities
  // =============================================================================

  private setupEventHandlers(): void {
    // Handle process signals for graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, initiating graceful shutdown');
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('Received SIGINT, initiating graceful shutdown');
      await this.shutdown();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception:', error);
      await this.shutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      await this.shutdown();
      process.exit(1);
    });
  }

  // Getters for configuration access
  public getConfig(): UEPConfig {
    return { ...this.config };
  }

  public getRegistrationStatus(): 'registered' | 'unregistered' | 'failed' {
    return this.registrationStatus;
  }

  public isHealthy(): boolean {
    return this.registrationStatus !== 'failed';
  }
}

// =============================================================================
// TypeScript Decorators for UEP Protocol Enforcement
// =============================================================================

/**
 * Decorator for methods that require UEP protocol validation
 */
export function ValidateUEP(target: any, propertyName:String, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const wrapper = (this as any).uepWrapper as UEPAgentWrapper;
    if (!wrapper) {
      throw new Error('UEP wrapper not initialized. Use @UEPAgent decorator on class.');
    }

    // Validate first argument as UEP message if it exists
    if (args.length > 0 && typeof args[0] === 'object') {
      const validatedMessage = wrapper.validateUEPMessage(args[0]);
      if (!validatedMessage) {
        throw new Error('Invalid UEP protocol message');
      }
      args[0] = validatedMessage;
    }

    return method.apply(this, args);
  };
}

/**
 * Class decorator for UEP Agent integration
 */
export function UEPAgent(config: Partial<UEPConfig>) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      public uepWrapper: UEPAgentWrapper;

      constructor(...args: any[]) {
        super(...args);
        this.uepWrapper = new UEPAgentWrapper(config);
      }

      async initialize() {
        await this.uepWrapper.initialize();
        if (super.initialize) {
          await super.initialize();
        }
      }

      async shutdown() {
        if (super.shutdown) {
          await super.shutdown();
        }
        await this.uepWrapper.shutdown();
      }
    };
  };
}

// =============================================================================
// Higher-Order Functions for Agent Lifecycle Management
// =============================================================================

/**
 * Higher-order function that wraps agent methods with UEP lifecycle management
 */
export function withUEPLifecycle<T extends (...args: any[]) => any>(
  fn: T,
  wrapper: UEPAgentWrapper
): T {
  return ((...args: any[]) => {
    return wrapper.tracer.startActiveSpan(`agent.${fn.name}`, async (span) => {
      try {
        span.setAttributes({
          'uep.agent.id': wrapper.getConfig().agentId,
          'uep.method.name': fn.name,
        });

        const result = await fn(...args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      }
    });
  }) as T;
}

/**
 * Higher-order function for creating UEP-compliant message handlers
 */
export function createUEPMessageHandler<T>(
  handler: (message: UEPProtocolMessage, ...args: any[]) => T,
  wrapper: UEPAgentWrapper
) {
  return (message: any, ...args: any[]): T => {
    const validatedMessage = wrapper.validateUEPMessage(message);
    if (!validatedMessage) {
      throw new Error('Invalid UEP protocol message');
    }
    return handler(validatedMessage, ...args);
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a standardized UEP protocol message
 */
export function createUEPMessage(
  messageType: string,
  payload: any,
  source: { agentId: string; agentType: string },
  target?: { agentId: string; agentType: string },
  protocolVersion: string = '2.0.0'
): UEPProtocolMessage {
  return {
    messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    messageType,
    version: protocolVersion,
    timestamp: new Date().toISOString(),
    source,
    target,
    payload,
  };
}

/**
 * Default export for easy import
 */
export default UEPAgentWrapper;