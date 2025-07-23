/**
 * Pattern Detection Engine
 *
 * Use context7: Unified API for running anti-pattern detection across codebases
 * Following All-Purpose Pattern: Configurable engine that works with ANY project structure
 */
import { PatternRegistry } from './PatternRegistry.js';
import { AnalysisReport, PatternDetectionConfig } from './types.js';
export interface CodebaseAnalysisReport {
    projectPath: string;
    analysisTimestamp: Date;
    totalFiles: number;
    analyzedFiles: number;
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    analysisTime: number;
    fileReports: Record<string, AnalysisReport>;
    summary: {
        mostCommonIssues: Array<{
            ruleId: string;
            count: number;
            severity: 'error' | 'warning' | 'info';
        }>;
        filesByIssueCount: Array<{
            filePath: string;
            issueCount: number;
        }>;
        detectorPerformance: Array<{
            detectorId: string;
            filesAnalyzed: number;
            issuesFound: number;
            averageTime: number;
        }>;
    };
}
export declare class PatternDetectionEngine {
    private registry;
    constructor(config?: Partial<PatternDetectionConfig>);
    /**
     * Analyze a single file for anti-patterns
     */
    analyzeFile(filePath: string): Promise<AnalysisReport>;
    /**
     * Analyze a directory for anti-patterns
     */
    analyzeDirectory(dirPath: string): Promise<Record<string, AnalysisReport>>;
    /**
     * Analyze an entire codebase and generate a comprehensive report
     */
    analyzeCodebase(rootPath: string): Promise<CodebaseAnalysisReport>;
    /**
     * Get pattern registry for configuration
     */
    getRegistry(): PatternRegistry;
    /**
     * Generate a summary report for a codebase analysis
     */
    generateSummaryReport(codebaseReport: CodebaseAnalysisReport): string;
    private findFiles;
    private createAnalysisReport;
    private createErrorReport;
    private generateCodebaseStatistics;
}
//# sourceMappingURL=PatternDetectionEngine.d.ts.map