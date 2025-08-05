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
export declare class VersionAwareCircuitBreaker {
    private options;
    private versionStates;
    private contentNegotiator;
    private compatibilityManager;
    private featureDetector;
    private globalMetrics;
    constructor(options?: Partial<CircuitBreakerOptions>, negotiationEngine?: ContentNegotiationEngine);
    /**
     * Execute request with version-aware circuit breaker protection
     */
    call<T>(request: UEPRequest, executor: (message: UEPMessage, version: string) => Promise<T>): Promise<CircuitBreakerResult<T>>;
    /**
     * Get current state for a specific version
     */
    getVersionState(version: string): VersionCircuitBreakerState;
    /**
     * Get circuit breaker statistics for all versions
     */
    getStatistics(): Map<string, VersionCircuitBreakerState>;
    /**
     * Get global metrics across all versions
     */
    getGlobalMetrics(): any;
    /**
     * Reset circuit breaker state for a specific version
     */
    resetVersion(version: string): void;
    /**
     * Reset all circuit breaker states
     */
    resetAll(): void;
    /**
     * Check if version can be attempted based on circuit breaker state
     */
    private canAttemptVersion;
    /**
     * Execute request with specific version
     */
    private executeWithVersion;
    /**
     * Record successful execution
     */
    private recordSuccess;
    /**
     * Record failed execution
     */
    private recordFailure;
    /**
     * Get fallback versions for a given preferred version
     */
    private getFallbackVersions;
    /**
     * Compare version stability for fallback ordering
     */
    private compareVersionStability;
    /**
     * Initialize version states for supported versions
     */
    private initializeVersionStates;
    /**
     * Initialize state for a specific version
     */
    private initializeVersionState;
    /**
     * Update metrics for a version state
     */
    private updateMetrics;
    /**
     * Record state transition for monitoring
     */
    private recordStateTransition;
    /**
     * Update global metrics
     */
    private updateGlobalMetrics;
    /**
     * Helper method for delays
     */
    private delay;
}
/**
 * Circuit Breaker Factory for easy instantiation
 */
export declare class CircuitBreakerFactory {
    static createVersionAwareCircuitBreaker(options?: Partial<CircuitBreakerOptions>): VersionAwareCircuitBreaker;
    static createWithPresets(preset: 'conservative' | 'balanced' | 'aggressive'): VersionAwareCircuitBreaker;
}
//# sourceMappingURL=VersionAwareCircuitBreaker.d.ts.map