/**
 * Pattern Registry
 *
 * Use context7: Central registry for managing all anti-pattern detectors
 * Following All-Purpose Pattern: Configurable registry that can work with ANY set of detectors
 */
import { PatternDetector, DetectionResult, PatternDetectionConfig, DetectorConfig } from './types.js';
export declare class PatternRegistry {
    private detectors;
    private config;
    constructor(config?: Partial<PatternDetectionConfig>);
    /**
     * Register a new pattern detector
     */
    registerDetector(detector: PatternDetector): void;
    /**
     * Unregister a pattern detector
     */
    unregisterDetector(detectorId: string): boolean;
    /**
     * Get a specific detector by ID
     */
    getDetector(detectorId: string): PatternDetector | undefined;
    /**
     * Get all registered detectors
     */
    getAllDetectors(): PatternDetector[];
    /**
     * Get enabled detectors based on configuration
     */
    getEnabledDetectors(): PatternDetector[];
    /**
     * Get detector configuration
     */
    getDetectorConfig(detectorId: string): DetectorConfig | undefined;
    /**
     * Update detector configuration
     */
    updateDetectorConfig(detectorId: string, config: Partial<DetectorConfig>): void;
    /**
     * Get global configuration
     */
    getGlobalConfig(): PatternDetectionConfig;
    /**
     * Update global configuration
     */
    updateGlobalConfig(config: Partial<PatternDetectionConfig>): void;
    /**
     * Run all enabled detectors on a file
     */
    detectInFile(filePath: string, sourceCode: string): Promise<DetectionResult[]>;
    /**
     * Get detector statistics
     */
    getStatistics(): {
        totalDetectors: number;
        enabledDetectors: number;
        disabledDetectors: number;
        detectorSummary: Array<{
            id: string;
            name: string;
            enabled: boolean;
            severity: 'error' | 'warning' | 'info';
        }>;
    };
    private registerDefaultDetectors;
    private mergeWithDefaults;
    private deepMerge;
    private isDetectorEnabled;
    private isFileExcluded;
    private filterAndAdjustResults;
    private isResultExcluded;
}
//# sourceMappingURL=PatternRegistry.d.ts.map