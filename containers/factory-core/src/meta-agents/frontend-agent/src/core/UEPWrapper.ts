/**
 * UEP (Universal Execution Protocol) Wrapper
 * 
 * Handles integration with the meta-agent coordination system
 * Implements standardized messaging and task coordination
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';

import {
  UEPMessage,
  UEPContext,
  BackendTask,
  ProcessingResult,
  BackendAgentCapabilities
} from '../types/index.js';

import { createLogger } from '../utils/logger.js';

export interface UEPWrapperConfig {
  agentId: string;
  agentType: 'domain-specific' | 'infrastructure' | 'coordination';
  capabilities: BackendAgentCapabilities;
  coordinationEndpoint?: string;
  enableRealTimeUpdates?: boolean;
  enableTaskDistribution?: boolean;
}

/**
 * UEP Wrapper for Backend Agent coordination
 */
export class UEPWrapper extends EventEmitter {
  private config: UEPWrapperConfig;
  private logger: Logger;
  private isInitialized = false;
  private sessionId: string;
  private activeMessages = new Map<string, UEPMessage>();

  constructor(config: UEPWrapperConfig) {
    super();

    this.config = {
      coordinationEndpoint: 'http://localhost:3000/api/meta-agent-factory',
      enableRealTimeUpdates: true,
      enableTaskDistribution: true,
      ...config
    };

    this.logger = createLogger(`uep-wrapper-${config.agentId}`, 'info');
    this.sessionId = uuidv4();

    this.logger.info('UEP Wrapper initialized', {
      agentId: this.config.agentId,
      sessionId: this.sessionId,
      capabilities: this.config.capabilities
    });
  }

  /**
   * Initialize UEP wrapper and register with coordination system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('🚀 Initializing UEP Wrapper...');

      // Register agent with coordination system
      await this.registerAgent();

      // Setup message handlers
      this.setupMessageHandlers();

      // Start heartbeat for real-time coordination
      if (this.config.enableRealTimeUpdates) {
        this.startHeartbeat();
      }

      this.isInitialized = true;
      this.logger.info('✅ UEP Wrapper initialized successfully');

    } catch (error) {
      this.logger.error('❌ Failed to initialize UEP Wrapper', { error });
      throw error;
    }
  }

  /**
   * Send task result to coordination system
   */
  async sendTaskResult(task: BackendTask, result: ProcessingResult): Promise<void> {
    const message: UEPMessage = {
      id: uuidv4(),
      type: 'response',
      agentId: this.config.agentId,
      payload: {
        taskId: task.id,
        taskType: task.type,
        result,
        completedAt: new Date().toISOString(),
        processingTime: Date.now() - new Date(task.id).getTime(), // Approximate
        success: result.success
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    await this.sendMessage(message);
  }

  /**
   * Send task status update
   */
  async sendTaskUpdate(task: BackendTask): Promise<void> {
    const message: UEPMessage = {
      id: uuidv4(),
      type: 'event',
      agentId: this.config.agentId,
      payload: {
        type: 'task-update',
        taskId: task.id,
        status: task.status,
        progress: this.calculateTaskProgress(task),
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    await this.sendMessage(message);
  }

  /**
   * Request task from coordination system
   */
  async requestTask(taskType?: string, priority?: string): Promise<BackendTask | null> {
    const message: UEPMessage = {
      id: uuidv4(),
      type: 'request',
      agentId: this.config.agentId,
      payload: {
        type: 'task-request',
        taskType,
        priority,
        capabilities: this.config.capabilities,
        currentLoad: this.getCurrentLoad()
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    const response = await this.sendMessageAndWaitForResponse(message);
    return response?.payload?.task || null;
  }

  /**
   * Send coordination message to other agents
   */
  async coordinateWithAgents(agentTypes: string[], message: any): Promise<any[]> {
    const coordinationMessage: UEPMessage = {
      id: uuidv4(),
      type: 'request',
      agentId: this.config.agentId,
      payload: {
        type: 'agent-coordination',
        targetAgents: agentTypes,
        message,
        coordinationId: uuidv4()
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    const response = await this.sendMessageAndWaitForResponse(coordinationMessage);
    return response?.payload?.responses || [];
  }

  /**
   * Register capabilities with coordination system
   */
  async updateCapabilities(capabilities: Partial<BackendAgentCapabilities>): Promise<void> {
    this.config.capabilities = { ...this.config.capabilities, ...capabilities };

    const message: UEPMessage = {
      id: uuidv4(),
      type: 'event',
      agentId: this.config.agentId,
      payload: {
        type: 'capabilities-update',
        capabilities: this.config.capabilities,
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    await this.sendMessage(message);
  }

  /**
   * Get current coordination context
   */
  async getCoordinationContext(): Promise<UEPContext> {
    const message: UEPMessage = {
      id: uuidv4(),
      type: 'request',
      agentId: this.config.agentId,
      payload: {
        type: 'context-request',
        sessionId: this.sessionId
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    const response = await this.sendMessageAndWaitForResponse(message);
    
    return {
      sessionId: this.sessionId,
      memory: response?.payload?.memory || {},
      codebaseContext: response?.payload?.codebaseContext || {},
      validationResults: response?.payload?.validationResults || {}
    };
  }

  /**
   * Shutdown UEP wrapper
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down UEP Wrapper...');

    try {
      // Unregister from coordination system
      await this.unregisterAgent();

      // Clear active messages
      this.activeMessages.clear();

      // Stop heartbeat
      this.stopHeartbeat();

      this.isInitialized = false;
      this.logger.info('✅ UEP Wrapper shut down successfully');

    } catch (error) {
      this.logger.error('❌ Error shutting down UEP Wrapper', { error });
      throw error;
    }
  }

  /**
   * Private methods
   */
  private async registerAgent(): Promise<void> {
    const registrationMessage: UEPMessage = {
      id: uuidv4(),
      type: 'event',
      agentId: this.config.agentId,
      payload: {
        type: 'agent-registration',
        agentType: this.config.agentType,
        capabilities: this.config.capabilities,
        status: 'online',
        registeredAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    await this.sendMessage(registrationMessage);
    this.logger.info('✅ Agent registered with coordination system');
  }

  private async unregisterAgent(): Promise<void> {
    const unregistrationMessage: UEPMessage = {
      id: uuidv4(),
      type: 'event',
      agentId: this.config.agentId,
      payload: {
        type: 'agent-unregistration',
        reason: 'shutdown',
        unregisteredAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    await this.sendMessage(unregistrationMessage);
    this.logger.info('✅ Agent unregistered from coordination system');
  }

  private setupMessageHandlers(): void {
    // Handle incoming coordination messages
    this.on('message-received', (message: UEPMessage) => {
      this.handleIncomingMessage(message);
    });

    // Handle task distribution
    if (this.config.enableTaskDistribution) {
      this.on('task-assigned', (task: BackendTask) => {
        this.emit('new-task', task);
      });
    }
  }

  private async handleIncomingMessage(message: UEPMessage): Promise<void> {
    this.logger.debug('📨 Received message', { message });

    switch (message.payload?.type) {
      case 'task-assignment':
        this.emit('task-assigned', message.payload.task);
        break;
        
      case 'coordination-request':
        await this.handleCoordinationRequest(message);
        break;
        
      case 'capabilities-query':
        await this.handleCapabilitiesQuery(message);
        break;
        
      case 'status-request':
        await this.handleStatusRequest(message);
        break;
        
      default:
        this.logger.debug('Unknown message type', { type: message.payload?.type });
    }
  }

  private async handleCoordinationRequest(message: UEPMessage): Promise<void> {
    const response: UEPMessage = {
      id: uuidv4(),
      type: 'response',
      agentId: this.config.agentId,
      payload: {
        type: 'coordination-response',
        requestId: message.id,
        capabilities: this.config.capabilities,
        currentLoad: this.getCurrentLoad(),
        availableForTask: true
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    await this.sendMessage(response);
  }

  private async handleCapabilitiesQuery(message: UEPMessage): Promise<void> {
    const response: UEPMessage = {
      id: uuidv4(),
      type: 'response',
      agentId: this.config.agentId,
      payload: {
        type: 'capabilities-response',
        requestId: message.id,
        capabilities: this.config.capabilities,
        agentType: this.config.agentType,
        status: 'available'
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    await this.sendMessage(response);
  }

  private async handleStatusRequest(message: UEPMessage): Promise<void> {
    const response: UEPMessage = {
      id: uuidv4(),
      type: 'response',
      agentId: this.config.agentId,
      payload: {
        type: 'status-response',
        requestId: message.id,
        status: {
          agentId: this.config.agentId,
          initialized: this.isInitialized,
          sessionId: this.sessionId,
          activeMessages: this.activeMessages.size,
          capabilities: this.config.capabilities,
          uptime: Date.now() - new Date(this.sessionId).getTime()
        }
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    await this.sendMessage(response);
  }

  private heartbeatInterval?: NodeJS.Timeout;

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      const heartbeatMessage: UEPMessage = {
        id: uuidv4(),
        type: 'event',
        agentId: this.config.agentId,
        payload: {
          type: 'heartbeat',
          status: 'alive',
          load: this.getCurrentLoad(),
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId
      };

      try {
        await this.sendMessage(heartbeatMessage);
      } catch (error) {
        this.logger.warn('💓 Heartbeat failed', { error });
      }
    }, 30000); // 30 second heartbeat
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private async sendMessage(message: UEPMessage): Promise<void> {
    this.activeMessages.set(message.id, message);

    try {
      // In a real implementation, this would send via HTTP/WebSocket to coordination system
      // For now, we'll emit locally and log
      this.emit('message-sent', message);
      this.logger.debug('📤 Message sent', { messageId: message.id, type: message.type });

      // Simulate successful send by removing from active messages after delay
      setTimeout(() => {
        this.activeMessages.delete(message.id);
      }, 1000);
      
    } catch (error) {
      this.activeMessages.delete(message.id);
      this.logger.error('❌ Failed to send message', { message, error });
      throw error;
    }
  }

  private async sendMessageAndWaitForResponse(message: UEPMessage, timeout = 10000): Promise<UEPMessage | null> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.removeListener('message-received', responseHandler);
        reject(new Error('Message response timeout'));
      }, timeout);

      const responseHandler = (response: UEPMessage) => {
        if (response.payload?.requestId === message.id || 
            (response.type === 'response' && response.payload?.type?.includes('response'))) {
          clearTimeout(timeoutHandle);
          this.removeListener('message-received', responseHandler);
          resolve(response);
        }
      };

      this.on('message-received', responseHandler);
      this.sendMessage(message).catch(reject);
    });
  }

  private calculateTaskProgress(task: BackendTask): number {
    // Simple progress calculation based on task status
    switch (task.status) {
      case 'pending': return 0;
      case 'in-progress': return 50;
      case 'completed': return 100;
      case 'failed': return 0;
      default: return 0;
    }
  }

  private getCurrentLoad(): number {
    // Simple load calculation based on active messages
    return Math.min(this.activeMessages.size / 10, 1.0);
  }
}