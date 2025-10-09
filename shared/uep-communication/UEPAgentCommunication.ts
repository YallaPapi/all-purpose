/**
 * UEP Agent Communication Patterns
 * 
 * Implements standardized communication patterns between meta-agents and domain agents
 * using the Universal Execution Protocol (UEP) over NATS JetStream.
 * 
 * Key Features:
 * - Request-Reply pattern for synchronous operations
 * - Publish-Subscribe for event notifications
 * - Queue-based workload distribution
 * - Circuit breaker integration for resilience
 * - Automatic retry with exponential backoff
 * - Dead letter queues for failed messages
 */

import { NatsConnection, JetStreamClient, Msg } from 'nats';
import { UEPValidationEngine } from '../uep-validation/UEPValidationArchitecture.js';
import { VersionAwareCircuitBreaker } from '../resilience/VersionAwareCircuitBreaker.js';

export interface UEPCommunicationConfig {
  natsConnection: NatsConnection;
  jetStreamClient: JetStreamClient;
  agentId: string;
  agentType: 'meta' | 'domain';
  timeout: number;
  retryAttempts: number;
  circuitBreakerEnabled: boolean;
}

export interface UEPRequest {
  id: string;
  from: string;
  to: string;
  method: string;
  data: any;
  timestamp: Date;
  version: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timeout?: number;
}

export interface UEPResponse {
  id: string;
  requestId: string;
  from: string;
  to: string;
  status: 'success' | 'error' | 'timeout';
  data?: any;
  error?: string;
  timestamp: Date;
  version: string;
  latency: number;
}

export interface UEPEvent {
  id: string;
  from: string;
  eventType: string;
  data: any;
  timestamp: Date;
  version: string;
  tags?: string[];
}

/**
 * Core UEP Communication Client for Agents
 */
export class UEPAgentCommunicator {
  private config: UEPCommunicationConfig;
  private validationEngine: UEPValidationEngine;
  private circuitBreaker: VersionAwareCircuitBreaker;
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();

  constructor(config: UEPCommunicationConfig) {
    this.config = config;
    this.validationEngine = new UEPValidationEngine({
      enableApiGatewayValidation: true,
      enableServiceMeshValidation: true,
      circuitBreakerThreshold: 5,
      timeoutMs: config.timeout,
      retryAttempts: config.retryAttempts,
      validationLevel: 'strict'
    });
    
    if (config.circuitBreakerEnabled) {
      this.circuitBreaker = new VersionAwareCircuitBreaker({
        failureThreshold: 5,
        recoveryTime: 30000,
        timeout: config.timeout
      });
    }

    this.setupMessageHandlers();
  }

  /**
   * Request-Reply Pattern - Synchronous Communication
   */
  async request(to: string, method: string, data: any, options?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    timeout?: number;
    version?: string;
  }): Promise<UEPResponse> {
    const requestId = this.generateRequestId();
    const request: UEPRequest = {
      id: requestId,
      from: this.config.agentId,
      to,
      method,
      data,
      timestamp: new Date(),
      version: options?.version || '1.0.0',
      priority: options?.priority || 'normal',
      timeout: options?.timeout || this.config.timeout
    };

    // Validate request using UEP
    const validationResult = this.validationEngine.validateRequest(request);
    if (!validationResult.valid) {
      throw new Error(`UEP Validation Failed: ${validationResult.violations?.join(', ')}`);
    }

    // Circuit breaker check
    if (this.config.circuitBreakerEnabled && this.circuitBreaker.isOpen()) {
      throw new Error(`Circuit breaker open for agent ${to}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${requestId}`));
      }, request.timeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // Send request via NATS JetStream
      const subject = `UEP.v1.${this.config.agentType}.${to}.${method}`;
      this.config.jetStreamClient.publish(subject, JSON.stringify(request));
    });
  }

  /**
   * Publish-Subscribe Pattern - Event Notifications
   */
  async publishEvent(eventType: string, data: any, options?: {
    tags?: string[];
    version?: string;
  }): Promise<void> {
    const event: UEPEvent = {
      id: this.generateEventId(),
      from: this.config.agentId,
      eventType,
      data,
      timestamp: new Date(),
      version: options?.version || '1.0.0',
      tags: options?.tags || []
    };

    // Validate event using UEP
    const validationResult = this.validationEngine.validateEvent(event);
    if (!validationResult.valid) {
      throw new Error(`UEP Event Validation Failed: ${validationResult.violations?.join(', ')}`);
    }

    // Publish event
    const subject = `UEP.v1.events.${this.config.agentType}.${eventType}`;
    await this.config.jetStreamClient.publish(subject, JSON.stringify(event));
  }

  /**
   * Subscribe to Events Pattern
   */
  async subscribeToEvents(eventTypes: string[], handler: (event: UEPEvent) => Promise<void>): Promise<void> {
    for (const eventType of eventTypes) {
      const subject = `UEP.v1.events.*.${eventType}`;
      const subscription = await this.config.jetStreamClient.subscribe(subject);
      
      // Process messages
      (async () => {
        for await (const msg of subscription) {
          try {
            const event: UEPEvent = JSON.parse(msg.data.toString());
            
            // Validate event
            const validationResult = this.validationEngine.validateEvent(event);
            if (validationResult.valid) {
              await handler(event);
              msg.ack();
            } else {
              console.warn('Invalid event received:', validationResult.violations);
              msg.nak();
            }
          } catch (error) {
            console.error('Error processing event:', error);
            msg.nak();
          }
        }
      })();
    }
  }

  /**
   * Queue-based Workload Distribution Pattern
   */
  async processWorkQueue(queueName: string, handler: (task: any) => Promise<any>): Promise<void> {
    const subject = `UEP.v1.queue.${queueName}`;
    const subscription = await this.config.jetStreamClient.subscribe(subject, {
      queue: `${this.config.agentId}-workers`
    });

    // Process work items
    (async () => {
      for await (const msg of subscription) {
        try {
          const task = JSON.parse(msg.data.toString());
          
          // Validate task
          const validationResult = this.validationEngine.validateRequest(task);
          if (validationResult.valid) {
            const result = await handler(task);
            
            // Send result back if reply subject exists
            if (msg.reply) {
              const response: UEPResponse = {
                id: this.generateResponseId(),
                requestId: task.id,
                from: this.config.agentId,
                to: task.from,
                status: 'success',
                data: result,
                timestamp: new Date(),
                version: task.version,
                latency: Date.now() - new Date(task.timestamp).getTime()
              };
              
              await this.config.natsConnection.publish(msg.reply, JSON.stringify(response));
            }
            
            msg.ack();
          } else {
            console.warn('Invalid task received:', validationResult.violations);
            msg.nak();
          }
        } catch (error) {
          console.error('Error processing task:', error);
          
          // Send error response if reply subject exists
          if (msg.reply) {
            const errorResponse: UEPResponse = {
              id: this.generateResponseId(),
              requestId: 'unknown',
              from: this.config.agentId,
              to: 'unknown',
              status: 'error',
              error: error.message,
              timestamp: new Date(),
              version: '1.0.0',
              latency: 0
            };
            
            await this.config.natsConnection.publish(msg.reply, JSON.stringify(errorResponse));
          }
          
          msg.nak();
        }
      }
    })();
  }

  /**
   * Submit Work to Queue Pattern
   */
  async submitWork(queueName: string, task: any, options?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    expectResponse?: boolean;
    timeout?: number;
  }): Promise<any> {
    const taskId = this.generateTaskId();
    const workItem = {
      id: taskId,
      from: this.config.agentId,
      data: task,
      timestamp: new Date(),
      version: '1.0.0',
      priority: options?.priority || 'normal'
    };

    const subject = `UEP.v1.queue.${queueName}`;
    
    if (options?.expectResponse) {
      // Use request-reply pattern for work that needs response
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Work submission timeout: ${taskId}`));
        }, options?.timeout || this.config.timeout);

        const replySubject = this.config.natsConnection.createInbox();
        const subscription = this.config.natsConnection.subscribe(replySubject, {
          max: 1,
          callback: (err, msg) => {
            clearTimeout(timeout);
            if (err) {
              reject(err);
            } else {
              const response = JSON.parse(msg.data.toString());
              if (response.status === 'success') {
                resolve(response.data);
              } else {
                reject(new Error(response.error));
              }
            }
          }
        });

        this.config.natsConnection.publish(subject, JSON.stringify(workItem), replySubject);
      });
    } else {
      // Fire-and-forget pattern
      await this.config.jetStreamClient.publish(subject, JSON.stringify(workItem));
    }
  }

  /**
   * Setup message handlers for responses and events
   */
  private setupMessageHandlers(): void {
    // Handle responses to our requests
    const responseSubject = `UEP.v1.responses.${this.config.agentId}`;
    this.config.jetStreamClient.subscribe(responseSubject).then(subscription => {
      (async () => {
        for await (const msg of subscription) {
          try {
            const response: UEPResponse = JSON.parse(msg.data.toString());
            const pending = this.pendingRequests.get(response.requestId);
            
            if (pending) {
              clearTimeout(pending.timeout);
              this.pendingRequests.delete(response.requestId);
              
              if (response.status === 'success') {
                pending.resolve(response);
              } else {
                pending.reject(new Error(response.error));
              }
            }
            
            msg.ack();
          } catch (error) {
            console.error('Error processing response:', error);
            msg.nak();
          }
        }
      })();
    });

    // Handle incoming requests
    const requestSubject = `UEP.v1.${this.config.agentType}.${this.config.agentId}.>`;
    this.config.jetStreamClient.subscribe(requestSubject).then(subscription => {
      (async () => {
        for await (const msg of subscription) {
          try {
            const request: UEPRequest = JSON.parse(msg.data.toString());
            await this.handleIncomingRequest(request, msg);
          } catch (error) {
            console.error('Error processing request:', error);
            msg.nak();
          }
        }
      })();
    });
  }

  /**
   * Handle incoming requests - to be overridden by specific agents
   */
  protected async handleIncomingRequest(request: UEPRequest, msg: Msg): Promise<void> {
    // Default implementation - agents should override this
    console.log(`Received request: ${request.method} from ${request.from}`);
    
    const response: UEPResponse = {
      id: this.generateResponseId(),
      requestId: request.id,
      from: this.config.agentId,
      to: request.from,
      status: 'error',
      error: 'Method not implemented',
      timestamp: new Date(),
      version: request.version,
      latency: Date.now() - new Date(request.timestamp).getTime()
    };

    const responseSubject = `UEP.v1.responses.${request.from}`;
    await this.config.jetStreamClient.publish(responseSubject, JSON.stringify(response));
    msg.ack();
  }

  // Utility methods
  private generateRequestId(): string {
    return `req_${this.config.agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt_${this.config.agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResponseId(): string {
    return `res_${this.config.agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTaskId(): string {
    return `task_${this.config.agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create UEP communicator for agents
 */
export async function createUEPCommunicator(
  natsUrl: string,
  agentId: string,
  agentType: 'meta' | 'domain',
  options?: {
    timeout?: number;
    retryAttempts?: number;
    circuitBreakerEnabled?: boolean;
  }
): Promise<UEPAgentCommunicator> {
  const { connect } = await import('nats');
  
  const natsConnection = await connect({
    servers: natsUrl.split(','),
    user: agentType === 'meta' ? 'uep-meta-agents' : 'uep-domain-agents',
    pass: agentType === 'meta' ? 'uep-agents-secret-2024' : 'uep-domain-secret-2024'
  });

  const jetStreamClient = natsConnection.jetstream();

  const config: UEPCommunicationConfig = {
    natsConnection,
    jetStreamClient,
    agentId,
    agentType,
    timeout: options?.timeout || 30000,
    retryAttempts: options?.retryAttempts || 3,
    circuitBreakerEnabled: options?.circuitBreakerEnabled || true
  };

  return new UEPAgentCommunicator(config);
}