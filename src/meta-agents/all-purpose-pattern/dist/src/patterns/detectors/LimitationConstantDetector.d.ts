/**
 * Limitation Constant Detector
 *
 * Detects hardcoded numeric constants that impose business limitations
 * Following All-Purpose Pattern: Identifies ANY hardcoded constraint values
 * Context7-enhanced with intelligent limitation pattern recognition
 */
import { Node } from '@babel/types';
import { NodePath } from '@babel/traverse';
import { BasePatternDetector, DetectionResult, DetectionContext, PatternDetectorConfig } from '../types';
export interface LimitationConstantDetectorConfig extends PatternDetectorConfig {
    minLimitValue?: number;
    maxLimitValue?: number;
    limitationPatterns?: RegExp[];
    excludeConstants?: number[];
    checkVariableNamesOnly?: boolean;
    includeZeroValues?: boolean;
}
/**
 * Detects hardcoded numeric constants that represent limitations
 * Examples: const maxItems = 50; const limitPerUser = 10; const MAX_INDUSTRIES = 25;
 */
export declare class LimitationConstantDetector extends BasePatternDetector {
    readonly name = "LimitationConstantDetector";
    readonly description = "Detects hardcoded numeric constants that impose business limitations or constraints";
    readonly version = "1.0.0";
    readonly supportedNodeTypes: string[];
    protected config: LimitationConstantDetectorConfig;
    detect(node: Node, path: NodePath, context: DetectionContext): DetectionResult[];
    /**
     * Detect limitation constants in variable declarations
     * Example: const maxUsers = 100; const USER_LIMIT = 50;
     */
    private detectVariableLimitation;
    /**
     * Detect limitation constants in object properties
     * Example: { maxItems: 50, userLimit: 100 }
     */
    private detectPropertyLimitation;
    /**
     * Detect limitation constants in assignments
     * Example: this.maxUsers = 100; limits.itemCount = 50;
     */
    private detectAssignmentLimitation;
    /**
     * Determine if a constant should be analyzed based on configuration
     */
    private shouldAnalyzeConstant;
    /**
     * Calculate limitation score (0-1) based on naming and value patterns
     */
    private calculateLimitationScore;
    /**
     * Assess how suspicious a numeric value is as a business limitation
     */
    private assessValueSuspicion;
    /**
     * Analyze surrounding context for business-related terms
     */
    private analyzeContext;
    /**
     * Assess the impact of a limitation based on value and context
     */
    private assessImpact;
    /**
     * Classify the type of limitation based on name and value
     */
    private classifyLimitationType;
    /**
     * Get matching limitation patterns for context
     */
    private getMatchingLimitationPatterns;
    /**
     * Convert camelCase to config key (snake_case)
     */
    private camelToConfigKey;
}
//# sourceMappingURL=LimitationConstantDetector.d.ts.map