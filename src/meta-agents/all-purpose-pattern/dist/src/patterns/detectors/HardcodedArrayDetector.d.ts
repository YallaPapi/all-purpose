/**
 * Hardcoded Array Detector
 *
 * Detects hardcoded arrays that represent business limitations
 * Following All-Purpose Pattern: Identifies ANY hardcoded list constraints
 * Context7-enhanced with intelligent business logic detection
 */
import { Node } from '@babel/types';
import { NodePath } from '@babel/traverse';
import { BasePatternDetector, DetectionResult, DetectionContext, PatternDetectorConfig } from '../types';
export interface HardcodedArrayDetectorConfig extends PatternDetectorConfig {
    minArraySize?: number;
    maxArraySize?: number;
    businessTermPatterns?: RegExp[];
    excludeVariableNames?: string[];
    includeOnlyExports?: boolean;
    checkStringArraysOnly?: boolean;
}
/**
 * Detects hardcoded arrays that impose business limitations
 * Examples: ['automotive', 'dental', 'legal'], ['US', 'UK', 'CA'], ['max', 'premium']
 */
export declare class HardcodedArrayDetector extends BasePatternDetector {
    readonly name = "HardcodedArrayDetector";
    readonly description = "Detects hardcoded arrays that represent business limitations or constraints";
    readonly version = "1.0.0";
    readonly supportedNodeTypes: string[];
    protected config: HardcodedArrayDetectorConfig;
    detect(node: Node, path: NodePath, context: DetectionContext): DetectionResult[];
    /**
     * Detect hardcoded arrays in variable declarations
     * Example: const industries = ['automotive', 'dental', 'legal'];
     */
    private detectVariableArray;
    /**
     * Detect hardcoded arrays in object properties
     * Example: { supportedCountries: ['US', 'UK', 'CA'] }
     */
    private detectPropertyArray;
    /**
     * Detect hardcoded arrays in assignments
     * Example: this.allowedIndustries = ['tech', 'finance'];
     */
    private detectAssignmentArray;
    /**
     * Determine if an array should be analyzed based on configuration
     */
    private shouldAnalyzeArray;
    /**
     * Calculate business logic score (0-1) based on naming and content patterns
     */
    private calculateBusinessScore;
    /**
     * Analyze array content to determine if it represents business logic
     */
    private analyzeArrayContent;
    /**
     * Get types of elements in array for metadata
     */
    private getElementTypes;
    /**
     * Get matching business terms for context
     */
    private getMatchingBusinessTerms;
    /**
     * Convert camelCase to config key (snake_case)
     */
    private camelToConfigKey;
}
//# sourceMappingURL=HardcodedArrayDetector.d.ts.map