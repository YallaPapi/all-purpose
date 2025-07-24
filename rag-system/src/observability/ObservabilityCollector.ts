/**
 * Observability Collector
 * 
 * Captures and structures all meta-agent coordination events for visualization
 * Following All-Purpose Pattern: Configurable observability for ANY agent system
 */

import { EventEmitter } from 'events';
import { MetaAgentCoordinator, MetaAgentRegistration, CoordinationTask, SharedKnowledge } from '../coordination/metaAgentCoordinator';
import { createContextLogger, performanceLogger } from '../utils/logger';
import { Redis } from '@upstash/redis';

const observabilityLogger = createContextLogger('OBSERVABILITY');

export interface ObservabilityEvent {
  id: string;
  timestamp: Date;
  eventType: 'agent' | 'task' | 'knowledge' | 'coordination' | 'system';
  eventName: string;
  agentId?: string;
  taskId?: string;
  knowledgeId?: string;
  data: any;
  metadata: {
    duration?: number;
    previousState?: string;
    newState?: string;
    relevantAgents?: string[];
    priority?: string;
    tags?: string[];
  };
}

export interface AgentFlowNode {
  id: string;
  label: string;
  type: 'agent' | 'task' | 'knowledge';
  status: string;
  lastActivity: Date;
  connections: string[];
  metrics: {
    tasksCompleted: number;
    knowledgeShared: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export interface CoordinationMetrics {
  totalEvents: number;
  activeAgents: number;
  completedTasks: number;
  sharedKnowledge: number;
  averageCoordinationTime: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  eventsByType: Record<string, number>;
  agentPerformance: Record<string, {
    tasksCompleted: number;
    averageTime: number;
    successRate: number;
    lastSeen: Date;
  }>;
}

export class ObservabilityCollector extends EventEmitter {
  private redis: Redis;
  private events: Map<string, ObservabilityEvent> = new Map();
  private agentMetrics: Map<string, any> = new Map();
  private taskTimings: Map<string, { startTime: Date; agentId?: string }> = new Map();
  private isCollecting = false;
  private metricsInterval?: NodeJS.Timeout;

  constructor() {
    super();
    
    // Initialize Redis connection using existing KV setup
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    observabilityLogger.info('ObservabilityCollector initialized');
  }

  /**
   * Start collecting observability data from coordinator
   */
  async startCollecting(coordinator: MetaAgentCoordinator): Promise<void> {
    if (this.isCollecting) {
      observabilityLogger.warn('Observability collection already started');
      return;
    }

    // Listen to all coordinator events
    this.setupCoordinatorListeners(coordinator);
    
    // Start metrics collection interval
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics(coordinator);
    }, 10000); // Collect metrics every 10 seconds

    this.isCollecting = true;
    observabilityLogger.info('Started observability collection');
    
    // Record system start event
    await this.recordEvent({
      eventType: 'system',
      eventName: 'observability_started',
      data: { coordinatorId: coordinator.getConfig().coordinatorId },
      metadata: { tags: ['system', 'startup'] }
    });
  }

  /**
   * Stop collecting observability data
   */
  async stopCollecting(): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.isCollecting = false;
    observabilityLogger.info('Stopped observability collection');
    
    await this.recordEvent({
      eventType: 'system',
      eventName: 'observability_stopped',
      data: { totalEventsCollected: this.events.size },
      metadata: { tags: ['system', 'shutdown'] }
    });
  }

  /**
   * Setup listeners for all coordinator events
   */
  private setupCoordinatorListeners(coordinator: MetaAgentCoordinator): void {
    // System events
    coordinator.on('coordinatorStarted', (data) => {
      this.recordEvent({
        eventType: 'system',
        eventName: 'coordinator_started',
        data,
        metadata: { tags: ['system', 'startup'] }
      });
    });

    coordinator.on('coordinatorStopped', (data) => {
      this.recordEvent({
        eventType: 'system',
        eventName: 'coordinator_stopped',
        data,
        metadata: { tags: ['system', 'shutdown'] }
      });
    });

    // Agent events
    coordinator.on('agentRegistered', (agent: MetaAgentRegistration) => {
      this.recordEvent({
        eventType: 'agent',
        eventName: 'agent_registered',
        agentId: agent.agentId,
        data: {
          agentName: agent.agentName,
          agentType: agent.agentType,
          capabilities: agent.capabilities,
          status: agent.status
        },
        metadata: { 
          newState: agent.status,
          tags: ['agent', 'registration', agent.agentType]
        }
      });
      
      this.initializeAgentMetrics(agent.agentId);
    });

    coordinator.on('agentUnregistered', (data) => {
      this.recordEvent({
        eventType: 'agent',
        eventName: 'agent_unregistered',
        agentId: data.agentId,
        data: { agentName: data.agent.agentName },
        metadata: { 
          previousState: data.agent.status,
          tags: ['agent', 'unregistration']
        }
      });
    });

    coordinator.on('agentStatusUpdated', (data) => {
      const timer = performanceLogger.startTimer(`agent_status_update_${data.agentId}`);
      
      this.recordEvent({
        eventType: 'agent',
        eventName: 'agent_status_updated',
        agentId: data.agentId,
        data: { 
          status: data.status,
          agentName: data.agent.agentName,
          lastSeen: data.agent.lastSeen
        },
        metadata: { 
          previousState: data.agent.status !== data.status ? 'unknown' : data.status,
          newState: data.status,
          duration: timer.end(),
          tags: ['agent', 'status', data.status]
        }
      });

      this.updateAgentMetrics(data.agentId, 'status_update');
    });

    coordinator.on('agentOffline', (data) => {
      this.recordEvent({
        eventType: 'agent',
        eventName: 'agent_offline',
        agentId: data.agentId,
        data: { 
          agentName: data.agent.agentName,
          lastSeen: data.agent.lastSeen
        },
        metadata: { 
          previousState: data.agent.status,
          newState: 'offline',
          tags: ['agent', 'offline', 'error']
        }
      });

      this.updateAgentMetrics(data.agentId, 'offline');
    });

    // Task events
    coordinator.on('taskCreated', (task: CoordinationTask) => {
      this.taskTimings.set(task.taskId, { 
        startTime: task.createdAt,
        agentId: task.assignedAgentId
      });

      this.recordEvent({
        eventType: 'task',
        eventName: 'task_created',
        taskId: task.taskId,
        agentId: task.requestingAgentId,
        data: {
          taskType: task.taskType,
          description: task.description,
          priority: task.priority,
          requirements: task.requirements,
          dependencies: task.dependencies
        },
        metadata: { 
          newState: task.status,
          priority: task.priority,
          relevantAgents: task.assignedAgentId ? [task.requestingAgentId, task.assignedAgentId] : [task.requestingAgentId],
          tags: ['task', 'creation', task.taskType, task.priority]
        }
      });
    });

    coordinator.on('taskUpdated', (task: CoordinationTask) => {
      const timing = this.taskTimings.get(task.taskId);
      const duration = timing ? Date.now() - timing.startTime.getTime() : undefined;

      this.recordEvent({
        eventType: 'task',
        eventName: 'task_updated',
        taskId: task.taskId,
        agentId: task.assignedAgentId || task.requestingAgentId,
        data: {
          status: task.status,
          taskType: task.taskType,
          priority: task.priority,
          assignedAgent: task.assignedAgentId,
          result: task.status === 'completed' ? 'Task completed successfully' : undefined,
          error: task.error
        },
        metadata: { 
          newState: task.status,
          duration,
          priority: task.priority,
          relevantAgents: [task.requestingAgentId, task.assignedAgentId].filter(Boolean) as string[],
          tags: ['task', 'update', task.status, task.taskType]
        }
      });

      // Update agent metrics for task completion
      if (task.status === 'completed' && task.assignedAgentId) {
        this.updateAgentMetrics(task.assignedAgentId, 'task_completed', duration);
      } else if (task.status === 'failed' && task.assignedAgentId) {
        this.updateAgentMetrics(task.assignedAgentId, 'task_failed');
      }

      // Clean up timing if task is finished
      if (['completed', 'failed', 'cancelled'].includes(task.status)) {
        this.taskTimings.delete(task.taskId);
      }
    });

    // Knowledge events
    coordinator.on('knowledgeShared', (knowledge: SharedKnowledge) => {
      this.recordEvent({
        eventType: 'knowledge',
        eventName: 'knowledge_shared',
        knowledgeId: knowledge.id,
        agentId: knowledge.sourceAgentId,
        data: {
          knowledgeType: knowledge.knowledgeType,
          title: knowledge.title,
          confidence: knowledge.confidence,
          tags: knowledge.tags,
          relevantAgents: knowledge.relevantAgents
        },
        metadata: { 
          relevantAgents: knowledge.relevantAgents,
          tags: ['knowledge', 'sharing', knowledge.knowledgeType]
        }
      });

      this.updateAgentMetrics(knowledge.sourceAgentId, 'knowledge_shared');
    });

    coordinator.on('knowledgeNotification', (data) => {
      this.recordEvent({
        eventType: 'knowledge',
        eventName: 'knowledge_notification',
        knowledgeId: data.knowledge.id,
        agentId: data.agentId,
        data: {
          sourceAgent: data.knowledge.sourceAgentId,
          knowledgeType: data.knowledge.knowledgeType,
          title: data.knowledge.title
        },
        metadata: { 
          relevantAgents: [data.agentId, data.knowledge.sourceAgentId],
          tags: ['knowledge', 'notification', data.knowledge.knowledgeType]
        }
      });
    });
  }

  /**
   * Record an observability event
   */
  private async recordEvent(eventData: Omit<ObservabilityEvent, 'id' | 'timestamp'>): Promise<void> {
    const event: ObservabilityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...eventData
    };

    // Store in memory
    this.events.set(event.id, event);

    // Store in Redis for real-time access
    try {
      await this.redis.lpush('observability:events', JSON.stringify(event));
      await this.redis.ltrim('observability:events', 0, 999); // Keep last 1000 events
      
      // Store by event type for filtering
      await this.redis.lpush(`observability:events:${event.eventType}`, JSON.stringify(event));
      await this.redis.ltrim(`observability:events:${event.eventType}`, 0, 299); // Keep last 300 per type
      
    } catch (error) {
      observabilityLogger.error('Failed to store event in Redis', { 
        eventId: event.id, 
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Log structured event
    observabilityLogger.info('Event recorded', {
      eventId: event.id,
      eventType: event.eventType,
      eventName: event.eventName,
      agentId: event.agentId,
      taskId: event.taskId,
      duration: event.metadata.duration
    });

    // Emit for real-time listeners
    this.emit('observabilityEvent', event);
  }

  /**
   * Initialize metrics tracking for an agent
   */
  private initializeAgentMetrics(agentId: string): void {
    this.agentMetrics.set(agentId, {
      tasksCompleted: 0,
      tasksFailed: 0,
      knowledgeShared: 0,
      statusUpdates: 0,
      totalResponseTime: 0,
      lastSeen: new Date(),
      offlineCount: 0
    });
  }

  /**
   * Update agent metrics
   */
  private updateAgentMetrics(agentId: string, metricType: string, duration?: number): void {
    const metrics = this.agentMetrics.get(agentId) || {};
    
    switch (metricType) {
      case 'task_completed':
        metrics.tasksCompleted = (metrics.tasksCompleted || 0) + 1;
        if (duration) {
          metrics.totalResponseTime = (metrics.totalResponseTime || 0) + duration;
        }
        break;
      case 'task_failed':
        metrics.tasksFailed = (metrics.tasksFailed || 0) + 1;
        break;
      case 'knowledge_shared':
        metrics.knowledgeShared = (metrics.knowledgeShared || 0) + 1;
        break;
      case 'status_update':
        metrics.statusUpdates = (metrics.statusUpdates || 0) + 1;
        metrics.lastSeen = new Date();
        break;
      case 'offline':
        metrics.offlineCount = (metrics.offlineCount || 0) + 1;
        break;
    }

    this.agentMetrics.set(agentId, metrics);
  }

  /**
   * Collect system-wide metrics
   */
  private async collectSystemMetrics(coordinator: MetaAgentCoordinator): Promise<void> {
    try {
      const stats = coordinator.getCoordinationStats();
      const metrics: CoordinationMetrics = {
        totalEvents: this.events.size,
        activeAgents: stats.agents.online,
        completedTasks: stats.tasks.completed,
        sharedKnowledge: stats.knowledge.total,
        averageCoordinationTime: this.calculateAverageCoordinationTime(),
        systemHealth: this.calculateSystemHealth(stats),
        eventsByType: this.getEventsByType(),
        agentPerformance: this.getAgentPerformance()
      };

      // Store metrics in Redis
      await this.redis.set('observability:metrics:current', JSON.stringify(metrics));
      await this.redis.lpush('observability:metrics:history', JSON.stringify({
        timestamp: new Date(),
        ...metrics
      }));
      await this.redis.ltrim('observability:metrics:history', 0, 99); // Keep last 100 metric snapshots

      observabilityLogger.debug('System metrics collected', {
        totalEvents: metrics.totalEvents,
        activeAgents: metrics.activeAgents,
        systemHealth: metrics.systemHealth
      });

    } catch (error) {
      observabilityLogger.error('Failed to collect system metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Calculate average coordination time across tasks
   */
  private calculateAverageCoordinationTime(): number {
    const completedEvents = Array.from(this.events.values())
      .filter(e => e.eventName === 'task_updated' && e.metadata.duration);
    
    if (completedEvents.length === 0) return 0;
    
    const totalTime = completedEvents.reduce((sum, event) => 
      sum + (event.metadata.duration || 0), 0);
    
    return Math.round(totalTime / completedEvents.length);
  }

  /**
   * Calculate system health based on current metrics
   */
  private calculateSystemHealth(stats: any): 'healthy' | 'degraded' | 'critical' {
    const offlineAgents = stats.agents.total - stats.agents.online;
    const failedTasks = stats.tasks.failed;
    const totalTasks = stats.tasks.total;
    
    // Critical: >50% agents offline or >30% task failure rate
    if (offlineAgents / stats.agents.total > 0.5 || 
        (totalTasks > 0 && failedTasks / totalTasks > 0.3)) {
      return 'critical';
    }
    
    // Degraded: >25% agents offline or >15% task failure rate
    if (offlineAgents / stats.agents.total > 0.25 ||
        (totalTasks > 0 && failedTasks / totalTasks > 0.15)) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Get event counts by type
   */
  private getEventsByType(): Record<string, number> {
    const eventsByType: Record<string, number> = {};
    
    for (const event of this.events.values()) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    }
    
    return eventsByType;
  }

  /**
   * Get agent performance metrics
   */
  private getAgentPerformance(): Record<string, any> {
    const performance: Record<string, any> = {};
    
    for (const [agentId, metrics] of this.agentMetrics) {
      const totalTasks = metrics.tasksCompleted + metrics.tasksFailed;
      const averageTime = totalTasks > 0 && metrics.totalResponseTime > 0 
        ? Math.round(metrics.totalResponseTime / metrics.tasksCompleted) 
        : 0;
      const successRate = totalTasks > 0 
        ? Math.round((metrics.tasksCompleted / totalTasks) * 100) / 100 
        : 1;

      performance[agentId] = {
        tasksCompleted: metrics.tasksCompleted,
        averageTime,
        successRate,
        lastSeen: metrics.lastSeen
      };
    }
    
    return performance;
  }

  /**
   * Get recent events for dashboard
   */
  async getRecentEvents(eventType?: string, limit: number = 50): Promise<ObservabilityEvent[]> {
    try {
      const key = eventType ? `observability:events:${eventType}` : 'observability:events';
      const events = await this.redis.lrange(key, 0, limit - 1);
      
      return events.map(event => JSON.parse(event)).reverse(); // Most recent first
    } catch (error) {
      observabilityLogger.error('Failed to get recent events', {
        eventType,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Get current metrics for dashboard
   */
  async getCurrentMetrics(): Promise<CoordinationMetrics | null> {
    try {
      const metricsData = await this.redis.get('observability:metrics:current');
      if (!metricsData) return null;
      const parsed = typeof metricsData === 'string' ? JSON.parse(metricsData) : metricsData;
      return parsed && typeof parsed === 'object' && 'totalEvents' in parsed ? parsed as CoordinationMetrics : null;
    } catch (error) {
      observabilityLogger.error('Failed to get current metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Generate flow visualization data
   */
  async generateFlowVisualization(): Promise<AgentFlowNode[]> {
    const events = await this.getRecentEvents(undefined, 200);
    const nodes: Map<string, AgentFlowNode> = new Map();

    // Process events to build flow nodes
    for (const event of events) {
      if (event.agentId) {
        const nodeId = event.agentId;
        let node = nodes.get(nodeId);
        
        if (!node) {
          node = {
            id: nodeId,
            label: event.data.agentName || nodeId,
            type: 'agent',
            status: event.data.status || 'unknown',
            lastActivity: event.timestamp,
            connections: [],
            metrics: {
              tasksCompleted: 0,
              knowledgeShared: 0,
              averageResponseTime: 0,
              errorRate: 0
            }
          };
        }

        // Update metrics based on event
        if (event.eventName === 'task_updated' && event.data.status === 'completed') {
          node.metrics.tasksCompleted++;
        }
        if (event.eventName === 'knowledge_shared') {
          node.metrics.knowledgeShared++;
        }
        if (event.metadata.duration) {
          node.metrics.averageResponseTime = 
            (node.metrics.averageResponseTime + event.metadata.duration) / 2;
        }

        // Update connections
        if (event.metadata.relevantAgents) {
          for (const relevantAgent of event.metadata.relevantAgents) {
            if (relevantAgent !== nodeId && !node.connections.includes(relevantAgent)) {
              node.connections.push(relevantAgent);
            }
          }
        }

        node.lastActivity = event.timestamp;
        nodes.set(nodeId, node);
      }
    }

    return Array.from(nodes.values());
  }
}

/**
 * Create observability collector singleton
 */
export function createObservabilityCollector(): ObservabilityCollector {
  return new ObservabilityCollector();
}