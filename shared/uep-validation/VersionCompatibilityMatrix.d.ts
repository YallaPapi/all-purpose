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
export interface VersionFeatures {
    version: string;
    features: string[];
    capabilities: string[];
    limitations: string[];
}
export interface CompatibilityRule {
    sourceVersion: string;
    targetVersion: string;
    compatible: boolean;
    requiresTransformation: boolean;
    transformationComplexity: 'simple' | 'moderate' | 'complex';
    notes?: string;
}
export interface MigrationPath {
    fromVersion: string;
    toVersion: string;
    steps: MigrationStep[];
    estimatedDuration: string;
    riskLevel: 'low' | 'medium' | 'high';
    rollbackSupported: boolean;
}
export interface MigrationStep {
    id: string;
    description: string;
    type: 'schema' | 'data' | 'config' | 'validation';
    required: boolean;
    estimatedTime: string;
}
export interface DeprecatedVersion {
    version: string;
    deprecatedDate: Date;
    endOfLifeDate: Date;
    replacementVersion: string;
    migrationGuideUrl?: string;
}
export interface VersionCompatibilityInfo {
    canCommunicateWith: string[];
    canUpgradeTo: string[];
    deprecatedIn: string | null;
    endOfLifeIn: string | null;
    features: string[];
    limitations: string[];
    securityFeatures: string[];
    performanceCharacteristics: Record<string, any>;
}
export type VersionCompatibilityMatrix = Record<string, VersionCompatibilityInfo>;
/**
 * Comprehensive compatibility matrix for UEP protocol versions
 */
export declare const COMPATIBILITY_MATRIX: VersionCompatibilityMatrix;
/**
 * Migration paths between UEP protocol versions
 */
export declare const MIGRATION_PATHS: MigrationPath[];
/**
 * Deprecated versions and their lifecycle information
 */
export declare const DEPRECATED_VERSIONS: DeprecatedVersion[];
/**
 * Version Compatibility Manager
 */
export declare class VersionCompatibilityManager {
    private matrix;
    private migrationPaths;
    private deprecatedVersions;
    constructor();
    /**
     * Check if two versions can communicate directly
     */
    canCommunicate(version1: string, version2: string): boolean;
    /**
     * Check if version can be upgraded to target version
     */
    canUpgradeTo(fromVersion: string, toVersion: string): boolean;
    /**
     * Get features available in a specific version
     */
    getVersionFeatures(version: string): string[];
    /**
     * Get limitations of a specific version
     */
    getVersionLimitations(version: string): string[];
    /**
     * Check if version is deprecated
     */
    isVersionDeprecated(version: string): boolean;
    /**
     * Get deprecation information for a version
     */
    getDeprecationInfo(version: string): DeprecatedVersion | null;
    /**
     * Get migration path between two versions
     */
    getMigrationPath(fromVersion: string, toVersion: string): MigrationPath | null;
    /**
     * Get all available migration paths from a version
     */
    getAvailableMigrations(fromVersion: string): MigrationPath[];
    /**
     * Validate compatibility between versions with detailed result
     */
    validateCompatibility(sourceVersion: string, targetVersion: string): CompatibilityResult;
    /**
     * Check if transformation path exists between versions
     */
    private hasTransformationPath;
    /**
     * Calculate performance impact of version compatibility
     */
    private calculatePerformanceImpact;
    /**
     * Compare memory footprint between versions
     */
    private compareMemoryFootprint;
    /**
     * Compare CPU overhead between versions
     */
    private compareCpuOverhead;
}
export interface CompatibilityResult {
    compatible: boolean;
    requiresTransformation: boolean;
    issues: string[];
    recommendations: string[];
    migrationPath?: MigrationPath | null;
    performanceImpact?: PerformanceImpact;
}
export interface PerformanceImpact {
    throughputChange: number;
    latencyChange: number;
    memoryImpact: string;
    cpuImpact: string;
}
//# sourceMappingURL=VersionCompatibilityMatrix.d.ts.map