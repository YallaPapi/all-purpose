#!/usr/bin/env node
"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllPurposePatternAgent = void 0;
const events_1 = require("events");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const astParser_1 = require("./core/astParser");
const astTraverse_1 = require("./core/astTraverse");
/**
 * All-Purpose Pattern Agent - Transforms ANY hardcoded system to universal
 * NO limitations on codebase size, languages, or patterns detected
 */
class AllPurposePatternAgent extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.isInitialized = false;
        // All-Purpose Pattern: NO hardcoded defaults, unlimited configuration
        this.config = {
            sourceDir: config.sourceDir || process.cwd(),
            outputDir: config.outputDir || path_1.default.join(process.cwd(), 'all-purpose-output'),
            recursive: config.recursive !== false, // Default to true
            filePattern: config.filePattern || /\\.(js|jsx|ts|tsx|mjs|cjs)$/i,
            exclude: config.exclude || [/node_modules/, /\\.git/, /dist/, /coverage/],
            concurrency: config.concurrency || 10,
            transformationEnabled: config.transformationEnabled !== false,
            validationEnabled: config.validationEnabled !== false,
            templateGeneration: config.templateGeneration !== false,
            contextEnabled: config.contextEnabled !== false, // Context7 integration
            taskMasterIntegration: config.taskMasterIntegration !== false,
            maxFiles: config.maxFiles, // UNLIMITED by default
            maxDepth: config.maxDepth, // UNLIMITED by default
            ...config // UNLIMITED additional configuration
        };
        this.astParser = new astParser_1.ASTParser();
        this.astTraversal = new astTraverse_1.ASTTraversal();
    }
    /**
     * Initialize the agent - Context7 enhanced setup
     */
    async initialize() {
        try {
            this.emit('agent:initializing', {
                agent: 'All-Purpose-Pattern',
                config: this.config,
                timestamp: new Date().toISOString()
            });
            // Ensure output directory exists
            await fs_extra_1.default.ensureDir(this.config.outputDir);
            // Initialize Context7 patterns if enabled
            if (this.config.contextEnabled) {
                await this.initializeContext7();
            }
            this.isInitialized = true;
            this.emit('agent:initialized', {
                agent: 'All-Purpose-Pattern',
                capabilities: this.getCapabilities(),
                timestamp: new Date().toISOString()
            });
            console.log(chalk_1.default.green('🚀 All-Purpose Pattern Agent initialized successfully'));
            console.log(chalk_1.default.blue(`📁 Source: ${this.config.sourceDir}`));
            console.log(chalk_1.default.blue(`📤 Output: ${this.config.outputDir}`));
        }
        catch (error) {
            this.emit('agent:error', { error: error.message });
            throw error;
        }
    }
    /**
     * Process codebase - main entry point for analysis and transformation
     */
    async process(input) {
        const startTime = Date.now();
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            this.emit('processing:start', {
                input,
                timestamp: new Date().toISOString()
            });
            // Determine source to process
            const sourceDir = input?.sourceDirectory || this.config.sourceDir;
            console.log(chalk_1.default.blue(`🔍 Analyzing codebase: ${sourceDir}`));
            // Step 1: Parse and analyze codebase
            const parseResults = await this.astParser.parseDirectory(sourceDir, {
                recursive: this.config.recursive,
                filePattern: this.config.filePattern,
                exclude: this.config.exclude,
                concurrency: this.config.concurrency
            });
            // Filter successful parses
            const successfulParses = parseResults.filter((result) => 'ast' in result);
            const parseErrors = parseResults.filter((result) => 'error' in result);
            console.log(chalk_1.default.green(`✅ Parsed ${successfulParses.length} files`));
            if (parseErrors.length > 0) {
                console.log(chalk_1.default.yellow(`⚠️  ${parseErrors.length} parsing errors`));
            }
            // Step 2: Analyze for anti-patterns
            console.log(chalk_1.default.blue('🔍 Detecting anti-patterns...'));
            const analysis = await this.analyzeAntiPatterns(successfulParses);
            // Step 3: Transform if enabled
            let transformation;
            if (this.config.transformationEnabled && analysis.antiPatterns.length > 0) {
                console.log(chalk_1.default.blue('🔄 Transforming to universal patterns...'));
                transformation = await this.transformCodebase(successfulParses, analysis);
            }
            // Step 4: Validate if enabled
            let validation;
            if (this.config.validationEnabled) {
                console.log(chalk_1.default.blue('✅ Validating universal patterns...'));
                validation = await this.validateUniversality(successfulParses, analysis);
            }
            const totalTime = Date.now() - startTime;
            const result = {
                success: true,
                analysis,
                transformation,
                validation,
                performance: {
                    totalTime,
                    filesProcessed: successfulParses.length,
                    errorsCount: parseErrors.length
                }
            };
            this.emit('processing:complete', {
                result,
                timestamp: new Date().toISOString()
            });
            console.log(chalk_1.default.green(`🎉 Processing complete in ${totalTime}ms`));
            console.log(chalk_1.default.blue(`📊 Anti-patterns found: ${analysis.antiPatterns.length}`));
            return result;
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            this.emit('processing:error', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return {
                success: false,
                performance: {
                    totalTime,
                    filesProcessed: 0,
                    errorsCount: 1
                }
            };
        }
    }
    /**
     * Analyze codebase for anti-patterns - detects ALL hardcoded limitations
     */
    async analyzeAntiPatterns(parseResults) {
        const antiPatterns = [];
        const stats = {
            totalFiles: parseResults.length,
            totalNodes: 0,
            complexity: 0,
            languages: new Set()
        };
        for (const parseResult of parseResults) {
            const { ast, filePath, isTypeScript } = parseResult;
            // Track language stats
            stats.languages.add(isTypeScript ? 'TypeScript' : 'JavaScript');
            // Analyze AST structure
            const structure = this.astTraversal.analyzeStructure(ast);
            stats.totalNodes += Object.values(structure.statistics).reduce((a, b) => a + b, 0);
            stats.complexity += structure.complexity;
            // Detect hardcoded arrays (industries, locations, etc.)
            const hardcodedArrays = this.astTraversal.findNodes(ast, 'ArrayExpression', (node, path) => {
                const elements = node.elements || [];
                return elements.length > 0 && elements.every((el) => el?.type === 'StringLiteral');
            });
            hardcodedArrays.forEach(finding => {
                const elements = finding.node.elements || [];
                antiPatterns.push({
                    type: 'hardcoded_array',
                    severity: elements.length > 5 ? 'critical' : 'high',
                    file: filePath,
                    location: {
                        line: finding.location?.start.line || 0,
                        column: finding.location?.start.column || 0
                    },
                    code: `[${elements.map((el) => el.value).join(', ')}]`,
                    description: `Hardcoded array with ${elements.length} string literals`,
                    recommendation: 'Replace with dynamic configuration from userInput or config object'
                });
            });
            // Detect limitation constants
            const limitationConstants = this.astTraversal.findNodes(ast, 'VariableDeclarator', (node, path) => {
                const id = node.id;
                const init = node.init;
                return id?.name?.toLowerCase().includes('max') && init?.type === 'NumericLiteral';
            });
            limitationConstants.forEach(finding => {
                const id = finding.node.id;
                const init = finding.node.init;
                antiPatterns.push({
                    type: 'limitation_constant',
                    severity: 'high',
                    file: filePath,
                    location: {
                        line: finding.location?.start.line || 0,
                        column: finding.location?.start.column || 0
                    },
                    code: `${id.name} = ${init.value}`,
                    description: `Hardcoded limitation constant: ${id.name}`,
                    recommendation: 'Remove hardcoded limits or make configurable'
                });
            });
            // TODO: Add more anti-pattern detectors
            // - Conditional logic based on hardcoded values
            // - Hardcoded API endpoints
            // - Hardcoded UI text
        }
        return {
            antiPatterns,
            codebaseStats: {
                ...stats,
                languages: Array.from(stats.languages)
            },
            recommendations: this.generateRecommendations(antiPatterns)
        };
    }
    /**
     * Transform codebase to universal patterns
     */
    async transformCodebase(parseResults, analysis) {
        // TODO: Implement transformation logic
        // This will replace hardcoded elements with universal patterns
        return {
            transformedFiles: [],
            templatesGenerated: [],
            configurationSchema: {}
        };
    }
    /**
     * Validate that transformed code has no limitations
     */
    async validateUniversality(parseResults, analysis) {
        // TODO: Implement validation logic
        // This will ensure no hardcoded limitations remain
        return {
            isUniversal: analysis.antiPatterns.length === 0,
            hasLimitations: analysis.antiPatterns.length > 0,
            issues: []
        };
    }
    /**
     * Initialize Context7 patterns
     */
    async initializeContext7() {
        // TODO: Implement Context7 integration
        console.log(chalk_1.default.blue('🔧 Initializing Context7 patterns...'));
    }
    /**
     * Generate recommendations based on findings
     */
    generateRecommendations(antiPatterns) {
        const recommendations = [];
        if (antiPatterns.some(p => p.type === 'hardcoded_array')) {
            recommendations.push('Replace hardcoded arrays with dynamic configuration from userInput');
        }
        if (antiPatterns.some(p => p.type === 'limitation_constant')) {
            recommendations.push('Remove all hardcoded limitations and numeric constraints');
        }
        return recommendations;
    }
    /**
     * Get agent capabilities
     */
    getCapabilities() {
        return {
            name: 'All-Purpose Pattern Agent',
            version: '1.0.0',
            patterns: [
                'Hardcoded array detection',
                'Limitation constant detection',
                'Conditional logic analysis',
                'Universal code generation',
                'Context7 enhancement'
            ],
            languages: ['JavaScript', 'TypeScript'],
            integrations: ['TaskMaster', 'Context7', 'PRD-Parser', 'Scaffold-Generator'],
            performance: {
                maxFiles: this.config.maxFiles || 'unlimited',
                maxDepth: this.config.maxDepth || 'unlimited',
                concurrency: this.config.concurrency
            }
        };
    }
}
exports.AllPurposePatternAgent = AllPurposePatternAgent;
// CLI interface for standalone usage
if (require.main === module) {
    const agent = new AllPurposePatternAgent();
    // Event logging for observability
    agent.on('agent:initialized', data => console.log('🚀 Agent ready:', data));
    agent.on('processing:complete', data => console.log('✅ Processing complete:', data.result.performance));
    agent.on('agent:error', data => console.error('❌ Agent error:', data));
    // Start processing
    agent.process().catch(error => {
        console.error('❌ Failed to process codebase:', error);
        process.exit(1);
    });
}
exports.default = AllPurposePatternAgent;
//# sourceMappingURL=main.js.map