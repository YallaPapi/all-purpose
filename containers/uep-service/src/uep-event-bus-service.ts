/**
 * UEP Event Bus Validation Service
 * 
 * Integrates with NATS JetStream to provide real-time UEP protocol validation
 * for all messages flowing through the Meta-Agent Factory event bus.
 * 
 * Key Features:
 * - Real-time message validation using NATS JetStream consumers
 * - Version-aware protocol validation
 * - Circuit breaker integration for fallback handling
 * - Audit trail logging for compliance
 * - Performance metrics collection
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { connect, NatsConnection, JetStreamManager, JetStreamClient, consumerOpts, createInbox, Msg, DeliverPolicy, ReplayPolicy, AckPolicy } from 'nats';
import { UEPValidationEngine } from './core/UEPValidationEngine.js';
import { UEPProtocolProcessor } from './core/UEPProtocolProcessor.js';
import { UEPEnforcementEngine } from './core/UEPEnforcementEngine.js';
import { ContentNegotiationEngine, UEPMessage } from '../../../shared/uep-validation/UEPProtocolVersioning.js';
import { VersionAwareCircuitBreaker } from '../../../shared/resilience/VersionAwareCircuitBreaker.js';
import { SchemaTransformationEngine } from '../../../shared/uep-validation/SchemaTransformationEngine.js';

interface UEPEventBusConfig {
  natsUrl: string;
  jetStreamDomain: string;
  validationEnabled: boolean;
  circuitBreakerEnabled: boolean;
  auditEnabled: boolean;
  metricsEnabled: boolean;
  port: number;
}

interface ValidationMetrics {
  totalMessages: number;
  validMessages: number;
  invalidMessages: number;
  averageLatency: number;
  circuitBreakerTrips: number;
  versionTransformations: number;
  lastUpdated: string;
}

export class UEPEventBusValidationService {
  private app: express.Application;
  private server: any;
  private natsConnection: NatsConnection | null = null;
  private jetStreamManager: JetStreamManager | null = null;
  private jetStreamClient: JetStreamClient | null = null;
  
  private validationEngine: UEPValidationEngine;
  private protocolProcessor: UEPProtocolProcessor;
  private enforcementEngine: UEPEnforcementEngine;
  private contentNegotiator: ContentNegotiationEngine;
  private circuitBreaker: VersionAwareCircuitBreaker;
  private transformationEngine: SchemaTransformationEngine;
  
  private metrics: ValidationMetrics;
  private isRunning = false;

  constructor(private config: UEPEventBusConfig) {
    this.app = express();
    this.server = createServer(this.app);
    
    // Initialize UEP components
    this.validationEngine = new UEPValidationEngine();
    this.protocolProcessor = new UEPProtocolProcessor();
    this.enforcementEngine = new UEPEnforcementEngine();
    this.transformationEngine = new SchemaTransformationEngine();
    
    this.contentNegotiator = new ContentNegotiationEngine({
      supportedVersions: ['1.0', '1.1', '2.0', '2.1'],
      defaultVersion: '2.0',
      fallbackVersion: '1.1',
      enablePerformanceOptimization: true,
      enableCircuitBreakerFallback: true,
      strictCompatibility: false
    });
    
    this.circuitBreaker = new VersionAwareCircuitBreaker({
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
      resetTimeout: 60000,
      maxRetries: 3,
      retryDelay: 1000,
      enableVersionFallback: true,
      fallbackVersions: ['1.1', '1.0'],
      monitoringEnabled: true
    });
    
    this.metrics = {
      totalMessages: 0,
      validMessages: 0,
      invalidMessages: 0,
      averageLatency: 0,
      circuitBreakerTrips: 0,
      versionTransformations: 0,
      lastUpdated: new Date().toISOString()
    };
    
    this.setupExpressApp();
  }

  private setupExpressApp(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: this.isRunning ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        nats: {
          connected: this.natsConnection?.isClosed() === false,
          jetstream: this.jetStreamClient !== null
        },
        uep: {
          validation: this.config.validationEnabled,
          circuitBreaker: this.config.circuitBreakerEnabled,
          audit: this.config.auditEnabled
        },
        metrics: this.metrics
      });
    });

    // UEP validation endpoint for direct validation requests
    this.app.post('/validate', async (req, res) => {
      try {
        const message: UEPMessage = req.body;
        const result = await this.validateMessage(message);
        
        res.json({
          valid: result.valid,
          version: result.version,
          violations: result.violations,
          transformationUsed: result.transformationUsed,
          latency: result.latency
        });
      } catch (error) {
        console.error('Direct validation error:', error);
        res.status(500).json({
          valid: false,
          error: 'Validation service error'
        });
      }
    });

    // Version negotiation endpoint
    this.app.post('/negotiate-version', (req, res) => {
      try {
        const { clientVersions, serverVersions, performanceRequirements } = req.body;
        
        const result = this.contentNegotiator.selectOptimalVersion(
          clientVersions,
          serverVersions,
          performanceRequirements
        );
        
        res.json(result);
      } catch (error) {
        console.error('Version negotiation error:', error);
        res.status(500).json({
          version: null,
          strategy: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Circuit breaker status endpoint
    this.app.get('/circuit-breaker/status', (req, res) => {
      const statistics = this.circuitBreaker.getStatistics();
      const globalMetrics = this.circuitBreaker.getGlobalMetrics();
      
      res.json({
        statistics: Object.fromEntries(statistics),
        globalMetrics,
        timestamp: new Date().toISOString()
      });
    });

    // Metrics endpoint for Prometheus scraping
    this.app.get('/metrics', (req, res) => {
      const prometheusMetrics = this.generatePrometheusMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(prometheusMetrics);
    });

    // UEP audit trail endpoint
    this.app.get('/audit', async (req, res) => {
      try {
        const { since, limit = 100, severity } = req.query;
        
        // Query audit trail from JetStream
        const auditEvents = await this.queryAuditTrail({
          since: since as string,
          limit: parseInt(limit as string),
          severity: severity as string
        });
        
        res.json(auditEvents);
      } catch (error) {
        console.error('Audit query error:', error);
        res.status(500).json({
          error: 'Failed to query audit trail'
        });
      }
    });

    // Error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('UEP service error:', err);
      res.status(500).json({
        error: 'Internal UEP service error',
        timestamp: new Date().toISOString()
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Connect to NATS JetStream
      await this.connectToNATS();
      
      // Setup JetStream consumers for UEP validation
      await this.setupJetStreamConsumers();
      
      // Start HTTP server
      await this.startHttpServer();
      
      this.isRunning = true;
      console.log('🚀 UEP Event Bus Validation Service started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start UEP service:', error);
      throw error;
    }
  }

  private async connectToNATS(): Promise<void> {
    console.log(`Connecting to NATS: ${this.config.natsUrl}`);
    
    this.natsConnection = await connect({
      servers: this.config.natsUrl.split(','),
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectTimeWait: 2000,
      name: 'uep-validation-service',
      user: 'uep-validation-service',
      pass: 'uep-validation-secret-2024'
    });

    console.log('✅ Connected to NATS');

    // Setup JetStream management
    this.jetStreamManager = await this.natsConnection.jetstreamManager({
      domain: this.config.jetStreamDomain
    });
    
    this.jetStreamClient = this.natsConnection.jetstream({
      domain: this.config.jetStreamDomain
    });

    console.log(`✅ JetStream client initialized for domain: ${this.config.jetStreamDomain}`);
  }

  private async setupJetStreamConsumers(): Promise<void> {
    if (!this.jetStreamClient) {
      throw new Error('JetStream client not initialized');
    }

    // Consumer for primary UEP protocol messages validation
    // FIXED: Create consumer first, then get it
    try {
      await this.jetStreamManager!.consumers.add('UEP_PROTOCOL_MESSAGES', {
        durable_name: 'uep-validation-consumer',
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.All,
        replay_policy: ReplayPolicy.Instant
      });
    } catch (error: any) {
      // Consumer might already exist, that's OK
      if (!error.message?.includes('consumer already exists')) {
        throw error;
      }
    }

    // Now get the consumer - this is the correct API: (streamName, consumerName)
    const uepConsumer = await this.jetStreamClient.consumers.get('UEP_PROTOCOL_MESSAGES', 'uep-validation-consumer');
    
    console.log('✅ UEP protocol validation consumer created');

    // Start consuming and validating messages
    const messageIterator = await uepConsumer.consume({
      max_messages: 1000,
      expires: 60000
    });

    this.processUEPMessages(messageIterator);

    // Consumer for audit trail generation
    if (this.config.auditEnabled) {
      await this.setupAuditConsumer();
    }

    console.log('✅ JetStream consumers configured and running');
  }

  private async processUEPMessages(messageIterator: any): Promise<void> {
    for await (const msg of messageIterator) {
      try {
        const startTime = Date.now();
        
        // Parse UEP message
        const uepMessage: UEPMessage = JSON.parse(msg.data.toString());
        
        // Validate message using circuit breaker
        const validationResult = await this.circuitBreaker.call(
          {
            message: uepMessage,
            preferredVersion: uepMessage.version,
            acceptableVersions: ['1.0', '1.1', '2.0', '2.1']
          },
          async (message, version) => {
            return await this.validateMessage(message);
          }
        );
        
        const latency = Date.now() - startTime;
        this.updateMetrics(validationResult.success, latency, validationResult.fallbackUsed);
        
        if (validationResult.success) {
          // Message is valid, acknowledge it
          msg.ack();
          
          if (this.config.auditEnabled) {
            await this.logAuditEvent('validation.success', {
              messageType: uepMessage.messageType,
              agentId: uepMessage.agentId,
              version: validationResult.versionUsed,
              latency
            });
          }
        } else {
          // Message validation failed
          msg.nak();
          
          if (this.config.auditEnabled) {
            await this.logAuditEvent('validation.failure', {
              messageType: uepMessage.messageType,
              agentId: uepMessage.agentId,
              version: uepMessage.version,
              error: validationResult.error?.message,
              latency
            });
          }
          
          console.warn(`UEP validation failed for message from ${uepMessage.agentId}:`, validationResult.error);
        }
        
      } catch (error) {
        console.error('Error processing UEP message:', error);
        msg.nak();
        
        if (this.config.auditEnabled) {
          await this.logAuditEvent('validation.error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            rawMessage: msg.data.toString()
          });
        }
      }
    }
  }

  private async validateMessage(message: UEPMessage): Promise<{
    valid: boolean;
    version: string;
    violations: string[];
    transformationUsed: boolean;
    latency: number;
  }> {
    const startTime = Date.now();
    let transformationUsed = false;
    
    try {
      // Check if message needs version transformation
      const targetVersion = '2.0'; // Always validate against latest stable version
      
      if (message.version !== targetVersion) {
        const transformationResult = await this.transformationEngine.transformMessage(
          message,
          message.version,
          targetVersion
        );
        
        if (transformationResult.success && transformationResult.transformedMessage) {
          message = transformationResult.transformedMessage;
          transformationUsed = true;
          this.metrics.versionTransformations++;
        } else {
          return {
            valid: false,
            version: message.version,
            violations: transformationResult.errors.map(e => e.message),
            transformationUsed: false,
            latency: Date.now() - startTime
          };
        }
      }
      
      // Validate the message using the UEP validation engine
      const validation = await this.validationEngine.validateMessage(message);
      
      return {
        valid: validation.valid,
        version: message.version,
        violations: validation.violations || [],
        transformationUsed,
        latency: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        valid: false,
        version: message.version,
        violations: [error instanceof Error ? error.message : 'Validation error'],
        transformationUsed,
        latency: Date.now() - startTime
      };
    }
  }

  private async setupAuditConsumer(): Promise<void> {
    // Setup consumer for audit trail events
    console.log('Setting up audit trail consumer...');
    // Implementation for audit trail consumer would go here
  }

  private async logAuditEvent(eventType: string, data: any): Promise<void> {
    if (!this.jetStreamClient || !this.config.auditEnabled) return;
    
    try {
      const auditEvent = {
        eventType,
        timestamp: new Date().toISOString(),
        serviceId: 'uep-validation-service',
        data
      };
      
      await this.jetStreamClient.publish(
        `audit.validation.${eventType.replace('.', '_')}`,
        JSON.stringify(auditEvent)
      );
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  private async queryAuditTrail(params: {
    since?: string;
    limit: number;
    severity?: string;
  }): Promise<any[]> {
    // Implementation for querying audit trail from JetStream
    // This would use JetStream consumers to fetch historical audit events
    return [];
  }

  private updateMetrics(isValid: boolean, latency: number, fallbackUsed: boolean): void {
    this.metrics.totalMessages++;
    
    if (isValid) {
      this.metrics.validMessages++;
    } else {
      this.metrics.invalidMessages++;
    }
    
    if (fallbackUsed) {
      this.metrics.circuitBreakerTrips++;
    }
    
    // Update average latency (simple moving average)
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (this.metrics.totalMessages - 1) + latency) / this.metrics.totalMessages;
    
    this.metrics.lastUpdated = new Date().toISOString();
  }

  private generatePrometheusMetrics(): string {
    const metrics = [
      `# HELP uep_validation_messages_total Total number of UEP messages processed`,
      `# TYPE uep_validation_messages_total counter`,
      `uep_validation_messages_total ${this.metrics.totalMessages}`,
      ``,
      `# HELP uep_validation_messages_valid Valid UEP messages`,
      `# TYPE uep_validation_messages_valid counter`,
      `uep_validation_messages_valid ${this.metrics.validMessages}`,
      ``,
      `# HELP uep_validation_messages_invalid Invalid UEP messages`,
      `# TYPE uep_validation_messages_invalid counter`,
      `uep_validation_messages_invalid ${this.metrics.invalidMessages}`,
      ``,
      `# HELP uep_validation_latency_avg Average validation latency in milliseconds`,
      `# TYPE uep_validation_latency_avg gauge`,
      `uep_validation_latency_avg ${this.metrics.averageLatency}`,
      ``,
      `# HELP uep_circuit_breaker_trips Circuit breaker activation count`,
      `# TYPE uep_circuit_breaker_trips counter`,
      `uep_circuit_breaker_trips ${this.metrics.circuitBreakerTrips}`,
      ``,
      `# HELP uep_version_transformations Version transformation count`,
      `# TYPE uep_version_transformations counter`,
      `uep_version_transformations ${this.metrics.versionTransformations}`
    ];
    
    return metrics.join('\n');
  }

  private async startHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`✅ UEP validation HTTP server listening on port ${this.config.port}`);
          resolve();
        }
      });
    });
  }

  async stop(): Promise<void> {
    console.log('Shutting down UEP Event Bus Validation Service...');
    
    this.isRunning = false;
    
    // Close NATS connection
    if (this.natsConnection) {
      await this.natsConnection.close();
      console.log('✅ NATS connection closed');
    }
    
    // Close HTTP server
    if (this.server) {
      this.server.close();
      console.log('✅ HTTP server closed');
    }
    
    console.log('🛑 UEP Event Bus Validation Service stopped');
  }
}

// Main service initialization
async function main() {
  const config: UEPEventBusConfig = {
    natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
    jetStreamDomain: process.env.JETSTREAM_DOMAIN || 'uep-meta-agent-factory',
    validationEnabled: process.env.UEP_VALIDATION_ENABLED === 'true',
    circuitBreakerEnabled: process.env.UEP_CIRCUIT_BREAKER_ENABLED === 'true',
    auditEnabled: process.env.UEP_AUDIT_ENABLED === 'true',
    metricsEnabled: process.env.UEP_METRICS_ENABLED !== 'false',
    port: parseInt(process.env.PORT || '3000')
  };

  const service = new UEPEventBusValidationService(config);
  
  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    await service.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  try {
    await service.start();
  } catch (error) {
    console.error('Failed to start UEP service:', error);
    process.exit(1);
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}