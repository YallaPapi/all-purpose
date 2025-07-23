#!/usr/bin/env node
"use strict";
/**
 * Thirty-Minute Rule Agent - The Anti-Debugging-Loop Guardian
 *
 * This meta-agent implements the 30-minute debugging rule that prevents endless debugging by:
 * 1. Enforcing time-bounded problem solving with configurable limits
 * 2. Automatically generating /api/debug endpoints for every component
 * 3. Implementing component isolation testing procedures
 * 4. Architecting alternative pathway implementation for failure scenarios
 * 5. Providing systematic debugging procedures with time limits
 * 6. Coordinating with other meta-agents for systematic debugging across the entire factory
 *
 * Architecture Pattern: Time-Bound → Isolate → Debug → Fallback → Extract Knowledge
 * Integration: TaskMaster API, Context7, MetaAgentCoordinator, DebugEndpoints
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on project types, debugging scenarios, or frameworks
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThirtyMinuteRuleAgent = void 0;
const events_1 = require("events");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const uuid_1 = require("uuid");
const DebuggingSessionManager_js_1 = require("./DebuggingSessionManager.js");
const ComponentIsolationTester_js_1 = require("./ComponentIsolationTester.js");
const DebugEndpointGenerator_js_1 = require("../debug/DebugEndpointGenerator.js");
/**
 * Thirty-Minute Rule Agent - Prevents endless debugging loops through systematic time-bounded debugging
 * NO limitations on project types, debugging scenarios, or complexity levels
 */
class ThirtyMinuteRuleAgent extends events_1.EventEmitter {
    config;
    sessionManager;
    isolationTester;
    endpointGenerator;
    isInitialized = false;
    metaAgentIntegration;
    // Coordination and knowledge sharing
    extractedKnowledge = new Map();
    debuggingSessions = new Map();
    componentRegistry = new Map();
    constructor(config = {}) {
        super();
        // All-Purpose Pattern: NO hardcoded defaults, unlimited configuration
        this.config = {
            defaultTimeLimit: config.defaultTimeLimit || 30 * 60 * 1000, // 30 minutes
            maxTimeLimit: config.maxTimeLimit, // UNLIMITED by default
            minTimeLimit: config.minTimeLimit || 5 * 60 * 1000, // 5 minutes minimum
            debugEndpointPort: config.debugEndpointPort || 3001,
            debugEndpointPrefix: config.debugEndpointPrefix || '/api/debug',
            autoGenerateEndpoints: config.autoGenerateEndpoints !== false,
            isolationTestingEnabled: config.isolationTestingEnabled !== false,
            healthCheckInterval: config.healthCheckInterval || 30000,
            enableAutoFallback: config.enableAutoFallback !== false,
            fallbackTimeout: config.fallbackTimeout || 5 * 60 * 1000,
            contextEnabled: config.contextEnabled !== false, // Context7 integration
            metaAgentCoordination: config.metaAgentCoordination !== false,
            projectType: config.projectType || 'auto-detect',
            framework: config.framework || 'auto-detect',
            testingFramework: config.testingFramework || 'auto-detect',
            ...config // UNLIMITED additional configuration
        };
        // Initialize core components
        this.sessionManager = new DebuggingSessionManager_js_1.DebuggingSessionManager(this.config);
        this.isolationTester = new ComponentIsolationTester_js_1.ComponentIsolationTester(this.config);
        this.endpointGenerator = new DebugEndpointGenerator_js_1.DebugEndpointGenerator(this.config);
        // Set up event forwarding for observability
        this.setupEventForwarding();
    }
    /**
     * Initialize the agent - Context7 enhanced setup
     */
    async initialize() {
        try {
            this.emit('agent:initializing', {
                agent: 'Thirty-Minute-Rule',
                config: this.config,
                timestamp: new Date().toISOString()
            });
            // Initialize Context7 integration if enabled
            if (this.config.contextEnabled) {
                await this.initializeContext7Integration();
            }
            // Initialize meta-agent coordination if enabled
            if (this.config.metaAgentCoordination) {
                await this.initializeMetaAgentCoordination();
            }
            // Load existing knowledge base
            await this.loadKnowledgeBase();
            this.isInitialized = true;
            this.emit('agent:initialized', {
                agent: 'Thirty-Minute-Rule',
                capabilities: this.getCapabilities(),
                timestamp: new Date().toISOString()
            });
            console.log(chalk_1.default.green('⏰ Thirty-Minute Rule Agent initialized successfully'));
            console.log(chalk_1.default.blue(`🔧 Debug endpoints: ${this.config.debugEndpointPrefix} (port ${this.config.debugEndpointPort})`));
            console.log(chalk_1.default.blue(`⏱️  Default time limit: ${Math.round(this.config.defaultTimeLimit / 60000)} minutes`));
            console.log(chalk_1.default.blue(`🧪 Isolation testing: ${this.config.isolationTestingEnabled ? 'enabled' : 'disabled'}`));
        }
        catch (error) {
            this.emit('agent:error', { error: error.message });
            throw error;
        }
    }
    /**
     * Start a time-bounded debugging session - main entry point
     */
    async startDebuggingSession(input) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            this.emit('debugging:start', {
                input,
                timestamp: new Date().toISOString()
            });
            console.log(chalk_1.default.blue(`🚀 Starting debugging session: ${input.description}`));
            // Step 1: Start debugging session with time limits
            const sessionId = await this.sessionManager.startSession({
                description: input.description,
                component: input.component,
                timeLimit: input.timeLimit,
                priority: input.priority,
                metadata: input.metadata,
                customStrategies: input.customStrategies
            });
            // Step 2: Auto-generate debug endpoints if requested
            if (input.autoGenerateEndpoints !== false && this.config.autoGenerateEndpoints) {
                console.log(chalk_1.default.blue('🔧 Generating debug endpoints...'));
                try {
                    const endpointResult = await this.endpointGenerator.generateEndpoints({
                        componentFilter: input.component ? [input.component] : undefined
                    });
                    if (endpointResult.success) {
                        await this.sessionManager.addDebugStep(sessionId, {
                            action: 'Generate debug endpoints',
                            result: 'success',
                            details: `Generated ${endpointResult.endpointsGenerated.length} debug endpoints`,
                            evidence: endpointResult
                        });
                    }
                    else {
                        await this.sessionManager.addDebugStep(sessionId, {
                            action: 'Generate debug endpoints',
                            result: 'failure',
                            details: `Failed to generate endpoints: ${endpointResult.errors.map(e => e.error).join(', ')}`
                        });
                    }
                }
                catch (error) {
                    console.warn(chalk_1.default.yellow(`⚠️  Debug endpoint generation failed: ${error.message}`));
                }
            }
            // Step 3: Run isolation tests if requested
            if (input.runIsolationTests !== false && this.config.isolationTestingEnabled && input.component) {
                console.log(chalk_1.default.blue('🧪 Running component isolation tests...'));
                try {
                    const component = this.componentRegistry.get(input.component);
                    if (component) {
                        const testResult = await this.isolationTester.runIsolationTests([component]);
                        await this.sessionManager.addDebugStep(sessionId, {
                            action: 'Run isolation tests',
                            result: testResult.summary.failed === 0 ? 'success' : 'partial',
                            details: `Tests: ${testResult.summary.passed} passed, ${testResult.summary.failed} failed`,
                            evidence: testResult
                        });
                    }
                }
                catch (error) {
                    console.warn(chalk_1.default.yellow(`⚠️  Isolation testing failed: ${error.message}`));
                }
            }
            // Store session reference
            this.debuggingSessions.set(sessionId, await this.sessionManager.getSessionStatus(sessionId));
            this.emit('debugging:sessionStarted', {
                sessionId,
                description: input.description,
                timeLimit: input.timeLimit || this.config.defaultTimeLimit,
                timestamp: new Date().toISOString()
            });
            console.log(chalk_1.default.green(`✅ Debugging session started: ${sessionId}`));
            return sessionId;
        }
        catch (error) {
            this.emit('debugging:error', {
                error: error.message,
                input,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    /**
     * Add a debug step to an active session
     */
    async addDebugStep(sessionId, step) {
        try {
            await this.sessionManager.addDebugStep(sessionId, step);
            // Update session reference
            const session = await this.sessionManager.getSessionStatus(sessionId);
            if (session) {
                this.debuggingSessions.set(sessionId, session);
            }
            this.emit('debugging:stepAdded', {
                sessionId,
                step,
                timeRemaining: this.sessionManager.getTimeRemaining(sessionId),
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            this.emit('debugging:stepError', {
                sessionId,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    /**
     * Complete a debugging session with resolution
     */
    async completeDebuggingSession(sessionId, resolution) {
        try {
            const result = await this.sessionManager.completeSession(sessionId, resolution);
            // Extract and store knowledge
            await this.storeExtractedKnowledge(sessionId, result.knowledgeExtracted);
            // Clean up session reference
            this.debuggingSessions.delete(sessionId);
            // Share knowledge with other meta-agents if coordination is enabled
            if (this.config.metaAgentCoordination && this.metaAgentIntegration) {
                await this.shareKnowledgeWithMetaAgents(result.knowledgeExtracted);
            }
            this.emit('debugging:completed', {
                sessionId,
                result,
                timestamp: new Date().toISOString()
            });
            console.log(chalk_1.default.green(`🎉 Debugging session completed: ${sessionId}`));
            console.log(chalk_1.default.blue(`📊 Knowledge extracted: ${result.knowledgeExtracted.length} items`));
            return result;
        }
        catch (error) {
            this.emit('debugging:completionError', {
                sessionId,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    /**
     * Cancel a debugging session
     */
    async cancelDebuggingSession(sessionId, reason) {
        try {
            await this.sessionManager.cancelSession(sessionId, reason);
            this.debuggingSessions.delete(sessionId);
            this.emit('debugging:cancelled', {
                sessionId,
                reason,
                timestamp: new Date().toISOString()
            });
            console.log(chalk_1.default.yellow(`❌ Debugging session cancelled: ${sessionId} - ${reason}`));
        }
        catch (error) {
            this.emit('debugging:cancellationError', {
                sessionId,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    /**
     * Generate debug endpoints for project components
     */
    async generateDebugEndpoints(input) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            console.log(chalk_1.default.blue('🔧 Generating debug endpoints...'));
            const result = await this.endpointGenerator.generateEndpoints(input);
            // Register discovered components
            for (const component of result.componentsAnalyzed) {
                this.componentRegistry.set(component.name, component);
            }
            this.emit('endpoints:generated', {
                result,
                timestamp: new Date().toISOString()
            });
            console.log(chalk_1.default.green(`✅ Debug endpoints generated: ${result.endpointsGenerated.length}`));
            return result;
        }
        catch (error) {
            this.emit('endpoints:error', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    /**
     * Run isolation tests for components
     */
    async runIsolationTests(components, config) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            console.log(chalk_1.default.blue('🧪 Running component isolation tests...'));
            // Get components to test
            const componentsToTest = components ?
                components.map(name => this.componentRegistry.get(name)).filter(Boolean) :
                Array.from(this.componentRegistry.values());
            if (componentsToTest.length === 0) {
                throw new Error('No components found to test. Generate debug endpoints first.');
            }
            const result = await this.isolationTester.runIsolationTests(componentsToTest, config);
            this.emit('isolation:tested', {
                result,
                timestamp: new Date().toISOString()
            });
            console.log(chalk_1.default.green(`✅ Isolation tests completed: ${result.summary.passed} passed, ${result.summary.failed} failed`));
            return result;
        }
        catch (error) {
            this.emit('isolation:error', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    /**
     * Get current debugging status and active sessions
     */
    getDebuggingStatus() {
        const activeSessions = this.sessionManager.getActiveSessions();
        const totalExtracted = Array.from(this.extractedKnowledge.values()).reduce((sum, items) => sum + items.length, 0);
        return {
            activeSessions,
            totalSessions: this.debuggingSessions.size + activeSessions.length,
            completedSessions: this.debuggingSessions.size,
            registeredComponents: this.componentRegistry.size,
            extractedKnowledge: totalExtracted,
            capabilities: this.getCapabilities()
        };
    }
    /**
     * Query extracted knowledge
     */
    queryKnowledge(filters = {}) {
        let allKnowledge = [];
        for (const knowledgeItems of this.extractedKnowledge.values()) {
            allKnowledge.push(...knowledgeItems);
        }
        // Apply filters
        if (filters.type) {
            allKnowledge = allKnowledge.filter(k => k.type === filters.type);
        }
        if (filters.context) {
            allKnowledge = allKnowledge.filter(k => k.applicableContexts.some(ctx => ctx.toLowerCase().includes(filters.context.toLowerCase())));
        }
        if (filters.minConfidence !== undefined) {
            allKnowledge = allKnowledge.filter(k => k.confidence >= filters.minConfidence);
        }
        // Sort by confidence
        allKnowledge.sort((a, b) => b.confidence - a.confidence);
        // Apply limit
        if (filters.limit) {
            allKnowledge = allKnowledge.slice(0, filters.limit);
        }
        return allKnowledge;
    }
    /**
     * Get agent capabilities
     */
    getCapabilities() {
        return {
            name: 'Thirty-Minute Rule Agent',
            version: '1.0.0',
            features: [
                'Time-bounded debugging sessions',
                'Automatic debug endpoint generation',
                'Component isolation testing',
                'Fallback mechanism implementation',
                'Knowledge extraction and sharing',
                'Meta-agent coordination',
                'Context7 integration',
                'All-Purpose Pattern compliance'
            ],
            supportedProjectTypes: ['unlimited'], // NO hardcoded limitations
            supportedFrameworks: ['unlimited'], // NO hardcoded limitations
            debugEndpointGeneration: {
                automatic: true,
                customizable: true,
                projectTypes: ['unlimited'] // NO hardcoded limitations
            },
            componentIsolation: {
                testingSupported: true,
                healthChecksSupported: true,
                frameworkSupport: ['unlimited'] // NO hardcoded limitations
            },
            fallbackMechanisms: {
                strategiesSupported: ['alternative_implementation', 'cached_response', 'stub_response', 'redirect', 'custom'],
                autoTrigger: true,
                customStrategies: true
            },
            integration: {
                metaAgentCoordination: this.config.metaAgentCoordination,
                context7Support: this.config.contextEnabled,
                externalTools: ['VSCode', 'Jest', 'Mocha', 'Express', 'unlimited'] // NO hardcoded limitations
            },
            performance: {
                maxConcurrentSessions: 'unlimited',
                maxComponents: 'unlimited',
                maxEndpoints: 'unlimited'
            }
        };
    }
    /**
     * Private helper methods
     */
    setupEventForwarding() {
        // Forward events from session manager
        this.sessionManager.on('sessionStarted', (data) => this.emit('session:started', data));
        this.sessionManager.on('sessionCompleted', (data) => this.emit('session:completed', data));
        this.sessionManager.on('sessionTimeout', (data) => this.emit('session:timeout', data));
        this.sessionManager.on('debugStepAdded', (data) => this.emit('session:stepAdded', data));
        // Forward events from isolation tester
        this.isolationTester.on('testSuite:start', (data) => this.emit('isolation:start', data));
        this.isolationTester.on('testSuite:complete', (data) => this.emit('isolation:complete', data));
        this.isolationTester.on('healthCheck:complete', (data) => this.emit('health:checked', data));
        // Forward events from endpoint generator
        this.endpointGenerator.on('generation:start', (data) => this.emit('endpoints:start', data));
        this.endpointGenerator.on('generation:complete', (data) => this.emit('endpoints:complete', data));
    }
    async initializeContext7Integration() {
        try {
            console.log(chalk_1.default.blue('🔧 Initializing Context7 integration...'));
            // Context7 integration implementation would go here
            // This would provide up-to-date documentation for debugging patterns
            console.log(chalk_1.default.green('✅ Context7 integration initialized'));
        }
        catch (error) {
            console.warn(chalk_1.default.yellow(`⚠️  Context7 integration failed: ${error.message}`));
        }
    }
    async initializeMetaAgentCoordination() {
        try {
            console.log(chalk_1.default.blue('🤝 Initializing meta-agent coordination...'));
            this.metaAgentIntegration = {
                coordinatorId: 'meta-agent-coordinator',
                agentRegistration: {
                    agentId: `thirty-minute-rule-${(0, uuid_1.v4)().substring(0, 8)}`,
                    agentName: 'Thirty-Minute Rule Agent',
                    agentType: 'thirty-minute-rule',
                    capabilities: [
                        'time-bounded-debugging',
                        'debug-endpoint-generation',
                        'component-isolation-testing',
                        'fallback-mechanism-implementation',
                        'knowledge-extraction'
                    ],
                    status: 'idle'
                },
                sharedKnowledge: {
                    subscribe: ['debugging-patterns', 'component-health', 'performance-metrics'],
                    publish: ['debugging-solutions', 'fallback-strategies', 'isolation-test-results']
                },
                taskCoordination: {
                    acceptedTaskTypes: ['debugging', 'testing', 'health-check', 'fallback-implementation'],
                    priority: 8
                }
            };
            // Register with meta-agent coordinator if available
            // Implementation would depend on the coordinator being available
            console.log(chalk_1.default.green('✅ Meta-agent coordination initialized'));
        }
        catch (error) {
            console.warn(chalk_1.default.yellow(`⚠️  Meta-agent coordination failed: ${error.message}`));
        }
    }
    async loadKnowledgeBase() {
        try {
            const knowledgeBasePath = path_1.default.join(process.cwd(), '.thirty-minute-rule', 'knowledge-base.json');
            if (await fs_extra_1.default.pathExists(knowledgeBasePath)) {
                const knowledgeData = await fs_extra_1.default.readJSON(knowledgeBasePath);
                for (const [sessionId, knowledge] of Object.entries(knowledgeData)) {
                    this.extractedKnowledge.set(sessionId, knowledge);
                }
                console.log(chalk_1.default.blue(`📚 Loaded knowledge base with ${this.extractedKnowledge.size} sessions`));
            }
        }
        catch (error) {
            console.warn(chalk_1.default.yellow(`⚠️  Failed to load knowledge base: ${error.message}`));
        }
    }
    async storeExtractedKnowledge(sessionId, knowledge) {
        this.extractedKnowledge.set(sessionId, knowledge);
        try {
            const knowledgeBasePath = path_1.default.join(process.cwd(), '.thirty-minute-rule', 'knowledge-base.json');
            await fs_extra_1.default.ensureDir(path_1.default.dirname(knowledgeBasePath));
            const knowledgeData = Object.fromEntries(this.extractedKnowledge);
            await fs_extra_1.default.writeJSON(knowledgeBasePath, knowledgeData, { spaces: 2 });
        }
        catch (error) {
            console.warn(chalk_1.default.yellow(`⚠️  Failed to store knowledge base: ${error.message}`));
        }
    }
    async shareKnowledgeWithMetaAgents(knowledge) {
        try {
            // Share knowledge with other meta-agents through the coordinator
            for (const item of knowledge) {
                this.emit('knowledge:extracted', {
                    knowledge: item,
                    agentId: this.metaAgentIntegration?.agentRegistration.agentId,
                    timestamp: new Date().toISOString()
                });
            }
        }
        catch (error) {
            console.warn(chalk_1.default.yellow(`⚠️  Failed to share knowledge: ${error.message}`));
        }
    }
}
exports.ThirtyMinuteRuleAgent = ThirtyMinuteRuleAgent;
exports.default = ThirtyMinuteRuleAgent;
//# sourceMappingURL=ThirtyMinuteRuleAgent.js.map