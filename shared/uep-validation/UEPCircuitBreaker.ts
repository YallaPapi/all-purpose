/**
 * UEP Circuit Breaker - Graceful Failure Handling
 * 
 * Implements circuit breaker patterns specifically designed for UEP validation
 * middleware to handle graceful failure scenarios, prevent cascade failures,
 * and maintain system resilience under load.
 */

import { EventEmitter } from 'events';

export interface CircuitBreakerConfig {
  // Failure threshold settings
  failureThreshold: number;
  failureRateThreshold: number; // percentage
  minimumRequestThreshold: number;
  
  // Timing settings
  timeout: number; // request timeout in ms
  resetTimeout: number; // time to wait before trying half-open
  monitoringPeriod: number; // sliding window period
  
  // Recovery settings
  successThreshold: number; // successful requests needed to close circuit
  halfOpenMaxCalls: number;
  
  // Advanced settings
  enableFallback: boolean;
  fallbackFunction?: (error: Error, context: any) => Promise<any>;
  healthCheckFunction?: () => Promise<boolean>;
  errorFilter?: (error: Error) => boolean;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  requests: number;
  failureRate: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  nextAttempt: Date | null;
  stateChangedAt: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export interface CircuitBreakerMetrics {
  circuitBreakers: Map<string, CircuitBreakerState>;
  globalStats: {
    totalCircuitBreakers: number;
    openCircuitBreakers: number;
    halfOpenCircuitBreakers: number;
    closedCircuitBreakers: number;
    totalFailures: number;
    totalSuccesses: number;
    averageFailureRate: number;
  };
}

export interface RequestContext {
  capability: string;
  agentId: string;
  method: string;
  timestamp: Date;
  timeout: number;
  retryCount?: number;
  metadata?: any;
}

/**
 * UEP-Specific Circuit Breaker Manager
 */
export class UEPCircuitBreakerManager extends EventEmitter {
  private config: CircuitBreakerConfig;
  private circuitBreakers: Map<string, UEPCircuitBreaker> = new Map();
  private globalMetrics = {
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    totalTimeouts: 0
  };

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = config;
    this.setupHealthChecking();
  }

  /**
   * Get or create circuit breaker for capability
   */
  getCircuitBreaker(capability: string): UEPCircuitBreaker {
    if (!this.circuitBreakers.has(capability)) {
      const circuitBreaker = new UEPCircuitBreaker(capability, this.config);
      
      // Setup event forwarding
      circuitBreaker.on('state-changed', (state) => {
        this.emit('circuit-breaker-state-changed', { capability, state });
      });
      
      circuitBreaker.on('failure', (error) => {
        this.globalMetrics.totalFailures++;
        this.emit('circuit-breaker-failure', { capability, error });
      });
      
      circuitBreaker.on('success', () => {
        this.globalMetrics.totalSuccesses++;
        this.emit('circuit-breaker-success', { capability });
      });
      
      this.circuitBreakers.set(capability, circuitBreaker);
    }
    
    return this.circuitBreakers.get(capability)!;
  }

  /**
   * Execute request through circuit breaker
   */
  async execute<T>(
    capability: string,
    requestFn: () => Promise<T>,
    context?: RequestContext
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(capability);
    this.globalMetrics.totalRequests++;
    
    try {
      const result = await circuitBreaker.execute(requestFn, context);
      return result;
    } catch (error) {
      // Check if we should apply fallback
      if (this.config.enableFallback && this.config.fallbackFunction) {
        try {
          console.warn(`Circuit breaker fallback activated for ${capability}`);
          return await this.config.fallbackFunction(error, context);
        } catch (fallbackError) {
          console.error(`Fallback failed for ${capability}:`, fallbackError);
          throw error; // Throw original error
        }
      }
      throw error;
    }
  }

  /**
   * Get metrics for all circuit breakers
   */
  getMetrics(): CircuitBreakerMetrics {
    const circuitBreakerStates = new Map<string, CircuitBreakerState>();
    let openCount = 0;
    let halfOpenCount = 0;
    let closedCount = 0;
    let totalFailures = 0;
    let totalSuccesses = 0;
    let totalRequests = 0;
    
    for (const [capability, circuitBreaker] of this.circuitBreakers) {
      const state = circuitBreaker.getState();
      circuitBreakerStates.set(capability, state);
      
      switch (state.state) {
        case 'OPEN':
          openCount++;
          break;
        case 'HALF_OPEN':
          halfOpenCount++;
          break;
        case 'CLOSED':
          closedCount++;
          break;
      }
      
      totalFailures += state.totalFailures;
      totalSuccesses += state.totalSuccesses;
      totalRequests += state.totalRequests;
    }
    
    return {
      circuitBreakers: circuitBreakerStates,
      globalStats: {
        totalCircuitBreakers: this.circuitBreakers.size,
        openCircuitBreakers: openCount,
        halfOpenCircuitBreakers: halfOpenCount,
        closedCircuitBreakers: closedCount,
        totalFailures,
        totalSuccesses,
        averageFailureRate: totalRequests > 0 ? (totalFailures / totalRequests) * 100 : 0
      }
    };
  }

  /**
   * Force open circuit breaker
   */
  forceOpen(capability: string): void {
    const circuitBreaker = this.getCircuitBreaker(capability);
    circuitBreaker.forceOpen();
  }

  /**
   * Force close circuit breaker
   */
  forceClose(capability: string): void {
    const circuitBreaker = this.getCircuitBreaker(capability);
    circuitBreaker.forceClose();
  }

  /**
   * Reset circuit breaker
   */
  reset(capability: string): void {
    const circuitBreaker = this.getCircuitBreaker(capability);
    circuitBreaker.reset();
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }
  }

  /**
   * Setup periodic health checking
   */
  private setupHealthChecking(): void {
    if (!this.config.healthCheckFunction) return;
    
    setInterval(async () => {
      for (const [capability, circuitBreaker] of this.circuitBreakers) {
        if (circuitBreaker.isOpen()) {
          try {
            const isHealthy = await this.config.healthCheckFunction!();
            if (isHealthy) {
              console.log(`Health check passed for ${capability}, attempting recovery`);
              circuitBreaker.attemptReset();
            }
          } catch (error) {
            console.warn(`Health check failed for ${capability}:`, error);
          }
        }
      }
    }, this.config.monitoringPeriod);
  }

  /**
   * Shutdown circuit breaker manager
   */
  async shutdown(): Promise<void> {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      await circuitBreaker.shutdown();
    }
    this.circuitBreakers.clear();
    this.removeAllListeners();
  }
}

/**
 * Individual Circuit Breaker Implementation
 */
export class UEPCircuitBreaker extends EventEmitter {
  private capability: string;
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private requestWindow: Array<{ timestamp: Date; success: boolean }> = [];
  private halfOpenCalls = 0;

  constructor(capability: string, config: CircuitBreakerConfig) {
    super();
    this.capability = capability;
    this.config = config;
    
    this.state = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      requests: 0,
      failureRate: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      nextAttempt: null,
      stateChangedAt: new Date(),
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0
    };
  }

  /**
   * Execute request through circuit breaker
   */
  async execute<T>(
    requestFn: () => Promise<T>,
    context?: RequestContext
  ): Promise<T> {
    // Check circuit breaker state
    if (this.state.state === 'OPEN') {
      if (!this.canAttemptReset()) {
        throw new Error(`Circuit breaker is OPEN for capability: ${this.capability}`);
      } else {
        this.transitionToHalfOpen();
      }
    }

    if (this.state.state === 'HALF_OPEN' && this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      throw new Error(`Circuit breaker is HALF_OPEN and max calls exceeded for: ${this.capability}`);
    }

    // Execute request with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      }, context?.timeout || this.config.timeout);
    });

    try {
      const result = await Promise.race([requestFn(), timeoutPromise]);
      
      this.recordSuccess();
      return result;
      
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  /**
   * Record successful request
   */
  private recordSuccess(): void {
    this.state.successes++;
    this.state.totalSuccesses++;
    this.state.totalRequests++;
    this.state.requests++;
    this.state.lastSuccessTime = new Date();
    
    this.addToWindow(true);
    
    if (this.state.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    }
    
    this.updateFailureRate();
    this.emit('success');
  }

  /**
   * Record failed request
   */
  private recordFailure(error: Error): void {
    // Check if error should be counted as failure
    if (this.config.errorFilter && !this.config.errorFilter(error)) {
      return;
    }
    
    this.state.failures++;
    this.state.totalFailures++;
    this.state.totalRequests++;
    this.state.requests++;
    this.state.lastFailureTime = new Date();
    
    this.addToWindow(false);
    this.updateFailureRate();
    
    // Check if we should open the circuit
    if (this.shouldOpen()) {
      this.transitionToOpen();
    }
    
    this.emit('failure', error);
  }

  /**
   * Add request result to sliding window
   */
  private addToWindow(success: boolean): void {
    const now = new Date();
    this.requestWindow.push({ timestamp: now, success });
    
    // Remove old entries outside monitoring period
    const cutoff = new Date(now.getTime() - this.config.monitoringPeriod);
    this.requestWindow = this.requestWindow.filter(req => req.timestamp >= cutoff);
  }

  /**
   * Update failure rate based on sliding window
   */
  private updateFailureRate(): void {
    if (this.requestWindow.length === 0) {
      this.state.failureRate = 0;
      return;
    }
    
    const failures = this.requestWindow.filter(req => !req.success).length;
    this.state.failureRate = (failures / this.requestWindow.length) * 100;
  }

  /**
   * Check if circuit should open
   */
  private shouldOpen(): boolean {
    return (
      this.state.state === 'CLOSED' &&
      this.state.requests >= this.config.minimumRequestThreshold &&
      (
        this.state.failures >= this.config.failureThreshold ||
        this.state.failureRate >= this.config.failureRateThreshold
      )
    );
  }

  /**
   * Check if we can attempt to reset from OPEN to HALF_OPEN
   */
  private canAttemptReset(): boolean {
    return (
      this.state.nextAttempt !== null &&
      new Date() >= this.state.nextAttempt
    );
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state.state = 'OPEN';
    this.state.stateChangedAt = new Date();
    this.state.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
    
    console.warn(`Circuit breaker OPENED for capability: ${this.capability}`);
    this.emit('state-changed', this.state);
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state.state = 'HALF_OPEN';
    this.state.stateChangedAt = new Date();
    this.halfOpenCalls = 0;
    
    console.info(`Circuit breaker transitioned to HALF_OPEN for capability: ${this.capability}`);
    this.emit('state-changed', this.state);
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state.state = 'CLOSED';
    this.state.stateChangedAt = new Date();
    this.state.failures = 0;
    this.state.successes = 0;
    this.state.requests = 0;
    this.halfOpenCalls = 0;
    this.requestWindow = [];
    
    console.info(`Circuit breaker CLOSED for capability: ${this.capability}`);
    this.emit('state-changed', this.state);
  }

  /**
   * Force open circuit breaker
   */
  forceOpen(): void {
    this.transitionToOpen();
  }

  /**
   * Force close circuit breaker
   */
  forceClose(): void {
    this.transitionToClosed();
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.transitionToClosed();
  }

  /**
   * Attempt reset if conditions are met
   */
  attemptReset(): void {
    if (this.state.state === 'OPEN' && this.canAttemptReset()) {
      this.transitionToHalfOpen();
    }
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen(): boolean {
    return this.state.state === 'OPEN';
  }

  /**
   * Check if circuit breaker is half open
   */
  isHalfOpen(): boolean {
    return this.state.state === 'HALF_OPEN';
  }

  /**
   * Check if circuit breaker is closed
   */
  isClosed(): boolean {
    return this.state.state === 'CLOSED';
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.state.failures;
  }

  /**
   * Get last failure time
   */
  getLastFailureTime(): Date | null {
    return this.state.lastFailureTime;
  }

  /**
   * Shutdown circuit breaker
   */
  async shutdown(): Promise<void> {
    this.removeAllListeners();
  }
}