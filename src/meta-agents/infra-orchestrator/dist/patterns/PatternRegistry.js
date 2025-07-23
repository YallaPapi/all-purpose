/**
 * Pattern Registry
 *
 * Use context7: Central registry for managing all anti-pattern detectors
 * Following All-Purpose Pattern: Configurable registry that can work with ANY set of detectors
 */
import { HardcodedArrayDetector } from './detectors/HardcodedArrayDetector.js';
import { LimitationConstantDetector } from './detectors/LimitationConstantDetector.js';
import { ConditionalLogicDetector } from './detectors/ConditionalLogicDetector.js';
import { HardcodedEndpointDetector } from './detectors/HardcodedEndpointDetector.js';
import { HardcodedUITextDetector } from './detectors/HardcodedUITextDetector.js';
export class PatternRegistry {
    detectors = new Map();
    config;
    constructor(config) {
        this.config = this.mergeWithDefaults(config);
        this.registerDefaultDetectors();
    }
    /**
     * Register a new pattern detector
     */
    registerDetector(detector) {
        this.detectors.set(detector.id, detector);
    }
    /**
     * Unregister a pattern detector
     */
    unregisterDetector(detectorId) {
        return this.detectors.delete(detectorId);
    }
    /**
     * Get a specific detector by ID
     */
    getDetector(detectorId) {
        return this.detectors.get(detectorId);
    }
    /**
     * Get all registered detectors
     */
    getAllDetectors() {
        return Array.from(this.detectors.values());
    }
    /**
     * Get enabled detectors based on configuration
     */
    getEnabledDetectors() {
        return Array.from(this.detectors.values()).filter(detector => this.isDetectorEnabled(detector.id));
    }
    /**
     * Get detector configuration
     */
    getDetectorConfig(detectorId) {
        switch (detectorId) {
            case 'hardcoded-arrays':
                return this.config.hardcodedArrays;
            case 'limitation-constants':
                return this.config.limitationConstants;
            case 'conditional-logic':
                return this.config.conditionalLogic;
            case 'hardcoded-endpoints':
                return this.config.hardcodedEndpoints;
            case 'hardcoded-ui-text':
                return this.config.hardcodedUIText;
            default:
                return undefined;
        }
    }
    /**
     * Update detector configuration
     */
    updateDetectorConfig(detectorId, config) {
        const currentConfig = this.getDetectorConfig(detectorId);
        if (currentConfig) {
            Object.assign(currentConfig, config);
        }
    }
    /**
     * Get global configuration
     */
    getGlobalConfig() {
        return { ...this.config };
    }
    /**
     * Update global configuration
     */
    updateGlobalConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Run all enabled detectors on a file
     */
    async detectInFile(filePath, sourceCode) {
        const enabledDetectors = this.getEnabledDetectors();
        const results = [];
        // Check global file exclusions
        if (this.isFileExcluded(filePath)) {
            return results;
        }
        // Run detectors in parallel for better performance
        const detectionPromises = enabledDetectors.map(async (detector) => {
            try {
                const detectorResults = await detector.detect(filePath, sourceCode);
                return this.filterAndAdjustResults(detector.id, detectorResults);
            }
            catch (error) {
                console.warn(`Detector ${detector.id} failed on ${filePath}:`, error);
                return [];
            }
        });
        const allResults = await Promise.all(detectionPromises);
        // Flatten and sort results by severity and line number
        return allResults
            .flat()
            .sort((a, b) => {
            // Sort by severity first (error > warning > info)
            const severityOrder = { error: 3, warning: 2, info: 1 };
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            if (severityDiff !== 0)
                return severityDiff;
            // Then by line number
            return a.lineNumber - b.lineNumber;
        });
    }
    /**
     * Get detector statistics
     */
    getStatistics() {
        const allDetectors = this.getAllDetectors();
        const enabledCount = this.getEnabledDetectors().length;
        return {
            totalDetectors: allDetectors.length,
            enabledDetectors: enabledCount,
            disabledDetectors: allDetectors.length - enabledCount,
            detectorSummary: allDetectors.map(detector => ({
                id: detector.id,
                name: detector.name,
                enabled: this.isDetectorEnabled(detector.id),
                severity: this.getDetectorConfig(detector.id)?.severity || 'warning'
            }))
        };
    }
    registerDefaultDetectors() {
        // Register all built-in detectors
        this.registerDetector(new HardcodedArrayDetector());
        this.registerDetector(new LimitationConstantDetector());
        this.registerDetector(new ConditionalLogicDetector());
        this.registerDetector(new HardcodedEndpointDetector());
        this.registerDetector(new HardcodedUITextDetector());
    }
    mergeWithDefaults(config) {
        const defaults = {
            hardcodedArrays: {
                enabled: true,
                severity: 'warning',
                patterns: [],
                exclusions: ['test', 'spec', '__tests__']
            },
            limitationConstants: {
                enabled: true,
                severity: 'warning',
                patterns: [],
                exclusions: ['config', 'constant', 'enum']
            },
            conditionalLogic: {
                enabled: true,
                severity: 'warning',
                patterns: [],
                exclusions: ['test', 'spec']
            },
            hardcodedEndpoints: {
                enabled: true,
                severity: 'error',
                patterns: [],
                exclusions: ['test', 'mock']
            },
            hardcodedUIText: {
                enabled: true,
                severity: 'info',
                patterns: [],
                exclusions: ['test', 'spec', 'story', 'stories']
            },
            globalExclusions: [
                'node_modules/**',
                'dist/**',
                'build/**',
                '**/*.test.*',
                '**/*.spec.*',
                '**/*.d.ts'
            ],
            filePatterns: [
                '**/*.js',
                '**/*.jsx',
                '**/*.ts',
                '**/*.tsx',
                '**/*.vue',
                '**/*.svelte'
            ]
        };
        return this.deepMerge(defaults, config || {});
    }
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
    isDetectorEnabled(detectorId) {
        const config = this.getDetectorConfig(detectorId);
        return config?.enabled ?? false;
    }
    isFileExcluded(filePath) {
        const exclusions = this.config.globalExclusions || [];
        return exclusions.some(pattern => {
            // Simple glob pattern matching
            const regexPattern = pattern
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '.');
            return new RegExp(regexPattern).test(filePath);
        });
    }
    filterAndAdjustResults(detectorId, results) {
        const config = this.getDetectorConfig(detectorId);
        if (!config)
            return results;
        return results
            .filter(result => !this.isResultExcluded(result, config))
            .map(result => ({
            ...result,
            severity: config.severity // Override severity with configured value
        }));
    }
    isResultExcluded(result, config) {
        const exclusions = config.exclusions || [];
        // Check if the file path contains any exclusion patterns
        return exclusions.some(exclusion => result.filePath.toLowerCase().includes(exclusion.toLowerCase()) ||
            result.message.toLowerCase().includes(exclusion.toLowerCase()));
    }
}
//# sourceMappingURL=PatternRegistry.js.map