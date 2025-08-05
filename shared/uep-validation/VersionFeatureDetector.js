"use strict";
/**
 * UEP Version Feature Detector
 *
 * Detects and manages version-specific features for the UEP protocol,
 * enabling dynamic feature discovery and capability-based interactions.
 *
 * Key Features:
 * - Automatic feature detection by version
 * - Capability matrix management
 * - Feature compatibility checking
 * - Performance characteristics mapping
 * - Security feature tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionFeatureDetector = void 0;
/**
 * Version Feature Detector and Manager
 */
class VersionFeatureDetector {
    constructor() {
        this.featureMatrix = new Map();
        this.capabilityDefinitions = new Map();
        this.featureCompatibility = new Map();
        this.initializeFeatureMatrix();
        this.initializeCapabilityDefinitions();
        this.initializeFeatureCompatibility();
    }
    /**
     * Detect features available in a specific version
     */
    detectFeatures(version) {
        const cached = this.featureMatrix.get(version);
        if (cached) {
            return cached;
        }
        // Build features dynamically if not cached
        const features = this.buildVersionFeatures(version);
        this.featureMatrix.set(version, features);
        return features;
    }
    /**
     * Check if a specific feature is supported in a version
     */
    isFeatureSupported(version, feature) {
        const versionFeatures = this.detectFeatures(version);
        return versionFeatures.features.includes(feature);
    }
    /**
     * Check if a capability is supported in a version
     */
    isCapabilitySupported(version, capability) {
        const versionFeatures = this.detectFeatures(version);
        return versionFeatures.capabilities.includes(capability);
    }
    /**
     * Get all features introduced in a specific version
     */
    getFeaturesIntroducedIn(version) {
        const introduced = [];
        for (const [feature, compatibility] of this.featureCompatibility) {
            if (compatibility.introducedIn === version) {
                introduced.push(feature);
            }
        }
        return introduced;
    }
    /**
     * Get all features enhanced in a specific version
     */
    getFeaturesEnhancedIn(version) {
        const enhanced = [];
        for (const [feature, compatibility] of this.featureCompatibility) {
            if (compatibility.enhancedIn?.includes(version)) {
                enhanced.push(feature);
            }
        }
        return enhanced;
    }
    /**
     * Find minimum version that supports a set of features
     */
    findMinimumVersionForFeatures(requiredFeatures) {
        const versions = ['1.0', '1.1', '2.0', '2.1'];
        for (const version of versions) {
            const versionFeatures = this.detectFeatures(version);
            const hasAllFeatures = requiredFeatures.every(feature => versionFeatures.features.includes(feature));
            if (hasAllFeatures) {
                return version;
            }
        }
        return null;
    }
    /**
     * Get optimal version for a set of requirements
     */
    getOptimalVersion(requirements) {
        const versions = ['1.0', '1.1', '2.0', '2.1'];
        const scored = [];
        for (const version of versions) {
            const features = this.detectFeatures(version);
            const score = this.calculateVersionScore(features, requirements);
            scored.push({ version, score, features });
        }
        // Sort by score (highest first)
        scored.sort((a, b) => b.score - a.score);
        const optimal = scored[0];
        return {
            recommendedVersion: optimal.version,
            score: optimal.score,
            features: optimal.features,
            reasoning: this.generateRecommendationReasoning(optimal.features, requirements),
            alternatives: scored.slice(1, 3).map(s => ({
                version: s.version,
                score: s.score,
                reasoning: `Alternative with ${s.score.toFixed(1)} compatibility score`
            }))
        };
    }
    /**
     * Compare two versions and get feature differences
     */
    compareVersions(version1, version2) {
        const features1 = this.detectFeatures(version1);
        const features2 = this.detectFeatures(version2);
        const newFeatures = features2.features.filter(f => !features1.features.includes(f));
        const removedFeatures = features1.features.filter(f => !features2.features.includes(f));
        const commonFeatures = features1.features.filter(f => features2.features.includes(f));
        const newCapabilities = features2.capabilities.filter(c => !features1.capabilities.includes(c));
        const removedCapabilities = features1.capabilities.filter(c => !features2.capabilities.includes(c));
        return {
            version1,
            version2,
            newFeatures,
            removedFeatures,
            commonFeatures,
            newCapabilities,
            removedCapabilities,
            performanceComparison: this.comparePerformanceCharacteristics(features1.performanceCharacteristics, features2.performanceCharacteristics),
            compatibility: this.isVersionAtLeast(version2, version1) ? 'upgrade' :
                this.isVersionAtLeast(version1, version2) ? 'downgrade' : 'incompatible'
        };
    }
    /**
     * Check if version1 is at least version2
     */
    isVersionAtLeast(version1, version2) {
        const parseVersion = (v) => v.split('.').map(Number);
        const v1Parts = parseVersion(version1);
        const v2Parts = parseVersion(version2);
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            if (v1Part > v2Part)
                return true;
            if (v1Part < v2Part)
                return false;
        }
        return true; // Equal versions
    }
    /**
     * Initialize the feature matrix for all versions
     */
    initializeFeatureMatrix() {
        // UEP v1.0 Features
        this.featureMatrix.set('1.0', {
            version: '1.0',
            features: [
                'basic-validation',
                'agent-registration',
                'message-routing',
                'simple-error-handling',
                'basic-logging'
            ],
            capabilities: [
                'send-message',
                'receive-message',
                'register-agent',
                'basic-monitoring'
            ],
            limitations: [
                'no-circuit-breaker',
                'no-advanced-validation',
                'no-compression',
                'no-performance-monitoring',
                'limited-error-reporting',
                'no-service-mesh',
                'no-distributed-tracing'
            ],
            securityFeatures: [
                'basic-authentication',
                'api-key-support',
                'tls-encryption'
            ],
            performanceCharacteristics: {
                maxThroughput: 1000,
                averageLatency: 150,
                memoryFootprint: 'low',
                cpuOverhead: 'minimal',
                networkEfficiency: 'basic',
                concurrency: 10,
                scalability: 'limited'
            }
        });
        // UEP v1.1 Features
        this.featureMatrix.set('1.1', {
            version: '1.1',
            features: [
                'basic-validation',
                'agent-registration',
                'message-routing',
                'enhanced-error-reporting',
                'structured-metadata',
                'compression-support',
                'request-correlation',
                'improved-logging'
            ],
            capabilities: [
                'send-message',
                'receive-message',
                'register-agent',
                'enhanced-monitoring',
                'metadata-management',
                'error-analysis'
            ],
            limitations: [
                'no-circuit-breaker',
                'no-service-mesh-integration',
                'no-distributed-tracing',
                'limited-performance-monitoring'
            ],
            securityFeatures: [
                'basic-authentication',
                'api-key-support',
                'jwt-support',
                'tls-encryption',
                'mutual-tls'
            ],
            performanceCharacteristics: {
                maxThroughput: 2500,
                averageLatency: 120,
                memoryFootprint: 'low',
                cpuOverhead: 'low',
                networkEfficiency: 'optimized',
                concurrency: 25,
                scalability: 'moderate'
            }
        });
        // UEP v2.0 Features
        this.featureMatrix.set('2.0', {
            version: '2.0',
            features: [
                'basic-validation',
                'agent-registration',
                'message-routing',
                'enhanced-error-reporting',
                'structured-metadata',
                'compression-support',
                'request-correlation',
                'circuit-breaker-integration',
                'advanced-validation',
                'service-mesh-integration',
                'load-balancing',
                'health-monitoring',
                'metrics-collection',
                'advanced-logging'
            ],
            capabilities: [
                'send-message',
                'receive-message',
                'register-agent',
                'advanced-monitoring',
                'metadata-management',
                'error-analysis',
                'circuit-breaking',
                'load-balancing',
                'health-checking',
                'metrics-reporting'
            ],
            limitations: [
                'no-distributed-tracing',
                'no-auto-scaling-integration'
            ],
            securityFeatures: [
                'basic-authentication',
                'api-key-support',
                'jwt-support',
                'oauth2-support',
                'tls-encryption',
                'mutual-tls',
                'end-to-end-encryption',
                'rbac-support'
            ],
            performanceCharacteristics: {
                maxThroughput: 5000,
                averageLatency: 80,
                memoryFootprint: 'medium',
                cpuOverhead: 'optimized',
                networkEfficiency: 'advanced',
                concurrency: 100,
                scalability: 'high'
            }
        });
        // UEP v2.1 Features
        this.featureMatrix.set('2.1', {
            version: '2.1',
            features: [
                'basic-validation',
                'agent-registration',
                'message-routing',
                'enhanced-error-reporting',
                'structured-metadata',
                'compression-support',
                'request-correlation',
                'circuit-breaker-integration',
                'advanced-validation',
                'service-mesh-integration',
                'load-balancing',
                'health-monitoring',
                'metrics-collection',
                'distributed-tracing',
                'performance-monitoring',
                'auto-scaling-integration',
                'streaming-support',
                'multiplexing',
                'comprehensive-logging'
            ],
            capabilities: [
                'send-message',
                'receive-message',
                'register-agent',
                'comprehensive-monitoring',
                'metadata-management',
                'error-analysis',
                'circuit-breaking',
                'load-balancing',
                'health-checking',
                'metrics-reporting',
                'distributed-tracing',
                'performance-analysis',
                'auto-scaling',
                'streaming',
                'multiplexing'
            ],
            limitations: [],
            securityFeatures: [
                'basic-authentication',
                'api-key-support',
                'jwt-support',
                'oauth2-support',
                'tls-encryption',
                'mutual-tls',
                'end-to-end-encryption',
                'rbac-support',
                'attribute-based-access-control',
                'zero-trust-networking'
            ],
            performanceCharacteristics: {
                maxThroughput: 10000,
                averageLatency: 50,
                memoryFootprint: 'medium',
                cpuOverhead: 'minimal',
                networkEfficiency: 'advanced',
                concurrency: 250,
                scalability: 'elastic'
            }
        });
    }
    /**
     * Initialize capability definitions
     */
    initializeCapabilityDefinitions() {
        const capabilities = [
            {
                name: 'basic-messaging',
                description: 'Send and receive basic UEP messages',
                requiredFeatures: ['basic-validation', 'message-routing'],
                optionalFeatures: [],
                minimumVersion: '1.0',
                performanceImpact: 'none'
            },
            {
                name: 'enhanced-error-handling',
                description: 'Advanced error reporting and analysis',
                requiredFeatures: ['enhanced-error-reporting', 'structured-metadata'],
                optionalFeatures: ['compression-support'],
                minimumVersion: '1.1',
                performanceImpact: 'low'
            },
            {
                name: 'circuit-breaking',
                description: 'Circuit breaker pattern implementation',
                requiredFeatures: ['circuit-breaker-integration', 'health-monitoring'],
                optionalFeatures: ['metrics-collection'],
                minimumVersion: '2.0',
                performanceImpact: 'medium'
            },
            {
                name: 'service-mesh-integration',
                description: 'Full service mesh capabilities',
                requiredFeatures: ['service-mesh-integration', 'load-balancing'],
                optionalFeatures: ['advanced-validation'],
                minimumVersion: '2.0',
                performanceImpact: 'medium'
            },
            {
                name: 'distributed-observability',
                description: 'Distributed tracing and monitoring',
                requiredFeatures: ['distributed-tracing', 'performance-monitoring'],
                optionalFeatures: ['auto-scaling-integration'],
                minimumVersion: '2.1',
                performanceImpact: 'high'
            }
        ];
        capabilities.forEach(cap => {
            this.capabilityDefinitions.set(cap.name, cap);
        });
    }
    /**
     * Initialize feature compatibility matrix
     */
    initializeFeatureCompatibility() {
        const features = [
            {
                feature: 'basic-validation',
                supportedVersions: ['1.0', '1.1', '2.0', '2.1'],
                introducedIn: '1.0'
            },
            {
                feature: 'enhanced-error-reporting',
                supportedVersions: ['1.1', '2.0', '2.1'],
                introducedIn: '1.1',
                enhancedIn: ['2.0']
            },
            {
                feature: 'circuit-breaker-integration',
                supportedVersions: ['2.0', '2.1'],
                introducedIn: '2.0',
                enhancedIn: ['2.1']
            },
            {
                feature: 'distributed-tracing',
                supportedVersions: ['2.1'],
                introducedIn: '2.1'
            },
            {
                feature: 'compression-support',
                supportedVersions: ['1.1', '2.0', '2.1'],
                introducedIn: '1.1',
                enhancedIn: ['2.0', '2.1']
            }
        ];
        features.forEach(feature => {
            this.featureCompatibility.set(feature.feature, feature);
        });
    }
    /**
     * Build version features dynamically
     */
    buildVersionFeatures(version) {
        const features = new Set();
        const capabilities = new Set();
        // Add core features available in all versions
        features.add('basic-validation');
        features.add('agent-registration');
        features.add('message-routing');
        capabilities.add('send-message');
        capabilities.add('receive-message');
        capabilities.add('register-agent');
        // Add version-specific features
        if (this.isVersionAtLeast(version, '1.1')) {
            features.add('enhanced-error-reporting');
            features.add('structured-metadata');
            features.add('compression-support');
            capabilities.add('enhanced-monitoring');
            capabilities.add('metadata-management');
        }
        if (this.isVersionAtLeast(version, '2.0')) {
            features.add('circuit-breaker-integration');
            features.add('advanced-validation');
            features.add('service-mesh-integration');
            features.add('load-balancing');
            capabilities.add('circuit-breaking');
            capabilities.add('load-balancing');
        }
        if (this.isVersionAtLeast(version, '2.1')) {
            features.add('distributed-tracing');
            features.add('performance-monitoring');
            features.add('auto-scaling-integration');
            capabilities.add('distributed-tracing');
            capabilities.add('performance-analysis');
        }
        return {
            version,
            features: Array.from(features),
            capabilities: Array.from(capabilities),
            limitations: this.getVersionLimitations(version),
            securityFeatures: this.getVersionSecurityFeatures(version),
            performanceCharacteristics: this.getVersionPerformanceCharacteristics(version)
        };
    }
    /**
     * Get limitations for a version
     */
    getVersionLimitations(version) {
        const limitations = [];
        if (!this.isVersionAtLeast(version, '1.1')) {
            limitations.push('limited-error-reporting', 'no-compression');
        }
        if (!this.isVersionAtLeast(version, '2.0')) {
            limitations.push('no-circuit-breaker', 'no-service-mesh');
        }
        if (!this.isVersionAtLeast(version, '2.1')) {
            limitations.push('no-distributed-tracing', 'no-auto-scaling');
        }
        return limitations;
    }
    /**
     * Get security features for a version
     */
    getVersionSecurityFeatures(version) {
        const features = ['basic-authentication', 'tls-encryption'];
        if (this.isVersionAtLeast(version, '1.1')) {
            features.push('jwt-support', 'mutual-tls');
        }
        if (this.isVersionAtLeast(version, '2.0')) {
            features.push('oauth2-support', 'rbac-support');
        }
        if (this.isVersionAtLeast(version, '2.1')) {
            features.push('zero-trust-networking');
        }
        return features;
    }
    /**
     * Get performance characteristics for a version
     */
    getVersionPerformanceCharacteristics(version) {
        const baselinePerf = {
            maxThroughput: 1000,
            averageLatency: 150,
            memoryFootprint: 'low',
            cpuOverhead: 'minimal',
            networkEfficiency: 'basic',
            concurrency: 10,
            scalability: 'limited'
        };
        if (this.isVersionAtLeast(version, '1.1')) {
            baselinePerf.maxThroughput = 2500;
            baselinePerf.averageLatency = 120;
            baselinePerf.networkEfficiency = 'optimized';
            baselinePerf.concurrency = 25;
            baselinePerf.scalability = 'moderate';
        }
        if (this.isVersionAtLeast(version, '2.0')) {
            baselinePerf.maxThroughput = 5000;
            baselinePerf.averageLatency = 80;
            baselinePerf.memoryFootprint = 'medium';
            baselinePerf.cpuOverhead = 'optimized';
            baselinePerf.networkEfficiency = 'advanced';
            baselinePerf.concurrency = 100;
            baselinePerf.scalability = 'high';
        }
        if (this.isVersionAtLeast(version, '2.1')) {
            baselinePerf.maxThroughput = 10000;
            baselinePerf.averageLatency = 50;
            baselinePerf.cpuOverhead = 'minimal';
            baselinePerf.concurrency = 250;
            baselinePerf.scalability = 'elastic';
        }
        return baselinePerf;
    }
    /**
     * Calculate version score based on requirements
     */
    calculateVersionScore(features, requirements) {
        let score = 0;
        // Feature requirements scoring
        if (requirements.requiredFeatures) {
            const hasAllRequired = requirements.requiredFeatures.every(f => features.features.includes(f));
            if (!hasAllRequired)
                return 0; // Disqualify if missing required features
            score += 50; // Base score for meeting requirements
        }
        // Optional feature bonus
        if (requirements.optionalFeatures) {
            const optionalCount = requirements.optionalFeatures.filter(f => features.features.includes(f)).length;
            score += (optionalCount / requirements.optionalFeatures.length) * 20;
        }
        // Performance scoring
        if (requirements.performanceRequirements) {
            const perfReq = requirements.performanceRequirements;
            const perfChar = features.performanceCharacteristics;
            if (perfReq.minThroughput && perfChar.maxThroughput >= perfReq.minThroughput) {
                score += 10;
            }
            if (perfReq.maxLatency && perfChar.averageLatency <= perfReq.maxLatency) {
                score += 10;
            }
        }
        // Stability bonus (older versions are more stable)
        const versionAge = { '1.0': 4, '1.1': 3, '2.0': 2, '2.1': 1 };
        score += (versionAge[features.version] || 0) * 2;
        return score;
    }
    /**
     * Generate reasoning for version recommendation
     */
    generateRecommendationReasoning(features, requirements) {
        const reasons = [];
        if (requirements.requiredFeatures) {
            const hasAll = requirements.requiredFeatures.every(f => features.features.includes(f));
            if (hasAll) {
                reasons.push(`Supports all required features: ${requirements.requiredFeatures.join(', ')}`);
            }
        }
        if (requirements.performanceRequirements) {
            const perf = features.performanceCharacteristics;
            reasons.push(`Performance: ${perf.maxThroughput} req/s throughput, ${perf.averageLatency}ms latency`);
        }
        if (features.limitations.length === 0) {
            reasons.push('No known limitations');
        }
        else if (features.limitations.length < 3) {
            reasons.push('Minimal limitations');
        }
        return reasons.join('; ');
    }
    /**
     * Compare performance characteristics between versions
     */
    comparePerformanceCharacteristics(perf1, perf2) {
        return {
            throughputChange: ((perf2.maxThroughput - perf1.maxThroughput) / perf1.maxThroughput) * 100,
            latencyChange: ((perf2.averageLatency - perf1.averageLatency) / perf1.averageLatency) * 100,
            memoryFootprintChange: this.compareFootprint(perf1.memoryFootprint, perf2.memoryFootprint),
            cpuOverheadChange: this.compareOverhead(perf1.cpuOverhead, perf2.cpuOverhead),
            concurrencyChange: ((perf2.concurrency - perf1.concurrency) / perf1.concurrency) * 100
        };
    }
    /**
     * Compare memory footprint levels
     */
    compareFootprint(footprint1, footprint2) {
        const levels = { 'minimal': 1, 'low': 2, 'medium': 3, 'high': 4 };
        const level1 = levels[footprint1] || 2;
        const level2 = levels[footprint2] || 2;
        if (level2 > level1)
            return 'increased';
        if (level2 < level1)
            return 'decreased';
        return 'unchanged';
    }
    /**
     * Compare CPU overhead levels
     */
    compareOverhead(overhead1, overhead2) {
        const levels = { 'minimal': 1, 'low': 2, 'optimized': 1.5, 'medium': 3, 'high': 4 };
        const level1 = levels[overhead1] || 2;
        const level2 = levels[overhead2] || 2;
        if (level2 > level1)
            return 'increased';
        if (level2 < level1)
            return 'decreased';
        return 'unchanged';
    }
}
exports.VersionFeatureDetector = VersionFeatureDetector;
//# sourceMappingURL=VersionFeatureDetector.js.map