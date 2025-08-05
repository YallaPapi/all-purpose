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
export interface VersionFeatures {
    version: string;
    features: string[];
    capabilities: string[];
    limitations: string[];
    securityFeatures: string[];
    performanceCharacteristics: PerformanceCharacteristics;
    deprecationInfo?: DeprecationInfo;
}
export interface PerformanceCharacteristics {
    maxThroughput: number;
    averageLatency: number;
    memoryFootprint: 'minimal' | 'low' | 'medium' | 'high';
    cpuOverhead: 'minimal' | 'low' | 'optimized' | 'medium' | 'high';
    networkEfficiency: 'basic' | 'optimized' | 'advanced';
    concurrency: number;
    scalability: 'limited' | 'moderate' | 'high' | 'elastic';
}
export interface DeprecationInfo {
    isDeprecated: boolean;
    deprecatedSince: string;
    endOfLifeDate?: string;
    replacementVersion: string;
    migrationPath: string;
}
export interface FeatureCompatibility {
    feature: string;
    supportedVersions: string[];
    introducedIn: string;
    enhancedIn?: string[];
    deprecatedIn?: string;
    removedIn?: string;
}
export interface CapabilityDefinition {
    name: string;
    description: string;
    requiredFeatures: string[];
    optionalFeatures: string[];
    minimumVersion: string;
    performanceImpact: 'none' | 'low' | 'medium' | 'high';
}
/**
 * Version Feature Detector and Manager
 */
export declare class VersionFeatureDetector {
    private featureMatrix;
    private capabilityDefinitions;
    private featureCompatibility;
    constructor();
    /**
     * Detect features available in a specific version
     */
    detectFeatures(version: string): VersionFeatures;
    /**
     * Check if a specific feature is supported in a version
     */
    isFeatureSupported(version: string, feature: string): boolean;
    /**
     * Check if a capability is supported in a version
     */
    isCapabilitySupported(version: string, capability: string): boolean;
    /**
     * Get all features introduced in a specific version
     */
    getFeaturesIntroducedIn(version: string): string[];
    /**
     * Get all features enhanced in a specific version
     */
    getFeaturesEnhancedIn(version: string): string[];
    /**
     * Find minimum version that supports a set of features
     */
    findMinimumVersionForFeatures(requiredFeatures: string[]): string | null;
    /**
     * Get optimal version for a set of requirements
     */
    getOptimalVersion(requirements: VersionRequirements): VersionRecommendation;
    /**
     * Compare two versions and get feature differences
     */
    compareVersions(version1: string, version2: string): VersionComparison;
    /**
     * Check if version1 is at least version2
     */
    isVersionAtLeast(version1: string, version2: string): boolean;
    /**
     * Initialize the feature matrix for all versions
     */
    private initializeFeatureMatrix;
    /**
     * Initialize capability definitions
     */
    private initializeCapabilityDefinitions;
    /**
     * Initialize feature compatibility matrix
     */
    private initializeFeatureCompatibility;
    /**
     * Build version features dynamically
     */
    private buildVersionFeatures;
    /**
     * Get limitations for a version
     */
    private getVersionLimitations;
    /**
     * Get security features for a version
     */
    private getVersionSecurityFeatures;
    /**
     * Get performance characteristics for a version
     */
    private getVersionPerformanceCharacteristics;
    /**
     * Calculate version score based on requirements
     */
    private calculateVersionScore;
    /**
     * Generate reasoning for version recommendation
     */
    private generateRecommendationReasoning;
    /**
     * Compare performance characteristics between versions
     */
    private comparePerformanceCharacteristics;
    /**
     * Compare memory footprint levels
     */
    private compareFootprint;
    /**
     * Compare CPU overhead levels
     */
    private compareOverhead;
}
export interface VersionRequirements {
    requiredFeatures?: string[];
    optionalFeatures?: string[];
    performanceRequirements?: {
        minThroughput?: number;
        maxLatency?: number;
        maxMemoryFootprint?: string;
        maxCpuOverhead?: string;
    };
    securityRequirements?: string[];
}
export interface VersionRecommendation {
    recommendedVersion: string;
    score: number;
    features: VersionFeatures;
    reasoning: string;
    alternatives: Array<{
        version: string;
        score: number;
        reasoning: string;
    }>;
}
export interface VersionComparison {
    version1: string;
    version2: string;
    newFeatures: string[];
    removedFeatures: string[];
    commonFeatures: string[];
    newCapabilities: string[];
    removedCapabilities: string[];
    performanceComparison: PerformanceComparison;
    compatibility: 'upgrade' | 'downgrade' | 'incompatible';
}
export interface PerformanceComparison {
    throughputChange: number;
    latencyChange: number;
    memoryFootprintChange: string;
    cpuOverheadChange: string;
    concurrencyChange: number;
}
//# sourceMappingURL=VersionFeatureDetector.d.ts.map