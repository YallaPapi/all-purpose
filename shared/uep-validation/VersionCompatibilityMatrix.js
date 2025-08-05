"use strict";
/**
 * UEP Version Compatibility Matrix
 *
 * Defines compatibility rules, migration paths, and feature support
 * across different UEP protocol versions for the Meta-Agent Factory system.
 *
 * Key Features:
 * - Version compatibility checking
 * - Feature support mapping
 * - Migration path definitions
 * - Deprecation lifecycle management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionCompatibilityManager = exports.DEPRECATED_VERSIONS = exports.MIGRATION_PATHS = exports.COMPATIBILITY_MATRIX = void 0;
/**
 * Comprehensive compatibility matrix for UEP protocol versions
 */
exports.COMPATIBILITY_MATRIX = {
    "1.0": {
        canCommunicateWith: ["1.0", "1.1"],
        canUpgradeTo: ["1.1", "2.0"],
        deprecatedIn: "2.1",
        endOfLifeIn: "3.0",
        features: [
            "basic-validation",
            "agent-registration",
            "message-routing",
            "simple-error-handling"
        ],
        limitations: [
            "no-circuit-breaker",
            "no-advanced-validation",
            "no-compression",
            "no-performance-monitoring",
            "limited-error-reporting"
        ],
        securityFeatures: [
            "basic-authentication",
            "api-key-support",
            "tls-encryption"
        ],
        performanceCharacteristics: {
            maxThroughput: 1000,
            averageLatency: 150,
            memoryFootprint: "low",
            cpuOverhead: "minimal"
        }
    },
    "1.1": {
        canCommunicateWith: ["1.0", "1.1", "2.0"],
        canUpgradeTo: ["2.0", "2.1"],
        deprecatedIn: null,
        endOfLifeIn: null,
        features: [
            "basic-validation",
            "agent-registration",
            "message-routing",
            "enhanced-error-reporting",
            "structured-metadata",
            "compression-support",
            "request-correlation"
        ],
        limitations: [
            "no-circuit-breaker",
            "no-service-mesh-integration",
            "no-distributed-tracing",
            "limited-performance-monitoring"
        ],
        securityFeatures: [
            "basic-authentication",
            "api-key-support",
            "jwt-support",
            "tls-encryption",
            "mutual-tls"
        ],
        performanceCharacteristics: {
            maxThroughput: 2500,
            averageLatency: 120,
            memoryFootprint: "low",
            cpuOverhead: "low"
        }
    },
    "2.0": {
        canCommunicateWith: ["1.1", "2.0", "2.1"],
        canUpgradeTo: ["2.1", "3.0"],
        deprecatedIn: null,
        endOfLifeIn: null,
        features: [
            "basic-validation",
            "agent-registration",
            "message-routing",
            "enhanced-error-reporting",
            "structured-metadata",
            "compression-support",
            "request-correlation",
            "circuit-breaker-integration",
            "advanced-validation",
            "service-mesh-integration",
            "load-balancing",
            "health-monitoring",
            "metrics-collection"
        ],
        limitations: [
            "no-distributed-tracing",
            "no-auto-scaling-integration"
        ],
        securityFeatures: [
            "basic-authentication",
            "api-key-support",
            "jwt-support",
            "oauth2-support",
            "tls-encryption",
            "mutual-tls",
            "end-to-end-encryption",
            "rbac-support"
        ],
        performanceCharacteristics: {
            maxThroughput: 5000,
            averageLatency: 80,
            memoryFootprint: "medium",
            cpuOverhead: "optimized"
        }
    },
    "2.1": {
        canCommunicateWith: ["2.0", "2.1", "3.0"],
        canUpgradeTo: ["3.0"],
        deprecatedIn: null,
        endOfLifeIn: null,
        features: [
            "basic-validation",
            "agent-registration",
            "message-routing",
            "enhanced-error-reporting",
            "structured-metadata",
            "compression-support",
            "request-correlation",
            "circuit-breaker-integration",
            "advanced-validation",
            "service-mesh-integration",
            "load-balancing",
            "health-monitoring",
            "metrics-collection",
            "distributed-tracing",
            "performance-monitoring",
            "auto-scaling-integration",
            "streaming-support",
            "multiplexing"
        ],
        limitations: [],
        securityFeatures: [
            "basic-authentication",
            "api-key-support",
            "jwt-support",
            "oauth2-support",
            "tls-encryption",
            "mutual-tls",
            "end-to-end-encryption",
            "rbac-support",
            "attribute-based-access-control",
            "zero-trust-networking"
        ],
        performanceCharacteristics: {
            maxThroughput: 10000,
            averageLatency: 50,
            memoryFootprint: "medium",
            cpuOverhead: "minimal"
        }
    }
};
/**
 * Migration paths between UEP protocol versions
 */
exports.MIGRATION_PATHS = [
    {
        fromVersion: "1.0",
        toVersion: "1.1",
        estimatedDuration: "2-4 hours",
        riskLevel: "low",
        rollbackSupported: true,
        steps: [
            {
                id: "schema-update-1.1",
                description: "Update message schema to support enhanced error reporting",
                type: "schema",
                required: true,
                estimatedTime: "30 minutes"
            },
            {
                id: "metadata-support",
                description: "Add structured metadata support to agent configurations",
                type: "config",
                required: true,
                estimatedTime: "1 hour"
            },
            {
                id: "compression-config",
                description: "Configure compression support for improved performance",
                type: "config",
                required: false,
                estimatedTime: "30 minutes"
            },
            {
                id: "validation-update",
                description: "Update validation rules to v1.1 specifications",
                type: "validation",
                required: true,
                estimatedTime: "1-2 hours"
            }
        ]
    },
    {
        fromVersion: "1.1",
        toVersion: "2.0",
        estimatedDuration: "1-2 days",
        riskLevel: "medium",
        rollbackSupported: true,
        steps: [
            {
                id: "circuit-breaker-integration",
                description: "Integrate circuit breaker patterns into agent communication",
                type: "schema",
                required: true,
                estimatedTime: "4-6 hours"
            },
            {
                id: "service-mesh-setup",
                description: "Configure service mesh integration for enhanced networking",
                type: "config",
                required: true,
                estimatedTime: "6-8 hours"
            },
            {
                id: "advanced-validation",
                description: "Implement advanced validation engine with comprehensive rules",
                type: "validation",
                required: true,
                estimatedTime: "4-6 hours"
            },
            {
                id: "load-balancing-config",
                description: "Configure load balancing strategies for agent coordination",
                type: "config",
                required: false,
                estimatedTime: "2-3 hours"
            },
            {
                id: "monitoring-setup",
                description: "Setup health monitoring and metrics collection",
                type: "config",
                required: true,
                estimatedTime: "3-4 hours"
            }
        ]
    },
    {
        fromVersion: "2.0",
        toVersion: "2.1",
        estimatedDuration: "4-8 hours",
        riskLevel: "low",
        rollbackSupported: true,
        steps: [
            {
                id: "distributed-tracing",
                description: "Enable distributed tracing for request flow visibility",
                type: "config",
                required: true,
                estimatedTime: "2-3 hours"
            },
            {
                id: "performance-monitoring",
                description: "Integrate advanced performance monitoring capabilities",
                type: "config",
                required: true,
                estimatedTime: "1-2 hours"
            },
            {
                id: "auto-scaling-integration",
                description: "Configure auto-scaling integration for dynamic resource management",
                type: "config",
                required: false,
                estimatedTime: "2-3 hours"
            },
            {
                id: "streaming-support",
                description: "Enable streaming support for large data transfers",
                type: "schema",
                required: false,
                estimatedTime: "1-2 hours"
            }
        ]
    },
    {
        fromVersion: "1.0",
        toVersion: "2.0",
        estimatedDuration: "2-3 days",
        riskLevel: "high",
        rollbackSupported: true,
        steps: [
            {
                id: "intermediate-upgrade-1.1",
                description: "Upgrade to v1.1 as intermediate step",
                type: "schema",
                required: true,
                estimatedTime: "2-4 hours"
            },
            {
                id: "circuit-breaker-integration",
                description: "Integrate circuit breaker patterns",
                type: "schema",
                required: true,
                estimatedTime: "4-6 hours"
            },
            {
                id: "service-mesh-setup",
                description: "Full service mesh configuration",
                type: "config",
                required: true,
                estimatedTime: "8-12 hours"
            },
            {
                id: "advanced-validation",
                description: "Complete validation engine overhaul",
                type: "validation",
                required: true,
                estimatedTime: "6-8 hours"
            },
            {
                id: "security-upgrade",
                description: "Upgrade security features to v2.0 specifications",
                type: "config",
                required: true,
                estimatedTime: "4-6 hours"
            }
        ]
    }
];
/**
 * Deprecated versions and their lifecycle information
 */
exports.DEPRECATED_VERSIONS = [
    {
        version: "1.0",
        deprecatedDate: new Date("2024-06-01"),
        endOfLifeDate: new Date("2025-12-31"),
        replacementVersion: "1.1",
        migrationGuideUrl: "https://docs.uep-system.com/migration/v1.0-to-v1.1"
    }
];
/**
 * Version Compatibility Manager
 */
class VersionCompatibilityManager {
    constructor() {
        this.matrix = exports.COMPATIBILITY_MATRIX;
        this.migrationPaths = exports.MIGRATION_PATHS;
        this.deprecatedVersions = exports.DEPRECATED_VERSIONS;
    }
    /**
     * Check if two versions can communicate directly
     */
    canCommunicate(version1, version2) {
        const info = this.matrix[version1];
        return info ? info.canCommunicateWith.includes(version2) : false;
    }
    /**
     * Check if version can be upgraded to target version
     */
    canUpgradeTo(fromVersion, toVersion) {
        const info = this.matrix[fromVersion];
        return info ? info.canUpgradeTo.includes(toVersion) : false;
    }
    /**
     * Get features available in a specific version
     */
    getVersionFeatures(version) {
        const info = this.matrix[version];
        return info ? info.features : [];
    }
    /**
     * Get limitations of a specific version
     */
    getVersionLimitations(version) {
        const info = this.matrix[version];
        return info ? info.limitations : [];
    }
    /**
     * Check if version is deprecated
     */
    isVersionDeprecated(version) {
        return this.deprecatedVersions.some(dv => dv.version === version);
    }
    /**
     * Get deprecation information for a version
     */
    getDeprecationInfo(version) {
        return this.deprecatedVersions.find(dv => dv.version === version) || null;
    }
    /**
     * Get migration path between two versions
     */
    getMigrationPath(fromVersion, toVersion) {
        return this.migrationPaths.find(mp => mp.fromVersion === fromVersion && mp.toVersion === toVersion) || null;
    }
    /**
     * Get all available migration paths from a version
     */
    getAvailableMigrations(fromVersion) {
        return this.migrationPaths.filter(mp => mp.fromVersion === fromVersion);
    }
    /**
     * Validate compatibility between versions with detailed result
     */
    validateCompatibility(sourceVersion, targetVersion) {
        const canCommunicate = this.canCommunicate(sourceVersion, targetVersion);
        const requiresTransformation = !canCommunicate &&
            (this.canCommunicate(targetVersion, sourceVersion) ||
                this.hasTransformationPath(sourceVersion, targetVersion));
        const sourceInfo = this.matrix[sourceVersion];
        const targetInfo = this.matrix[targetVersion];
        if (!sourceInfo || !targetInfo) {
            return {
                compatible: false,
                requiresTransformation: false,
                issues: [`Unknown version: ${!sourceInfo ? sourceVersion : targetVersion}`],
                recommendations: []
            };
        }
        const issues = [];
        const recommendations = [];
        // Check for deprecated versions
        if (this.isVersionDeprecated(sourceVersion)) {
            const deprecationInfo = this.getDeprecationInfo(sourceVersion);
            issues.push(`Source version ${sourceVersion} is deprecated since ${deprecationInfo?.deprecatedDate}`);
            recommendations.push(`Upgrade to ${deprecationInfo?.replacementVersion} or later`);
        }
        // Check for feature compatibility
        const missingFeatures = targetInfo.features.filter(feature => !sourceInfo.features.includes(feature));
        if (missingFeatures.length > 0) {
            issues.push(`Source version lacks features: ${missingFeatures.join(', ')}`);
            recommendations.push('Consider upgrading source version for full feature compatibility');
        }
        // Check for security compatibility
        const missingSecurityFeatures = targetInfo.securityFeatures.filter(feature => !sourceInfo.securityFeatures.includes(feature));
        if (missingSecurityFeatures.length > 0) {
            issues.push(`Source version lacks security features: ${missingSecurityFeatures.join(', ')}`);
            recommendations.push('Upgrade for enhanced security features');
        }
        return {
            compatible: canCommunicate,
            requiresTransformation,
            issues,
            recommendations,
            migrationPath: this.getMigrationPath(sourceVersion, targetVersion),
            performanceImpact: this.calculatePerformanceImpact(sourceInfo, targetInfo)
        };
    }
    /**
     * Check if transformation path exists between versions
     */
    hasTransformationPath(sourceVersion, targetVersion) {
        // Simple check: can source communicate with any version that can communicate with target
        const sourceInfo = this.matrix[sourceVersion];
        const targetInfo = this.matrix[targetVersion];
        if (!sourceInfo || !targetInfo)
            return false;
        // Direct transformation possible if versions are in same major version
        const sourceMajor = parseInt(sourceVersion.split('.')[0]);
        const targetMajor = parseInt(targetVersion.split('.')[0]);
        return sourceMajor === targetMajor;
    }
    /**
     * Calculate performance impact of version compatibility
     */
    calculatePerformanceImpact(sourceInfo, targetInfo) {
        const sourcePerf = sourceInfo.performanceCharacteristics;
        const targetPerf = targetInfo.performanceCharacteristics;
        const throughputImpact = (targetPerf.maxThroughput - sourcePerf.maxThroughput) / sourcePerf.maxThroughput;
        const latencyImpact = (targetPerf.averageLatency - sourcePerf.averageLatency) / sourcePerf.averageLatency;
        return {
            throughputChange: throughputImpact,
            latencyChange: latencyImpact,
            memoryImpact: this.compareMemoryFootprint(sourcePerf.memoryFootprint, targetPerf.memoryFootprint),
            cpuImpact: this.compareCpuOverhead(sourcePerf.cpuOverhead, targetPerf.cpuOverhead)
        };
    }
    /**
     * Compare memory footprint between versions
     */
    compareMemoryFootprint(source, target) {
        const levels = { 'low': 1, 'medium': 2, 'high': 3 };
        const sourceLevel = levels[source] || 2;
        const targetLevel = levels[target] || 2;
        if (targetLevel > sourceLevel)
            return 'increased';
        if (targetLevel < sourceLevel)
            return 'decreased';
        return 'unchanged';
    }
    /**
     * Compare CPU overhead between versions
     */
    compareCpuOverhead(source, target) {
        const levels = { 'minimal': 1, 'low': 2, 'optimized': 1.5, 'medium': 3, 'high': 4 };
        const sourceLevel = levels[source] || 2;
        const targetLevel = levels[target] || 2;
        if (targetLevel > sourceLevel)
            return 'increased';
        if (targetLevel < sourceLevel)
            return 'decreased';
        return 'unchanged';
    }
}
exports.VersionCompatibilityManager = VersionCompatibilityManager;
//# sourceMappingURL=VersionCompatibilityMatrix.js.map