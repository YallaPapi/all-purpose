/**
 * Pattern Detection Engine
 * 
 * Use context7: Unified API for running anti-pattern detection across codebases
 * Following All-Purpose Pattern: Configurable engine that works with ANY project structure
 */

import * as fs from 'fs-extra';
import * as nativeFs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { PatternRegistry } from './PatternRegistry.js';
import { DetectionResult, AnalysisReport, PatternDetectionConfig } from './types.js';

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

export class PatternDetectionEngine {
  private registry: PatternRegistry;

  constructor(config?: Partial<PatternDetectionConfig>) {
    this.registry = new PatternRegistry(config);
  }

  /**
   * Analyze a single file for anti-patterns
   */
  async analyzeFile(filePath: string): Promise<AnalysisReport> {
    const startTime = Date.now();
    
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const sourceCode = await nativeFs.promises.readFile(filePath, 'utf-8');
    const results = await this.registry.detectInFile(filePath, sourceCode);
    
    const analysisTime = Date.now() - startTime;
    
    return this.createAnalysisReport(filePath, results, analysisTime);
  }

  /**
   * Analyze a directory for anti-patterns
   */
  async analyzeDirectory(dirPath: string): Promise<Record<string, AnalysisReport>> {
    if (!await fs.pathExists(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const config = this.registry.getGlobalConfig();
    const filePatterns = config.filePatterns || ['**/*.{js,jsx,ts,tsx}'];
    const exclusions = config.globalExclusions || [];

    // Find all matching files
    const files = await this.findFiles(dirPath, filePatterns, exclusions);
    
    // Analyze files in batches to avoid overwhelming the system
    const batchSize = 10;
    const reports: Record<string, AnalysisReport> = {};
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const report = await this.analyzeFile(file);
          return { file, report };
        } catch (error) {
          console.warn(`Failed to analyze ${file}:`, error);
          return {
            file,
            report: this.createErrorReport(file, error as Error)
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const { file, report } of batchResults) {
        reports[file] = report;
      }
    }

    return reports;
  }

  /**
   * Analyze an entire codebase and generate a comprehensive report
   */
  async analyzeCodebase(rootPath: string): Promise<CodebaseAnalysisReport> {
    const startTime = Date.now();
    
    // Use native fs.existsSync instead of fs-extra pathExists to avoid Docker volume overlay issues
    if (!nativeFs.existsSync(rootPath)) {
      throw new Error(`Root path not found: ${rootPath}`);
    }

    console.log(`🔍 Starting codebase analysis at: ${rootPath}`);
    
    const fileReports = await this.analyzeDirectory(rootPath);
    const analysisTime = Date.now() - startTime;
    
    // Generate comprehensive statistics
    const stats = this.generateCodebaseStatistics(fileReports, analysisTime);
    
    console.log(`✅ Analysis complete! Found ${stats.totalIssues} issues across ${stats.analyzedFiles} files`);
    
    return {
      projectPath: rootPath,
      analysisTimestamp: new Date(),
      ...stats,
      fileReports
    };
  }

  /**
   * Get pattern registry for configuration
   */
  getRegistry(): PatternRegistry {
    return this.registry;
  }

  /**
   * Generate a summary report for a codebase analysis
   */
  generateSummaryReport(codebaseReport: CodebaseAnalysisReport): string {
    const { summary, totalIssues, errorCount, warningCount, infoCount, analysisTime } = codebaseReport;
    
    let report = '';
    report += `📊 Anti-Pattern Detection Report\n`;
    report += `=====================================\n\n`;
    report += `📁 Project: ${codebaseReport.projectPath}\n`;
    report += `⏱️  Analysis Time: ${(analysisTime / 1000).toFixed(2)}s\n`;
    report += `📄 Files Analyzed: ${codebaseReport.analyzedFiles}\n`;
    report += `🚨 Total Issues: ${totalIssues}\n`;
    report += `  • Errors: ${errorCount}\n`;
    report += `  • Warnings: ${warningCount}\n`;
    report += `  • Info: ${infoCount}\n\n`;

    // Most common issues
    report += `🔍 Most Common Issues:\n`;
    report += `----------------------\n`;
    summary.mostCommonIssues.slice(0, 5).forEach((issue, index) => {
      const icon = issue.severity === 'error' ? '🚨' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      report += `${index + 1}. ${icon} ${issue.ruleId}: ${issue.count} occurrences\n`;
    });

    // Files with most issues
    report += `\n📄 Files with Most Issues:\n`;
    report += `--------------------------\n`;
    summary.filesByIssueCount.slice(0, 5).forEach((file, index) => {
      const relativePath = path.relative(codebaseReport.projectPath, file.filePath);
      report += `${index + 1}. ${relativePath}: ${file.issueCount} issues\n`;
    });

    // Detector performance
    report += `\n⚡ Detector Performance:\n`;
    report += `----------------------\n`;
    summary.detectorPerformance.forEach(perf => {
      report += `• ${perf.detectorId}: ${perf.issuesFound} issues in ${perf.filesAnalyzed} files (${perf.averageTime.toFixed(2)}ms avg)\n`;
    });

    return report;
  }

  private async findFiles(dirPath: string, patterns: string[], exclusions: string[]): Promise<string[]> {
    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      const fullPattern = path.join(dirPath, pattern);
      const files = await glob(fullPattern, {
        ignore: exclusions.map(ex => path.join(dirPath, ex)),
        absolute: true
      });
      allFiles.push(...files);
    }
    
    // Remove duplicates and sort
    return [...new Set(allFiles)].sort();
  }

  private createAnalysisReport(filePath: string, results: DetectionResult[], analysisTime: number): AnalysisReport {
    const errorCount = results.filter(r => r.severity === 'error').length;
    const warningCount = results.filter(r => r.severity === 'warning').length;
    const infoCount = results.filter(r => r.severity === 'info').length;

    return {
      filePath,
      totalPatterns: results.length,
      errors: errorCount,
      warnings: warningCount,
      infos: infoCount,
      results,
      analysisTime
    };
  }

  private createErrorReport(filePath: string, error: Error): AnalysisReport {
    return {
      filePath,
      totalPatterns: 0,
      errors: 1,
      warnings: 0,
      infos: 0,
      results: [{
        ruleId: 'analysis-error',
        severity: 'error',
        message: `Analysis failed: ${error.message}`,
        filePath,
        lineNumber: 0,
        columnNumber: 0,
        codeSnippet: '',
        metadata: {
          error: error.message,
          stack: error.stack
        }
      }],
      analysisTime: 0
    };
  }

  private generateCodebaseStatistics(
    fileReports: Record<string, AnalysisReport>, 
    analysisTime: number
  ): Omit<CodebaseAnalysisReport, 'projectPath' | 'analysisTimestamp' | 'fileReports'> {
    const files = Object.keys(fileReports);
    const totalFiles = files.length;
    const analyzedFiles = files.filter(f => fileReports[f].totalPatterns >= 0).length;
    
    let totalIssues = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    
    const issuesByRule = new Map<string, { count: number; severity: 'error' | 'warning' | 'info' }>();
    const detectorStats = new Map<string, { filesAnalyzed: number; issuesFound: number; totalTime: number }>();
    
    for (const [filePath, report] of Object.entries(fileReports)) {
      totalIssues += report.totalPatterns;
      errorCount += report.errors;
      warningCount += report.warnings;
      infoCount += report.infos;
      
      // Track issues by rule
      for (const result of report.results) {
        const existing = issuesByRule.get(result.ruleId);
        if (existing) {
          existing.count++;
        } else {
          issuesByRule.set(result.ruleId, {
            count: 1,
            severity: result.severity
          });
        }
        
        // Track detector performance
        const detectorId = result.ruleId;
        const detectorStat = detectorStats.get(detectorId);
        if (detectorStat) {
          detectorStat.issuesFound++;
        } else {
          detectorStats.set(detectorId, {
            filesAnalyzed: 1,
            issuesFound: 1,
            totalTime: report.analysisTime
          });
        }
      }
    }

    // Generate summary statistics
    const mostCommonIssues = Array.from(issuesByRule.entries())
      .map(([ruleId, stats]) => ({ ruleId, ...stats }))
      .sort((a, b) => b.count - a.count);

    const filesByIssueCount = files
      .map(filePath => ({
        filePath,
        issueCount: fileReports[filePath].totalPatterns
      }))
      .filter(f => f.issueCount > 0)
      .sort((a, b) => b.issueCount - a.issueCount);

    const detectorPerformance = Array.from(detectorStats.entries())
      .map(([detectorId, stats]) => ({
        detectorId,
        filesAnalyzed: analyzedFiles, // All detectors run on all files
        issuesFound: stats.issuesFound,
        averageTime: stats.totalTime / analyzedFiles
      }));

    return {
      totalFiles,
      analyzedFiles,
      totalIssues,
      errorCount,
      warningCount,
      infoCount,
      analysisTime,
      summary: {
        mostCommonIssues,
        filesByIssueCount,
        detectorPerformance
      }
    };
  }
}