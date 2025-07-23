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
import { EventEmitter } from 'events';
import { ThirtyMinuteRuleConfig, DebugSession, DebuggingSessionResult, FallbackStrategyConfig } from '../types/index.js';
export declare class DebuggingSessionManager extends EventEmitter {
    private config;
    private activeSessions;
    private sessionTimers;
    private fallbackStrategies;
    constructor(config: ThirtyMinuteRuleConfig);
    /**
     * Start a new debugging session with time-bounded constraints
     */
    startSession(input: {
        description: string;
        component?: string;
        timeLimit?: number;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        metadata?: Record<string, any>;
        customStrategies?: FallbackStrategyConfig[];
    }): Promise<string>;
    /**
     * Add a debug step to an active session
     */
    addDebugStep(sessionId: string, step: {
        action: string;
        result: 'success' | 'failure' | 'partial' | 'timeout';
        details: string;
        evidence?: any;
        nextActions?: string[];
        confidence?: number;
    }): Promise<void>;
    /**
     * Complete a debugging session successfully
     */
    completeSession(sessionId: string, resolution: string): Promise<DebuggingSessionResult>;
    /**
     * Cancel a debugging session
     */
    cancelSession(sessionId: string, reason: string): Promise<void>;
    /**
     * Get time remaining for a session
     */
    getTimeRemaining(sessionId: string): number;
    /**
     * Get current session status
     */
    getSessionStatus(sessionId: string): DebugSession | null;
    /**
     * Get all active sessions
     */
    getActiveSessions(): DebugSession[];
    /**
     * Handle session timeout - triggers fallback mechanisms
     */
    private handleSessionTimeout;
    /**
     * Evaluate and execute fallback strategies
     */
    private evaluateFallbackStrategies;
    /**
     * Execute a specific fallback strategy
     */
    private executeFallbackStrategy;
    /**
     * Execute alternative implementation fallback
     */
    private executeAlternativeImplementation;
    /**
     * Execute cached response fallback
     */
    private executeCachedResponse;
    /**
     * Execute stub response fallback
     */
    private executeStubResponse;
    /**
     * Execute redirect fallback
     */
    private executeRedirect;
    /**
     * Execute custom fallback
     */
    private executeCustomFallback;
    /**
     * Extract knowledge from completed debugging session
     */
    private extractKnowledgeFromSession;
    /**
     * Generate next actions based on session results
     */
    private generateNextActions;
    /**
     * Validate time limit against configured constraints
     */
    private validateTimeLimit;
    /**
     * Load default fallback strategies
     */
    private loadFallbackStrategies;
}
//# sourceMappingURL=DebuggingSessionManager.d.ts.map