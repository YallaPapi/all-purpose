/**
 * Pattern Registry
 *
 * Central registry for managing all pattern detectors
 * Following All-Purpose Pattern: NO hardcoded limitations on detector types
 * Context7-enhanced with dynamic detector management and configuration
 */
import { PatternDetector, PatternRegistry as IPatternRegistry, PatternDetectorConfig } from './types';
export interface PatternRegistryConfig {
    autoRegisterBuiltins?: boolean;
    enabledByDefault?: boolean;
    defaultSeverity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
    defaultConfidence?: number;
    allowDuplicateNames?: boolean;
    validateDetectors?: boolean;
}
/**
 * Central registry for pattern detectors - manages unlimited detector types
 * Provides registration, configuration, and retrieval of all pattern detectors
 */
export declare class PatternRegistry implements IPatternRegistry {
    private detectors;
    private nodeTypeIndex;
    private config;
    constructor(config?: PatternRegistryConfig);
    /**
     * Register a pattern detector
     * Following All-Purpose Pattern: Accepts ANY detector implementation
     */
    register(detector: PatternDetector): void;
    /**
     * Unregister a pattern detector by name
     */
    unregister(name: string): void;
    /**
     * Get a specific detector by name
     */
    get(name: string): PatternDetector | undefined;
    /**
     * Get all registered detectors
     * Returns copy to prevent external modification
     */
    getAll(): PatternDetector[];
    /**
     * Get all detectors that support a specific node type
     * Optimized for fast lookups during AST traversal
     */
    getByNodeType(nodeType: string): PatternDetector[];
    /**
     * Configure a specific detector
     */
    configure(detectorName: string, config: PatternDetectorConfig): void;
    /**
     * Configure multiple detectors at once
     * Following All-Purpose Pattern: Accepts ANY detector configurations
     */
    configureAll(configs: Record<string, PatternDetectorConfig>): void;
    /**
     * Get enabled detectors only
     */
    getEnabled(): PatternDetector[];
    /**
     * Get detectors by severity level
     */
    getBySeverity(severity: 'critical' | 'high' | 'medium' | 'low' | 'info'): PatternDetector[];
    /**
     * Get registry statistics
     */
    getStatistics(): {
        totalDetectors: number;
        enabledDetectors: number;
        disabledDetectors: number;
        detectorsByType: Record<string, number>;
        supportedNodeTypes: string[];
        averageConfidence: number;
    };
    /**
     * Enable all detectors
     */
    enableAll(): void;
    /**
     * Disable all detectors
     */
    disableAll(): void;
    /**
     * Enable detectors by severity
     */
    enableBySeverity(severities: ('critical' | 'high' | 'medium' | 'low' | 'info')[]): void;
    /**
     * Reset all detectors to default configuration
     */
    resetAll(): void;
    /**
     * Export registry configuration
     */
    exportConfiguration(): Record<string, PatternDetectorConfig>;
    /**
     * Import registry configuration
     */
    importConfiguration(configs: Record<string, PatternDetectorConfig>): void;
    /**
     * Clone registry with same configuration
     */
    clone(): PatternRegistry;
    /**
     * Register all built-in detectors
     * Following All-Purpose Pattern: Registers ALL available detectors
     */
    private registerBuiltinDetectors;
    /**
     * Validate a detector implementation
     */
    private validateDetector;
    /**
     * Update node type index for fast lookups
     */
    private updateNodeTypeIndex;
    /**
     * Remove detector from node type index
     */
    private removeFromNodeTypeIndex;
}
/**
 * Default pattern registry instance with all built-in detectors
 * Ready to use out of the box - follows All-Purpose Pattern
 */
export declare const defaultPatternRegistry: PatternRegistry;
/**
 * Create a custom registry with specific configuration
 */
export declare function createPatternRegistry(config?: PatternRegistryConfig): PatternRegistry;
/**
 * Factory function to create registry with only specific detector types
 */
export declare function createRegistryWithDetectors(detectorNames: string[]): PatternRegistry;
//# sourceMappingURL=PatternRegistry.d.ts.map