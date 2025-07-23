/**
 * Hardcoded UI Text Detector
 *
 * Detects hardcoded user-facing text that creates business limitations
 * Following All-Purpose Pattern: Identifies ANY hardcoded user interface constraints
 * Context7-enhanced with intelligent UI limitation pattern recognition
 */
import { Node } from '@babel/types';
import { NodePath } from '@babel/traverse';
import { BasePatternDetector, DetectionResult, DetectionContext, PatternDetectorConfig } from '../types';
export interface HardcodedUITextDetectorConfig extends PatternDetectorConfig {
    limitationPhrases?: RegExp[];
    businessTermPatterns?: RegExp[];
    excludeGenericText?: boolean;
    minTextLength?: number;
    maxTextLength?: number;
    checkTemplateStrings?: boolean;
    uiContextPatterns?: RegExp[];
    minimumLimitationScore?: number;
}
/**
 * Detects hardcoded UI text that imposes business limitations
 * Examples: 'Only available for automotive industry', 'Maximum 10 users', 'US customers only'
 */
export declare class HardcodedUITextDetector extends BasePatternDetector {
    readonly name = "HardcodedUITextDetector";
    readonly description = "Detects hardcoded user-facing text that creates business limitations or constraints";
    readonly version = "1.0.0";
    readonly supportedNodeTypes: string[];
    protected config: HardcodedUITextDetectorConfig;
    detect(node: Node, path: NodePath, context: DetectionContext): DetectionResult[];
    /**
     * Detect hardcoded UI text in variable declarations
     * Example: const errorMessage = 'Only available for premium users';
     */
    private detectVariableUIText;
    /**
     * Detect hardcoded UI text in object properties
     * Example: { placeholder: 'Enter US phone number' }
     */
    private detectPropertyUIText;
    /**
     * Detect hardcoded UI text in assignments
     * Example: this.warningText = 'Feature only available in premium plan';
     */
    private detectAssignmentUIText;
    /**
     * Detect hardcoded UI text in string literals
     * Example: return 'Maximum 5 users allowed';
     */
    private detectStringUIText;
    /**
     * Detect hardcoded UI text in template literals
     * Example: `Only ${maxUsers} users allowed in ${planType} plan`
     */
    private detectTemplateUIText;
    /**
     * Detect hardcoded UI text in JSX text nodes
     * Example: <div>Only available for premium users</div>
     */
    private detectJSXUIText;
    /**
     * Detect hardcoded UI text in JSX expression containers
     * Example: <div>{errorMessage}</div> where errorMessage contains limitations
     */
    private detectJSXExpressionUIText;
    /**
     * Extract text information from various AST value nodes
     */
    private extractTextFromValue;
    /**
     * Determine if text should be analyzed based on configuration
     */
    private shouldAnalyzeText;
    /**
     * Check if text is generic/common UI text that shouldn't be flagged
     */
    private isGenericText;
    /**
     * Calculate limitation score for text content
     */
    private calculateLimitationScore;
    /**
     * Check if variable name suggests UI context
     */
    private isUIVariable;
    /**
     * Check if parent context suggests this is likely UI text
     */
    private isLikelyUIContext;
    /**
     * Check if text contains specific business limitations
     */
    private containsSpecificLimitations;
    /**
     * Find limitation phrases in text for context
     */
    private findLimitationPhrases;
    /**
     * Identify UI context from variable name
     */
    private identifyUIContext;
    /**
     * Assess the impact of hardcoded UI text
     */
    private assessTextImpact;
    /**
     * Truncate text for display in descriptions
     */
    private truncateText;
    /**
     * Convert camelCase to config key (snake_case)
     */
    private camelToConfigKey;
    /**
     * Convert text value to config key
     */
    private valueToConfigKey;
}
//# sourceMappingURL=HardcodedUITextDetector.d.ts.map