/**
 * Pattern Detection Engine
 *
 * Unified API for detecting hardcoded patterns in JavaScript/TypeScript code
 * Following All-Purpose Pattern: NO hardcoded limitations on analysis scope
 * Context7-enhanced with comprehensive pattern detection capabilities
 */
import { PatternRegistry } from './PatternRegistry';
import { DetectionResult, DetectionContext, AnalysisReport } from './types';
export interface PatternDetectionConfig {
    registry?: PatternRegistry;
    concurrency?: number;
    includeNodeModules?: boolean;
    fileExtensions?: string[];
    excludePatterns?: RegExp[];
    includePatterns?: RegExp[];
    maxFileSize?: number;
    timeoutPerFile?: number;
    enableDetailedMetrics?: boolean;
    stopOnFirstError?: boolean;
}
export interface FileAnalysisOptions {
    filePath?: string;
    encoding?: BufferEncoding;
    skipValidation?: boolean;
    customContext?: Partial<DetectionContext>;
}
export interface DirectoryAnalysisOptions {
    recursive?: boolean;
    maxDepth?: number;
    followSymlinks?: boolean;
    customFilters?: Array<(filePath: string) => boolean>;
}
export interface CodebaseAnalysisOptions extends DirectoryAnalysisOptions {
    generateReport?: boolean;
    reportFormat?: 'json' | 'markdown' | 'html';
    outputPath?: string;
}
/**
 * Main engine for pattern detection - orchestrates all detectors
 * Provides unified API for analyzing files, directories, and codebases
 */
export declare class PatternDetectionEngine {
    private parser;
    private registry;
    private config;
    constructor(config?: PatternDetectionConfig);
    /**
     * Analyze a single file for hardcoded patterns
     * Following All-Purpose Pattern: Works with ANY JavaScript/TypeScript file
     */
    analyzeFile(filePath: string, options?: FileAnalysisOptions): Promise<DetectionResult[]>;
    /**
     * Analyze a directory for hardcoded patterns
     * Following All-Purpose Pattern: Works with ANY directory structure
     */
    analyzeDirectory(dirPath: string, options?: DirectoryAnalysisOptions): Promise<Record<string, DetectionResult[]>>;
    /**
     * Analyze an entire codebase and generate comprehensive report
     * Following All-Purpose Pattern: Works with ANY codebase structure
     */
    analyzeCodebase(rootPath: string, options?: CodebaseAnalysisOptions): Promise<AnalysisReport>;
    /**
     * Analyze code string directly without file I/O
     * Following All-Purpose Pattern: Works with ANY JavaScript/TypeScript code
     */
    analyzeCode(source: string, filePath?: string, customContext?: Partial<DetectionContext>): DetectionResult[];
    /**
     * Get engine statistics and performance metrics
     */
    getStatistics(): {
        registryStats: any;
        configuration: PatternDetectionConfig;
        supportedFileTypes: string[];
        enabledDetectors: string[];
    };
    /**
     * Configure the detection engine
     */
    configure(config: Partial<PatternDetectionConfig>): void;
    /**
     * Detect patterns in an AST (async version)
     */
    private detectPatternsInAST;
    /**
     * Detect patterns in an AST (synchronous version)
     */
    private detectPatternsInASTSync;
    /**
     * Create detection context from parse result
     */
    private createDetectionContext;
    /**
     * Detect framework from source code
     */
    private detectFramework;
    /**
     * Find all analyzable files in a directory
     */
    private findAnalyzableFiles;
    /**
     * Determine if a file should be analyzed
     */
    private shouldAnalyzeFile;
    /**
     * Generate comprehensive analysis report
     */
    private generateAnalysisReport;
    /**
     * Generate file-specific report
     */
    private generateFileReport;
    /**
     * Generate overall recommendations
     */
    private generateRecommendations;
    /**
     * Generate file-specific recommendations
     */
    private generateFileRecommendations;
    /**
     * Get detector versions for metadata
     */
    private getDetectorVersions;
    /**
     * Save analysis report to file
     */
    private saveReport;
    /**
     * Generate markdown report
     */
    private generateMarkdownReport;
    /**
     * Generate HTML report
     */
    private generateHTMLReport;
    /**
     * Utility to chunk array for concurrency control
     */
    private chunkArray;
}
/**
 * Default engine instance ready to use
 */
export declare const defaultDetectionEngine: PatternDetectionEngine;
/**
 * Factory function to create custom detection engine
 */
export declare function createDetectionEngine(config?: PatternDetectionConfig): PatternDetectionEngine;
//# sourceMappingURL=PatternDetectionEngine.d.ts.map