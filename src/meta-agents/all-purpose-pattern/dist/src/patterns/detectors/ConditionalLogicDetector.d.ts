/**
 * Conditional Logic Detector
 *
 * Detects if/switch statements based on hardcoded business values
 * Following All-Purpose Pattern: Identifies ANY hardcoded conditional constraints
 * Context7-enhanced with intelligent business logic pattern recognition
 */
import { Node } from '@babel/types';
import { NodePath } from '@babel/traverse';
import { BasePatternDetector, DetectionResult, DetectionContext, PatternDetectorConfig } from '../types';
export interface ConditionalLogicDetectorConfig extends PatternDetectorConfig {
    businessValuePatterns?: RegExp[];
    excludeVariableNames?: string[];
    minCasesForSwitchDetection?: number;
    checkComparisonOperators?: string[];
    includeNestedConditions?: boolean;
    detectTernaryOperators?: boolean;
}
/**
 * Detects conditional logic that imposes business limitations
 * Examples: if (industry === 'automotive'), switch(userType) { case 'premium': ... }
 */
export declare class ConditionalLogicDetector extends BasePatternDetector {
    readonly name = "ConditionalLogicDetector";
    readonly description = "Detects if/switch statements based on hardcoded business values that create limitations";
    readonly version = "1.0.0";
    readonly supportedNodeTypes: string[];
    protected config: ConditionalLogicDetectorConfig;
    detect(node: Node, path: NodePath, context: DetectionContext): DetectionResult[];
    /**
     * Detect hardcoded business logic in if statements
     * Example: if (industry === 'automotive') { ... }
     */
    private detectIfStatement;
    /**
     * Detect hardcoded business logic in switch statements
     * Example: switch(userType) { case 'premium': ... case 'basic': ... }
     */
    private detectSwitchStatement;
    /**
     * Detect hardcoded business logic in ternary expressions
     * Example: userType === 'premium' ? premiumFeatures : basicFeatures
     */
    private detectTernaryExpression;
    /**
     * Analyze a condition to extract business logic patterns
     */
    private analyzeCondition;
    /**
     * Extract variable name from various AST node types
     */
    private extractVariableName;
    /**
     * Extract case values from switch statement cases
     */
    private extractCaseValues;
    /**
     * Determine if a switch statement should be analyzed
     */
    private shouldAnalyzeSwitch;
    /**
     * Check if a variable-value combination represents business logic
     */
    private isBusinessValue;
    /**
     * Check if a variable name suggests business logic
     */
    private isBusinessVariable;
    /**
     * Calculate business logic score for conditions
     */
    private calculateBusinessScore;
    /**
     * Calculate business logic score for switch statements
     */
    private calculateSwitchBusinessScore;
    /**
     * Assess the impact of conditional business logic
     */
    private assessImpact;
    /**
     * Assess the complexity of a condition
     */
    private assessConditionComplexity;
    /**
     * Convert camelCase to config key (snake_case)
     */
    private camelToConfigKey;
}
//# sourceMappingURL=ConditionalLogicDetector.d.ts.map