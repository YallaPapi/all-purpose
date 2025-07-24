/**
 * Meta-Agent Coordinator - Handles coordination with other meta-agents
 *
 * Enables seamless coordination across unlimited meta-agents
 * Following All-Purpose Pattern: NO hardcoded limitations on agent coordination
 */
import { EventEmitter } from 'events';
import { ParameterFlowConfig } from '../types/index.js';
interface MetaAgentInfo {
    agentId: string;
    agentType: string;
    agentName: string;
    version: string;
    capabilities: string[];
    status: 'online' | 'offline' | 'busy' | 'error';
    endpoint?: string;
    lastSeen: Date;
    metadata: Record<string, any>;
}
export declare class MetaAgentCoordinator extends EventEmitter {
    private config;
    private isInitialized;
    private registeredAgents;
    private pendingRequests;
    private messageHistory;
    private coordinationMetrics;
    private readonly KNOWN_META_AGENTS;
    constructor(config: ParameterFlowConfig);
    initialize(): Promise<void>;
    /**
     * Initialize coordination with all meta-agents
     */
    initializeCoordination(): Promise<void>;
    /**
     * Register a meta-agent
     */
    registerAgent(agentInfo: MetaAgentInfo): Promise<void>;
    /**
     * Send coordination request to another meta-agent
     */
    sendRequest(targetAgentId: string, requestType: string, parameters: Record<string, any>, timeout?: number): Promise<any>;
    /**
     * Send notification to meta-agent(s)
     */
    sendNotification(targetAgentId: string | 'broadcast', notificationType: string, data: Record<string, any>): Promise<void>;
    /**
     * Request integration architecture assistance from other agents
     */
    requestIntegrationAssistance(integrationRequest: {
        assistanceType: 'architecture-review' | 'component-analysis' | 'testing-strategy' | 'deployment-guidance';
        integrationArchitecture: any;
        specificRequirements?: Record<string, any>;
    }): Promise<any>;
    /**
     * Coordinate with PRD-Parser Agent for requirements analysis
     */
    coordinateRequirementsAnalysis(requirements: any): Promise<any>;
    /**
     * Share integration patterns with Template Engine Factory Agent
     */
    shareIntegrationPatterns(patterns: any[]): Promise<void>;
    /**
     * Get coordination status
     */
    getCoordinationStatus(): any;
    /**
     * Private helper methods
     */
    private initializeCommunicationChannels;
    private setupEventHandlers;
    private setupHttpCommunication;
    private setupWebSocketCommunication;
    private setupMessageQueueCommunication;
    private discoverMetaAgents;
    private discoverMetaAgentInDirectory;
    private inferAgentType;
    private formatAgentName;
    private attemptAgentConnection;
    private setupCommunicationProtocols;
    private initializeProtocol;
    private setupHttpProtocol;
    private setupWebSocketProtocol;
    private setupMessageQueueProtocol;
    private setupHealthMonitoring;
    private performHealthChecks;
    private initializeMetrics;
    private sendMessage;
    private simulateMessageDelivery;
    private sendNotificationToAgent;
    private handleIncomingMessage;
    private handleIncomingRequest;
    private handleIncomingResponse;
    private handleIncomingNotification;
    private handleIncomingEvent;
    private summarizeAssistanceResults;
}
export default MetaAgentCoordinator;
//# sourceMappingURL=MetaAgentCoordinator.d.ts.map