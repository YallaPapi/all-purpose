/**
 * Meta-Agent Integrator - Integrates with other meta-agents in the ecosystem
 *
 * Provides unlimited integration capabilities with no hardcoded limitations
 * Following All-Purpose Pattern: NO limits on integration complexity
 */
import { EventEmitter } from 'events';
import { VercelNativeConfig, VercelArchitecture, MetaAgentIntegration, AgentCoordinationResult } from '../types/index.js';
export declare class MetaAgentIntegrator extends EventEmitter {
    private config;
    private isInitialized;
    private connectedAgents;
    constructor(config: VercelNativeConfig);
    initialize(): Promise<void>;
    /**
     * Coordinate with other meta-agents for architecture deployment
     */
    coordinateDeployment(architecture: VercelArchitecture, options: any): Promise<AgentCoordinationResult>;
    /**
     * Register integration with other meta-agents
     */
    registerIntegration(integration: MetaAgentIntegration): Promise<void>;
    /**
     * Coordinate with Template Engine Factory Agent
     */
    private coordinateWithTemplateEngine;
    /**
     * Coordinate with Parameter Flow Agent
     */
    private coordinateWithParameterFlow;
    /**
     * Coordinate with IOA for anti-pattern detection
     */
    private coordinateWithIOA;
    /**
     * Coordinate with 5-Document Framework Agent
     */
    private coordinateWithDocumentationFramework;
    /**
     * Coordinate with PRD-Parser Agent
     */
    private coordinateWithPRDParser;
    /**
     * Coordinate with 30-Minute Rule Agent
     */
    private coordinateWith30MinuteRule;
    /**
     * Get integration status for all connected agents
     */
    getIntegrationStatus(): Promise<any>;
    /**
     * Optimize cross-agent coordination
     */
    optimizeCoordination(options: any): Promise<any>;
}
export default MetaAgentIntegrator;
//# sourceMappingURL=MetaAgentIntegrator.d.ts.map