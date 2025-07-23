"use strict";
/**
 * Debugging Session Manager - Core time-bounded problem solving engine
 *
 * Implements the 30-minute debugging rule that prevents endless debugging loops by:
 * 1. Enforcing configurable time limits on debugging sessions
 * 2. Tracking debug steps and progress systematically
 * 3. Triggering fallback mechanisms when time limits are reached
 * 4. Extracting knowledge from debugging sessions for future use
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on problem types or debugging scenarios
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebuggingSessionManager = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
class DebuggingSessionManager extends events_1.EventEmitter {
    config;
    activeSessions = new Map();
    sessionTimers = new Map();
    fallbackStrategies = new Map();
    constructor(config) {
        super();
        // All-Purpose Pattern: NO hardcoded defaults, unlimited configuration
        this.config = {
            defaultTimeLimit: config.defaultTimeLimit || 30 * 60 * 1000, // 30 minutes
            maxTimeLimit: config.maxTimeLimit, // UNLIMITED by default
            minTimeLimit: config.minTimeLimit || 5 * 60 * 1000, // 5 minutes minimum
            enableAutoFallback: config.enableAutoFallback !== false, // Default to true
            fallbackTimeout: config.fallbackTimeout || 5 * 60 * 1000, // 5 minutes for fallback
            ...config
        };
        // Load fallback strategies
        this.loadFallbackStrategies();
    }
    /**
     * Start a new debugging session with time-bounded constraints
     */
    async startSession(input) {
        const sessionId = (0, uuid_1.v4)();
        const timeLimit = this.validateTimeLimit(input.timeLimit || this.config.defaultTimeLimit);
        const session = {
            sessionId,
            startTime: new Date(),
            timeLimit,
            status: 'active',
            description: input.description,
            component: input.component,
            debugSteps: [],
            healthChecks: [],
            fallbacksTriggered: [],
            metadata: {
                projectType: this.config.projectType,
                framework: this.config.framework,
                priority: input.priority || 'medium',
                tags: [],
                configuration: input.metadata || {},
                ...this.config.customConfiguration
            }
        };
        this.activeSessions.set(sessionId, session);
        // Set up timeout timer
        const timeoutTimer = setTimeout(() => {
            this.handleSessionTimeout(sessionId);
        }, timeLimit);
        this.sessionTimers.set(sessionId, timeoutTimer);
        // Load custom fallback strategies for this session
        if (input.customStrategies) {
            for (const strategy of input.customStrategies) {
                this.fallbackStrategies.set(strategy.strategyId, strategy);
            }
        }
        this.emit('sessionStarted', {
            sessionId,
            session,
            timeLimit,
            timestamp: new Date()
        });
        console.log(`🚀 Debugging session started: ${sessionId}`);
        console.log(`⏰ Time limit: ${Math.round(timeLimit / 60000)} minutes`);
        console.log(`🎯 Target: ${input.description}`);
        return sessionId;
    }
    /**
     * Add a debug step to an active session
     */
    async addDebugStep(sessionId, step) {
        const session = this.activeSessions.get(sessionId);
        if (!session || session.status !== 'active') {
            throw new Error(`Session ${sessionId} is not active`);
        }
        const debugStep = {
            stepId: (0, uuid_1.v4)(),
            timestamp: new Date(),
            duration: Date.now() - session.startTime.getTime(),
            ...step
        };
        session.debugSteps.push(debugStep);
        this.emit('debugStepAdded', {
            sessionId,
            step: debugStep,
            totalSteps: session.debugSteps.length,
            timeRemaining: this.getTimeRemaining(sessionId)
        });
        // Check if we should trigger fallback based on step results
        if (step.result === 'failure' && this.config.enableAutoFallback) {
            await this.evaluateFallbackStrategies(sessionId, 'error', step.details);
        }
        console.log(`📝 Debug step added: ${step.action} → ${step.result}`);
    }
    /**
     * Complete a debugging session successfully
     */
    async completeSession(sessionId, resolution) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        // Clear timeout timer
        const timer = this.sessionTimers.get(sessionId);
        if (timer) {
            clearTimeout(timer);
            this.sessionTimers.delete(sessionId);
        }
        session.status = 'completed';
        session.endTime = new Date();
        const totalTime = session.endTime.getTime() - session.startTime.getTime();
        const completedInTime = totalTime <= session.timeLimit;
        // Extract knowledge from the session
        const knowledgeExtracted = await this.extractKnowledgeFromSession(session);
        const result = {
            sessionId,
            success: true,
            completedInTime,
            session,
            resolution,
            fallbacksUsed: session.fallbacksTriggered,
            knowledgeExtracted,
            nextActions: this.generateNextActions(session),
            performance: {
                totalTime,
                debugSteps: session.debugSteps.length,
                healthChecks: session.healthChecks.length,
                fallbacksTriggered: session.fallbacksTriggered.length
            }
        };
        this.activeSessions.delete(sessionId);
        this.emit('sessionCompleted', {
            sessionId,
            result,
            timestamp: new Date()
        });
        console.log(`✅ Debugging session completed: ${sessionId}`);
        console.log(`⏱️  Total time: ${Math.round(totalTime / 60000)}min ${Math.round((totalTime % 60000) / 1000)}s`);
        console.log(`🎯 Resolution: ${resolution}`);
        return result;
    }
    /**
     * Cancel a debugging session
     */
    async cancelSession(sessionId, reason) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return;
        }
        // Clear timeout timer
        const timer = this.sessionTimers.get(sessionId);
        if (timer) {
            clearTimeout(timer);
            this.sessionTimers.delete(sessionId);
        }
        session.status = 'cancelled';
        session.endTime = new Date();
        this.activeSessions.delete(sessionId);
        this.sessionTimers.delete(sessionId);
        this.emit('sessionCancelled', {
            sessionId,
            reason,
            session,
            timestamp: new Date()
        });
        console.log(`❌ Debugging session cancelled: ${sessionId} - ${reason}`);
    }
    /**
     * Get time remaining for a session
     */
    getTimeRemaining(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session || session.status !== 'active') {
            return 0;
        }
        const elapsed = Date.now() - session.startTime.getTime();
        return Math.max(0, session.timeLimit - elapsed);
    }
    /**
     * Get current session status
     */
    getSessionStatus(sessionId) {
        return this.activeSessions.get(sessionId) || null;
    }
    /**
     * Get all active sessions
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    /**
     * Handle session timeout - triggers fallback mechanisms
     */
    async handleSessionTimeout(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session || session.status !== 'active') {
            return;
        }
        console.log(`⏰ Session timeout reached: ${sessionId}`);
        // Try fallback strategies before marking as timeout
        const fallbackTriggered = await this.evaluateFallbackStrategies(sessionId, 'timeout', 'Session time limit exceeded');
        if (fallbackTriggered) {
            session.status = 'fallback';
            console.log(`🔄 Fallback strategy activated for session: ${sessionId}`);
        }
        else {
            session.status = 'timeout';
            session.endTime = new Date();
            this.activeSessions.delete(sessionId);
            console.log(`❌ Session timeout without fallback: ${sessionId}`);
        }
        this.sessionTimers.delete(sessionId);
        this.emit('sessionTimeout', {
            sessionId,
            session,
            fallbackTriggered,
            timestamp: new Date()
        });
    }
    /**
     * Evaluate and execute fallback strategies
     */
    async evaluateFallbackStrategies(sessionId, triggerType, triggerDetails) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return false;
        }
        // Find applicable fallback strategies
        const applicableStrategies = Array.from(this.fallbackStrategies.values())
            .filter(strategy => strategy.enabled &&
            strategy.triggers.some(trigger => trigger.type === triggerType))
            .sort((a, b) => b.priority - a.priority); // Higher priority first
        for (const strategy of applicableStrategies) {
            try {
                const fallbackExecution = {
                    executionId: (0, uuid_1.v4)(),
                    timestamp: new Date(),
                    strategyId: strategy.strategyId,
                    trigger: strategy.triggers.find(t => t.type === triggerType),
                    action: strategy.action,
                    result: 'success', // Will be updated based on execution
                    details: `Fallback triggered by ${triggerType}: ${triggerDetails}`,
                    fallbackTime: Date.now() - session.startTime.getTime(),
                    originalError: triggerDetails
                };
                // Execute fallback strategy
                const success = await this.executeFallbackStrategy(sessionId, strategy, fallbackExecution);
                fallbackExecution.result = success ? 'success' : 'failure';
                session.fallbacksTriggered.push(fallbackExecution);
                if (success) {
                    console.log(`✅ Fallback strategy executed successfully: ${strategy.name}`);
                    return true;
                }
            }
            catch (error) {
                console.error(`❌ Fallback strategy failed: ${strategy.name}`, error);
                const fallbackExecution = {
                    executionId: (0, uuid_1.v4)(),
                    timestamp: new Date(),
                    strategyId: strategy.strategyId,
                    trigger: strategy.triggers.find(t => t.type === triggerType),
                    action: strategy.action,
                    result: 'failure',
                    details: `Fallback execution failed: ${error instanceof Error ? error.message : String(error)}`,
                    fallbackTime: Date.now() - session.startTime.getTime(),
                    originalError: triggerDetails
                };
                session.fallbacksTriggered.push(fallbackExecution);
            }
        }
        return false;
    }
    /**
     * Execute a specific fallback strategy
     */
    async executeFallbackStrategy(sessionId, strategy, execution) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return false;
        }
        switch (strategy.action.type) {
            case 'alternative_implementation':
                return await this.executeAlternativeImplementation(sessionId, strategy);
            case 'cached_response':
                return await this.executeCachedResponse(sessionId, strategy);
            case 'stub_response':
                return await this.executeStubResponse(sessionId, strategy);
            case 'redirect':
                return await this.executeRedirect(sessionId, strategy);
            case 'custom':
                return await this.executeCustomFallback(sessionId, strategy);
            default:
                console.warn(`⚠️  Unknown fallback action type: ${strategy.action.type}`);
                return false;
        }
    }
    /**
     * Execute alternative implementation fallback
     */
    async executeAlternativeImplementation(sessionId, strategy) {
        // Implementation would depend on the specific alternative approach
        // This is a placeholder for the actual implementation logic
        console.log(`🔄 Executing alternative implementation: ${strategy.action.implementation}`);
        // Add debug step for fallback execution
        await this.addDebugStep(sessionId, {
            action: `Alternative implementation: ${strategy.name}`,
            result: 'success',
            details: `Switched to alternative approach: ${strategy.action.implementation}`,
            confidence: 0.7 // Lower confidence for fallback solutions
        });
        return true;
    }
    /**
     * Execute cached response fallback
     */
    async executeCachedResponse(sessionId, strategy) {
        console.log(`💾 Executing cached response fallback: ${strategy.name}`);
        await this.addDebugStep(sessionId, {
            action: `Cached response fallback: ${strategy.name}`,
            result: 'success',
            details: `Using cached response from: ${strategy.action.implementation}`,
            confidence: 0.8
        });
        return true;
    }
    /**
     * Execute stub response fallback
     */
    async executeStubResponse(sessionId, strategy) {
        console.log(`🎭 Executing stub response fallback: ${strategy.name}`);
        await this.addDebugStep(sessionId, {
            action: `Stub response fallback: ${strategy.name}`,
            result: 'success',
            details: `Using stub implementation: ${strategy.action.implementation}`,
            confidence: 0.6
        });
        return true;
    }
    /**
     * Execute redirect fallback
     */
    async executeRedirect(sessionId, strategy) {
        console.log(`↗️  Executing redirect fallback: ${strategy.name}`);
        await this.addDebugStep(sessionId, {
            action: `Redirect fallback: ${strategy.name}`,
            result: 'success',
            details: `Redirecting to: ${strategy.action.implementation}`,
            confidence: 0.9
        });
        return true;
    }
    /**
     * Execute custom fallback
     */
    async executeCustomFallback(sessionId, strategy) {
        console.log(`🔧 Executing custom fallback: ${strategy.name}`);
        // Custom fallback logic would be implemented based on the strategy configuration
        // This is a placeholder for custom implementations
        await this.addDebugStep(sessionId, {
            action: `Custom fallback: ${strategy.name}`,
            result: 'success',
            details: `Custom fallback executed: ${strategy.action.implementation}`,
            confidence: 0.7
        });
        return true;
    }
    /**
     * Extract knowledge from completed debugging session
     */
    async extractKnowledgeFromSession(session) {
        const knowledge = [];
        // Extract patterns from successful debug steps
        const successfulSteps = session.debugSteps.filter(step => step.result === 'success');
        if (successfulSteps.length > 0) {
            knowledge.push({
                type: 'pattern',
                title: `Successful debugging pattern for ${session.component || 'general'}`,
                description: `Pattern derived from ${successfulSteps.length} successful debug steps`,
                applicableContexts: [session.metadata.projectType, session.metadata.framework].filter(Boolean),
                confidence: 0.8,
                evidence: successfulSteps.map(step => ({
                    action: step.action,
                    result: step.result,
                    details: step.details
                }))
            });
        }
        // Extract anti-patterns from failed steps
        const failedSteps = session.debugSteps.filter(step => step.result === 'failure');
        if (failedSteps.length > 1) {
            knowledge.push({
                type: 'anti-pattern',
                title: `Debugging anti-pattern identified`,
                description: `Pattern of failures that should be avoided`,
                applicableContexts: [session.metadata.projectType, session.metadata.framework].filter(Boolean),
                confidence: 0.7,
                evidence: failedSteps.map(step => ({
                    action: step.action,
                    result: step.result,
                    details: step.details
                }))
            });
        }
        // Extract solutions from fallback executions
        const successfulFallbacks = session.fallbacksTriggered.filter(fb => fb.result === 'success');
        for (const fallback of successfulFallbacks) {
            knowledge.push({
                type: 'solution',
                title: `Fallback solution: ${fallback.strategyId}`,
                description: `Working fallback strategy for similar scenarios`,
                applicableContexts: [session.metadata.projectType, session.metadata.framework].filter(Boolean),
                confidence: 0.6,
                evidence: {
                    trigger: fallback.trigger,
                    action: fallback.action,
                    result: fallback.result,
                    fallbackTime: fallback.fallbackTime
                }
            });
        }
        return knowledge;
    }
    /**
     * Generate next actions based on session results
     */
    generateNextActions(session) {
        const actions = [];
        // Suggest improvements based on debug steps
        const failureRate = session.debugSteps.filter(s => s.result === 'failure').length / session.debugSteps.length;
        if (failureRate > 0.5) {
            actions.push('Consider improving debugging methodology or tools');
            actions.push('Review component architecture for testability improvements');
        }
        // Suggest fallback improvements
        if (session.fallbacksTriggered.length > 0) {
            const failedFallbacks = session.fallbacksTriggered.filter(fb => fb.result === 'failure');
            if (failedFallbacks.length > 0) {
                actions.push('Review and improve fallback strategy configurations');
            }
        }
        // Time-based suggestions
        const totalTime = session.endTime.getTime() - session.startTime.getTime();
        if (totalTime > session.timeLimit * 0.8) {
            actions.push('Consider breaking down complex debugging tasks into smaller sessions');
        }
        return actions;
    }
    /**
     * Validate time limit against configured constraints
     */
    validateTimeLimit(timeLimit) {
        if (this.config.minTimeLimit && timeLimit < this.config.minTimeLimit) {
            return this.config.minTimeLimit;
        }
        if (this.config.maxTimeLimit && timeLimit > this.config.maxTimeLimit) {
            return this.config.maxTimeLimit;
        }
        return timeLimit;
    }
    /**
     * Load default fallback strategies
     */
    loadFallbackStrategies() {
        // Load strategies from configuration or use defaults
        const defaultStrategies = this.config.fallbackStrategies || [
            {
                strategyId: 'alternative-implementation',
                name: 'Alternative Implementation',
                description: 'Switch to alternative implementation when primary approach fails',
                triggers: [
                    { type: 'timeout', condition: 'session_timeout', threshold: 1 },
                    { type: 'error', condition: 'consecutive_failures', threshold: 3 }
                ],
                action: {
                    type: 'alternative_implementation',
                    implementation: 'fallback_implementation',
                    timeoutMs: 5 * 60 * 1000
                },
                priority: 10,
                enabled: true
            },
            {
                strategyId: 'cached-response',
                name: 'Cached Response',
                description: 'Use cached response when real-time debugging fails',
                triggers: [
                    { type: 'timeout', condition: 'session_timeout', threshold: 1 }
                ],
                action: {
                    type: 'cached_response',
                    implementation: 'cache_store',
                    parameters: { maxAge: 3600000 }
                },
                priority: 8,
                enabled: true
            },
            {
                strategyId: 'stub-response',
                name: 'Stub Response',
                description: 'Return stub response when debugging cannot complete',
                triggers: [
                    { type: 'timeout', condition: 'session_timeout', threshold: 1 },
                    { type: 'error', condition: 'critical_failure', threshold: 1 }
                ],
                action: {
                    type: 'stub_response',
                    implementation: 'stub_generator',
                    parameters: { responseType: 'minimal' }
                },
                priority: 5,
                enabled: true
            }
        ];
        for (const strategy of defaultStrategies) {
            this.fallbackStrategies.set(strategy.strategyId, strategy);
        }
    }
}
exports.DebuggingSessionManager = DebuggingSessionManager;
//# sourceMappingURL=DebuggingSessionManager.js.map