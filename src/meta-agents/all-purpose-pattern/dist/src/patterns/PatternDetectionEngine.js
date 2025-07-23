"use strict";
/**
 * Pattern Detection Engine
 *
 * Unified API for detecting hardcoded patterns in JavaScript/TypeScript code
 * Following All-Purpose Pattern: NO hardcoded limitations on analysis scope
 * Context7-enhanced with comprehensive pattern detection capabilities
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultDetectionEngine = exports.PatternDetectionEngine = void 0;
exports.createDetectionEngine = createDetectionEngine;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const astParser_1 = require("../core/astParser");
const PatternRegistry_1 = require("./PatternRegistry");
/**
 * Main engine for pattern detection - orchestrates all detectors
 * Provides unified API for analyzing files, directories, and codebases
 */
class PatternDetectionEngine {
    constructor(config = {}) {
        this.config = {
            registry: PatternRegistry_1.defaultPatternRegistry,
            concurrency: 10,
            includeNodeModules: false,
            fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
            excludePatterns: [
                /node_modules/,
                /\.git/,
                /dist/,
                /build/,
                /coverage/,
                /\.next/,
                /\.nuxt/,
                /\.cache/
            ],
            includePatterns: [],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            timeoutPerFile: 30000, // 30 seconds
            enableDetailedMetrics: true,
            stopOnFirstError: false,
            ...config
        };
        this.parser = new astParser_1.ASTParser();
        this.registry = this.config.registry;
    }
    /**
     * Analyze a single file for hardcoded patterns
     * Following All-Purpose Pattern: Works with ANY JavaScript/TypeScript file
     */
    async analyzeFile(filePath, options = {}) {
        const startTime = Date.now();
        try {
            // Validate file
            if (!options.skipValidation && !await this.shouldAnalyzeFile(filePath)) {
                return [];
            }
            // Parse the file
            const parseResult = await this.parser.parseFile(filePath, options.encoding);
            if ('error' in parseResult) {
                console.warn(`Failed to parse ${filePath}:`, parseResult.error);
                return [];
            }
            // Create detection context
            const context = this.createDetectionContext(parseResult, options.customContext);
            // Detect patterns
            const results = await this.detectPatternsInAST(parseResult.ast, context);
            // Log performance metrics if enabled
            if (this.config.enableDetailedMetrics) {
                const analysisTime = Date.now() - startTime;
                console.debug(`Analyzed ${filePath} in ${analysisTime}ms - found ${results.length} patterns`);
            }
            return results;
        }
        catch (error) {
            if (this.config.stopOnFirstError) {
                throw error;
            }
            console.error(`Error analyzing file ${filePath}:`, error);
            return [];
        }
    }
    /**
     * Analyze a directory for hardcoded patterns
     * Following All-Purpose Pattern: Works with ANY directory structure
     */
    async analyzeDirectory(dirPath, options = {}) {
        const files = await this.findAnalyzableFiles(dirPath, options);
        const results = {};
        // Process files with concurrency control
        const chunks = this.chunkArray(files, this.config.concurrency);
        for (const chunk of chunks) {
            const chunkPromises = chunk.map(async (filePath) => {
                const fileResults = await this.analyzeFile(filePath);
                return { filePath, results: fileResults };
            });
            const chunkResults = await Promise.allSettled(chunkPromises);
            chunkResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    const { filePath, results: fileResults } = result.value;
                    if (fileResults.length > 0) {
                        results[filePath] = fileResults;
                    }
                }
                else {
                    console.error('File analysis failed:', result.reason);
                }
            });
        }
        return results;
    }
    /**
     * Analyze an entire codebase and generate comprehensive report
     * Following All-Purpose Pattern: Works with ANY codebase structure
     */
    async analyzeCodebase(rootPath, options = {}) {
        const startTime = Date.now();
        console.log(`Starting codebase analysis: ${rootPath}`);
        // Analyze all files in the codebase
        const fileResults = await this.analyzeDirectory(rootPath, options);
        // Generate comprehensive report
        const report = this.generateAnalysisReport(fileResults, rootPath, startTime);
        // Save report if requested
        if (options.generateReport && options.outputPath) {
            await this.saveReport(report, options.outputPath, options.reportFormat || 'json');
        }
        console.log(`Codebase analysis complete - found ${report.summary.totalPatterns} patterns in ${report.summary.filesAnalyzed} files`);
        return report;
    }
    /**
     * Analyze code string directly without file I/O
     * Following All-Purpose Pattern: Works with ANY JavaScript/TypeScript code
     */
    analyzeCode(source, filePath = 'inline-code.js', customContext) {
        try {
            // Parse the code
            const parseResult = this.parser.parseCode(source, filePath);
            // Create detection context
            const context = this.createDetectionContext(parseResult, customContext);
            // Detect patterns synchronously
            return this.detectPatternsInASTSync(parseResult.ast, context);
        }
        catch (error) {
            console.error(`Error analyzing code:`, error);
            return [];
        }
    }
    /**
     * Get engine statistics and performance metrics
     */
    getStatistics() {
        return {
            registryStats: this.registry.getStatistics(),
            configuration: this.config,
            supportedFileTypes: this.config.fileExtensions,
            enabledDetectors: this.registry.getEnabled().map(d => d.name)
        };
    }
    /**
     * Configure the detection engine
     */
    configure(config) {
        this.config = { ...this.config, ...config };
        if (config.registry) {
            this.registry = config.registry;
        }
    }
    /**
     * Detect patterns in an AST (async version)
     */
    async detectPatternsInAST(ast, context) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Analysis timeout for ${context.file}`));
            }, this.config.timeoutPerFile);
            try {
                const results = this.detectPatternsInASTSync(ast, context);
                clearTimeout(timeout);
                resolve(results);
            }
            catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }
    /**
     * Detect patterns in an AST (synchronous version)
     */
    detectPatternsInASTSync(ast, context) {
        const allResults = [];
        // Traverse the AST and run applicable detectors on each node
        (0, traverse_1.default)(ast, {
            enter: (path) => {
                const node = path.node;
                const nodeType = node.type;
                // Get all detectors that support this node type
                const applicableDetectors = this.registry.getByNodeType(nodeType);
                // Run each applicable detector
                for (const detector of applicableDetectors) {
                    try {
                        const detectorResults = detector.detect(node, path, context);
                        allResults.push(...detectorResults);
                    }
                    catch (error) {
                        console.warn(`Detector ${detector.name} failed on ${nodeType} in ${context.file}:`, error);
                    }
                }
            }
        });
        return allResults;
    }
    /**
     * Create detection context from parse result
     */
    createDetectionContext(parseResult, customContext) {
        const context = {
            file: parseResult.filePath || 'unknown',
            source: parseResult.source,
            isTypeScript: parseResult.isTypeScript,
            ast: parseResult.ast,
            imports: [], // TODO: Extract imports from AST
            exports: [], // TODO: Extract exports from AST
            scope: {
                variables: [],
                functions: [],
                classes: []
            },
            projectContext: {
                framework: this.detectFramework(parseResult.source),
                dependencies: []
            },
            ...customContext
        };
        return context;
    }
    /**
     * Detect framework from source code
     */
    detectFramework(source) {
        if (source.includes('import React') || source.includes('from \'react\''))
            return 'React';
        if (source.includes('@angular') || source.includes('from \'@angular'))
            return 'Angular';
        if (source.includes('import Vue') || source.includes('from \'vue\''))
            return 'Vue';
        if (source.includes('import { Component }') || source.includes('from \'@stencil'))
            return 'Stencil';
        if (source.includes('import express') || source.includes('from \'express\''))
            return 'Express';
        if (source.includes('import next') || source.includes('from \'next'))
            return 'Next.js';
        return 'Unknown';
    }
    /**
     * Find all analyzable files in a directory
     */
    async findAnalyzableFiles(dirPath, options) {
        const files = [];
        const traverse = async (currentPath, depth = 0) => {
            if (options.maxDepth && depth > options.maxDepth)
                return;
            try {
                const stats = await fs.stat(currentPath);
                if (stats.isFile()) {
                    if (await this.shouldAnalyzeFile(currentPath)) {
                        files.push(currentPath);
                    }
                }
                else if (stats.isDirectory() && (options.recursive !== false)) {
                    const entries = await fs.readdir(currentPath);
                    for (const entry of entries) {
                        const entryPath = path.join(currentPath, entry);
                        await traverse(entryPath, depth + 1);
                    }
                }
            }
            catch (error) {
                console.warn(`Error accessing ${currentPath}:`, error);
            }
        };
        await traverse(dirPath);
        return files;
    }
    /**
     * Determine if a file should be analyzed
     */
    async shouldAnalyzeFile(filePath) {
        try {
            // Check file extension
            const ext = path.extname(filePath);
            if (!this.config.fileExtensions.includes(ext)) {
                return false;
            }
            // Check exclude patterns
            const excludePatterns = this.config.excludePatterns;
            if (excludePatterns.some(pattern => pattern.test(filePath))) {
                return false;
            }
            // Check include patterns (if specified)
            const includePatterns = this.config.includePatterns;
            if (includePatterns.length > 0 && !includePatterns.some(pattern => pattern.test(filePath))) {
                return false;
            }
            // Check file size
            const stats = await fs.stat(filePath);
            if (stats.size > this.config.maxFileSize) {
                console.warn(`Skipping large file: ${filePath} (${stats.size} bytes)`);
                return false;
            }
            return true;
        }
        catch (error) {
            console.warn(`Error checking file ${filePath}:`, error);
            return false;
        }
    }
    /**
     * Generate comprehensive analysis report
     */
    generateAnalysisReport(fileResults, rootPath, startTime) {
        const allPatterns = [];
        const fileReports = {};
        // Process each file's results
        Object.entries(fileResults).forEach(([filePath, patterns]) => {
            allPatterns.push(...patterns);
            fileReports[filePath] = this.generateFileReport(filePath, patterns);
        });
        // Generate summary statistics
        const summary = {
            totalPatterns: allPatterns.length,
            criticalCount: allPatterns.filter(p => p.severity === 'critical').length,
            highCount: allPatterns.filter(p => p.severity === 'high').length,
            mediumCount: allPatterns.filter(p => p.severity === 'medium').length,
            lowCount: allPatterns.filter(p => p.severity === 'low').length,
            filesAnalyzed: Object.keys(fileResults).length,
            analysisTime: Date.now() - startTime
        };
        // Generate pattern statistics
        const patternsByType = {};
        const patternsBySeverity = {};
        allPatterns.forEach(pattern => {
            patternsByType[pattern.type] = (patternsByType[pattern.type] || 0) + 1;
            patternsBySeverity[pattern.severity] = (patternsBySeverity[pattern.severity] || 0) + 1;
        });
        // Calculate average confidence
        const averageConfidence = allPatterns.length > 0
            ? allPatterns.reduce((sum, p) => sum + p.metadata.confidence, 0) / allPatterns.length
            : 0;
        // Get top issues (highest severity + confidence)
        const topIssues = allPatterns
            .sort((a, b) => {
            const severityOrder = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
            const aSeverity = severityOrder[a.severity];
            const bSeverity = severityOrder[b.severity];
            if (aSeverity !== bSeverity)
                return bSeverity - aSeverity;
            return b.metadata.confidence - a.metadata.confidence;
        })
            .slice(0, 10);
        return {
            summary,
            patterns: allPatterns,
            fileReports,
            recommendations: this.generateRecommendations(allPatterns),
            statistics: {
                patternsByType,
                patternsBySeverity,
                averageConfidence,
                topIssues
            },
            metadata: {
                detectorVersions: this.getDetectorVersions(),
                analysisDate: new Date().toISOString(),
                configuration: this.config,
                rootPath,
                engineVersion: '1.0.0'
            }
        };
    }
    /**
     * Generate file-specific report
     */
    generateFileReport(filePath, patterns) {
        const summary = {
            totalPatterns: patterns.length,
            criticalCount: patterns.filter(p => p.severity === 'critical').length,
            highCount: patterns.filter(p => p.severity === 'high').length,
            mediumCount: patterns.filter(p => p.severity === 'medium').length,
            lowCount: patterns.filter(p => p.severity === 'low').length
        };
        // Calculate code quality score (100 - penalty for patterns)
        const severityPenalties = { critical: 25, high: 10, medium: 5, low: 2, info: 1 };
        const totalPenalty = patterns.reduce((sum, p) => {
            return sum + (severityPenalties[p.severity] || 0);
        }, 0);
        const codeQualityScore = Math.max(0, 100 - totalPenalty);
        // Determine technical debt level
        let technicalDebt = 'low';
        if (summary.criticalCount > 0 || summary.highCount > 5)
            technicalDebt = 'critical';
        else if (summary.highCount > 2 || summary.mediumCount > 10)
            technicalDebt = 'high';
        else if (summary.mediumCount > 3 || summary.lowCount > 10)
            technicalDebt = 'medium';
        return {
            file: filePath,
            patterns,
            summary,
            metrics: {
                codeQualityScore,
                maintainabilityIndex: Math.max(0, 100 - (patterns.length * 2)),
                technicalDebt
            },
            recommendations: this.generateFileRecommendations(patterns)
        };
    }
    /**
     * Generate overall recommendations
     */
    generateRecommendations(patterns) {
        const recommendations = [];
        if (patterns.length === 0) {
            recommendations.push('✅ No hardcoded limitations detected - code follows All-Purpose Pattern');
            return recommendations;
        }
        const criticalCount = patterns.filter(p => p.severity === 'critical').length;
        const highCount = patterns.filter(p => p.severity === 'high').length;
        if (criticalCount > 0) {
            recommendations.push(`🚨 Critical: Address ${criticalCount} critical hardcoded limitations immediately`);
        }
        if (highCount > 0) {
            recommendations.push(`⚠️ High Priority: Fix ${highCount} high-impact hardcoded patterns`);
        }
        recommendations.push('📋 Implement configuration-driven architecture using userInput patterns');
        recommendations.push('🔄 Replace hardcoded values with dynamic configuration from user input');
        recommendations.push('🧪 Add validation to ensure no hardcoded limitations remain');
        return recommendations;
    }
    /**
     * Generate file-specific recommendations
     */
    generateFileRecommendations(patterns) {
        if (patterns.length === 0) {
            return ['✅ No hardcoded limitations detected in this file'];
        }
        const recommendations = [];
        patterns.forEach(pattern => {
            if (pattern.recommendation) {
                recommendations.push(pattern.recommendation);
            }
        });
        return [...new Set(recommendations)]; // Remove duplicates
    }
    /**
     * Get detector versions for metadata
     */
    getDetectorVersions() {
        const versions = {};
        this.registry.getAll().forEach(detector => {
            versions[detector.name] = detector.version;
        });
        return versions;
    }
    /**
     * Save analysis report to file
     */
    async saveReport(report, outputPath, format) {
        try {
            let content;
            switch (format) {
                case 'json':
                    content = JSON.stringify(report, null, 2);
                    break;
                case 'markdown':
                    content = this.generateMarkdownReport(report);
                    break;
                case 'html':
                    content = this.generateHTMLReport(report);
                    break;
                default:
                    throw new Error(`Unsupported report format: ${format}`);
            }
            await fs.writeFile(outputPath, content, 'utf8');
            console.log(`Report saved to: ${outputPath}`);
        }
        catch (error) {
            console.error(`Failed to save report:`, error);
        }
    }
    /**
     * Generate markdown report
     */
    generateMarkdownReport(report) {
        return `# Pattern Detection Report

## Summary
- **Total Patterns**: ${report.summary.totalPatterns}
- **Files Analyzed**: ${report.summary.filesAnalyzed}
- **Analysis Time**: ${report.summary.analysisTime}ms

## Severity Breakdown
- **Critical**: ${report.summary.criticalCount}
- **High**: ${report.summary.highCount}
- **Medium**: ${report.summary.mediumCount}
- **Low**: ${report.summary.lowCount}

## Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

Generated on ${report.metadata.analysisDate}
`;
    }
    /**
     * Generate HTML report
     */
    generateHTMLReport(report) {
        return `<!DOCTYPE html>
<html>
<head>
    <title>Pattern Detection Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .critical { color: #d73027; }
        .high { color: #fc8d59; }
        .medium { color: #fee08b; }
        .low { color: #91bfdb; }
    </style>
</head>
<body>
    <h1>Pattern Detection Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Patterns:</strong> ${report.summary.totalPatterns}</p>
        <p><strong>Files Analyzed:</strong> ${report.summary.filesAnalyzed}</p>
        <p><strong>Analysis Time:</strong> ${report.summary.analysisTime}ms</p>
    </div>
    <p><em>Generated on ${report.metadata.analysisDate}</em></p>
</body>
</html>`;
    }
    /**
     * Utility to chunk array for concurrency control
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
}
exports.PatternDetectionEngine = PatternDetectionEngine;
/**
 * Default engine instance ready to use
 */
exports.defaultDetectionEngine = new PatternDetectionEngine();
/**
 * Factory function to create custom detection engine
 */
function createDetectionEngine(config) {
    return new PatternDetectionEngine(config);
}
//# sourceMappingURL=PatternDetectionEngine.js.map