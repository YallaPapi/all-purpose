#!/usr/bin/env node
"use strict";
/**
 * Thirty-Minute Rule Agent - CLI Entry Point
 *
 * Command-line interface for the Anti-Debugging-Loop Guardian.
 * Provides systematic debugging with time-bounded problem solving.
 *
 * Usage Examples:
 * - node main.js start "Debug authentication issue" --time-limit 25 --component auth
 * - node main.js generate-endpoints --source-dir ./src --output-dir ./debug
 * - node main.js test-isolation --components auth,api,database
 * - node main.js status
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on project types or frameworks
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ThirtyMinuteRuleAgent_js_1 = require("./core/ThirtyMinuteRuleAgent.js");
// Global agent instance
let agent;
// Initialize agent with configuration
async function initializeAgent(options = {}) {
    if (agent) {
        return agent;
    }
    const config = {
        defaultTimeLimit: options.timeLimit ? options.timeLimit * 60 * 1000 : undefined,
        debugEndpointPort: options.port,
        debugEndpointPrefix: options.prefix,
        projectType: options.projectType,
        framework: options.framework,
        testingFramework: options.testingFramework,
        autoGenerateEndpoints: options.autoGenerate !== false,
        isolationTestingEnabled: options.testing !== false,
        contextEnabled: options.context !== false,
        metaAgentCoordination: options.coordination !== false,
        customConfiguration: options.config ? JSON.parse(options.config) : {}
    };
    agent = new ThirtyMinuteRuleAgent_js_1.ThirtyMinuteRuleAgent(config);
    // Set up event logging for CLI
    setupEventLogging(agent);
    await agent.initialize();
    return agent;
}
// Set up event logging for CLI feedback
function setupEventLogging(agent) {
    agent.on('session:started', (data) => {
        console.log(chalk_1.default.green(`🚀 Session started: ${data.sessionId}`));
    });
    agent.on('session:completed', (data) => {
        console.log(chalk_1.default.green(`✅ Session completed: ${data.sessionId}`));
        console.log(chalk_1.default.blue(`📊 Knowledge extracted: ${data.result.knowledgeExtracted.length} items`));
    });
    agent.on('session:timeout', (data) => {
        console.log(chalk_1.default.yellow(`⏰ Session timeout: ${data.sessionId}`));
        if (data.fallbackTriggered) {
            console.log(chalk_1.default.blue(`🔄 Fallback strategy activated`));
        }
    });
    agent.on('endpoints:complete', (data) => {
        console.log(chalk_1.default.green(`🔧 Generated ${data.result.endpointsGenerated.length} debug endpoints`));
    });
    agent.on('isolation:complete', (data) => {
        const summary = data.result.summary;
        console.log(chalk_1.default.green(`🧪 Tests: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped`));
    });
    agent.on('agent:error', (data) => {
        console.error(chalk_1.default.red(`❌ Agent error: ${data.error}`));
    });
}
// CLI Commands
commander_1.program
    .name('thirty-minute-rule')
    .description('The Anti-Debugging-Loop Guardian - Time-bounded systematic debugging')
    .version('1.0.0');
// Global options
commander_1.program
    .option('--time-limit <minutes>', 'Default time limit for debugging sessions (in minutes)', '30')
    .option('--port <number>', 'Debug endpoint server port', '3001')
    .option('--prefix <path>', 'Debug endpoint prefix', '/api/debug')
    .option('--project-type <type>', 'Project type (auto-detect if not specified)')
    .option('--framework <framework>', 'Framework type (auto-detect if not specified)')
    .option('--testing-framework <framework>', 'Testing framework (auto-detect if not specified)')
    .option('--config <json>', 'Custom configuration as JSON string')
    .option('--no-auto-generate', 'Disable automatic endpoint generation')
    .option('--no-testing', 'Disable isolation testing')
    .option('--no-context', 'Disable Context7 integration')
    .option('--no-coordination', 'Disable meta-agent coordination');
// Start debugging session
commander_1.program
    .command('start')
    .description('Start a time-bounded debugging session')
    .argument('<description>', 'Description of the issue to debug')
    .option('-c, --component <name>', 'Specific component to debug')
    .option('-t, --time-limit <minutes>', 'Time limit for this session (in minutes)')
    .option('-p, --priority <level>', 'Priority level (low, medium, high, critical)', 'medium')
    .option('--no-endpoints', 'Skip debug endpoint generation')
    .option('--no-isolation', 'Skip isolation testing')
    .option('--strategies <json>', 'Custom fallback strategies as JSON')
    .action(async (description, options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        const sessionId = await agent.startDebuggingSession({
            description,
            component: options.component,
            timeLimit: options.timeLimit ? options.timeLimit * 60 * 1000 : undefined,
            priority: options.priority,
            autoGenerateEndpoints: options.endpoints !== false,
            runIsolationTests: options.isolation !== false,
            customStrategies: options.strategies ? JSON.parse(options.strategies) : undefined
        });
        console.log(chalk_1.default.green(`✅ Debugging session started successfully`));
        console.log(chalk_1.default.blue(`📋 Session ID: ${sessionId}`));
        console.log(chalk_1.default.blue(`🎯 Description: ${description}`));
        console.log(chalk_1.default.blue(`⏰ Time limit: ${options.timeLimit || globalOpts.timeLimit} minutes`));
        // Keep process alive to handle session events
        console.log(chalk_1.default.gray('Press Ctrl+C to exit...'));
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ Failed to start debugging session: ${error.message}`));
        process.exit(1);
    }
});
// Add debug step
commander_1.program
    .command('step')
    .description('Add a debug step to an active session')
    .argument('<session-id>', 'Session ID')
    .argument('<action>', 'Debug action taken')
    .argument('<result>', 'Result of the action (success, failure, partial, timeout)')
    .argument('<details>', 'Details about the step')
    .option('--evidence <json>', 'Evidence as JSON string')
    .option('--confidence <number>', 'Confidence level (0-1)', '0.8')
    .action(async (sessionId, action, result, details, options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        await agent.addDebugStep(sessionId, {
            action,
            result: result,
            details,
            evidence: options.evidence ? JSON.parse(options.evidence) : undefined,
            confidence: parseFloat(options.confidence)
        });
        console.log(chalk_1.default.green(`✅ Debug step added to session ${sessionId}`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ Failed to add debug step: ${error.message}`));
        process.exit(1);
    }
});
// Complete session
commander_1.program
    .command('complete')
    .description('Complete a debugging session')
    .argument('<session-id>', 'Session ID')
    .argument('<resolution>', 'Resolution description')
    .action(async (sessionId, resolution, options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        const result = await agent.completeDebuggingSession(sessionId, resolution);
        console.log(chalk_1.default.green(`🎉 Debugging session completed successfully`));
        console.log(chalk_1.default.blue(`📊 Total time: ${Math.round(result.performance.totalTime / 60000)}min ${Math.round((result.performance.totalTime % 60000) / 1000)}s`));
        console.log(chalk_1.default.blue(`📝 Debug steps: ${result.performance.debugSteps}`));
        console.log(chalk_1.default.blue(`🧠 Knowledge extracted: ${result.knowledgeExtracted.length} items`));
        console.log(chalk_1.default.blue(`🔄 Fallbacks used: ${result.performance.fallbacksTriggered}`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ Failed to complete session: ${error.message}`));
        process.exit(1);
    }
});
// Cancel session
commander_1.program
    .command('cancel')
    .description('Cancel a debugging session')
    .argument('<session-id>', 'Session ID')
    .argument('<reason>', 'Cancellation reason')
    .action(async (sessionId, reason, options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        await agent.cancelDebuggingSession(sessionId, reason);
        console.log(chalk_1.default.yellow(`❌ Session ${sessionId} cancelled: ${reason}`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ Failed to cancel session: ${error.message}`));
        process.exit(1);
    }
});
// Generate debug endpoints
commander_1.program
    .command('generate-endpoints')
    .description('Generate debug endpoints for project components')
    .option('-s, --source-dir <path>', 'Source directory to analyze', process.cwd())
    .option('-o, --output-dir <path>', 'Output directory for generated endpoints')
    .option('-c, --components <list>', 'Comma-separated list of component names to filter')
    .option('-t, --types <list>', 'Comma-separated list of endpoint types (health,isolation,fallback,metrics)', 'health,isolation,fallback,metrics')
    .action(async (options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        const result = await agent.generateDebugEndpoints({
            sourceDirectory: options.sourceDir,
            outputDirectory: options.outputDir,
            componentFilter: options.components ? options.components.split(',') : undefined,
            endpointTypes: options.types.split(',')
        });
        console.log(chalk_1.default.green(`🔧 Debug endpoints generated successfully`));
        console.log(chalk_1.default.blue(`📦 Components analyzed: ${result.componentsAnalyzed.length}`));
        console.log(chalk_1.default.blue(`🔗 Endpoints created: ${result.endpointsGenerated.length}`));
        console.log(chalk_1.default.blue(`⚠️  Errors: ${result.errors.length}`));
        console.log(chalk_1.default.blue(`⏱️  Generation time: ${Math.round(result.performance.totalTime / 1000)}s`));
        if (result.errors.length > 0) {
            console.log(chalk_1.default.yellow('Errors encountered:'));
            result.errors.forEach(error => {
                console.log(chalk_1.default.red(`  - ${error.component}: ${error.error}`));
            });
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ Failed to generate debug endpoints: ${error.message}`));
        process.exit(1);
    }
});
// Run isolation tests
commander_1.program
    .command('test-isolation')
    .description('Run component isolation tests')
    .option('-c, --components <list>', 'Comma-separated list of component names to test')
    .option('--timeout <seconds>', 'Test timeout in seconds', '60')
    .option('--no-mocks', 'Disable dependency mocking')
    .option('--no-coverage', 'Disable coverage generation')
    .option('--framework <name>', 'Testing framework to use')
    .action(async (options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        const components = options.components ? options.components.split(',') : undefined;
        const config = {
            testTimeout: parseInt(options.timeout) * 1000,
            mockDependencies: options.mocks !== false,
            generateCoverage: options.coverage !== false,
            testFramework: options.framework
        };
        const result = await agent.runIsolationTests(components, config);
        console.log(chalk_1.default.green(`🧪 Isolation tests completed`));
        console.log(chalk_1.default.blue(`📊 Summary: ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.skipped} skipped`));
        console.log(chalk_1.default.blue(`🏥 Health: ${result.summary.healthyComponents} healthy, ${result.summary.unhealthyComponents} unhealthy`));
        console.log(chalk_1.default.blue(`⏱️  Total time: ${Math.round(result.summary.totalTime / 1000)}s`));
        if (result.summary.coveragePercentage !== undefined) {
            console.log(chalk_1.default.blue(`📈 Coverage: ${result.summary.coveragePercentage.toFixed(2)}%`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ Failed to run isolation tests: ${error.message}`));
        process.exit(1);
    }
});
// Status command
commander_1.program
    .command('status')
    .description('Show current debugging status')
    .action(async (options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        const status = agent.getDebuggingStatus();
        console.log(chalk_1.default.green('📊 Thirty-Minute Rule Agent Status'));
        console.log(chalk_1.default.blue(`🔄 Active sessions: ${status.activeSessions.length}`));
        console.log(chalk_1.default.blue(`📋 Total sessions: ${status.totalSessions}`));
        console.log(chalk_1.default.blue(`✅ Completed sessions: ${status.completedSessions}`));
        console.log(chalk_1.default.blue(`📦 Registered components: ${status.registeredComponents}`));
        console.log(chalk_1.default.blue(`🧠 Extracted knowledge: ${status.extractedKnowledge}`));
        if (status.activeSessions.length > 0) {
            console.log(chalk_1.default.yellow('\nActive Sessions:'));
            status.activeSessions.forEach(session => {
                const elapsed = Date.now() - session.startTime.getTime();
                const remaining = Math.max(0, session.timeLimit - elapsed);
                console.log(chalk_1.default.gray(`  - ${session.sessionId}: ${session.description}`));
                console.log(chalk_1.default.gray(`    Time remaining: ${Math.round(remaining / 60000)}min ${Math.round((remaining % 60000) / 1000)}s`));
                console.log(chalk_1.default.gray(`    Debug steps: ${session.debugSteps.length}`));
            });
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ Failed to get status: ${error.message}`));
        process.exit(1);
    }
});
// Query knowledge
commander_1.program
    .command('knowledge')
    .description('Query extracted debugging knowledge')
    .option('-t, --type <type>', 'Knowledge type (pattern, solution, anti-pattern, best-practice)')
    .option('-c, --context <context>', 'Context filter')
    .option('--min-confidence <number>', 'Minimum confidence level (0-1)', '0.5')
    .option('-l, --limit <number>', 'Maximum number of results', '10')
    .action(async (options, command) => {
    try {
        const globalOpts = command.parent.opts();
        const agent = await initializeAgent(globalOpts);
        const knowledge = agent.queryKnowledge({
            type: options.type,
            context: options.context,
            minConfidence: parseFloat(options.minConfidence),
            limit: parseInt(options.limit)
        });
        console.log(chalk_1.default.green(`🧠 Found ${knowledge.length} knowledge items`));
        knowledge.forEach((item, index) => {
            console.log(chalk_1.default.blue(`\n${index + 1}. ${item.title} (${item.type})`));
            console.log(chalk_1.default.gray(`   Confidence: ${(item.confidence * 100).toFixed(1)}%`));
            console.log(chalk_1.default.gray(`   Contexts: ${item.applicableContexts.join(', ')}`));
            console.log(chalk_1.default.white(`   ${item.description}`));
        });
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ Failed to query knowledge: ${error.message}`));
        process.exit(1);
    }
});
// Error handling
process.on('uncaughtException', (error) => {
    console.error(chalk_1.default.red('❌ Uncaught Exception:'), error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk_1.default.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk_1.default.yellow('\n👋 Shutting down gracefully...'));
    process.exit(0);
});
// Parse CLI arguments
commander_1.program.parse();
// If no command provided, show help
if (!process.argv.slice(2).length) {
    commander_1.program.outputHelp();
}
//# sourceMappingURL=main.js.map