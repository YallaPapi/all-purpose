/**
 * UEP Validation Coordinator
 * 
 * Central coordination system that integrates all UEP validation components,
 * providing unified caching, metrics collection, error handling, and validation
 * orchestration across API Gateway, service-to-service, and event validation layers.
 * Based on TaskMaster research findings and Context7 methodology.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

// Import validation components
import UEPValidationMiddleware, { UEPValidationResult, UEPProtocolMessage } from '../../containers/api-gateway/src/validation/UEPValidationMiddleware';
import UEPServiceValidationInterceptor from './UEPServiceValidationInterceptor';
import UEPEventValidationMiddleware from './UEPEventValidationMiddleware';
import UEPValidationErrorHandler, { UEPStandardizedError, UEPErrorContext } from './UEPValidationErrorHandler';
import UEPValidationCacheManager from './UEPValidationCacheManager';
import UEPValidationMetricsCollector from './UEPValidationMetricsCollector';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPValidationCoordinatorConfig {
  enableAPIGatewayValidation: boolean;
  enableServiceValidation: boolean;
  enableEventValidation: boolean;
  enableErrorHandling: boolean;
  enableDistributedCache: boolean;
  enableMetricsCollection: boolean;
  enableTracing: boolean;
  validationMode: 'strict' | 'permissive' | 'development';
  coordinatorId: string;
  healthCheckInterval: number;
  automaticFailover: boolean;
  circuitBreakerEnabled: boolean;
  rateLimiting: {
    enabled: boolean;
    maxRequestsPerSecond: number;
    burstCapacity: number;
  };
  monitoring: {
    enableHealthChecks: boolean;
    enablePerformanceTracking: boolean;
    enableComplianceReporting: boolean;
  };
}

export interface UEPValidationContext {
  requestId: string;
  correlationId?: string;
  source: 'api-gateway' | 'service-to-service' | 'event-validation' | 'manual';
  endpoint?: string;
  method?: string;
  agentType?: string;
  protocolVersion: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UEPValidationResponse {
  valid: boolean;
  result: UEPValidationResult;
  standardizedError?: UEPStandardizedError;
  context: UEPValidationContext;
  performance: {
    validationTime: number;
    cacheHit: boolean;
    componentLatencies: Record<string, number>;
  };
  compliance: {
    protocolCompliant: boolean;
    schemaVersion: string;
    warnings: string[];
  };
}

export interface UEPCoordinatorHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  components: {
    apiGateway: 'healthy' | 'degraded' | 'critical' | 'disabled';
    serviceValidation: 'healthy' | 'degraded' | 'critical' | 'disabled';
    eventValidation: 'healthy' | 'degraded' | 'critical' | 'disabled';
    errorHandling: 'healthy' | 'degraded' | 'critical' | 'disabled';
    cacheManager: 'healthy' | 'degraded' | 'critical' | 'disabled';
    metricsCollector: 'healthy' | 'degraded' | 'critical' | 'disabled';
  };
  metrics: {
    totalValidations: number;
    successRate: number;
    averageLatency: number;
    cacheHitRate: number;
    activeAlerts: number;
  };
  uptime: number;
  lastHealthCheck: Date;
}

// =============================================================================
// UEP Validation Coordinator Core Class
// =============================================================================

export class UEPValidationCoordinator extends EventEmitter {
  private readonly config: UEPValidationCoordinatorConfig;
  private readonly logger = new Logger('UEPValidationCoordinator');
  private readonly tracer = trace.getTracer('uep-validation-coordinator', '1.0.0');
  
  // Validation components
  private readonly apiGatewayValidator?: UEPValidationMiddleware;
  private readonly serviceValidator?: UEPServiceValidationInterceptor;
  private readonly eventValidator?: UEPEventValidationMiddleware;
  private readonly errorHandler?: UEPValidationErrorHandler;
  
  // Shared infrastructure
  private readonly cacheManager?: UEPValidationCacheManager;
  private readonly metricsCollector?: UEPValidationMetricsCollector;
  
  // Coordinator state
  private readonly startTime: Date = new Date();
  private healthCheckTimer?: NodeJS.Timeout;
  private isShuttingDown: boolean = false;
  private currentHealth: UEPCoordinatorHealth;
  private validationCounter: number = 0;

  constructor(config: Partial<UEPValidationCoordinatorConfig> = {}) {
    super();
    
    this.config = {
      enableAPIGatewayValidation: true,
      enableServiceValidation: true,
      enableEventValidation: true,
      enableErrorHandling: true,
      enableDistributedCache: true,
      enableMetricsCollection: true,
      enableTracing: true,
      validationMode: 'strict',
      coordinatorId: `uep-coordinator-${Date.now()}`,
      healthCheckInterval: 30000, // 30 seconds
      automaticFailover: true,
      circuitBreakerEnabled: true,
      rateLimiting: {
        enabled: true,
        maxRequestsPerSecond: 1000,
        burstCapacity: 1500
      },
      monitoring: {
        enableHealthChecks: true,
        enablePerformanceTracking: true,
        enableComplianceReporting: true
      },
      ...config
    };

    // Initialize shared infrastructure first
    if (this.config.enableDistributedCache) {
      this.cacheManager = new UEPValidationCacheManager({
        enableDistributedCache: true,
        enableLocalCache: true,
        enableMetrics: this.config.enableMetricsCollection
      });
    }

    if (this.config.enableMetricsCollection) {
      this.metricsCollector = new UEPValidationMetricsCollector({
        enableDetailedMetrics: true,
        enablePerformanceMetrics: true,
        enableBusinessMetrics: true,
        enableAlerts: true
      });
    }

    // Initialize validation components
    this.initializeValidationComponents();

    // Initialize health tracking
    this.currentHealth = this.initializeHealthStatus();

    // Setup health checks
    if (this.config.monitoring.enableHealthChecks) {
      this.setupHealthChecks();
    }

    // Setup error handling
    this.setupErrorHandling();

    this.logger.info('UEP Validation Coordinator initialized', {
      coordinatorId: this.config.coordinatorId,
      validationMode: this.config.validationMode,
      enabledComponents: this.getEnabledComponents()
    });
  }

  // =============================================================================
  // Component Initialization
  // =============================================================================

  private initializeValidationComponents(): void {
    try {
      // API Gateway Validator
      if (this.config.enableAPIGatewayValidation) {
        this.apiGatewayValidator = new UEPValidationMiddleware({
          strictMode: this.config.validationMode === 'strict',
          enableCaching: this.config.enableDistributedCache,
          enableMetrics: this.config.enableMetricsCollection,
          enableTracing: this.config.enableTracing
        });
      }

      // Service Validation Interceptor
      if (this.config.enableServiceValidation) {
        this.serviceValidator = new UEPServiceValidationInterceptor({
          enableHTTPValidation: true,
          enableGRPCValidation: true,
          strictMode: this.config.validationMode === 'strict',
          enableCircuitBreaker: this.config.circuitBreakerEnabled,
          enableDistributedCache: this.config.enableDistributedCache,
          enableMetrics: this.config.enableMetricsCollection
        });
      }

      // Event Validation Middleware
      if (this.config.enableEventValidation) {
        this.eventValidator = new UEPEventValidationMiddleware({
          enableValidation: true,
          enableDeadLetterQueue: true,
          enableRetryLogic: true,
          strictMode: this.config.validationMode === 'strict',
          enableCaching: this.config.enableDistributedCache,
          enableMetrics: this.config.enableMetricsCollection
        });
      }

      // Error Handler
      if (this.config.enableErrorHandling) {
        this.errorHandler = new UEPValidationErrorHandler({
          enableDetailedErrors: true,
          enableSuggestions: true,
          enableMetrics: this.config.enableMetricsCollection,
          enableTracing: this.config.enableTracing,
          strictMode: this.config.validationMode === 'strict'
        });
      }

    } catch (error) {
      this.logger.error('Failed to initialize validation components', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  // =============================================================================
  // Core Validation Methods
  // =============================================================================

  public async validateMessage(
    message: UEPProtocolMessage,
    context: Partial<UEPValidationContext>
  ): Promise<UEPValidationResponse> {
    return this.tracer.startActiveSpan('uep.coordinator.validate_message', async (span) => {
      const startTime = Date.now();
      const requestId = context.requestId || this.generateRequestId();
      
      try {
        span.setAttributes({
          'uep.coordinator.id': this.config.coordinatorId,
          'uep.request.id': requestId,
          'uep.message.type': message.messageType,
          'uep.validation.source': context.source || 'manual'
        });

        // Increment validation counter
        this.validationCounter++;

        // Create full validation context
        const validationContext: UEPValidationContext = {
          requestId,
          correlationId: context.correlationId || message.correlationId,
          source: context.source || 'manual',
          endpoint: context.endpoint,
          method: context.method,
          agentType: message.source?.agentType,
          protocolVersion: message.version,
          timestamp: new Date().toISOString(),
          metadata: context.metadata
        };

        // Check cache first
        let result: UEPValidationResult | null = null;
        let cacheHit = false;
        const componentLatencies: Record<string, number> = {};

        if (this.cacheManager) {
          const cacheStart = Date.now();
          const cacheKey = this.generateCacheKey(message, validationContext);
          result = await this.cacheManager.get(cacheKey, validationContext.source);
          componentLatencies.cache = Date.now() - cacheStart;
          
          if (result) {
            cacheHit = true;
            span.setAttributes({ 'uep.validation.cache_hit': true });
          }
        }

        // Perform validation if not cached
        if (!result) {
          result = await this.performValidation(message, validationContext, componentLatencies);
          
          // Cache the result
          if (this.cacheManager && result) {
            const cacheKey = this.generateCacheKey(message, validationContext);
            await this.cacheManager.set(cacheKey, result, validationContext.source);
          }
        }

        // Handle validation errors
        let standardizedError: UEPStandardizedError | undefined;
        if (!result.valid && this.errorHandler) {
          const errorContext: UEPErrorContext = {
            requestId,
            correlationId: validationContext.correlationId,
            endpoint: validationContext.endpoint || 'unknown',
            method: validationContext.method || 'POST',
            timestamp: validationContext.timestamp,
            validationContext: validationContext.source,
            agentType: validationContext.agentType,
            protocolVersion: validationContext.protocolVersion
          };

          standardizedError = await this.errorHandler.handleValidationError(
            result,
            errorContext
          );
        }

        // Record metrics
        if (this.metricsCollector) {
          this.metricsCollector.recordValidation(
            validationContext.source,
            result,
            message,
            Date.now() - startTime
          );
        }

        const totalTime = Date.now() - startTime;
        const response: UEPValidationResponse = {
          valid: result.valid,
          result,
          standardizedError,
          context: validationContext,
          performance: {
            validationTime: totalTime,
            cacheHit,
            componentLatencies
          },
          compliance: {
            protocolCompliant: result.valid,
            schemaVersion: result.schemaVersion,
            warnings: result.warnings.map(w => w.message)
          }
        };

        span.setAttributes({
          'uep.validation.result': result.valid,
          'uep.validation.duration_ms': totalTime,
          'uep.validation.error_count': result.errors.length,
          'uep.validation.warning_count': result.warnings.length
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return response;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        this.logger.error('Validation coordination failed', {
          requestId,
          error: (error as Error).message,
          messageType: message.messageType
        });

        // Return error response
        return this.createErrorResponse(error as Error, context, startTime);
      }
    });
  }

  private async performValidation(
    message: UEPProtocolMessage,
    context: UEPValidationContext,
    componentLatencies: Record<string, number>
  ): Promise<UEPValidationResult> {
    // Select appropriate validator based on source
    let validator: any;
    let validationMethod: string;

    switch (context.source) {
      case 'api-gateway':
        validator = this.apiGatewayValidator;
        validationMethod = 'validateUEPMessage';
        break;
      case 'service-to-service':
        validator = this.serviceValidator;
        validationMethod = 'validateUEPMessage';
        break;
      case 'event-validation':
        validator = this.eventValidator;
        validationMethod = 'validateEvent';
        break;
      default:
        validator = this.apiGatewayValidator;
        validationMethod = 'validateUEPMessage';
    }

    if (!validator) {
      throw new Error(`No validator available for source: ${context.source}`);
    }

    // Perform validation with latency tracking
    const validationStart = Date.now();
    let result: UEPValidationResult;

    if (validationMethod === 'validateEvent' && this.eventValidator) {
      // Special handling for event validation
      result = await this.eventValidator['validateEvent'](
        context.endpoint || 'unknown',
        message,
        context.requestId
      );
    } else {
      result = validator[validationMethod](message, context.endpoint);
    }

    componentLatencies[context.source] = Date.now() - validationStart;
    return result;
  }

  // =============================================================================
  // Health Management
  // =============================================================================

  private initializeHealthStatus(): UEPCoordinatorHealth {
    return {
      overall: 'healthy',
      components: {
        apiGateway: this.config.enableAPIGatewayValidation ? 'healthy' : 'disabled',
        serviceValidation: this.config.enableServiceValidation ? 'healthy' : 'disabled',
        eventValidation: this.config.enableEventValidation ? 'healthy' : 'disabled',
        errorHandling: this.config.enableErrorHandling ? 'healthy' : 'disabled',
        cacheManager: this.config.enableDistributedCache ? 'healthy' : 'disabled',
        metricsCollector: this.config.enableMetricsCollection ? 'healthy' : 'disabled'
      },
      metrics: {
        totalValidations: 0,
        successRate: 1.0,
        averageLatency: 0,
        cacheHitRate: 0,
        activeAlerts: 0
      },
      uptime: 0,
      lastHealthCheck: new Date()
    };
  }

  private setupHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const healthStart = Date.now();
      
      // Check component health
      this.currentHealth.components.apiGateway = await this.checkComponentHealth('apiGateway');
      this.currentHealth.components.serviceValidation = await this.checkComponentHealth('serviceValidation');
      this.currentHealth.components.eventValidation = await this.checkComponentHealth('eventValidation');
      this.currentHealth.components.errorHandling = await this.checkComponentHealth('errorHandling');
      this.currentHealth.components.cacheManager = await this.checkComponentHealth('cacheManager');
      this.currentHealth.components.metricsCollector = await this.checkComponentHealth('metricsCollector');

      // Update metrics
      if (this.metricsCollector) {
        const summary = this.metricsCollector.getMetricsSummary();
        this.currentHealth.metrics = {
          totalValidations: summary.totalValidations,
          successRate: summary.totalValidations > 0 ? summary.successfulValidations / summary.totalValidations : 1.0,
          averageLatency: summary.averageLatency,
          cacheHitRate: summary.cacheHitRate,
          activeAlerts: summary.alertsTriggered.filter(alert => !alert.resolved).length
        };
      }

      // Calculate overall health
      this.currentHealth.overall = this.calculateOverallHealth();
      this.currentHealth.uptime = Date.now() - this.startTime.getTime();
      this.currentHealth.lastHealthCheck = new Date();

      // Record health metrics
      if (this.metricsCollector) {
        this.metricsCollector.recordSystemHealth('coordinator', this.getHealthScore());
      }

      this.emit('healthCheckCompleted', {
        health: this.currentHealth,
        duration: Date.now() - healthStart
      });

    } catch (error) {
      this.logger.error('Health check failed', { error: (error as Error).message });
      this.currentHealth.overall = 'critical';
    }
  }

  private async checkComponentHealth(component: string): Promise<'healthy' | 'degraded' | 'critical' | 'disabled'> {
    try {
      switch (component) {
        case 'apiGateway':
          return this.apiGatewayValidator ? 'healthy' : 'disabled';
        case 'serviceValidation':
          return this.serviceValidator ? 'healthy' : 'disabled';
        case 'eventValidation':
          return this.eventValidator ? 'healthy' : 'disabled';
        case 'errorHandling':
          return this.errorHandler ? 'healthy' : 'disabled';
        case 'cacheManager':
          if (!this.cacheManager) return 'disabled';
          // Add cache health check logic
          return 'healthy';
        case 'metricsCollector':
          return this.metricsCollector ? 'healthy' : 'disabled';
        default:
          return 'disabled';
      }
    } catch (error) {
      return 'critical';
    }
  }

  private calculateOverallHealth(): 'healthy' | 'degraded' | 'critical' {
    const healthStatuses = Object.values(this.currentHealth.components);
    const healthyCount = healthStatuses.filter(status => status === 'healthy').length;
    const totalEnabled = healthStatuses.filter(status => status !== 'disabled').length;

    if (totalEnabled === 0) return 'critical';
    
    const healthRatio = healthyCount / totalEnabled;
    
    if (healthRatio >= 0.8) return 'healthy';
    if (healthRatio >= 0.5) return 'degraded';
    return 'critical';
  }

  private getHealthScore(): number {
    const healthStatuses = Object.values(this.currentHealth.components);
    const scores = healthStatuses.map(status => {
      switch (status) {
        case 'healthy': return 1.0;
        case 'degraded': return 0.5;
        case 'critical': return 0.0;
        case 'disabled': return 1.0; // Don't penalize disabled components
        default: return 0.0;
      }
    });

    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(message: UEPProtocolMessage, context: UEPValidationContext): string {
    const keyData = {
      messageType: message.messageType,
      version: message.version,
      source: context.source,
      agentType: message.source?.agentType
    };
    
    return JSON.stringify(keyData);
  }

  private createErrorResponse(
    error: Error,
    context: Partial<UEPValidationContext>,
    startTime: number
  ): UEPValidationResponse {
    const errorResult: UEPValidationResult = {
      valid: false,
      errors: [{
        code: 'COORDINATOR_ERROR',
        message: error.message,
        severity: 'error'
      }],
      warnings: [],
      validationTime: Date.now() - startTime,
      schemaVersion: '2.0.0',
      cacheHit: false
    };

    return {
      valid: false,
      result: errorResult,
      context: {
        requestId: context.requestId || this.generateRequestId(),
        source: context.source || 'manual',
        protocolVersion: '2.0.0',
        timestamp: new Date().toISOString(),
        ...context
      } as UEPValidationContext,
      performance: {
        validationTime: Date.now() - startTime,
        cacheHit: false,
        componentLatencies: {}
      },
      compliance: {
        protocolCompliant: false,
        schemaVersion: '2.0.0',
        warnings: [error.message]
      }
    };
  }

  private getEnabledComponents(): string[] {
    const enabled: string[] = [];
    if (this.config.enableAPIGatewayValidation) enabled.push('apiGateway');
    if (this.config.enableServiceValidation) enabled.push('serviceValidation');
    if (this.config.enableEventValidation) enabled.push('eventValidation');
    if (this.config.enableErrorHandling) enabled.push('errorHandling');
    if (this.config.enableDistributedCache) enabled.push('cacheManager');
    if (this.config.enableMetricsCollection) enabled.push('metricsCollector');
    return enabled;
  }

  private setupErrorHandling(): void {
    this.on('error', (error) => {
      this.logger.error('Coordinator error', { error: error.message });
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception in coordinator', { error: error.message });
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled rejection in coordinator', { reason });
    });
  }

  // =============================================================================
  // Public API
  // =============================================================================

  public getHealth(): UEPCoordinatorHealth {
    return { ...this.currentHealth };
  }

  public async getMetrics(): Promise<Record<string, any>> {
    if (!this.metricsCollector) {
      return { error: 'Metrics collection disabled' };
    }

    return this.metricsCollector.getMetricsForDashboard();
  }

  public async getCacheStats(): Promise<Record<string, any>> {
    if (!this.cacheManager) {
      return { error: 'Cache management disabled' };
    }

    return this.cacheManager.getCacheStats();
  }

  public getValidationStats(): Record<string, any> {
    return {
      coordinatorId: this.config.coordinatorId,
      uptime: Date.now() - this.startTime.getTime(),
      totalValidations: this.validationCounter,
      configuration: {
        validationMode: this.config.validationMode,
        enabledComponents: this.getEnabledComponents(),
        rateLimiting: this.config.rateLimiting
      },
      health: this.currentHealth
    };
  }

  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    this.logger.info('Shutting down UEP Validation Coordinator');

    // Clear health check timer
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Shutdown components
    if (this.cacheManager) {
      await this.cacheManager.shutdown();
    }

    if (this.metricsCollector) {
      await this.metricsCollector.shutdown();
    }

    if (this.eventValidator) {
      await this.eventValidator.shutdown();
    }

    if (this.serviceValidator) {
      await this.serviceValidator.shutdown();
    }

    this.removeAllListeners();
    this.emit('shutdown', { 
      coordinatorId: this.config.coordinatorId,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime()
    });
  }
}

export default UEPValidationCoordinator;