/**
 * Meta-Agent Coordination System
 *
 * Use context7: Shared knowledge base and coordination for meta-agents
 * Following All-Purpose Pattern: Configurable for ANY agent types and coordination patterns
 */
import { EventEmitter } from 'events';
export interface MetaAgentRegistration {
    agentId: string;
    agentName: string;
    agentType: 'prd-parser' | 'scaffold-generator' | 'all-purpose-pattern' | 'template-engine' | 'parameter-flow' | 'vercel-native' | 'taskmaster-workflow' | 'custom';
    capabilities: string[];
    status: 'initializing' | 'idle' | 'working' | 'error' | 'offline';
    lastSeen: Date;
    metadata: {
        version?: string;
        location?: string;
        dependencies?: string[];
        outputs?: string[];
        configuration?: Record<string, any>;
    };
}
export interface SharedKnowledge {
    id: string;
    sourceAgentId: string;
    knowledgeType: 'pattern' | 'finding' | 'template' | 'configuration' | 'error' | 'solution' | 'resource';
    title: string;
    content: string;
    tags: string[];
    relevantAgents: string[];
    confidence: number;
    createdAt: Date;
    lastUpdated: Date;
    metadata: Record<string, any>;
}
export interface CoordinationTask {
    taskId: string;
    parentTaskId?: string;
    assignedAgentId?: string;
    requestingAgentId: string;
    taskType: 'analysis' | 'generation' | 'validation' | 'research' | 'coordination';
    description: string;
    requirements: string[];
    dependencies: string[];
    status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    deadline?: Date;
    result?: any;
    error?: string;
    createdAt: Date;
    lastUpdated: Date;
}
export interface MetaAgentCoordinatorConfig {
    coordinatorId: string;
    knowledgeBasePath: string;
    agentRegistryPath: string;
    maxConcurrentTasks: number;
    taskTimeoutMs: number;
    heartbeatIntervalMs: number;
    knowledgeRetentionDays: number;
    enableAutoCoordination: boolean;
}
/**
 * Meta-Agent Coordination System
 * Manages agent registration, shared knowledge, and task coordination
 */
export declare class MetaAgentCoordinator extends EventEmitter {
    private config;
    private registeredAgents;
    private sharedKnowledge;
    private coordinationTasks;
    private activeHeartbeats;
    private coordinatorRunning;
    constructor(config?: Partial<MetaAgentCoordinatorConfig>);
    /**
     * Start the coordination system
     */
    start(): Promise<void>;
    /**
     * Stop the coordination system
     */
    stop(): Promise<void>;
    /**
     * Register a meta-agent in the coordination system
     */
    registerAgent(registration: Omit<MetaAgentRegistration, 'lastSeen'>): Promise<string>;
    /**
     * Unregister a meta-agent
     */
    unregisterAgent(agentId: string): Promise<void>;
    /**
     * Update agent status and heartbeat
     */
    updateAgentStatus(agentId: string, status: MetaAgentRegistration['status'], metadata?: Record<string, any>): Promise<void>;
    /**
     * Share knowledge in the coordination system
     */
    shareKnowledge(knowledge: Omit<SharedKnowledge, 'id' | 'createdAt' | 'lastUpdated'>): Promise<string>;
    /**
     * Query shared knowledge
     */
    queryKnowledge(filters?: {
        agentId?: string;
        knowledgeType?: SharedKnowledge['knowledgeType'];
        tags?: string[];
        minConfidence?: number;
        limit?: number;
    }): SharedKnowledge[];
    /**
     * Create a coordination task
     */
    createTask(task: Omit<CoordinationTask, 'taskId' | 'status' | 'createdAt' | 'lastUpdated'>): Promise<string>;
    /**
     * Update task status and result
     */
    updateTask(taskId: string, updates: Partial<Pick<CoordinationTask, 'status' | 'result' | 'error' | 'assignedAgentId'>>): Promise<void>;
    /**
     * Get available tasks for an agent
     */
    getAvailableTasks(agentId: string, limit?: number): CoordinationTask[];
    /**
     * Get coordination statistics
     */
    getCoordinationStats(): {
        agents: {
            total: number;
            online: number;
            working: number;
            idle: number;
            byType: Record<string, number>;
        };
        tasks: {
            total: number;
            pending: number;
            assigned: number;
            inProgress: number;
            completed: number;
            failed: number;
            byType: Record<string, number>;
            byPriority: Record<string, number>;
        };
        knowledge: {
            total: number;
            byType: Record<string, number>;
            byAgent: Record<string, number>;
            avgConfidence: number;
        };
    };
    /**
     * Setup heartbeat monitoring for an agent
     */
    private setupHeartbeatMonitoring;
    /**
     * Handle missed heartbeat (agent goes offline)
     */
    private handleMissedHeartbeat;
    /**
     * Cancel tasks assigned to an agent
     */
    private cancelAgentTasks;
    /**
     * Auto-assign available tasks to an agent
     */
    private assignAvailableTasks;
    /**
     * Auto-assign a specific task
     */
    private autoAssignTask;
    /**
     * Check if an agent can handle a specific task
     */
    private canAgentHandleTask;
    /**
     * Calculate how relevant an agent is for a specific task
     */
    private calculateAgentTaskRelevance;
    /**
     * Notify relevant agents about new knowledge
     */
    private notifyRelevantAgents;
    /**
     * Extract knowledge from completed task
     */
    private extractKnowledgeFromTask;
    /**
     * Infer knowledge type from task
     */
    private inferKnowledgeType;
    /**
     * Infer relevant agents from task
     */
    private inferRelevantAgents;
    /**
     * Perform system maintenance
     */
    private performMaintenance;
    /**
     * Load state from persistent storage
     */
    private loadState;
    /**
     * Save state to persistent storage
     */
    private saveState;
    /**
     * Utility function to group array by property
     */
    private groupBy;
    /**
     * Get current running status
     */
    isRunning(): boolean;
    /**
     * Get current configuration
     */
    getConfig(): MetaAgentCoordinatorConfig;
}
/**
 * Create meta-agent coordinator with default configuration
 */
export declare function createMetaAgentCoordinator(config?: Partial<MetaAgentCoordinatorConfig>): MetaAgentCoordinator;
//# sourceMappingURL=metaAgentCoordinator.d.ts.map