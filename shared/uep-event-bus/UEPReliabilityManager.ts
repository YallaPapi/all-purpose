/**
 * UEP Reliability Manager
 * 
 * This module implements comprehensive reliability patterns for the UEP Event Bus,
 * including circuit breakers, retry mechanisms, bulkhead isolation, and failure recovery.
 * 
 * Features:
 * - Circuit breaker pattern with configurable thresholds
 * - Exponential backoff retry mechanisms
 * - Bulkhead isolation for resource protection
 * - Timeout management and deadline enforcement
 * - Health-based load balancing and failover
 * - Graceful degradation strategies
 */

import { EventEmitter } from 'events';
import { UEPMessage } from './UEPMessageBroker';
import { UEPEvent } from './UEPEventSchemaRegistry';

/**
 * Reliability Configuration
 */
export interface ReliabilityConfig {
  // Circuit breaker settings
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
    halfOpenMaxRequests: number;
    rollingWindowSize: number;
    minimumRequestThreshold: number;
  };

  // Retry settings
  retry: {
    enabled: boolean;
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitterEnabled: boolean;
    retryableErrors: string[];
  };

  // Timeout settings
  timeout: {
    enabled: boolean;
    defaultTimeout: number;
    operationTimeouts: Record<string, number>;
    deadlineEnforcement: boolean;
  };

  // Bulkhead settings
  bulkhead: {
    enabled: boolean;
    maxConcurrentRequests: number;
    queueSize: number;
    rejectionPolicy: 'fail-fast' | 'queue-and-wait' | 'best-effort';
  };

  // Health monitoring
  health: {
    enabled: boolean;
    checkInterval: number;
    unhealthyThreshold: number;
    recoveryThreshold: number;
    degradedThreshold: number;
  };

  // Failure handling
  failureHandling: {
    enableDeadLetterQueue: boolean;
    maxRetries: number;
    failureEscalationEnabled: boolean;
    gracefulDegradation: boolean;
  };
}

/**
 * Circuit Breaker States
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Circuit Breaker Status
 */
export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
  totalRequests: number;
  failureRate: number;
}

/**
 * Retry Context
 */
export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  delay: number;
  error: Error;
  startTime: Date;
  operation: string;
  metadata?: Record<string, any>;
}

/**
 * Bulkhead Status
 */
export interface BulkheadStatus {
  activeRequests: number;
  maxConcurrentRequests: number;
  queuedRequests: number;
  maxQueueSize: number;
  rejectedRequests: number;
  utilizationRate: number;
}

/**
 * Health Status
 */
export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  checks: HealthCheck[];
  lastUpdate: Date;
}

/**
 * Health Check
 */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Reliability Statistics
 */
export interface ReliabilityStats {
  circuitBreaker: {
    totalOperations: number;
    failedOperations: number;
    successfulOperations: number;
    circuitOpenEvents: number;
    circuitCloseEvents: number;
  };
  retry: {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    averageRetryDelay: number;
  };
  bulkhead: {
    totalRequests: number;
    rejectedRequests: number;
    queuedRequests: number;
    averageQueueTime: number;
  };
  timeout: {
    totalTimeouts: number;
    averageExecutionTime: number;
  };
}

/**
 * Operation Context
 */
export interface OperationContext {
  id: string;
  name: string;
  startTime: Date;
  timeout?: number;
  metadata?: Record<string, any>;
  retryContext?: RetryContext;
}

/**
 * UEP Reliability Manager Implementation
 */
export class UEPReliabilityManager extends EventEmitter {
  private config: ReliabilityConfig;
  private circuitBreakers: Map<string, CircuitBreakerStatus> = new Map();
  private bulkheadSemaphores: Map<string, BulkheadStatus> = new Map();
  private healthStatus: Map<string, ServiceHealthStatus> = new Map();
  private activeOperations: Map<string, OperationContext> = new Map();
  private stats: ReliabilityStats = {
    circuitBreaker: {
      totalOperations: 0,
      failedOperations: 0,
      successfulOperations: 0,
      circuitOpenEvents: 0,
      circuitCloseEvents: 0,
    },
    retry: {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryDelay: 0,
    },
    bulkhead: {
      totalRequests: 0,
      rejectedRequests: 0,
      queuedRequests: 0,
      averageQueueTime: 0,
    },
    timeout: {
      totalTimeouts: 0,
      averageExecutionTime: 0,
    },
  };

  // Monitoring intervals
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: ReliabilityConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the reliability manager
   */
  async initialize(): Promise<void> {
    try {
      this.emit('reliability:initializing');

      // Setup health monitoring
      if (this.config.health.enabled) {
        this.startHealthMonitoring();
      }

      // Setup cleanup tasks
      this.startCleanupTasks();

      this.emit('reliability:initialized');
    } catch (error) {
      this.emit('reliability:error', error);
      throw new Error(`Failed to initialize Reliability Manager: ${error.message}`);
    }
  }

  /**
   * Execute operation with reliability patterns
   */
  async executeWithReliability<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Partial<OperationContext>
  ): Promise<T> {
    const opContext: OperationContext = {
      id: this.generateOperationId(),
      name: operationName,
      startTime: new Date(),
      timeout: context?.timeout || this.config.timeout.operationTimeouts[operationName] || this.config.timeout.defaultTimeout,
      metadata: context?.metadata,
    };

    this.activeOperations.set(opContext.id, opContext);

    try {
      // Check circuit breaker
      await this.checkCircuitBreaker(operationName);

      // Apply bulkhead isolation
      await this.acquireBulkhead(operationName);

      // Execute with timeout and retry
      const result = await this.executeWithTimeoutAndRetry(operation, opContext);

      // Record success
      this.recordSuccess(operationName);

      return result;

    } catch (error) {
      // Record failure
      this.recordFailure(operationName, error);
      throw error;

    } finally {
      // Release bulkhead
      this.releaseBulkhead(operationName);

      // Cleanup operation context
      this.activeOperations.delete(opContext.id);
    }
  }

  /**
   * Execute message operation with reliability
   */
  async executeMessageOperation<T>(
    message: UEPMessage<any>,
    operation: (message: UEPMessage<any>) => Promise<T>,
    operationType: string
  ): Promise<T> {
    const operationName = `message.${operationType}`;
    
    return this.executeWithReliability(
      operationName,
      () => operation(message),
      {
        metadata: {
          messageId: message.id,
          messageType: message.routing.messageType,
          agentId: message.agent.id,
        },
      }
    );
  }

  /**
   * Execute event operation with reliability
   */
  async executeEventOperation<T>(
    event: UEPEvent,
    operation: (event: UEPEvent) => Promise<T>,
    operationType: string
  ): Promise<T> {
    const operationName = `event.${operationType}`;
    
    return this.executeWithReliability(
      operationName,
      () => operation(event),
      {
        metadata: {
          eventId: event.eventId,
          eventType: event.eventType,
          category: event.metadata.category,
        },
      }
    );
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(operationName: string): CircuitBreakerStatus | null {
    return this.circuitBreakers.get(operationName) || null;
  }

  /**
   * Get bulkhead status
   */
  getBulkheadStatus(operationName: string): BulkheadStatus | null {
    return this.bulkheadSemaphores.get(operationName) || null;
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName: string): ServiceHealthStatus | null {
    return this.healthStatus.get(serviceName) || null;
  }

  /**
   * Force circuit breaker state
   */
  forceCircuitBreakerState(operationName: string, state: CircuitBreakerState): void {
    const circuitBreaker = this.getOrCreateCircuitBreaker(operationName);
    circuitBreaker.state = state;
    
    if (state === 'open') {
      circuitBreaker.nextRetryTime = new Date(Date.now() + this.config.circuitBreaker.recoveryTimeout);
      this.stats.circuitBreaker.circuitOpenEvents++;
    } else if (state === 'closed') {
      circuitBreaker.failureCount = 0;
      circuitBreaker.nextRetryTime = undefined;
      this.stats.circuitBreaker.circuitCloseEvents++;
    }

    this.emit('circuit-breaker:state-changed', {
      operationName,
      state,
      forced: true,
    });
  }

  /**
   * Add health check
   */
  addHealthCheck(serviceName: string, check: HealthCheck): void {
    let serviceHealth = this.healthStatus.get(serviceName);
    
    if (!serviceHealth) {
      serviceHealth = {
        status: 'healthy',
        score: 100,
        checks: [],
        lastUpdate: new Date(),
      };
      this.healthStatus.set(serviceName, serviceHealth);
    }

    // Update or add check
    const existingIndex = serviceHealth.checks.findIndex(c => c.name === check.name);
    if (existingIndex >= 0) {
      serviceHealth.checks[existingIndex] = check;
    } else {
      serviceHealth.checks.push(check);
    }

    // Recalculate health status
    this.updateServiceHealthStatus(serviceName);
  }

  /**
   * Get reliability statistics
   */
  getStats(): ReliabilityStats {
    return JSON.parse(JSON.stringify(this.stats));
  }

  /**
   * Reset reliability statistics
   */
  resetStats(): void {
    this.stats = {
      circuitBreaker: {
        totalOperations: 0,
        failedOperations: 0,
        successfulOperations: 0,
        circuitOpenEvents: 0,
        circuitCloseEvents: 0,
      },
      retry: {
        totalRetries: 0,
        successfulRetries: 0,
        failedRetries: 0,
        averageRetryDelay: 0,
      },
      bulkhead: {
        totalRequests: 0,
        rejectedRequests: 0,
        queuedRequests: 0,
        averageQueueTime: 0,
      },
      timeout: {
        totalTimeouts: 0,
        averageExecutionTime: 0,
      },
    };

    this.emit('stats:reset');
  }

  /**
   * Shutdown reliability manager
   */
  async shutdown(): Promise<void> {
    try {
      this.emit('reliability:shutting-down');

      // Clear intervals
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Wait for active operations to complete (with timeout)
      await this.waitForActiveOperations(30000); // 30 second timeout

      this.emit('reliability:shutdown');
    } catch (error) {
      this.emit('reliability:error', { operation: 'shutdown', error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async checkCircuitBreaker(operationName: string): Promise<void> {
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    const circuitBreaker = this.getOrCreateCircuitBreaker(operationName);

    switch (circuitBreaker.state) {
      case 'open':
        if (circuitBreaker.nextRetryTime && new Date() < circuitBreaker.nextRetryTime) {
          throw new Error(`Circuit breaker is open for operation: ${operationName}`);
        } else {
          // Transition to half-open
          circuitBreaker.state = 'half-open';
          this.emit('circuit-breaker:half-open', { operationName });
        }
        break;

      case 'half-open':
        if (circuitBreaker.successCount >= this.config.circuitBreaker.halfOpenMaxRequests) {
          throw new Error(`Circuit breaker half-open limit exceeded for operation: ${operationName}`);
        }
        break;

      case 'closed':
        // Check if we should open the circuit
        if (this.shouldOpenCircuit(circuitBreaker)) {
          circuitBreaker.state = 'open';
          circuitBreaker.nextRetryTime = new Date(Date.now() + this.config.circuitBreaker.recoveryTimeout);
          this.stats.circuitBreaker.circuitOpenEvents++;
          
          this.emit('circuit-breaker:opened', { operationName, failureRate: circuitBreaker.failureRate });
          throw new Error(`Circuit breaker opened for operation: ${operationName}`);
        }
        break;
    }
  }

  private async acquireBulkhead(operationName: string): Promise<void> {
    if (!this.config.bulkhead.enabled) {
      return;
    }

    const bulkhead = this.getOrCreateBulkhead(operationName);
    
    if (bulkhead.activeRequests >= bulkhead.maxConcurrentRequests) {
      this.stats.bulkhead.rejectedRequests++;
      
      switch (this.config.bulkhead.rejectionPolicy) {
        case 'fail-fast':
          throw new Error(`Bulkhead capacity exceeded for operation: ${operationName}`);
        
        case 'queue-and-wait':
          if (bulkhead.queuedRequests >= bulkhead.maxQueueSize) {
            throw new Error(`Bulkhead queue full for operation: ${operationName}`);
          }
          // In a real implementation, we would queue the request
          break;
        
        case 'best-effort':
          // Allow the request but log a warning
          this.emit('bulkhead:overloaded', { operationName, activeRequests: bulkhead.activeRequests });
          break;
      }
    }

    bulkhead.activeRequests++;
    this.stats.bulkhead.totalRequests++;
  }

  private releaseBulkhead(operationName: string): void {
    if (!this.config.bulkhead.enabled) {
      return;
    }

    const bulkhead = this.bulkheadSemaphores.get(operationName);
    if (bulkhead && bulkhead.activeRequests > 0) {
      bulkhead.activeRequests--;
      bulkhead.utilizationRate = bulkhead.activeRequests / bulkhead.maxConcurrentRequests;
    }
  }

  private async executeWithTimeoutAndRetry<T>(
    operation: () => Promise<T>,
    context: OperationContext
  ): Promise<T> {
    let lastError: Error | null = null;
    const maxAttempts = this.config.retry.enabled ? this.config.retry.maxAttempts : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.executeWithTimeout(operation, context);
        
        if (attempt > 1) {
          this.stats.retry.successfulRetries++;
        }
        
        return result;

      } catch (error) {
        lastError = error;
        this.stats.circuitBreaker.totalOperations++;

        if (attempt === maxAttempts) {
          break;
        }

        if (!this.shouldRetry(error)) {
          break;
        }

        const delay = this.calculateRetryDelay(attempt);
        this.stats.retry.totalRetries++;
        this.stats.retry.averageRetryDelay = 
          (this.stats.retry.averageRetryDelay * (this.stats.retry.totalRetries - 1) + delay) / 
          this.stats.retry.totalRetries;

        context.retryContext = {
          attempt,
          maxAttempts,
          delay,
          error,
          startTime: context.startTime,
          operation: context.name,
          metadata: context.metadata,
        };

        this.emit('retry:attempt', context.retryContext);

        await this.sleep(delay);
      }
    }

    this.stats.retry.failedRetries++;
    throw lastError!;
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    context: OperationContext
  ): Promise<T> {
    if (!this.config.timeout.enabled || !context.timeout) {
      return operation();
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.stats.timeout.totalTimeouts++;
        reject(new Error(`Operation timeout: ${context.name} exceeded ${context.timeout}ms`));
      }, context.timeout);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          
          const executionTime = Date.now() - context.startTime.getTime();
          this.stats.timeout.averageExecutionTime = 
            (this.stats.timeout.averageExecutionTime * (this.stats.circuitBreaker.totalOperations - 1) + executionTime) / 
            this.stats.circuitBreaker.totalOperations;
          
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private recordSuccess(operationName: string): void {
    this.stats.circuitBreaker.successfulOperations++;

    if (this.config.circuitBreaker.enabled) {
      const circuitBreaker = this.circuitBreakers.get(operationName);
      if (circuitBreaker) {
        circuitBreaker.successCount++;
        
        if (circuitBreaker.state === 'half-open') {
          // Transition back to closed
          circuitBreaker.state = 'closed';
          circuitBreaker.failureCount = 0;
          circuitBreaker.successCount = 0;
          this.stats.circuitBreaker.circuitCloseEvents++;
          
          this.emit('circuit-breaker:closed', { operationName });
        }
        
        this.updateCircuitBreakerMetrics(circuitBreaker);
      }
    }
  }

  private recordFailure(operationName: string, error: Error): void {
    this.stats.circuitBreaker.failedOperations++;

    if (this.config.circuitBreaker.enabled) {
      const circuitBreaker = this.getOrCreateCircuitBreaker(operationName);
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = new Date();
      
      this.updateCircuitBreakerMetrics(circuitBreaker);
    }

    this.emit('operation:failed', { operationName, error: error.message });
  }

  private getOrCreateCircuitBreaker(operationName: string): CircuitBreakerStatus {
    let circuitBreaker = this.circuitBreakers.get(operationName);
    
    if (!circuitBreaker) {
      circuitBreaker = {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        totalRequests: 0,
        failureRate: 0,
      };
      this.circuitBreakers.set(operationName, circuitBreaker);
    }
    
    return circuitBreaker;
  }

  private getOrCreateBulkhead(operationName: string): BulkheadStatus {
    let bulkhead = this.bulkheadSemaphores.get(operationName);
    
    if (!bulkhead) {
      bulkhead = {
        activeRequests: 0,
        maxConcurrentRequests: this.config.bulkhead.maxConcurrentRequests,
        queuedRequests: 0,
        maxQueueSize: this.config.bulkhead.queueSize,
        rejectedRequests: 0,
        utilizationRate: 0,
      };
      this.bulkheadSemaphores.set(operationName, bulkhead);
    }
    
    return bulkhead;
  }

  private shouldOpenCircuit(circuitBreaker: CircuitBreakerStatus): boolean {
    if (circuitBreaker.totalRequests < this.config.circuitBreaker.minimumRequestThreshold) {
      return false;
    }

    return circuitBreaker.failureRate >= this.config.circuitBreaker.failureThreshold;
  }

  private shouldRetry(error: Error): boolean {
    if (!this.config.retry.enabled) {
      return false;
    }

    // Check if error is retryable
    return this.config.retry.retryableErrors.some(retryableError => 
      error.message.includes(retryableError) || error.name === retryableError
    );
  }

  private calculateRetryDelay(attempt: number): number {
    let delay = this.config.retry.initialDelay * Math.pow(this.config.retry.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, this.config.retry.maxDelay);

    if (this.config.retry.jitterEnabled) {
      delay = delay + (Math.random() * delay * 0.1); // Add 10% jitter
    }

    return Math.floor(delay);
  }

  private updateCircuitBreakerMetrics(circuitBreaker: CircuitBreakerStatus): void {
    circuitBreaker.totalRequests = circuitBreaker.failureCount + circuitBreaker.successCount;
    
    if (circuitBreaker.totalRequests > 0) {
      circuitBreaker.failureRate = circuitBreaker.failureCount / circuitBreaker.totalRequests;
    }

    // Implement rolling window logic here if needed
    // For now, we use simple counters
  }

  private updateServiceHealthStatus(serviceName: string): void {
    const serviceHealth = this.healthStatus.get(serviceName);
    if (!serviceHealth) return;

    const totalChecks = serviceHealth.checks.length;
    if (totalChecks === 0) return;

    const passedChecks = serviceHealth.checks.filter(c => c.status === 'pass').length;
    const failedChecks = serviceHealth.checks.filter(c => c.status === 'fail').length;
    const warnChecks = serviceHealth.checks.filter(c => c.status === 'warn').length;

    serviceHealth.score = (passedChecks * 100 + warnChecks * 50) / totalChecks;

    if (failedChecks > 0) {
      serviceHealth.status = 'unhealthy';
    } else if (warnChecks > 0) {
      serviceHealth.status = 'degraded';
    } else {
      serviceHealth.status = 'healthy';
    }

    serviceHealth.lastUpdate = new Date();

    this.emit('health:updated', { serviceName, status: serviceHealth.status, score: serviceHealth.score });
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.health.checkInterval);
  }

  private startCleanupTasks(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleOperations();
      this.cleanupOldMetrics();
    }, 60000); // Run every minute
  }

  private performHealthChecks(): void {
    // Implement health checks based on circuit breaker states and system metrics
    for (const [operationName, circuitBreaker] of this.circuitBreakers.entries()) {
      const check: HealthCheck = {
        name: `circuit-breaker-${operationName}`,
        status: circuitBreaker.state === 'open' ? 'fail' : circuitBreaker.state === 'half-open' ? 'warn' : 'pass',
        duration: 0,
        timestamp: new Date(),
        metadata: {
          state: circuitBreaker.state,
          failureRate: circuitBreaker.failureRate,
        },
      };

      this.addHealthCheck('reliability-manager', check);
    }
  }

  private cleanupStaleOperations(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [id, operation] of this.activeOperations.entries()) {
      if (now - operation.startTime.getTime() > staleThreshold) {
        this.activeOperations.delete(id);
        this.emit('operation:stale', { operationId: id, operationName: operation.name });
      }
    }
  }

  private cleanupOldMetrics(): void {
    // Reset circuit breaker metrics that are too old
    const resetThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const [operationName, circuitBreaker] of this.circuitBreakers.entries()) {
      if (circuitBreaker.lastFailureTime && 
          Date.now() - circuitBreaker.lastFailureTime.getTime() > resetThreshold) {
        circuitBreaker.failureCount = 0;
        circuitBreaker.successCount = 0;
        circuitBreaker.totalRequests = 0;
        circuitBreaker.failureRate = 0;
      }
    }
  }

  private async waitForActiveOperations(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (this.activeOperations.size > 0 && (Date.now() - startTime) < timeoutMs) {
      await this.sleep(100);
    }

    if (this.activeOperations.size > 0) {
      this.emit('reliability:warning', `${this.activeOperations.size} operations still active during shutdown`);
    }
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create default reliability configuration
 */
export function createDefaultReliabilityConfig(): ReliabilityConfig {
  return {
    circuitBreaker: {
      enabled: true,
      failureThreshold: 0.5, // 50% failure rate
      recoveryTimeout: 60000, // 1 minute
      halfOpenMaxRequests: 5,
      rollingWindowSize: 100,
      minimumRequestThreshold: 10,
    },
    retry: {
      enabled: true,
      maxAttempts: 3,
      initialDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      jitterEnabled: true,
      retryableErrors: [
        'ECONNRESET',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'TimeoutError',
        'ConnectionError',
      ],
    },
    timeout: {
      enabled: true,
      defaultTimeout: 30000, // 30 seconds
      operationTimeouts: {
        'message.publish': 10000,
        'message.validate': 5000,
        'event.emit': 15000,
        'schema.validate': 3000,
      },
      deadlineEnforcement: true,
    },
    bulkhead: {
      enabled: true,
      maxConcurrentRequests: 100,
      queueSize: 50,
      rejectionPolicy: 'fail-fast',
    },
    health: {
      enabled: true,
      checkInterval: 30000, // 30 seconds
      unhealthyThreshold: 0.3,
      recoveryThreshold: 0.8,
      degradedThreshold: 0.7,
    },
    failureHandling: {
      enableDeadLetterQueue: true,
      maxRetries: 3,
      failureEscalationEnabled: true,
      gracefulDegradation: true,
    },
  };
}