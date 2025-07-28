/**
 * UEP Monitoring and Resilience Framework
 * 
 * Implements comprehensive monitoring, debugging, and resilience patterns
 * for UEP communication in the Meta-Agent Factory system.
 * 
 * Key Features:
 * - Distributed tracing with OpenTelemetry
 * - Circuit breaker patterns for failing services
 * - Retry mechanisms with exponential backoff
 * - Dead letter queues for failed messages
 * - Real-time metrics collection
 * - Performance monitoring and alerting
 */

import { EventEmitter } from 'events';
import { UEPAgentCommunicator, UEPRequest, UEPResponse, UEPEvent } from './UEPAgentCommunication.js';
import { VersionAwareCircuitBreaker } from '../resilience/VersionAwareCircuitBreaker.js';

export interface UEPMonitoringConfig {
  enableTracing: boolean;
  enableMetrics: boolean;
  enableCircuitBreaker: boolean;
  enableDeadLetterQueue: boolean;
  metricsInterval: number;
  tracingServiceName: string;
  circuitBreakerConfig: CircuitBreakerConfig;
  retryConfig: RetryConfig;
  deadLetterConfig: DeadLetterConfig;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTime: number;
  timeout: number;
  monitoringPeriod: number;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface DeadLetterConfig {
  maxRetries: number;
  queueName: string;
  enablePoisonMessageDetection: boolean;
  alertOnDeadLetter: boolean;
}

export interface UEPMetrics {
  // Request metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeoutRequests: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  
  // Event metrics
  totalEvents: number;
  publishedEvents: number;
  receivedEvents: number;
  droppedEvents: number;
  
  // Circuit breaker metrics
  circuitBreakerTrips: number;
  circuitBreakerRecoveries: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  
  // Retry metrics
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  
  // Queue metrics
  deadLetterMessages: number;
  queuedMessages: number;
  processedMessages: number;
  
  // System metrics
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  
  timestamp: Date;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}

export interface UEPAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
}

/**
 * UEP Monitoring and Resilience Manager
 */
export class UEPMonitoringManager extends EventEmitter {
  private config: UEPMonitoringConfig;
  private communicator: UEPAgentCommunicator;
  private circuitBreakers: Map<string, VersionAwareCircuitBreaker> = new Map();
  private metrics: UEPMetrics;
  private latencyHistory: number[] = [];
  private activeTraces: Map<string, TraceContext> = new Map();
  private alerts: Map<string, UEPAlert> = new Map();
  private metricsTimer: NodeJS.Timeout | null = null;

  constructor(config: UEPMonitoringConfig, communicator: UEPAgentCommunicator) {
    super();
    this.config = config;
    this.communicator = communicator;
    this.metrics = this.initializeMetrics();
    
    this.setupMonitoring();
    this.setupResiliencePatterns();
  }

  /**
   * Initialize monitoring system
   */
  async initialize(): Promise<void> {
    console.log('UEP Monitoring: Initializing monitoring and resilience...');

    // Start metrics collection
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }

    // Setup tracing if enabled
    if (this.config.enableTracing) {
      await this.initializeTracing();
    }

    // Setup dead letter queue handling
    if (this.config.enableDeadLetterQueue) {
      await this.setupDeadLetterQueue();
    }

    console.log('UEP Monitoring: Initialization complete');
  }

  /**
   * Monitor request with tracing and metrics
   */
  async monitorRequest<T>(
    operation: string,
    target: string,
    requestFn: () => Promise<T>,
    options?: {
      enableRetry?: boolean;
      enableCircuitBreaker?: boolean;
      traceContext?: TraceContext;
    }
  ): Promise<T> {
    const startTime = Date.now();
    const traceId = options?.traceContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();

    // Create trace context
    const traceContext: TraceContext = {
      traceId,
      spanId,
      parentSpanId: options?.traceContext?.spanId,
      baggage: options?.traceContext?.baggage || {}
    };

    this.activeTraces.set(spanId, traceContext);

    try {
      console.log(`UEP Monitoring: Starting ${operation} to ${target} [trace=${traceId}, span=${spanId}]`);

      let result: T;

      // Apply circuit breaker if enabled
      if (this.config.enableCircuitBreaker && options?.enableCircuitBreaker) {
        const circuitBreaker = this.getOrCreateCircuitBreaker(target);
        
        if (circuitBreaker.isOpen()) {
          throw new Error(`Circuit breaker open for ${target}`);
        }

        result = await circuitBreaker.execute(requestFn);
      } else if (options?.enableRetry) {
        result = await this.executeWithRetry(requestFn, target);
      } else {
        result = await requestFn();
      }

      // Record success metrics
      const latency = Date.now() - startTime;
      this.recordSuccessMetrics(operation, latency);
      
      console.log(`UEP Monitoring: ${operation} to ${target} completed [${latency}ms]`);
      return result;

    } catch (error) {
      // Record failure metrics
      const latency = Date.now() - startTime;
      this.recordFailureMetrics(operation, error, latency);

      // Generate alert for critical errors
      if (this.isCriticalError(error)) {
        await this.generateAlert({
          type: 'error',
          severity: 'high',
          component: target,
          message: `${operation} failed: ${error.message}`,
          details: { operation, target, latency, traceId, error: error.stack }
        });
      }

      console.error(`UEP Monitoring: ${operation} to ${target} failed [${latency}ms]:`, error.message);
      throw error;

    } finally {
      this.activeTraces.delete(spanId);
    }
  }

  /**
   * Monitor event publishing with metrics
   */
  async monitorEventPublish(
    eventType: string,
    publishFn: () => Promise<void>,
    traceContext?: TraceContext
  ): Promise<void> {
    const startTime = Date.now();

    try {
      await publishFn();
      
      this.metrics.totalEvents++;
      this.metrics.publishedEvents++;
      
      console.log(`UEP Monitoring: Event ${eventType} published successfully`);

    } catch (error) {
      this.metrics.droppedEvents++;
      
      await this.generateAlert({
        type: 'warning',
        severity: 'medium',
        component: 'event-publisher',
        message: `Failed to publish event: ${eventType}`,
        details: { eventType, error: error.message, traceContext }
      });

      throw error;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): UEPMetrics {
    return {
      ...this.metrics,
      timestamp: new Date()
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): UEPAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): Map<string, any> {
    const status = new Map();
    
    for (const [target, circuitBreaker] of this.circuitBreakers.entries()) {
      status.set(target, {
        state: circuitBreaker.getState(),
        failureCount: circuitBreaker.getFailureCount(),
        isOpen: circuitBreaker.isOpen(),
        lastFailure: circuitBreaker.getLastFailureTime()
      });
    }
    
    return status;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolution?: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.details.resolution = resolution;
      alert.details.resolvedAt = new Date();
      
      this.emit('alert-resolved', alert);
      console.log(`UEP Monitoring: Alert ${alertId} resolved: ${resolution || 'No resolution provided'}`);
    }
  }

  /**
   * Generate monitoring report
   */
  generateReport(): any {
    const circuitBreakerStatus = this.getCircuitBreakerStatus();
    const activeAlerts = this.getActiveAlerts();
    const metrics = this.getMetrics();

    return {
      timestamp: new Date(),
      summary: {
        status: activeAlerts.filter(a => a.severity === 'critical').length > 0 ? 'critical' : 
                activeAlerts.filter(a => a.severity === 'high').length > 0 ? 'degraded' : 'healthy',
        totalRequests: metrics.totalRequests,
        successRate: metrics.totalRequests > 0 ? 
          (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
        averageLatency: metrics.averageLatency,
        activeAlerts: activeAlerts.length
      },
      metrics,
      circuitBreakers: Object.fromEntries(circuitBreakerStatus),
      alerts: activeAlerts,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    target: string
  ): Promise<T> {
    let lastError: Error;
    let delay = this.config.retryConfig.initialDelay;

    for (let attempt = 1; attempt <= this.config.retryConfig.maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`UEP Monitoring: Retry attempt ${attempt}/${this.config.retryConfig.maxAttempts} for ${target} after ${delay}ms`);
          await this.sleep(delay);
        }

        const result = await requestFn();
        
        if (attempt > 1) {
          this.metrics.successfulRetries++;
          console.log(`UEP Monitoring: Retry successful for ${target} on attempt ${attempt}`);
        }
        
        return result;

      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === this.config.retryConfig.maxAttempts) {
          if (attempt > 1) {
            this.metrics.failedRetries++;
          }
          break;
        }

        this.metrics.totalRetries++;
        delay = Math.min(delay * this.config.retryConfig.backoffMultiplier, this.config.retryConfig.maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Get or create circuit breaker for target
   */
  private getOrCreateCircuitBreaker(target: string): VersionAwareCircuitBreaker {
    if (!this.circuitBreakers.has(target)) {
      const circuitBreaker = new VersionAwareCircuitBreaker({
        failureThreshold: this.config.circuitBreakerConfig.failureThreshold,
        recoveryTime: this.config.circuitBreakerConfig.recoveryTime,
        timeout: this.config.circuitBreakerConfig.timeout
      });

      // Setup circuit breaker event handlers
      circuitBreaker.on('open', () => {
        this.metrics.circuitBreakerTrips++;
        this.generateAlert({
          type: 'warning',
          severity: 'high',
          component: target,
          message: `Circuit breaker opened for ${target}`,
          details: { target, threshold: this.config.circuitBreakerConfig.failureThreshold }
        });
      });

      circuitBreaker.on('close', () => {
        this.metrics.circuitBreakerRecoveries++;
        console.log(`UEP Monitoring: Circuit breaker closed for ${target}`);
      });

      this.circuitBreakers.set(target, circuitBreaker);
    }

    return this.circuitBreakers.get(target)!;
  }

  /**
   * Setup monitoring infrastructure
   */
  private setupMonitoring(): void {
    // Monitor communicator events if available
    if (this.communicator && typeof this.communicator.on === 'function') {
      this.communicator.on('request-sent', (request: UEPRequest) => {
        this.metrics.totalRequests++;
      });

      this.communicator.on('response-received', (response: UEPResponse) => {
        if (response.status === 'success') {
          this.metrics.successfulRequests++;
        } else {
          this.metrics.failedRequests++;
        }
        
        this.latencyHistory.push(response.latency);
        this.updateLatencyMetrics();
      });

      this.communicator.on('event-published', (event: UEPEvent) => {
        this.metrics.totalEvents++;
        this.metrics.publishedEvents++;
      });
    }
  }

  /**
   * Setup resilience patterns
   */
  private setupResiliencePatterns(): void {
    // Setup global error handlers
    process.on('unhandledRejection', (reason, promise) => {
      this.generateAlert({
        type: 'error',
        severity: 'critical',
        component: 'system',
        message: 'Unhandled promise rejection',
        details: { reason, promise: promise.toString() }
      });
    });

    process.on('uncaughtException', (error) => {
      this.generateAlert({
        type: 'error',
        severity: 'critical',
        component: 'system',
        message: 'Uncaught exception',
        details: { error: error.stack }
      });
    });
  }

  /**
   * Initialize distributed tracing
   */
  private async initializeTracing(): Promise<void> {
    // Initialize OpenTelemetry tracing
    // This would integrate with actual OpenTelemetry SDK in production
    console.log(`UEP Monitoring: Tracing initialized for service: ${this.config.tracingServiceName}`);
  }

  /**
   * Setup dead letter queue handling
   */
  private async setupDeadLetterQueue(): Promise<void> {
    // Setup dead letter queue processing
    console.log(`UEP Monitoring: Dead letter queue setup: ${this.config.deadLetterConfig.queueName}`);
    
    // This would connect to actual message broker and setup DLQ processing
    // For now, we'll simulate with periodic cleanup
    setInterval(() => {
      this.processDeadLetterQueue();
    }, 60000); // Process every minute
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
      this.emit('metrics-collected', this.getMetrics());
    }, this.config.metricsInterval);
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    // Collect system performance metrics
    const usage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    this.metrics.cpuUsage = (usage.user + usage.system) / 1000 / 1000; // seconds
    this.metrics.activeConnections = this.activeTraces.size;
  }

  /**
   * Process dead letter queue
   */
  private processDeadLetterQueue(): void {
    // Process messages in dead letter queue
    // This would integrate with actual message broker DLQ
    if (this.metrics.deadLetterMessages > 0) {
      console.log(`UEP Monitoring: Processing ${this.metrics.deadLetterMessages} dead letter messages`);
    }
  }

  /**
   * Record success metrics
   */
  private recordSuccessMetrics(operation: string, latency: number): void {
    this.metrics.successfulRequests++;
    this.latencyHistory.push(latency);
    this.updateLatencyMetrics();
  }

  /**
   * Record failure metrics
   */
  private recordFailureMetrics(operation: string, error: Error, latency: number): void {
    this.metrics.failedRequests++;
    
    if (error.message.includes('timeout')) {
      this.metrics.timeoutRequests++;
    }
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(): void {
    if (this.latencyHistory.length === 0) return;

    // Keep only recent latency data
    if (this.latencyHistory.length > 1000) {
      this.latencyHistory = this.latencyHistory.slice(-1000);
    }

    const sorted = [...this.latencyHistory].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    this.metrics.averageLatency = sum / sorted.length;
    this.metrics.p95Latency = sorted[Math.floor(sorted.length * 0.95)];
    this.metrics.p99Latency = sorted[Math.floor(sorted.length * 0.99)];
  }

  /**
   * Generate alert
   */
  private async generateAlert(alertData: Omit<UEPAlert, 'id' | 'resolved' | 'timestamp'>): Promise<void> {
    const alert: UEPAlert = {
      id: this.generateAlertId(),
      ...alertData,
      resolved: false,
      timestamp: new Date()
    };

    this.alerts.set(alert.id, alert);
    this.emit('alert-generated', alert);

    console.warn(`UEP Monitoring: Alert generated [${alert.severity}]: ${alert.message}`);

    // Auto-resolve low severity alerts after some time
    if (alert.severity === 'low') {
      setTimeout(() => {
        this.resolveAlert(alert.id, 'Auto-resolved (low severity)');
      }, 300000); // 5 minutes
    }
  }

  /**
   * Generate recommendations based on current metrics
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.metrics;

    // Latency recommendations
    if (metrics.averageLatency > 1000) {
      recommendations.push('High average latency detected. Consider optimizing request processing or scaling services.');
    }

    // Error rate recommendations
    const errorRate = metrics.totalRequests > 0 ? (metrics.failedRequests / metrics.totalRequests) : 0;
    if (errorRate > 0.05) {
      recommendations.push('High error rate detected. Review service dependencies and error handling.');
    }

    // Circuit breaker recommendations
    if (metrics.circuitBreakerTrips > 5) {
      recommendations.push('Frequent circuit breaker trips. Consider reviewing service health and scaling strategies.');
    }

    // Dead letter queue recommendations
    if (metrics.deadLetterMessages > 10) {
      recommendations.push('High number of dead letter messages. Review message processing logic and error handling.');
    }

    return recommendations;
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(error: Error): boolean {
    const criticalErrorPatterns = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Circuit breaker open',
      'Authentication failed',
      'Authorization denied'
    ];

    return criticalErrorPatterns.some(pattern => 
      error.message.includes(pattern)
    );
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = this.config.retryConfig.retryableErrors;
    return retryableErrors.some(pattern => error.message.includes(pattern));
  }

  /**
   * Initialize metrics object
   */
  private initializeMetrics(): UEPMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeoutRequests: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      totalEvents: 0,
      publishedEvents: 0,
      receivedEvents: 0,
      droppedEvents: 0,
      circuitBreakerTrips: 0,
      circuitBreakerRecoveries: 0,
      circuitBreakerState: 'closed',
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      deadLetterMessages: 0,
      queuedMessages: 0,
      processedMessages: 0,
      activeConnections: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      timestamp: new Date()
    };
  }

  // Utility methods
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown monitoring
   */
  async shutdown(): Promise<void> {
    console.log('UEP Monitoring: Shutting down...');

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    // Close circuit breakers
    for (const circuitBreaker of this.circuitBreakers.values()) {
      if (typeof circuitBreaker.shutdown === 'function') {
        await circuitBreaker.shutdown();
      }
    }

    console.log('UEP Monitoring: Shutdown complete');
  }
}

/**
 * Factory function to create UEP Monitoring Manager
 */
export function createUEPMonitoring(
  config: UEPMonitoringConfig,
  communicator: UEPAgentCommunicator
): UEPMonitoringManager {
  return new UEPMonitoringManager(config, communicator);
}