#!/usr/bin/env node
/**
 * All-Purpose Pattern Agent - Main Entry Point
 *
 * This meta-agent implements the All-Purpose Pattern methodology by:
 * 1. Detecting hardcoded anti-patterns in ANY codebase
 * 2. Transforming limitations into universal, configuration-driven systems
 * 3. Generating Context7-enhanced code with NO hardcoded constraints
 * 4. Validating unlimited scalability and industry-agnostic design
 *
 * Architecture Pattern: Analyze → Transform → Validate → Generate
 * Integration: TaskMaster API, Context7, PRD-Parser, Scaffold-Generator
 */
import { EventEmitter } from 'events';
export interface AllPurposePatternConfig {
    sourceDir?: string;
    outputDir?: string;
    recursive?: boolean;
    filePattern?: RegExp;
    exclude?: RegExp[];
    concurrency?: number;
    transformationEnabled?: boolean;
    validationEnabled?: boolean;
    templateGeneration?: boolean;
    contextEnabled?: boolean;
    taskMasterIntegration?: boolean;
    maxFiles?: number;
    maxDepth?: number;
    [key: string]: any;
}
export interface ProcessingResult {
    success: boolean;
    analysis?: AnalysisResult;
    transformation?: TransformationResult;
    validation?: ValidationResult;
    performance: {
        totalTime: number;
        filesProcessed: number;
        errorsCount: number;
    };
}
export interface AnalysisResult {
    antiPatterns: AntiPatternFinding[];
    codebaseStats: {
        totalFiles: number;
        totalNodes: number;
        complexity: number;
        languages: string[];
    };
    recommendations: string[];
}
export interface AntiPatternFinding {
    type: 'hardcoded_array' | 'limitation_constant' | 'conditional_logic' | 'hardcoded_endpoint' | 'hardcoded_text';
    severity: 'critical' | 'high' | 'medium' | 'low';
    file: string;
    location: {
        line: number;
        column: number;
    };
    code: string;
    description: string;
    recommendation: string;
}
export interface TransformationResult {
    transformedFiles: string[];
    templatesGenerated: string[];
    configurationSchema: Record<string, any>;
}
export interface ValidationResult {
    isUniversal: boolean;
    hasLimitations: boolean;
    issues: ValidationIssue[];
}
export interface ValidationIssue {
    type: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    file?: string;
    suggestion?: string;
}
/**
 * All-Purpose Pattern Agent - Transforms ANY hardcoded system to universal
 * NO limitations on codebase size, languages, or patterns detected
 */
export declare class AllPurposePatternAgent extends EventEmitter {
    private config;
    private astParser;
    private astTraversal;
    private isInitialized;
    constructor(config?: AllPurposePatternConfig);
    /**
     * Initialize the agent - Context7 enhanced setup
     */
    initialize(): Promise<void>;
    /**
     * Process codebase - main entry point for analysis and transformation
     */
    process(input?: {
        sourceCode?: string;
        sourceDirectory?: string;
        outputDirectory?: string;
        configuration?: Record<string, any>;
        context?: Record<string, any>;
    }): Promise<ProcessingResult>;
    /**
     * Analyze codebase for anti-patterns - detects ALL hardcoded limitations
     */
    private analyzeAntiPatterns;
    /**
     * Transform codebase to universal patterns
     */
    private transformCodebase;
    /**
     * Validate that transformed code has no limitations
     */
    private validateUniversality;
    /**
     * Initialize Context7 patterns
     */
    private initializeContext7;
    /**
     * Generate recommendations based on findings
     */
    private generateRecommendations;
    /**
     * Get agent capabilities
     */
    getCapabilities(): Record<string, any>;
}
export default AllPurposePatternAgent;
//# sourceMappingURL=main.d.ts.map