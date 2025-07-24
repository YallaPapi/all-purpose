#!/usr/bin/env node
/**
 * Template Engine Factory Agent - CLI Entry Point
 *
 * Command-line interface for the CODE BUILDER for Dynamic Systems.
 * Converts hardcoded content into dynamic, scalable template systems.
 *
 * Usage Examples:
 * - node main.js generate "E-commerce Product Templates" --engine handlebars --contexts product,category,user
 * - node main.js analyze ./templates/product.hbs --output analysis.json
 * - node main.js systems --list
 * - node main.js integrate --agent all-purpose-pattern --enable
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on system complexity
 */
import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import { TemplateEngineFactoryAgent } from './core/TemplateEngineFactoryAgent.js';
// Global agent instance
let agent;
/**
 * Initialize agent with configuration
 */
async function initializeAgent(options = {}) {
    if (agent) {
        return agent;
    }
    const config = {
        projectRoot: options.projectRoot || process.cwd(),
        outputDirectory: options.outputDir || './generated-template-systems',
        templateDirectory: options.templateDir || './templates',
        supportedEngines: options.engines ? options.engines.split(',') : ['mustache', 'handlebars', 'custom'],
        defaultEngine: options.engine || 'handlebars',
        codeGeneration: {
            targetLanguage: options.language || 'typescript',
            outputFormat: options.format || 'esm',
            includeTypes: options.types !== false,
            includeTests: options.tests !== false,
            includeDocumentation: options.docs !== false
        },
        dynamicSystems: {
            contextTypes: options.contexts ? options.contexts.split(',') : [],
            variationStrategies: options.variations ? options.variations.split(',') : [],
            fallbackPatterns: options.fallbacks ? options.fallbacks.split(',') : [],
            validationRules: options.validations ? options.validations.split(',') : []
        },
        integration: {
            allPurposePatternAgent: options.allPurpose !== false,
            infrastructureOrchestrator: options.orchestrator !== false,
            fiveDocumentFramework: options.framework !== false,
            context7Integration: options.context7 !== false,
            ragSystemIntegration: options.rag !== false
        },
        performance: {
            maxConcurrentGenerations: options.maxConcurrent === 'unlimited' ? 'unlimited' : parseInt(options.maxConcurrent) || 'unlimited',
            maxTemplateSize: options.maxSize === 'unlimited' ? 'unlimited' : parseInt(options.maxSize) || 'unlimited',
            maxOutputFiles: options.maxFiles === 'unlimited' ? 'unlimited' : parseInt(options.maxFiles) || 'unlimited',
            cacheStrategy: options.cache || 'memory'
        },
        customConfiguration: options.customConfig ? JSON.parse(options.customConfig) : {}
    };
    agent = new TemplateEngineFactoryAgent(config);
    // Set up event logging for CLI
    setupEventLogging(agent);
    await agent.initialize();
    return agent;
}
/**
 * Set up event logging for CLI feedback
 */
function setupEventLogging(agent) {
    agent.on('system:generation:started', (data) => {
        console.log(chalk.green(`🚀 System generation started: ${data.systemName}`));
    });
    agent.on('system:generation:progress', (data) => {
        console.log(chalk.blue(`⚡ Progress: ${data.progress}% - ${data.currentStep}`));
    });
    agent.on('system:generation:completed', (data) => {
        console.log(chalk.green(`✅ System generation completed: ${data.requestId}`));
        console.log(chalk.blue(`📊 Files generated: ${data.result.generation.filesGenerated}`));
        console.log(chalk.blue(`📝 Lines of code: ${data.result.generation.linesOfCode}`));
        console.log(chalk.blue(`⚡ Generation time: ${Math.round(data.result.generation.duration / 1000)}s`));
    });
    agent.on('system:generation:failed', (data) => {
        console.log(chalk.red(`❌ System generation failed: ${data.requestId}`));
        console.log(chalk.red(`💥 Error: ${data.error}`));
    });
    agent.on('template:analysis:completed', (data) => {
        console.log(chalk.green(`🔍 Template analysis completed: ${data.templatePath}`));
        console.log(chalk.blue(`📊 Complexity score: ${data.result.analysis.complexityScore}`));
        console.log(chalk.blue(`⚡ All-Purpose compliance: ${data.result.allPurposeAnalysis.complianceScore}%`));
    });
    agent.on('integration:connected', (data) => {
        console.log(chalk.green(`🔗 Integration connected: ${data.integrationType}`));
    });
    agent.on('integration:error', (data) => {
        console.log(chalk.red(`❌ Integration error: ${data.integrationType} - ${data.error}`));
    });
    agent.on('agent:error', (data) => {
        console.error(chalk.red(`❌ Agent error: ${data.error}`));
        if (data.component) {
            console.error(chalk.red(`🔧 Component: ${data.component}`));
        }
    });
}
// CLI Commands
program
    .name('template-engine-factory')
    .description('The CODE BUILDER for Dynamic Systems - Generate complete dynamic template systems')
    .version('1.0.0');
// Global options
program
    .option('--project-root <path>', 'Project root directory', process.cwd())
    .option('--output-dir <path>', 'Output directory for generated systems', './generated-template-systems')
    .option('--template-dir <path>', 'Template directory', './templates')
    .option('--engine <engine>', 'Default template engine (mustache, handlebars, custom)', 'handlebars')
    .option('--engines <engines>', 'Supported engines (comma-separated)', 'mustache,handlebars,custom')
    .option('--language <lang>', 'Target language (typescript, javascript)', 'typescript')
    .option('--format <format>', 'Output format (esm, cjs)', 'esm')
    .option('--contexts <contexts>', 'Context types (comma-separated)')
    .option('--variations <variations>', 'Variation strategies (comma-separated)')
    .option('--fallbacks <fallbacks>', 'Fallback patterns (comma-separated)')
    .option('--validations <validations>', 'Validation rules (comma-separated)')
    .option('--max-concurrent <number>', 'Max concurrent generations', 'unlimited')
    .option('--max-size <bytes>', 'Max template size', 'unlimited')
    .option('--max-files <number>', 'Max output files', 'unlimited')
    .option('--cache <strategy>', 'Cache strategy (memory, disk, distributed)', 'memory')
    .option('--custom-config <json>', 'Custom configuration as JSON string')
    .option('--no-all-purpose', 'Disable All-Purpose Pattern Agent integration')
    .option('--no-orchestrator', 'Disable Infrastructure Orchestrator integration')
    .option('--no-framework', 'Disable Five-Document Framework integration')
    .option('--no-context7', 'Disable Context7 integration')
    .option('--no-rag', 'Disable RAG System integration')
    .option('--no-types', 'Disable TypeScript type generation')
    .option('--no-tests', 'Disable test generation')
    .option('--no-docs', 'Disable documentation generation');
// Generate dynamic system
program
    .command('generate')
    .description('Generate a complete dynamic template system')
    .argument('<system-name>', 'Name of the system to generate')
    .option('-d, --description <desc>', 'System description')
    .option('-c, --content-types <types>', 'Content types (comma-separated)', 'html,text')
    .option('-t, --context-types <types>', 'Context types (comma-separated)', 'default')
    .option('-v, --variation-requirements <reqs>', 'Variation requirements (comma-separated)')
    .option('-f, --fallback-requirements <reqs>', 'Fallback requirements (comma-separated)', 'error-handling')
    .option('-r, --validation-requirements <reqs>', 'Validation requirements (comma-separated)', 'context-validation')
    .option('--meta-agents <agents>', 'Meta-agents to integrate with (comma-separated)')
    .option('--external-systems <systems>', 'External systems to integrate with (comma-separated)')
    .option('--performance-targets <json>', 'Performance targets as JSON')
    .option('--scalability-targets <json>', 'Scalability targets as JSON')
    .option('--maintainability-targets <json>', 'Maintainability targets as JSON')
    .option('--testing-requirements <reqs>', 'Testing requirements (comma-separated)')
    .action(async (systemName, options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        const request = {
            requestId: `generate-${Date.now()}`,
            systemName,
            description: options.description || `Generated dynamic system: ${systemName}`,
            specification: {
                templateEngine: globalOpts.engine,
                contentTypes: options.contentTypes.split(','),
                contextTypes: options.contextTypes.split(','),
                variationRequirements: options.variationRequirements ? options.variationRequirements.split(',') : [],
                fallbackRequirements: options.fallbackRequirements.split(','),
                validationRequirements: options.validationRequirements.split(',')
            },
            integrationRequirements: {
                metaAgents: options.metaAgents ? options.metaAgents.split(',') : [],
                externalSystems: options.externalSystems ? options.externalSystems.split(',') : [],
                context7Integration: !globalOpts.noContext7,
                ragSystemCompatible: !globalOpts.noRag
            },
            qualityRequirements: {
                performanceTargets: options.performanceTargets ? JSON.parse(options.performanceTargets) : {},
                scalabilityTargets: options.scalabilityTargets ? JSON.parse(options.scalabilityTargets) : {},
                maintainabilityTargets: options.maintainabilityTargets ? JSON.parse(options.maintainabilityTargets) : {},
                testingRequirements: options.testingRequirements ? options.testingRequirements.split(',') : []
            },
            customRequirements: {},
            advancedOptions: {}
        };
        const result = await agent.generateDynamicSystem(request);
        console.log(chalk.green(`🎉 Dynamic system generated successfully!`));
        console.log(chalk.blue(`📁 System ID: ${result.systemId}`));
        console.log(chalk.blue(`📊 Quality Score: ${result.quality.codeQualityScore}/100`));
        console.log(chalk.blue(`🚀 Production Ready: ${result.deployment.readyForProduction ? 'Yes' : 'No'}`));
        if (result.warnings.length > 0) {
            console.log(chalk.yellow(`⚠️  Warnings: ${result.warnings.length}`));
            result.warnings.forEach(warning => {
                console.log(chalk.yellow(`  - ${warning.message}`));
            });
        }
        if (result.recommendations.length > 0) {
            console.log(chalk.blue('💡 Recommendations:'));
            result.recommendations.forEach(rec => {
                console.log(chalk.blue(`  - ${rec}`));
            });
        }
    }
    catch (error) {
        console.error(chalk.red(`❌ Failed to generate system: ${error.message}`));
        process.exit(1);
    }
});
// Analyze template
program
    .command('analyze')
    .description('Analyze existing template for conversion opportunities')
    .argument('<template-path>', 'Path to template file')
    .option('-o, --output <file>', 'Output analysis to JSON file')
    .option('--verbose', 'Verbose analysis output')
    .action(async (templatePath, options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        const result = await agent.analyzeTemplate(templatePath);
        if (options.output) {
            await fs.writeJSON(options.output, result, { spaces: 2 });
            console.log(chalk.green(`📄 Analysis saved to: ${options.output}`));
        }
        if (options.verbose) {
            console.log(chalk.blue('📊 Analysis Results:'));
            console.log(chalk.blue(`   Template Engine: ${result.analysis.templateEngine}`));
            console.log(chalk.blue(`   Context Variables: ${result.analysis.contextVariables.length}`));
            console.log(chalk.blue(`   Dynamic Elements: ${result.analysis.dynamicElements.length}`));
            console.log(chalk.blue(`   Hardcoded Elements: ${result.analysis.hardcodedElements.length}`));
            console.log(chalk.blue(`   Complexity Score: ${result.analysis.complexityScore}`));
            console.log(chalk.blue(`   All-Purpose Compliance: ${result.allPurposeAnalysis.complianceScore}%`));
            if (result.recommendations.suggestedVariations.length > 0) {
                console.log(chalk.blue('💡 Suggested Variations:'));
                result.recommendations.suggestedVariations.forEach(variation => {
                    console.log(chalk.blue(`   - ${variation}`));
                });
            }
            if (result.allPurposeAnalysis.violations.length > 0) {
                console.log(chalk.yellow('⚠️  All-Purpose Pattern Violations:'));
                result.allPurposeAnalysis.violations.forEach(violation => {
                    console.log(chalk.yellow(`   - ${violation}`));
                });
            }
        }
    }
    catch (error) {
        console.error(chalk.red(`❌ Failed to analyze template: ${error.message}`));
        process.exit(1);
    }
});
// List generated systems
program
    .command('systems')
    .description('List generated dynamic systems')
    .option('-l, --list', 'List all generated systems')
    .option('-s, --system <id>', 'Show details for specific system')
    .option('--active', 'Show only active generations')
    .action(async (options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        if (options.system) {
            const system = agent.getGeneratedSystem(options.system);
            if (system) {
                console.log(chalk.green(`🏗️  System: ${system.name}`));
                console.log(chalk.blue(`📋 Description: ${system.description}`));
                console.log(chalk.blue(`🔧 Template Engine: ${system.architecture.templateEngine}`));
                console.log(chalk.blue(`📊 Components: ${agent['countComponents'](system)}`));
                console.log(chalk.blue(`⚡ Version: ${system.version}`));
            }
            else {
                console.log(chalk.red(`❌ System not found: ${options.system}`));
            }
        }
        else if (options.active) {
            const activeGenerations = agent.getActiveGenerations();
            console.log(chalk.green(`🔄 Active Generations: ${activeGenerations.length}`));
            activeGenerations.forEach(gen => {
                console.log(chalk.blue(`   - ${gen.systemName} (${gen.requestId})`));
            });
        }
        else {
            const systems = agent.getGeneratedSystems();
            console.log(chalk.green(`🏗️  Generated Systems: ${systems.length}`));
            systems.forEach(system => {
                console.log(chalk.blue(`   - ${system.name} (${system.systemId})`));
            });
        }
    }
    catch (error) {
        console.error(chalk.red(`❌ Failed to list systems: ${error.message}`));
        process.exit(1);
    }
});
// Manage integrations
program
    .command('integrate')
    .description('Manage integrations with other systems')
    .option('-a, --agent <agent-id>', 'Agent to integrate with')
    .option('-e, --enable', 'Enable integration')
    .option('-d, --disable', 'Disable integration')
    .option('-t, --test', 'Test integration connectivity')
    .option('-l, --list', 'List all integrations')
    .action(async (options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        const coordinator = agent['integrationCoordinator'];
        if (options.list) {
            const integrations = coordinator.getIntegrations();
            console.log(chalk.green(`🔗 Integrations: ${integrations.length}`));
            integrations.forEach(integration => {
                const statusColor = integration.connectionStatus === 'connected' ? chalk.green :
                    integration.connectionStatus === 'error' ? chalk.red : chalk.yellow;
                console.log(chalk.blue(`   - ${integration.agentName}`));
                console.log(statusColor(`     Status: ${integration.connectionStatus}`));
                console.log(chalk.blue(`     Type: ${integration.integrationType}`));
            });
        }
        else if (options.agent && options.test) {
            const result = await coordinator.testIntegration(options.agent);
            if (result) {
                console.log(chalk.green(`✅ Integration test successful: ${options.agent}`));
            }
            else {
                console.log(chalk.red(`❌ Integration test failed: ${options.agent}`));
            }
        }
        else {
            console.log(chalk.yellow('⚠️  Please specify an action (--list, --test, etc.)'));
        }
    }
    catch (error) {
        console.error(chalk.red(`❌ Failed to manage integrations: ${error.message}`));
        process.exit(1);
    }
});
// Status command
program
    .command('status')
    .description('Show agent status and capabilities')
    .action(async (options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        const capabilities = agent.getCapabilities();
        const systems = agent.getGeneratedSystems();
        const activeGenerations = agent.getActiveGenerations();
        console.log(chalk.green('🏗️  Template Engine Factory Agent Status'));
        console.log(chalk.blue(`📋 Version: ${capabilities.version}`));
        console.log(chalk.blue(`🔧 Template Engines: ${capabilities.coreCapabilities.templateEngines.join(', ')}`));
        console.log(chalk.blue(`💻 Code Generation: ${capabilities.coreCapabilities.codeGeneration.join(', ')}`));
        console.log(chalk.blue(`🏗️  Generated Systems: ${systems.length}`));
        console.log(chalk.blue(`🔄 Active Generations: ${activeGenerations.length}`));
        console.log(chalk.blue(`⚡ Max Concurrent: ${capabilities.performance.maxConcurrentSystems}`));
        console.log(chalk.blue(`🔗 Integrations: ${capabilities.integrations.metaAgentFactory ? 'Enabled' : 'Disabled'}`));
        console.log(chalk.green('\n🚀 Core Features:'));
        capabilities.coreCapabilities.templateEngines.forEach(engine => {
            console.log(chalk.blue(`   ✅ ${engine} template engine`));
        });
        console.log(chalk.green('\n🔗 Available Integrations:'));
        console.log(chalk.blue(`   ${capabilities.integrations.allPurposePattern ? '✅' : '❌'} All-Purpose Pattern Agent`));
        console.log(chalk.blue(`   ${capabilities.integrations.context7 ? '✅' : '❌'} Context7 System`));
        console.log(chalk.blue(`   ${capabilities.integrations.ragSystem ? '✅' : '❌'} RAG System`));
    }
    catch (error) {
        console.error(chalk.red(`❌ Failed to get status: ${error.message}`));
        process.exit(1);
    }
});
// Error handling
process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'), error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Shutting down gracefully...'));
    process.exit(0);
});
// Parse CLI arguments
program.parse();
// If no command provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=main.js.map