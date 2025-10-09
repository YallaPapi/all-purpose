/**
 * ProjectContext Integration Adapter
 * 
 * Integrates ProjectContext Manager with UEPMetaAgentFactory and other systems.
 * Provides seamless agent registration, event synchronization, and context sharing.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { EventEmitter } from 'events';
import { ProjectContextManager } from './ProjectContextManager';
import {
  ProjectContext,
  ActiveAgent,
  AgentStatus,
  TaskStatus,
  ProjectEventType,
  ProjectContextEvent
} from './interfaces/IProjectContext';

/**
 * Integration configuration
 */
export interface ProjectContextIntegrationConfig {
  projectId: string;
  enableAgentRegistration: boolean;
  enableEventSynchronization: boolean;
  enableMetricsCollection: boolean;
  enableContextSharing: boolean;
  autoCreateTasks: boolean;
  agentTimeout: number; // minutes
  syncInterval: number; // milliseconds
}

/**
 * UEP Factory Integration Interface
 */
export interface UEPFactoryIntegration {
  factory: any; // UEPMetaAgentFactory instance
  factoryEvents: string[];
  agentMappings: Map<string, string>; // agentId -> contextAgentId
}

/**
 * IOA Integration Interface
 */
export interface IOAIntegration {
  orchestrator: any; // InfraOrchestrator instance
  enabledFeatures: string[];
  escalationHandlers: Map<string, Function>;
}

/**
 * ProjectContext Integration Adapter
 * 
 * Bridges ProjectContext Manager with UEP Factory, IOA, and other systems
 */
export class ProjectContextIntegration extends EventEmitter {
  private projectContextManager: ProjectContextManager;
  private config: ProjectContextIntegrationConfig;
  private uepFactoryIntegration: UEPFactoryIntegration | null = null;
  private ioaIntegration: IOAIntegration | null = null;
  private isInitialized = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private agentStatusCache = new Map<string, AgentStatus>();

  constructor(
    projectContextManager: ProjectContextManager,
    config: Partial<ProjectContextIntegrationConfig> = {}
  ) {
    super();
    
    this.projectContextManager = projectContextManager;
    this.config = {
      projectId: config.projectId || `integration_${Date.now()}`,
      enableAgentRegistration: config.enableAgentRegistration ?? true,
      enableEventSynchronization: config.enableEventSynchronization ?? true,
      enableMetricsCollection: config.enableMetricsCollection ?? true,
      enableContextSharing: config.enableContextSharing ?? true,
      autoCreateTasks: config.autoCreateTasks ?? true,
      agentTimeout: config.agentTimeout ?? 15, // 15 minutes
      syncInterval: config.syncInterval ?? 30000, // 30 seconds
      ...config
    };

    console.log('🔗 ProjectContext Integration Adapter initialized', {
      projectId: this.config.projectId,
      enableAgentRegistration: this.config.enableAgentRegistration,
      enableEventSynchronization: this.config.enableEventSynchronization
    });
  }

  /**
   * Initialize the integration adapter
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ ProjectContext Integration already initialized');
      return;
    }

    try {
      // Initialize ProjectContext Manager if needed
      if (!this.projectContextManager['isInitialized']) {
        await this.projectContextManager.initialize();
      }

      // Create project context if it doesn't exist
      try {
        const existingProject = await this.projectContextManager.getProject(this.config.projectId);
        if (!existingProject) {
          await this.projectContextManager.createProject({
            projectId: this.config.projectId,
            enablePersistence: true,
            enableCrossAgentSharing: this.config.enableContextSharing,
            enableUEPIntegration: true,
            enableIOAIntegration: true,
            enableRAGIntegration: true,
            maxTasks: 1000,
            maxAgents: 50,
            maxHistoryEntries: 1000,
            cacheTTL: 3600,
            enableCaching: true,
            batchUpdateSize: 100,
            maxConcurrentOperations: 10,
            escalationTimeouts: {
              taskStuckThreshold: 30,
              agentUnresponsiveThreshold: this.config.agentTimeout,
              handoffAcknowledgmentTimeout: 5,
              decisionReviewTimeout: 60
            },
            escalationRules: [
              {
                condition: 'agent_unresponsive',
                action: 'notify_ioa',
                priority: 1,
                enabled: true
              }
            ]
          });
          console.log(`✅ Created project context: ${this.config.projectId}`);
        }
      } catch (error) {
        console.error('❌ Failed to create project context:', error);
        throw error;
      }

      // Set up event listeners
      this.setupEventListeners();

      // Start background synchronization
      if (this.config.enableEventSynchronization) {
        this.startBackgroundSync();
      }

      this.isInitialized = true;
      console.log('🚀 ProjectContext Integration initialized successfully');

      this.emit('integration:initialized', {
        projectId: this.config.projectId,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Failed to initialize ProjectContext Integration:', error);
      throw error;
    }
  }

  /**
   * Integrate with UEPMetaAgentFactory
   */
  async integrateWithUEPFactory(uepFactory: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Integration adapter must be initialized first');
    }

    console.log('🔗 Integrating with UEPMetaAgentFactory...');

    this.uepFactoryIntegration = {
      factory: uepFactory,
      factoryEvents: [
        'agent:created',
        'agent:removed',
        'agent:processed',
        'agent:error',
        'factory:initialized',
        'factory:cleanup'
      ],
      agentMappings: new Map()
    };

    // Set up UEP Factory event listeners
    this.uepFactoryIntegration.factoryEvents.forEach(eventName => {
      uepFactory.on(eventName, this.handleUEPFactoryEvent.bind(this, eventName));
    });

    // Register existing agents
    if (uepFactory.listAgents) {
      const existingAgents = uepFactory.listAgents();
      for (const agentInfo of existingAgents) {
        await this.registerUEPAgent(agentInfo);
      }
    }

    console.log('✅ UEPMetaAgentFactory integration completed');
    this.emit('integration:uep-factory-connected', { 
      agentCount: this.uepFactoryIntegration.agentMappings.size 
    });
  }

  /**
   * Integrate with InfraOrchestrator (IOA)
   */
  async integrateWithIOA(infraOrchestrator: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Integration adapter must be initialized first');
    }

    console.log('🔗 Integrating with InfraOrchestrator...');

    this.ioaIntegration = {
      orchestrator: infraOrchestrator,
      enabledFeatures: ['escalation', 'coordination', 'monitoring'],
      escalationHandlers: new Map()
    };

    // Set up escalation handlers
    this.setupIOAEscalationHandlers();

    // Listen for project context events that need IOA attention
    this.projectContextManager.onEvent('escalation_triggered', 
      this.handleEscalationEvent.bind(this));

    console.log('✅ InfraOrchestrator integration completed');
    this.emit('integration:ioa-connected', { 
      features: this.ioaIntegration.enabledFeatures 
    });
  }

  /**
   * Register a UEP agent with project context
   */
  private async registerUEPAgent(agentInfo: any): Promise<void> {
    if (!this.config.enableAgentRegistration) {
      return;
    }

    try {
      const contextAgentId = `uep_${agentInfo.agentId}`;
      
      const activeAgent: Omit<ActiveAgent, 'startedAt' | 'lastActivity'> = {
        agentId: contextAgentId,
        agentType: agentInfo.agentType || 'uep-managed',
        status: this.mapUEPStatusToContextStatus(agentInfo.status),
        sessionId: `session_${agentInfo.agentId}_${Date.now()}`,
        capabilities: this.extractAgentCapabilities(agentInfo),
        workload: this.calculateAgentWorkload(agentInfo),
        metadata: {
          uepAgentId: agentInfo.agentId,
          uepAgentType: agentInfo.agentType,
          createdAt: agentInfo.createdAt,
          lastUsed: agentInfo.lastUsed,
          usageCount: agentInfo.usageCount,
          metrics: agentInfo.metrics
        }
      };

      await this.projectContextManager.registerAgent(this.config.projectId, activeAgent);
      
      // Track the mapping
      if (this.uepFactoryIntegration) {
        this.uepFactoryIntegration.agentMappings.set(agentInfo.agentId, contextAgentId);
      }

      console.log(`✅ Registered UEP agent in project context: ${contextAgentId}`);

    } catch (error) {
      console.error(`❌ Failed to register UEP agent ${agentInfo.agentId}:`, error);
    }
  }

  /**
   * Handle UEP Factory events
   */
  private async handleUEPFactoryEvent(eventName: string, eventData: any): Promise<void> {
    if (!this.config.enableEventSynchronization) {
      return;
    }

    try {
      switch (eventName) {
        case 'agent:created':
          await this.registerUEPAgent(eventData);
          break;

        case 'agent:removed':
          await this.handleAgentRemoved(eventData);
          break;

        case 'agent:processed':
          await this.handleAgentProcessed(eventData);
          break;

        case 'agent:error':
          await this.handleAgentError(eventData);
          break;

        default:
          // Forward other events to project context
          this.emit(`uep:${eventName}`, eventData);
      }

    } catch (error) {
      console.error(`❌ Failed to handle UEP Factory event ${eventName}:`, error);
    }
  }

  /**
   * Handle agent removal
   */
  private async handleAgentRemoved(eventData: any): Promise<void> {
    if (!this.uepFactoryIntegration) return;

    const contextAgentId = this.uepFactoryIntegration.agentMappings.get(eventData.agentId);
    if (contextAgentId) {
      try {
        await this.projectContextManager.unregisterAgent(this.config.projectId, contextAgentId);
        this.uepFactoryIntegration.agentMappings.delete(eventData.agentId);
        console.log(`✅ Unregistered agent from project context: ${contextAgentId}`);
      } catch (error) {
        console.error(`❌ Failed to unregister agent ${contextAgentId}:`, error);
      }
    }
  }

  /**
   * Handle agent processing completion
   */
  private async handleAgentProcessed(eventData: any): Promise<void> {
    if (!this.uepFactoryIntegration) return;

    const contextAgentId = this.uepFactoryIntegration.agentMappings.get(eventData.agentId);
    if (contextAgentId) {
      try {
        // Update agent status to idle after processing
        await this.projectContextManager.updateAgentStatus(
          this.config.projectId,
          contextAgentId,
          'idle'
        );

        // Create task if auto-create is enabled
        if (this.config.autoCreateTasks) {
          await this.createTaskFromProcessing(eventData, contextAgentId);
        }

        // Record decision if applicable
        if (eventData.complianceScore !== undefined) {
          await this.recordProcessingDecision(eventData, contextAgentId);
        }

      } catch (error) {
        console.error(`❌ Failed to handle agent processing for ${contextAgentId}:`, error);
      }
    }
  }

  /**
   * Handle agent errors
   */
  private async handleAgentError(eventData: any): Promise<void> {
    if (!this.uepFactoryIntegration) return;

    const contextAgentId = this.uepFactoryIntegration.agentMappings.get(eventData.agentId);
    if (contextAgentId) {
      try {
        // Update agent status to error
        await this.projectContextManager.updateAgentStatus(
          this.config.projectId,
          contextAgentId,
          'offline'
        );

        // Create error task if needed
        if (this.config.autoCreateTasks) {
          const taskId = await this.projectContextManager.addTask(this.config.projectId, {
            agentId: contextAgentId,
            description: `Error handling: ${eventData.error}`,
            status: 'failed' as TaskStatus,
            priority: 'high',
            dependencies: [],
            metadata: {
              errorDetails: eventData.error,
              processingTime: eventData.processingTime,
              uepEvent: true
            }
          });

          await this.projectContextManager.failTask(
            this.config.projectId,
            taskId,
            eventData.error
          );
        }

      } catch (error) {
        console.error(`❌ Failed to handle agent error for ${contextAgentId}:`, error);
      }
    }
  }

  /**
   * Create task from processing event
   */
  private async createTaskFromProcessing(eventData: any, contextAgentId: string): Promise<void> {
    try {
      const taskDescription = `Processing completed by ${eventData.agentType}`;
      
      const taskId = await this.projectContextManager.addTask(this.config.projectId, {
        agentId: contextAgentId,
        description: taskDescription,
        status: 'completed' as TaskStatus,
        priority: 'medium',
        dependencies: [],
        metadata: {
          uepEvent: true,
          processingTime: eventData.processingTime,
          complianceScore: eventData.complianceScore,
          agentType: eventData.agentType,
          timestamp: eventData.timestamp
        }
      });

      await this.projectContextManager.completeTask(
        this.config.projectId,
        taskId,
        { processed: true, ...eventData }
      );

    } catch (error) {
      console.error('❌ Failed to create task from processing event:', error);
    }
  }

  /**
   * Record processing decision
   */
  private async recordProcessingDecision(eventData: any, contextAgentId: string): Promise<void> {
    try {
      await this.projectContextManager.recordDecision(this.config.projectId, {
        agentId: contextAgentId,
        decisionType: 'completion',
        context: `Processing completed with compliance score: ${eventData.complianceScore}`,
        decision: { success: eventData.success, result: 'processed' },
        reasoning: `Agent ${eventData.agentType} completed processing in ${eventData.processingTime}ms`,
        confidence: Math.min(eventData.complianceScore || 0.8, 1.0),
        impactedTasks: [],
        metadata: {
          uepEvent: true,
          processingTime: eventData.processingTime,
          agentType: eventData.agentType
        }
      });

    } catch (error) {
      console.error('❌ Failed to record processing decision:', error);
    }
  }

  /**
   * Set up IOA escalation handlers
   */
  private setupIOAEscalationHandlers(): void {
    if (!this.ioaIntegration) return;

    // Handler for agent unresponsive
    this.ioaIntegration.escalationHandlers.set('agent_unresponsive', async (event) => {
      console.log('🚨 IOA handling agent unresponsive escalation:', event);
      // TODO: Implement IOA-specific escalation logic
    });

    // Handler for task stuck
    this.ioaIntegration.escalationHandlers.set('task_stuck', async (event) => {
      console.log('🚨 IOA handling task stuck escalation:', event);
      // TODO: Implement IOA-specific task recovery
    });
  }

  /**
   * Handle escalation events
   */
  private async handleEscalationEvent(event: ProjectContextEvent): Promise<void> {
    if (!this.ioaIntegration) return;

    const escalationType = event.data.escalationType || 'general';
    const handler = this.ioaIntegration.escalationHandlers.get(escalationType);

    if (handler) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`❌ IOA escalation handler failed for ${escalationType}:`, error);
      }
    } else {
      console.warn(`⚠️ No IOA escalation handler for type: ${escalationType}`);
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for project context events
    this.projectContextManager.onEvent('*', (event: ProjectContextEvent) => {
      this.emit('project-context:event', event);
    });

    // Forward critical events
    const criticalEvents: ProjectEventType[] = [
      'agent_joined',
      'agent_left', 
      'task_failed',
      'escalation_triggered'
    ];

    criticalEvents.forEach(eventType => {
      this.projectContextManager.onEvent(eventType, (event: ProjectContextEvent) => {
        this.emit(`critical:${eventType}`, event);
      });
    });
  }

  /**
   * Start background synchronization
   */
  private startBackgroundSync(): void {
    this.syncTimer = setInterval(async () => {
      try {
        await this.performBackgroundSync();
      } catch (error) {
        console.error('❌ Background sync failed:', error);
      }
    }, this.config.syncInterval);

    console.log(`⏰ Background sync started (interval: ${this.config.syncInterval}ms)`);
  }

  /**
   * Perform background synchronization
   */
  private async performBackgroundSync(): Promise<void> {
    if (!this.uepFactoryIntegration) return;

    // Sync agent statuses
    const currentAgents = this.uepFactoryIntegration.factory.listAgents();
    
    for (const agentInfo of currentAgents) {
      const contextAgentId = this.uepFactoryIntegration.agentMappings.get(agentInfo.agentId);
      if (contextAgentId) {
        const newStatus = this.mapUEPStatusToContextStatus(agentInfo.status);
        const cachedStatus = this.agentStatusCache.get(contextAgentId);
        
        if (newStatus !== cachedStatus) {
          try {
            await this.projectContextManager.updateAgentStatus(
              this.config.projectId,
              contextAgentId,
              newStatus
            );
            this.agentStatusCache.set(contextAgentId, newStatus);
          } catch (error) {
            console.warn(`⚠️ Failed to sync status for agent ${contextAgentId}:`, error);
          }
        }
      }
    }
  }

  /**
   * Utility methods
   */
  private mapUEPStatusToContextStatus(uepStatus: string): AgentStatus {
    switch (uepStatus?.toLowerCase()) {
      case 'active':
      case 'idle':
        return 'idle';
      case 'processing':
      case 'working':
        return 'working';
      case 'error':
      case 'failed':
        return 'offline';
      case 'blocked':
        return 'blocked';
      default:
        return 'idle';
    }
  }

  private extractAgentCapabilities(agentInfo: any): string[] {
    const capabilities = [];
    
    if (agentInfo.agentType) {
      capabilities.push(agentInfo.agentType);
    }
    
    if (agentInfo.metrics?.successfulTasks > 0) {
      capabilities.push('task-processing');
    }
    
    if (agentInfo.metrics?.averageComplianceScore > 0.8) {
      capabilities.push('high-compliance');
    }
    
    return capabilities.length > 0 ? capabilities : ['general'];
  }

  private calculateAgentWorkload(agentInfo: any): number {
    if (!agentInfo.metrics) return 0;
    
    // Simple workload calculation based on recent activity
    const recentUsage = Date.now() - new Date(agentInfo.lastUsed).getTime();
    const hoursAgo = recentUsage / (1000 * 60 * 60);
    
    if (hoursAgo < 1) return 80; // High workload if used in last hour
    if (hoursAgo < 6) return 40; // Medium workload if used in last 6 hours
    return 10; // Low workload otherwise
  }

  /**
   * Get integration status
   */
  getStatus(): any {
    return {
      initialized: this.isInitialized,
      projectId: this.config.projectId,
      uepFactoryConnected: !!this.uepFactoryIntegration,
      ioaConnected: !!this.ioaIntegration,
      agentMappings: this.uepFactoryIntegration?.agentMappings.size || 0,
      syncRunning: !!this.syncTimer,
      config: this.config
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down ProjectContext Integration...');

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.isInitialized = false;
    console.log('✅ ProjectContext Integration shutdown complete');
  }
}

/**
 * Factory function for creating integration adapter
 */
export function createProjectContextIntegration(
  projectContextManager: ProjectContextManager,
  config?: Partial<ProjectContextIntegrationConfig>
): ProjectContextIntegration {
  return new ProjectContextIntegration(projectContextManager, config);
}

/**
 * Convenience function for quick setup
 */
export async function setupProjectContextIntegration(config?: {
  projectId?: string;
  uepFactory?: any;
  ioaOrchestrator?: any;
  integrationConfig?: Partial<ProjectContextIntegrationConfig>;
}): Promise<{
  projectContextManager: ProjectContextManager;
  integration: ProjectContextIntegration;
}> {
  
  // Create ProjectContext Manager
  const projectContextManager = new ProjectContextManager({
    projectId: config?.projectId || `integration_${Date.now()}`,
    enablePersistence: true,
    enableCrossAgentSharing: true,
    enableUEPIntegration: true,
    enableIOAIntegration: true
  });

  // Create integration adapter
  const integration = createProjectContextIntegration(
    projectContextManager,
    config?.integrationConfig
  );

  // Initialize everything
  await integration.initialize();

  // Connect to UEP Factory if provided
  if (config?.uepFactory) {
    await integration.integrateWithUEPFactory(config.uepFactory);
  }

  // Connect to IOA if provided
  if (config?.ioaOrchestrator) {
    await integration.integrateWithIOA(config.ioaOrchestrator);
  }

  return { projectContextManager, integration };
}