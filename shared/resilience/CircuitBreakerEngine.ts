/**
 * Circuit Breaker Engine - Advanced Resilience Patterns
 * Implements circuit breaking, bulkhead isolation, retry with backoff,
 * timeout handling, and fallback mechanisms for UEP agent coordination
 */

export interface CircuitBreakerConfig {
  failureThreshold: number;          // Number of failures before opening
  timeoutMs: number;                 // Request timeout in milliseconds  
  resetTimeoutMs: number;            // Time to wait before attempting reset
  halfOpenMaxCalls: number;          // Max calls allowed in half-open state
  rollingWindowMs: number;           // Rolling window for failure tracking
  minimumThroughput: number;         // Minimum requests before evaluation
  errorThresholdPercentage: number;  // Percentage of errors before opening
}

export interface RetryConfig {
  maxAttempts: number;               // Maximum retry attempts
  baseDelayMs: number;              // Base delay between retries
  maxDelayMs: number;               // Maximum delay between retries
  backoffMultiplier: number;        // Exponential backoff multiplier
  jitterMs: number;                 // Random jitter to prevent thundering herd
}

export interface BulkheadConfig {
  maxConcurrentCalls: number;       // Maximum concurrent calls
  maxQueueSize: number;             // Maximum queue size for pending calls
  timeoutMs: number;                // Timeout for queued calls
}

export interface FallbackConfig {
  enableFallback: boolean;          // Enable fallback mechanism
  fallbackTimeoutMs: number;        // Timeout for fallback execution
  fallbackStrategy: 'cache' | 'default' | 'degraded' | 'custom';
}

export enum CircuitState {
  CLOSED = 'closed',                // Normal operation
  OPEN = 'open',                    // Circuit is open, blocking calls
  HALF_OPEN = 'half-open'           // Testing if service has recovered
}

export interface CallMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  timeoutCalls: number;
  averageResponseTime: number;
  lastCallTime: Date;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  metrics: CallMetrics;
  stateChangedAt: Date;
  nextAttemptAt?: Date;
  halfOpenCalls: number;
}

/**
 * Advanced Circuit Breaker with multiple resilience patterns
 */
export class CircuitBreakerEngine {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private halfOpenCalls: number = 0;
  private callMetrics: CallMetrics;
  private recentCalls: Array<{ success: boolean; timestamp: number; duration: number }> = [];
  private concurrentCalls: number = 0;
  private callQueue: Array<{ resolve: Function; reject: Function; timestamp: number }> = [];

  constructor(
    private serviceName: string,
    private circuitConfig: CircuitBreakerConfig,
    private retryConfig: RetryConfig,
    private bulkheadConfig: BulkheadConfig,
    private fallbackConfig: FallbackConfig
  ) {
    this.callMetrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      timeoutCalls: 0,
      averageResponseTime: 0,
      lastCallTime: new Date()
    };
  }

  /**
   * Execute a function with full resilience patterns
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    // Check bulkhead limits
    if (!this.canAcceptCall()) {
      throw new Error(`Bulkhead limit exceeded for service: ${this.serviceName}`);
    }

    return await this.executeWithRetry(operation, fallbackOperation);
  }

  /**
   * Execute operation with retry and circuit breaker logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    // Check circuit breaker state
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        return await this.executeFallback(fallbackOperation);
      }
      this.transitionToHalfOpen();
    }

    if (this.state === CircuitState.HALF_OPEN && this.halfOpenCalls >= this.circuitConfig.halfOpenMaxCalls) {
      return await this.executeFallback(fallbackOperation);
    }

    this.incrementConcurrentCalls();
    const startTime = Date.now();

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(operation);
      
      // Record success
      this.recordSuccess(Date.now() - startTime);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordFailure(duration, error);

      // Attempt retry if configured and not at max attempts
      if (attempt < this.retryConfig.maxAttempts && this.shouldRetry(error)) {
        const delay = this.calculateRetryDelay(attempt);
        await this.sleep(delay);
        return await this.executeWithRetry(operation, fallbackOperation, attempt + 1);
      }

      // Execute fallback if available
      if (fallbackOperation || this.fallbackConfig.enableFallback) {
        return await this.executeFallback(fallbackOperation);
      }

      throw error;
    } finally {
      this.decrementConcurrentCalls();
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.circuitConfig.timeoutMs}ms for service: ${this.serviceName}`));
      }, this.circuitConfig.timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Execute fallback operation
   */
  private async executeFallback<T>(fallbackOperation?: () => Promise<T>): Promise<T> {
    if (!this.fallbackConfig.enableFallback) {
      throw new Error(`Service ${this.serviceName} unavailable and no fallback configured`);
    }

    if (fallbackOperation) {
      try {
        return await this.executeWithTimeout(fallbackOperation);
      } catch (error) {
        throw new Error(`Fallback failed for service ${this.serviceName}: ${error.message}`);
      }
    }

    // Default fallback strategies
    switch (this.fallbackConfig.fallbackStrategy) {
      case 'cache':
        return this.getCachedResponse<T>();
      case 'default':
        return this.getDefaultResponse<T>();
      case 'degraded':
        return this.getDegradedResponse<T>();
      default:
        throw new Error(`No fallback available for service: ${this.serviceName}`);
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(duration: number): void {
    this.callMetrics.totalCalls++;
    this.callMetrics.successfulCalls++;
    this.callMetrics.lastCallTime = new Date();
    this.updateAverageResponseTime(duration);
    
    this.recentCalls.push({ success: true, timestamp: Date.now(), duration });
    this.cleanupRecentCalls();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.circuitConfig.halfOpenMaxCalls) {
        this.transitionToClosed();
      }
    }

    this.failureCount = Math.max(0, this.failureCount - 1); // Gradual recovery
  }

  /**
   * Record failed operation
   */
  private recordFailure(duration: number, error: any): void {
    this.callMetrics.totalCalls++;
    this.callMetrics.failedCalls++;
    this.callMetrics.lastCallTime = new Date();
    this.updateAverageResponseTime(duration);

    if (this.isTimeout(error)) {
      this.callMetrics.timeoutCalls++;
    }

    this.recentCalls.push({ success: false, timestamp: Date.now(), duration });
    this.cleanupRecentCalls();

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.shouldOpenCircuit()) {
      this.transitionToOpen();
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    if (this.callMetrics.totalCalls < this.circuitConfig.minimumThroughput) {
      return false;
    }

    const recentFailures = this.recentCalls.filter(call => !call.success).length;
    const errorPercentage = (recentFailures / this.recentCalls.length) * 100;

    return this.failureCount >= this.circuitConfig.failureThreshold ||
           errorPercentage >= this.circuitConfig.errorThresholdPercentage;
  }

  /**
   * State transition methods
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.circuitConfig.resetTimeoutMs;
    console.log(`Circuit breaker OPENED for service: ${this.serviceName}`);
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenCalls = 0;
    console.log(`Circuit breaker HALF-OPEN for service: ${this.serviceName}`);
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenCalls = 0;
    console.log(`Circuit breaker CLOSED for service: ${this.serviceName}`);
  }

  /**
   * Bulkhead pattern implementation
   */
  private canAcceptCall(): boolean {
    if (this.concurrentCalls >= this.bulkheadConfig.maxConcurrentCalls) {
      if (this.callQueue.length >= this.bulkheadConfig.maxQueueSize) {
        return false;
      }
      return true; // Can queue the call
    }
    return true;
  }

  private incrementConcurrentCalls(): void {
    this.concurrentCalls++;
  }

  private decrementConcurrentCalls(): void {
    this.concurrentCalls--;
    this.processQueuedCalls();
  }

  private processQueuedCalls(): void {
    if (this.callQueue.length > 0 && this.concurrentCalls < this.bulkheadConfig.maxConcurrentCalls) {
      const queuedCall = this.callQueue.shift();
      if (queuedCall) {
        // Check if call hasn't timed out
        if (Date.now() - queuedCall.timestamp < this.bulkheadConfig.timeoutMs) {
          queuedCall.resolve();
        } else {
          queuedCall.reject(new Error('Queued call timeout'));
        }
      }
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private shouldRetry(error: any): boolean {
    // Don't retry on validation errors or authentication failures
    if (error.message.includes('validation') || error.message.includes('authentication')) {
      return false;
    }
    
    // Retry on network errors, timeouts, and 5xx HTTP errors
    return this.isTimeout(error) || 
           this.isNetworkError(error) || 
           this.isServerError(error);
  }

  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
      this.retryConfig.maxDelayMs
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * this.retryConfig.jitterMs;
    return delay + jitter;
  }

  /**
   * Error classification methods
   */
  private isTimeout(error: any): boolean {
    return error.message.includes('timeout') || error.code === 'ETIMEDOUT';
  }

  private isNetworkError(error: any): boolean {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ENOTFOUND' || 
           error.code === 'ECONNRESET';
  }

  private isServerError(error: any): boolean {
    return error.status >= 500 && error.status < 600;
  }

  /**
   * Fallback strategy implementations
   */
  private getCachedResponse<T>(): T {
    // Implementation would fetch from cache
    throw new Error('Cache fallback not implemented');
  }

  private getDefaultResponse<T>(): T {
    // Implementation would return default response
    throw new Error('Default fallback not implemented');
  }

  private getDegradedResponse<T>(): T {
    // Implementation would return degraded functionality
    throw new Error('Degraded fallback not implemented');
  }

  /**
   * Utility methods
   */
  private updateAverageResponseTime(duration: number): void {
    const totalTime = this.callMetrics.averageResponseTime * (this.callMetrics.totalCalls - 1);
    this.callMetrics.averageResponseTime = (totalTime + duration) / this.callMetrics.totalCalls;
  }

  private cleanupRecentCalls(): void {
    const cutoffTime = Date.now() - this.circuitConfig.rollingWindowMs;
    this.recentCalls = this.recentCalls.filter(call => call.timestamp > cutoffTime);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      metrics: { ...this.callMetrics },
      stateChangedAt: new Date(this.lastFailureTime || Date.now()),
      nextAttemptAt: this.state === CircuitState.OPEN ? new Date(this.nextAttemptTime) : undefined,
      halfOpenCalls: this.halfOpenCalls
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenCalls = 0;
    this.recentCalls = [];
    this.concurrentCalls = 0;
    this.callQueue = [];
    
    this.callMetrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      timeoutCalls: 0,
      averageResponseTime: 0,
      lastCallTime: new Date()
    };
  }
}

/**
 * Circuit Breaker Factory for creating service-specific instances
 */
export class CircuitBreakerFactory {
  private circuitBreakers: Map<string, CircuitBreakerEngine> = new Map();

  createCircuitBreaker(
    serviceName: string,
    circuitConfig?: Partial<CircuitBreakerConfig>,
    retryConfig?: Partial<RetryConfig>,
    bulkheadConfig?: Partial<BulkheadConfig>,
    fallbackConfig?: Partial<FallbackConfig>
  ): CircuitBreakerEngine {
    
    const defaultCircuitConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      timeoutMs: 5000,
      resetTimeoutMs: 30000,
      halfOpenMaxCalls: 3,
      rollingWindowMs: 60000,
      minimumThroughput: 10,
      errorThresholdPercentage: 50
    };

    const defaultRetryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      jitterMs: 500
    };

    const defaultBulkheadConfig: BulkheadConfig = {
      maxConcurrentCalls: 10,
      maxQueueSize: 20,
      timeoutMs: 30000
    };

    const defaultFallbackConfig: FallbackConfig = {
      enableFallback: true,
      fallbackTimeoutMs: 2000,
      fallbackStrategy: 'default'
    };

    const circuitBreaker = new CircuitBreakerEngine(
      serviceName,
      { ...defaultCircuitConfig, ...circuitConfig },
      { ...defaultRetryConfig, ...retryConfig },
      { ...defaultBulkheadConfig, ...bulkheadConfig },
      { ...defaultFallbackConfig, ...fallbackConfig }
    );

    this.circuitBreakers.set(serviceName, circuitBreaker);
    return circuitBreaker;
  }

  getCircuitBreaker(serviceName: string): CircuitBreakerEngine | undefined {
    return this.circuitBreakers.get(serviceName);
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [serviceName, circuitBreaker] of this.circuitBreakers) {
      stats[serviceName] = circuitBreaker.getStats();
    }
    return stats;
  }

  resetAll(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }
  }
}

export default CircuitBreakerEngine;