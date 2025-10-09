/**
 * NATS-Enabled Agent Wrapper
 *
 * Wraps existing meta-agents to enable NATS communication
 * for distributed coordination and task execution
 */
import { NatsConnection, Subscription } from 'nats';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
export interface AgentConfig {
    id: string;
    type: string;
    name: string;
    capabilities: string[];
    natsUrl?: string;
    natsUser?: string;
    natsPass?: string;
}
export interface AgentTask {
    id: string;
    type: string;
    workflowId?: string;
    payload: any;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    timeout?: number;
    retries?: number;
}
export interface TaskResult {
    taskId: string;
    agentId: string;
    success: boolean;
    result?: any;
    error?: string;
    executionTime: number;
    timestamp: Date;
}
export declare class NATSAgentWrapper extends EventEmitter {
    protected nc: NatsConnection | null;
    protected logger: Logger;
    protected config: AgentConfig;
    protected status: 'idle' | 'busy' | 'offline';
    protected subscriptions: Subscription[];
    protected heartbeatInterval: NodeJS.Timeout | null;
    protected currentTask: AgentTask | null;
    protected wrappedAgent: any;
    constructor(config: AgentConfig, wrappedAgent: any);
    connect(): Promise<void>;
    protected setupConnectionHandlers(): void;
    protected register(): Promise<void>;
    protected setupSubscriptions(): Promise<void>;
    protected handleTaskSubscription(sub: Subscription): Promise<void>;
    protected handleControlSubscription(sub: Subscription): Promise<void>;
    protected executeTask(task: AgentTask): Promise<void>;
    protected executeWrappedAgent(task: AgentTask): Promise<any>;
    protected publishTaskResult(result: TaskResult): Promise<void>;
    protected publishStatus(event: string, data: any): Promise<void>;
    protected startHeartbeat(): void;
    shutdown(): Promise<void>;
    getStatus(): string;
    getCurrentTask(): AgentTask | null;
    isConnected(): boolean;
}
//# sourceMappingURL=NATSAgentWrapper.d.ts.map