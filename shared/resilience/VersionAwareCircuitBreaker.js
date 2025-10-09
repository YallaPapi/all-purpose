"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerFactory = exports.VersionAwareCircuitBreaker = void 0;
const UEPProtocolVersioning_1 = require("../uep-validation/UEPProtocolVersioning");
const VersionCompatibilityMatrix_1 = require("../uep-validation/VersionCompatibilityMatrix");
const VersionFeatureDetector_1 = require("../uep-validation/VersionFeatureDetector");
/**
 * Version-Aware Circuit Breaker Implementation
 */
class VersionAwareCircuitBreaker {
    constructor(options = {}, negotiationEngine) {
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
        this.contentNegotiator = negotiationEngine || new UEPProtocolVersioning_1.ContentNegotiationEngine({
            supportedVersions: ['1.0', '1.1', '2.0', '2.1'],
            defaultVersion: '2.0',
            fallbackVersion: '1.1',
            enablePerformanceOptimization: true,
            enableCircuitBreakerFallback: true,
            strictCompatibility: false
        });
        this.compatibilityManager = new VersionCompatibilityMatrix_1.VersionCompatibilityManager();
        this.featureDetector = new VersionFeatureDetector_1.VersionFeatureDetector();
        this.initializeVersionStates();
    }
    /**
     * Execute request with version-aware circuit breaker protection
     */
    async call(request, executor) {
        const startTime = Date.now();
        let retryCount = 0;
        let lastError;
        const result = {
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
                const data = await this.executeWithVersion(request.message, request.preferredVersion, executor);
                this.recordSuccess(request.preferredVersion);
                result.success = true;
                result.data = data;
                result.circuitBreakerState = preferredState.state;
            }
            catch (error) {
                lastError = error;
                this.recordFailure(request.preferredVersion, lastError);
                retryCount++;
            }
        }
        // If preferred version failed or circuit is open, try fallback versions
        if (!result.success && this.options.enableVersionFallback) {
            const fallbackVersions = this.getFallbackVersions(request.preferredVersion, request.acceptableVersions);
            for (const fallbackVersion of fallbackVersions) {
                const fallbackState = this.getVersionState(fallbackVersion);
                if (this.canAttemptVersion(fallbackState) && retryCount < this.options.maxRetries) {
                    try {
                        // Wait for retry delay
                        if (retryCount > 0) {
                            await this.delay(this.options.retryDelay * retryCount);
                        }
                        const data = await this.executeWithVersion(request.message, fallbackVersion, executor);
                        this.recordSuccess(fallbackVersion);
                        result.success = true;
                        result.data = data;
                        result.versionUsed = fallbackVersion;
                        result.circuitBreakerState = fallbackState.state;
                        result.fallbackUsed = true;
                        break;
                    }
                    catch (error) {
                        lastError = error;
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
    getVersionState(version) {
        if (!this.versionStates.has(version)) {
            this.initializeVersionState(version);
        }
        return this.versionStates.get(version);
    }
    /**
     * Get circuit breaker statistics for all versions
     */
    getStatistics() {
        return new Map(this.versionStates);
    }
    /**
     * Get global metrics across all versions
     */
    getGlobalMetrics() {
        return Object.fromEntries(this.globalMetrics);
    }
    /**
     * Reset circuit breaker state for a specific version
     */
    resetVersion(version) {
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
    resetAll() {
        for (const version of this.versionStates.keys()) {
            this.resetVersion(version);
        }
    }
    /**
     * Check if version can be attempted based on circuit breaker state
     */
    canAttemptVersion(state) {
        const now = Date.now();
        switch (state.state) {
            case 'closed':
                return true;
            case 'open':
                if (now >= state.nextAttemptTime) {
                    // Transition to half-open for testing
                    state.state = 'half-open';
                    state.successCount = 0;
                    this.recordStateTransition(state.version, 'open', 'half-open', 'Timeout expired, testing connection');
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
    async executeWithVersion(message, version, executor) {
        const timeoutPromise = new Promise((_, reject) => {
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
    recordSuccess(version) {
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
    recordFailure(version, error) {
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
        }
        else if (state.state === 'half-open') {
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
    getFallbackVersions(preferredVersion, acceptableVersions) {
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
    compareVersionStability(version1, version2) {
        const stability = { '1.0': 4, '1.1': 3, '2.0': 2, '2.1': 1 };
        const v1Stability = stability[version1] || 0;
        const v2Stability = stability[version2] || 0;
        return v2Stability - v1Stability; // Higher stability value wins
    }
    /**
     * Initialize version states for supported versions
     */
    initializeVersionStates() {
        const supportedVersions = ['1.0', '1.1', '2.0', '2.1'];
        for (const version of supportedVersions) {
            this.initializeVersionState(version);
        }
    }
    /**
     * Initialize state for a specific version
     */
    initializeVersionState(version) {
        const state = {
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
    updateMetrics(state, success, timestamp) {
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
    recordStateTransition(version, fromState, toState, reason) {
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
    updateGlobalMetrics(result) {
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.VersionAwareCircuitBreaker = VersionAwareCircuitBreaker;
/**
 * Circuit Breaker Factory for easy instantiation
 */
class CircuitBreakerFactory {
    static createVersionAwareCircuitBreaker(options) {
        return new VersionAwareCircuitBreaker(options);
    }
    static createWithPresets(preset) {
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
exports.CircuitBreakerFactory = CircuitBreakerFactory;
//# sourceMappingURL=VersionAwareCircuitBreaker.js.map