/**
 * Anti-Pattern Detection Types
 *
 * Universal types for detecting ANY hardcoded limitations in code
 * Following All-Purpose Pattern: NO hardcoded constraints on detection scope
 * Enhanced with Context7 best practices for extensible pattern detection
 */
import { Node } from '@babel/types';
import { NodePath } from '@babel/traverse';
export type AntiPatternType = 'hardcoded_array' | 'limitation_constant' | 'conditional_logic' | 'hardcoded_endpoint' | 'hardcoded_text' | 'business_logic_restriction' | 'geographic_limitation' | 'numeric_constraint' | 'enum_limitation' | 'configuration_hardcoding' | string;
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export interface DetectionResult {
    type: AntiPatternType;
    severity: SeverityLevel;
    node: Node;
    path: NodePath;
    file: string;
    location: {
        line: number;
        column: number;
        start: number;
        end: number;
    };
    code: string;
    description: string;
    recommendation: string;
    context: {
        parentType?: string;
        scope?: string;
        exports?: boolean;
        imports?: string[];
        [key: string]: any;
    };
    metadata: {
        confidence: number;
        impact: 'breaking' | 'major' | 'minor' | 'cosmetic';
        fixComplexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'architectural';
        tags: string[];
        [key: string]: any;
    };
}
export interface PatternDetectorConfig {
    enabled?: boolean;
    severity?: SeverityLevel;
    confidence?: number;
    customRules?: Record<string, any>;
    excludePatterns?: RegExp[];
    includePatterns?: RegExp[];
    [key: string]: any;
}
export interface PatternDetector {
    readonly name: string;
    readonly description: string;
    readonly version: string;
    readonly supportedNodeTypes: string[];
    detect(node: Node, path: NodePath, context: DetectionContext): DetectionResult[];
    configure(config: PatternDetectorConfig): void;
    getConfiguration(): PatternDetectorConfig;
    validateNode(node: Node): boolean;
}
export interface DetectionContext {
    file: string;
    source: string;
    isTypeScript: boolean;
    ast: Node;
    imports: string[];
    exports: string[];
    scope: {
        variables: string[];
        functions: string[];
        classes: string[];
        [key: string]: any;
    };
    projectContext?: {
        packageJson?: Record<string, any>;
        framework?: string;
        dependencies?: string[];
        [key: string]: any;
    };
    [key: string]: any;
}
export interface AnalysisReport {
    summary: {
        totalPatterns: number;
        criticalCount: number;
        highCount: number;
        mediumCount: number;
        lowCount: number;
        filesAnalyzed: number;
        analysisTime: number;
    };
    patterns: DetectionResult[];
    fileReports: Record<string, FileReport>;
    recommendations: string[];
    statistics: {
        patternsByType: Record<AntiPatternType, number>;
        patternsBySeverity: Record<SeverityLevel, number>;
        averageConfidence: number;
        topIssues: DetectionResult[];
    };
    metadata: {
        detectorVersions: Record<string, string>;
        analysisDate: string;
        configuration: Record<string, any>;
        [key: string]: any;
    };
}
export interface FileReport {
    file: string;
    patterns: DetectionResult[];
    summary: {
        totalPatterns: number;
        criticalCount: number;
        highCount: number;
        mediumCount: number;
        lowCount: number;
    };
    metrics: {
        codeQualityScore: number;
        maintainabilityIndex: number;
        technicalDebt: 'low' | 'medium' | 'high' | 'critical';
    };
    recommendations: string[];
}
export interface PatternRegistry {
    register(detector: PatternDetector): void;
    unregister(name: string): void;
    get(name: string): PatternDetector | undefined;
    getAll(): PatternDetector[];
    getByNodeType(nodeType: string): PatternDetector[];
    configure(detectorName: string, config: PatternDetectorConfig): void;
    configureAll(config: Record<string, PatternDetectorConfig>): void;
}
/**
 * Base class for all pattern detectors - implements common functionality
 * Following All-Purpose Pattern: NO hardcoded limitations in base implementation
 */
export declare abstract class BasePatternDetector implements PatternDetector {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly version: string;
    abstract readonly supportedNodeTypes: string[];
    protected config: PatternDetectorConfig;
    abstract detect(node: Node, path: NodePath, context: DetectionContext): DetectionResult[];
    configure(config: PatternDetectorConfig): void;
    getConfiguration(): PatternDetectorConfig;
    validateNode(node: Node): boolean;
    /**
     * Helper method to create detection result - ensures consistent format
     */
    protected createResult(type: AntiPatternType, node: Node, path: NodePath, context: DetectionContext, overrides?: Partial<DetectionResult>): DetectionResult;
    /**
     * Extract code snippet from source - handles edge cases
     */
    protected extractCode(node: Node, source: string): string;
    /**
     * Check if node is exported - useful for severity assessment
     */
    protected isExported(path: NodePath): boolean;
    /**
     * Calculate severity based on context - dynamic severity assessment
     */
    protected calculateSeverity(node: Node, path: NodePath, context: DetectionContext, baseSeverity?: SeverityLevel): SeverityLevel;
    /**
     * Helper to increase severity level
     */
    private increaseSeverity;
}
//# sourceMappingURL=types.d.ts.map