/**
 * Version-Aware Circuit Breaker for UEP Protocol
 * 
 * Extends the standard circuit breaker pattern with version-aware fallback
 * capabilities, enabling graceful degradation across UEP protocol versions.
 * 
 * Key Features:
 * - Version-specific circuit breaker states
 * - Automatic fallback to compatible versions
 * - Performance-aware version selection
 * - Circuit breaker metrics per version
 * - Integration with content negotiation
 */

import { ContentNegotiationEngine, UEPMessage } from '../uep-validation/UEPProtocolVersioning';
import { VersionCompatibilityManager } from '../uep-validation/VersionCompatibilityMatrix';
import { VersionFeatureDetector } from '../uep-validation/VersionFeatureDetector';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  maxRetries: number;
  retryDelay: number;
  enableVersionFallback: boolean;
  fallbackVersions?: string[];
  monitoringEnabled: boolean;
}

export interface VersionCircuitBreakerState {
  version: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  metrics: CircuitBreakerMetrics;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  errorRate: number;
  lastResetTime: number;
  stateTransitions: Array<{
    fromState: string;
    toState: string;
    timestamp: number;
    reason: string;
  }>;
}

export interface UEPRequest {
  message: UEPMessage;
  preferredVersion: string;
  acceptableVersions?: string[];
  timeout?: number;
  retries?: number;
}

export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  versionUsed: string;
  circuitBreakerState: string;
  fallbackUsed: boolean;
  metrics: {
    latency: number;
    retryCount: number;
    versionNegotiationTime: number;
  };
}

/**
 * Version-Aware Circuit Breaker Implementation
 */
export class VersionAwareCircuitBreaker {
  private options: CircuitBreakerOptions;
  private versionStates: Map<string, VersionCircuitBreakerState>;
  private contentNegotiator: ContentNegotiationEngine;
  private compatibilityManager: VersionCompatibilityManager;
  private featureDetector: VersionFeatureDetector;
  private globalMetrics: Map<string, any>;

  constructor(
    options: Partial<CircuitBreakerOptions> = {},
    negotiationEngine?: ContentNegotiationEngine
  ) {
    this.options = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
      resetTimeout: 60000,
      maxRetries: 3,
      retryDelay: 1000,
      enableVersionFallback: true,
      fallbackVersions: ['1.1', '1.0'],
      monitoringEnabled: true,
      ...options
    };

    this.versionStates = new Map();
    this.globalMetrics = new Map();
    
    this.contentNegotiator = negotiationEngine || new ContentNegotiationEngine({
      supportedVersions: ['1.0', '1.1', '2.0', '2.1'],
      defaultVersion: '2.0',
      fallbackVersion: '1.1',
      enablePerformanceOptimization: true,
      enableCircuitBreakerFallback: true,
      strictCompatibility: false
    });
    
    this.compatibilityManager = new VersionCompatibilityManager();
    this.featureDetector = new VersionFeatureDetector();

    this.initializeVersionStates();
  }

  /**
   * Execute request with version-aware circuit breaker protection
   */
  async call<T>(
    request: UEPRequest,
    executor: (message: UEPMessage, version: string) => Promise<T>
  ): Promise<CircuitBreakerResult<T>> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | undefined;
    
    const result: CircuitBreakerResult<T> = {
      success: false,
      versionUsed: request.preferredVersion,
      circuitBreakerState: 'unknown',
      fallbackUsed: false,
      metrics: {
        latency: 0,
        retryCount: 0,
        versionNegotiationTime: 0
      }
    };

    // Try with preferred version first
    const preferredState = this.getVersionState(request.preferredVersion);
    
    if (this.canAttemptVersion(preferredState)) {
      try {
        const data = await this.executeWithVersion(
          request.message,
          request.preferredVersion,
          executor
        );
        
        this.recordSuccess(request.preferredVersion);
        result.success = true;
        result.data = data;
        result.circuitBreakerState = preferredState.state;
        
      } catch (error) {
        lastError = error as Error;
        this.recordFailure(request.preferredVersion, lastError);
        retryCount++;
      }
    }

    // If preferred version failed or circuit is open, try fallback versions
    if (!result.success && this.options.enableVersionFallback) {
      const fallbackVersions = this.getFallbackVersions(
        request.preferredVersion,
        request.acceptableVersions
      );

      for (const fallbackVersion of fallbackVersions) {
        const fallbackState = this.getVersionState(fallbackVersion);
        
        if (this.canAttemptVersion(fallbackState) && retryCount < this.options.maxRetries) {
          try {
            // Wait for retry delay
            if (retryCount > 0) {
              await this.delay(this.options.retryDelay * retryCount);
            }

            const data = await this.executeWithVersion(
              request.message,
              fallbackVersion,
              executor
            );
            
            this.recordSuccess(fallbackVersion);
            result.success = true;
            result.data = data;
            result.versionUsed = fallbackVersion;
            result.circuitBreakerState = fallbackState.state;
            result.fallbackUsed = true;
            break;
            
          } catch (error) {
            lastError = error as Error;
            this.recordFailure(fallbackVersion, lastError);
            retryCount++;
          }
        }
      }
    }

    // Final result preparation
    result.metrics.latency = Date.now() - startTime;
    result.metrics.retryCount = retryCount;
    
    if (!result.success && lastError) {
      result.error = lastError;
    }

    // Update global metrics
    this.updateGlobalMetrics(result);

    return result;
  }

  /**
   * Get current state for a specific version
   */
  getVersionState(version: string): VersionCircuitBreakerState {
    if (!this.versionStates.has(version)) {
      this.initializeVersionState(version);
    }
    return this.versionStates.get(version)!;
  }

  /**
   * Get circuit breaker statistics for all versions
   */
  getStatistics(): Map<string, VersionCircuitBreakerState> {
    return new Map(this.versionStates);
  }

  /**
   * Get global metrics across all versions
   */
  getGlobalMetrics(): any {
    return Object.fromEntries(this.globalMetrics);
  }

  /**
   * Reset circuit breaker state for a specific version
   */
  resetVersion(version: string): void {
    const state = this.getVersionState(version);
    state.state = 'closed';
    state.failureCount = 0;
    state.successCount = 0;
    state.lastFailureTime = 0;
    state.nextAttemptTime = 0;
    
    this.recordStateTransition(version, state.state, 'closed', 'Manual reset');
  }

  /**
   * Reset all circuit breaker states
   */
  resetAll(): void {
    for (const version of this.versionStates.keys()) {
      this.resetVersion(version);
    }
  }

  /**
   * Check if version can be attempted based on circuit breaker state
   */
  private canAttemptVersion(state: VersionCircuitBreakerState): boolean {
    const now = Date.now();
    
    switch (state.state) {
      case 'closed':
        return true;
        
      case 'open':
        if (now >= state.nextAttemptTime) {
          // Transition to half-open for testing
          state.state = 'half-open';
          state.successCount = 0;
          this.recordStateTransition(
            state.version,
            'open',
            'half-open',
            'Timeout expired, testing connection'
          );
          return true;
        }
        return false;
        
      case 'half-open':
        return state.successCount < this.options.successThreshold;
        
      default:
        return false;
    }
  }

  /**
   * Execute request with specific version
   */
  private async executeWithVersion<T>(
    message: UEPMessage,
    version: string,
    executor: (message: UEPMessage, version: string) => Promise<T>
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Circuit breaker timeout')), this.options.timeout);
    });

    return Promise.race([
      executor(message, version),
      timeoutPromise
    ]);
  }

  /**
   * Record successful execution
   */
  private recordSuccess(version: string): void {
    const state = this.getVersionState(version);
    const now = Date.now();
    
    state.successCount++;
    state.metrics.successfulRequests++;
    state.metrics.totalRequests++;
    
    if (state.state === 'half-open' && state.successCount >= this.options.successThreshold) {
      // Close the circuit
      state.state = 'closed';
      state.failureCount = 0;
      this.recordStateTransition(version, 'half-open', 'closed', 'Success threshold reached');
    }
    
    this.updateMetrics(state, true, now);
  }

  /**
   * Record failed execution
   */
  private recordFailure(version: string, error: Error): void {
    const state = this.getVersionState(version);
    const now = Date.now();
    
    state.failureCount++;
    state.lastFailureTime = now;
    state.metrics.failedRequests++;
    state.metrics.totalRequests++;
    
    if (state.state === 'closed' && state.failureCount >= this.options.failureThreshold) {
      // Open the circuit
      state.state = 'open';
      state.nextAttemptTime = now + this.options.resetTimeout;
      this.recordStateTransition(version, 'closed', 'open', `Failure threshold reached: ${error.message}`);
    } else if (state.state === 'half-open') {
      // Return to open state
      state.state = 'open';
      state.nextAttemptTime = now + this.options.resetTimeout;
      this.recordStateTransition(version, 'half-open', 'open', `Test failed: ${error.message}`);
    }
    
    this.updateMetrics(state, false, now);
  }

  /**
   * Get fallback versions for a given preferred version
   */
  private getFallbackVersions(
    preferredVersion: string,
    acceptableVersions?: string[]
  ): string[] {
    // Start with explicitly acceptable versions
    let fallbacks = acceptableVersions || [];
    
    // Add configured fallback versions
    if (this.options.fallbackVersions) {
      fallbacks = [...fallbacks, ...this.options.fallbackVersions];
    }
    
    // Add compatible versions based on version compatibility matrix
    const compatibleVersions = this.compatibilityManager.getVersionFeatures(preferredVersion)?.canCommunicateWith || [];
    fallbacks = [...fallbacks, ...compatibleVersions];
    
    // Remove duplicates and preferred version
    fallbacks = [...new Set(fallbacks)].filter(v => v !== preferredVersion);
    
    // Sort by preference (stability and compatibility)
    return fallbacks.sort((a, b) => {
      const aFeatures = this.featureDetector.detectFeatures(a);
      const bFeatures = this.featureDetector.detectFeatures(b);
      
      // Prefer versions with fewer limitations
      const aLimitations = aFeatures.limitations.length;
      const bLimitations = bFeatures.limitations.length;
      
      if (aLimitations !== bLimitations) {
        return aLimitations - bLimitations;
      }
      
      // Prefer more stable (older) versions for fallback
      return this.compareVersionStability(a, b);
    });
  }

  /**
   * Compare version stability for fallback ordering
   */
  private compareVersionStability(version1: string, version2: string): number {
    const stability = { '1.0': 4, '1.1': 3, '2.0': 2, '2.1': 1 };
    const v1Stability = stability[version1 as keyof typeof stability] || 0;
    const v2Stability = stability[version2 as keyof typeof stability] || 0;
    
    return v2Stability - v1Stability; // Higher stability value wins
  }

  /**
   * Initialize version states for supported versions
   */
  private initializeVersionStates(): void {
    const supportedVersions = ['1.0', '1.1', '2.0', '2.1'];
    
    for (const version of supportedVersions) {
      this.initializeVersionState(version);
    }
  }

  /**
   * Initialize state for a specific version
   */
  private initializeVersionState(version: string): void {
    const state: VersionCircuitBreakerState = {
      version,
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        errorRate: 0,
        lastResetTime: Date.now(),
        stateTransitions: []
      }
    };
    
    this.versionStates.set(version, state);
  }

  /**
   * Update metrics for a version state
   */
  private updateMetrics(state: VersionCircuitBreakerState, success: boolean, timestamp: number): void {
    const metrics = state.metrics;
    
    // Calculate error rate
    metrics.errorRate = metrics.totalRequests > 0 
      ? (metrics.failedRequests / metrics.totalRequests) * 100 
      : 0;
    
    // Update average latency (simplified)
    if (success) {
      const latency = timestamp - (state.lastFailureTime || timestamp - 100);
      metrics.averageLatency = metrics.successfulRequests > 1
        ? (metrics.averageLatency * (metrics.successfulRequests - 1) + latency) / metrics.successfulRequests
        : latency;
    }
  }

  /**
   * Record state transition for monitoring
   */
  private recordStateTransition(
    version: string,
    fromState: string,
    toState: string,
    reason: string
  ): void {
    const state = this.getVersionState(version);
    
    state.metrics.stateTransitions.push({
      fromState,
      toState,
      timestamp: Date.now(),
      reason
    });
    
    // Keep only last 50 transitions per version
    if (state.metrics.stateTransitions.length > 50) {
      state.metrics.stateTransitions = state.metrics.stateTransitions.slice(-50);
    }
    
    if (this.options.monitoringEnabled) {
      console.log(`[Circuit Breaker] Version ${version}: ${fromState} -> ${toState} (${reason})`);
    }
  }

  /**
   * Update global metrics
   */
  private updateGlobalMetrics(result: CircuitBreakerResult<any>): void {
    const totalRequests = (this.globalMetrics.get('totalRequests') || 0) + 1;
    const successfulRequests = (this.globalMetrics.get('successfulRequests') || 0) + (result.success ? 1 : 0);
    const fallbacksUsed = (this.globalMetrics.get('fallbacksUsed') || 0) + (result.fallbackUsed ? 1 : 0);
    
    this.globalMetrics.set('totalRequests', totalRequests);
    this.globalMetrics.set('successfulRequests', successfulRequests);
    this.globalMetrics.set('fallbacksUsed', fallbacksUsed);
    this.globalMetrics.set('successRate', (successfulRequests / totalRequests) * 100);
    this.globalMetrics.set('fallbackRate', (fallbacksUsed / totalRequests) * 100);
    this.globalMetrics.set('lastUpdated', Date.now());
  }

  /**
   * Helper method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit Breaker Factory for easy instantiation
 */
export class CircuitBreakerFactory {
  static createVersionAwareCircuitBreaker(
    options?: Partial<CircuitBreakerOptions>
  ): VersionAwareCircuitBreaker {
    return new VersionAwareCircuitBreaker(options);
  }

  static createWithPresets(preset: 'conservative' | 'balanced' | 'aggressive'): VersionAwareCircuitBreaker {
    const presets = {
      conservative: {
        failureThreshold: 3,
        successThreshold: 5,
        timeout: 60000,
        resetTimeout: 120000,
        maxRetries: 5,
        retryDelay: 2000,
        enableVersionFallback: true,
        fallbackVersions: ['1.1', '1.0']
      },
      balanced: {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000,
        maxRetries: 3,
        retryDelay: 1000,
        enableVersionFallback: true,
        fallbackVersions: ['1.1', '1.0']
      },
      aggressive: {
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 15000,
        resetTimeout: 30000,
        maxRetries: 2,
        retryDelay: 500,
        enableVersionFallback: true,
        fallbackVersions: ['2.0', '1.1']
      }
    };

    return new VersionAwareCircuitBreaker(presets[preset]);
  }
}