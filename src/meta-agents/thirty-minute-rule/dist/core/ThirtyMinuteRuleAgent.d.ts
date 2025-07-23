#!/usr/bin/env node
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
import { EventEmitter } from 'events';
import { ThirtyMinuteRuleConfig, ThirtyMinuteRuleAgentCapabilities, DebugSession, DebuggingSessionResult, DebugEndpointGenerationResult, IsolationTestSuite, ExtractedKnowledge } from '../types/index.js';
/**
 * Thirty-Minute Rule Agent - Prevents endless debugging loops through systematic time-bounded debugging
 * NO limitations on project types, debugging scenarios, or complexity levels
 */
export declare class ThirtyMinuteRuleAgent extends EventEmitter {
    private config;
    private sessionManager;
    private isolationTester;
    private endpointGenerator;
    private isInitialized;
    private metaAgentIntegration?;
    private extractedKnowledge;
    private debuggingSessions;
    private componentRegistry;
    constructor(config?: ThirtyMinuteRuleConfig);
    /**
     * Initialize the agent - Context7 enhanced setup
     */
    initialize(): Promise<void>;
    /**
     * Start a time-bounded debugging session - main entry point
     */
    startDebuggingSession(input: {
        description: string;
        component?: string;
        timeLimit?: number;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        autoGenerateEndpoints?: boolean;
        runIsolationTests?: boolean;
        enableFallbacks?: boolean;
        customStrategies?: any[];
        metadata?: Record<string, any>;
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
     * Complete a debugging session with resolution
     */
    completeDebuggingSession(sessionId: string, resolution: string): Promise<DebuggingSessionResult>;
    /**
     * Cancel a debugging session
     */
    cancelDebuggingSession(sessionId: string, reason: string): Promise<void>;
    /**
     * Generate debug endpoints for project components
     */
    generateDebugEndpoints(input?: {
        sourceDirectory?: string;
        outputDirectory?: string;
        componentFilter?: string[];
        endpointTypes?: ('health' | 'isolation' | 'fallback' | 'metrics')[];
    }): Promise<DebugEndpointGenerationResult>;
    /**
     * Run isolation tests for components
     */
    runIsolationTests(components?: string[], config?: any): Promise<IsolationTestSuite>;
    /**
     * Get current debugging status and active sessions
     */
    getDebuggingStatus(): {
        activeSessions: DebugSession[];
        totalSessions: number;
        completedSessions: number;
        registeredComponents: number;
        extractedKnowledge: number;
        capabilities: ThirtyMinuteRuleAgentCapabilities;
    };
    /**
     * Query extracted knowledge
     */
    queryKnowledge(filters?: {
        type?: 'pattern' | 'solution' | 'anti-pattern' | 'best-practice';
        context?: string;
        minConfidence?: number;
        limit?: number;
    }): ExtractedKnowledge[];
    /**
     * Get agent capabilities
     */
    getCapabilities(): ThirtyMinuteRuleAgentCapabilities;
    /**
     * Private helper methods
     */
    private setupEventForwarding;
    private initializeContext7Integration;
    private initializeMetaAgentCoordination;
    private loadKnowledgeBase;
    private storeExtractedKnowledge;
    private shareKnowledgeWithMetaAgents;
}
export default ThirtyMinuteRuleAgent;
//# sourceMappingURL=ThirtyMinuteRuleAgent.d.ts.map