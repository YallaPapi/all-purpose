/**
 * UEP Agent Decorators
 * 
 * Provides TypeScript decorators for creating UEP-compliant agent interfaces
 * with automatic message handling, validation, and tracing integration.
 * 
 * Features:
 * - @UEPAgent decorator for class-level agent configuration
 * - @UEPCapability decorator for method-level capability exposure
 * - @UEPEventHandler decorator for event subscription
 * - Automatic request/response handling
 * - Built-in validation and error handling
 * - Tracing and metrics integration
 */

import 'reflect-metadata';
import { 
  UEPClient,
  UEPRequest,
  UEPResponse,
  UEPEvent,
  UEPAgentInfo,
  UEPCapability,
  UEPError,
  UEPClientOptions
} from '../core/UEPClient.js';
import { UEPConstants } from '../core/UEPTypes.js';

/**
 * Agent Decorator Configuration
 */
export interface UEPAgentConfig {
  name: string;
  version: string;
  type: 'meta' | 'domain' | 'factory' | 'orchestrator';
  description?: string;
  healthCheck?: {
    endpoint?: string;
    interval?: number;
  };
  resources?: {
    memory?: string;
    cpu?: string;
  };
}

/**
 * Capability Decorator Configuration
 */
export interface UEPCapabilityConfig {
  name: string;
  version?: string;
  description?: string;
  schema?: {
    request?: any;
    response?: any;
  };
  timeout?: number;
  rateLimit?: {
    requestsPerSecond?: number;
    requestsPerMinute?: number;
  };
  metadata?: {
    tags?: string[];
    deprecated?: boolean;
    experimental?: boolean;
  };
}

/**
 * Event Handler Decorator Configuration
 */
export interface UEPEventHandlerConfig {
  eventType: string;
  version?: string;
  queue?: string;
  autoAck?: boolean;
  maxRetries?: number;
}

/**
 * Metadata Keys for Reflection
 */
const METADATA_KEYS = {
  AGENT_CONFIG: Symbol('uep:agent:config'),
  CAPABILITIES: Symbol('uep:capabilities'),
  EVENT_HANDLERS: Symbol('uep:event-handlers'),
  ORIGINAL_METHOD: Symbol('uep:original-method')
} as const;

/**
 * Agent Registry for managing decorated agents
 */
class UEPAgentRegistry {
  private static instance: UEPAgentRegistry;
  private agents = new Map<string, any>();
  private clients = new Map<string, UEPClient>();

  static getInstance(): UEPAgentRegistry {
    if (!UEPAgentRegistry.instance) {
      UEPAgentRegistry.instance = new UEPAgentRegistry();
    }
    return UEPAgentRegistry.instance;
  }

  registerAgent(agent: any): void {
    const config = Reflect.getMetadata(METADATA_KEYS.AGENT_CONFIG, agent.constructor);
    if (config) {
      this.agents.set(config.name, agent);
    }
  }

  getAgent(name: string): any {
    return this.agents.get(name);
  }

  getAllAgents(): any[] {
    return Array.from(this.agents.values());
  }

  async startAgent(agentName: string, clientOptions: UEPClientOptions): Promise<void> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    const client = new UEPClient(clientOptions);
    await client.connect();

    this.clients.set(agentName, client);

    // Setup capability handlers
    await this.setupCapabilityHandlers(agent, client);

    // Setup event handlers
    await this.setupEventHandlers(agent, client);
  }

  async stopAgent(agentName: string): Promise<void> {
    const client = this.clients.get(agentName);
    if (client) {
      await client.disconnect();
      this.clients.delete(agentName);
    }
  }

  private async setupCapabilityHandlers(agent: any, client: UEPClient): Promise<void> {
    const capabilities = Reflect.getMetadata(METADATA_KEYS.CAPABILITIES, agent.constructor) || [];

    for (const { propertyKey, config } of capabilities) {
      const subject = `${config.name}`;
      
      await client.subscribe(subject, async (message) => {
        try {
          if (message.routing.messageType === 'command' || message.routing.messageType === 'query') {
            const request = message as UEPRequest;
            const result = await agent[propertyKey](request.payload, request);
            
            if (request.routing.replyTo) {
              const response: UEPResponse<any> = {
                id: client['generateMessageId'](),
                timestamp: new Date(),
                version: UEPConstants.PROTOCOL_VERSION,
                protocol: message.protocol,
                routing: {
                  subject: request.routing.replyTo,
                  messageType: 'response',
                  correlationId: request.routing.correlationId || request.id
                },
                agent: client['createAgentInfo'](),
                tracing: message.tracing,
                payload: result,
                success: true
              };

              await client['sendMessage'](response);
            }
          }
        } catch (error) {
          // Send error response
          if (message.routing.replyTo) {
            const errorResponse: UEPResponse<any> = {
              id: client['generateMessageId'](),
              timestamp: new Date(),
              version: UEPConstants.PROTOCOL_VERSION,
              protocol: message.protocol,
              routing: {
                subject: message.routing.replyTo,
                messageType: 'response',
                correlationId: message.routing.correlationId || message.id
              },
              agent: client['createAgentInfo'](),
              tracing: message.tracing,
              payload: null,
              success: false,
              error: {
                code: 'CAPABILITY_ERROR',
                message: error.message,
                retryable: false,
                timestamp: new Date()
              }
            };

            await client['sendMessage'](errorResponse);
          }
        }
      });
    }
  }

  private async setupEventHandlers(agent: any, client: UEPClient): Promise<void> {
    const eventHandlers = Reflect.getMetadata(METADATA_KEYS.EVENT_HANDLERS, agent.constructor) || [];

    for (const { propertyKey, config } of eventHandlers) {
      const subject = `events.${config.eventType}`;
      
      await client.subscribe(subject, async (message) => {
        try {
          if (message.routing.messageType === 'event') {
            const event = message as UEPEvent;
            await agent[propertyKey](event.payload, event);
          }
        } catch (error) {
          console.error(`Error handling event ${config.eventType}:`, error);
        }
      }, {
        subject,
        queue: config.queue,
        autoAck: config.autoAck
      });
    }
  }
}

/**
 * @UEPAgent - Class decorator for UEP agent configuration
 */
export function UEPAgent(config: UEPAgentConfig) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    // Store agent configuration
    Reflect.defineMetadata(METADATA_KEYS.AGENT_CONFIG, config, constructor);

    // Register agent
    const registry = UEPAgentRegistry.getInstance();
    
    // Enhanced constructor that auto-registers the agent
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        registry.registerAgent(this);
      }
    } as T;
  };
}

/**
 * @UEPCapability - Method decorator for exposing agent capabilities
 */
export function UEPCapability(config: UEPCapabilityConfig) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Get existing capabilities or create new array
    const existingCapabilities = Reflect.getMetadata(METADATA_KEYS.CAPABILITIES, target.constructor) || [];
    
    // Add this capability
    existingCapabilities.push({ propertyKey, config });
    
    // Store updated capabilities
    Reflect.defineMetadata(METADATA_KEYS.CAPABILITIES, existingCapabilities, target.constructor);

    // Store original method
    const originalMethod = descriptor.value;
    Reflect.defineMetadata(METADATA_KEYS.ORIGINAL_METHOD, originalMethod, target, propertyKey);

    // Wrap the method with UEP handling
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        // Call original method
        const result = await originalMethod.apply(this, args);
        
        // Log success metrics
        const duration = Date.now() - startTime;
        console.debug(`Capability ${config.name} executed successfully in ${duration}ms`);
        
        return result;
      } catch (error) {
        // Log error metrics
        const duration = Date.now() - startTime;
        console.error(`Capability ${config.name} failed after ${duration}ms:`, error);
        
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * @UEPEventHandler - Method decorator for event subscription
 */
export function UEPEventHandler(config: UEPEventHandlerConfig) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Get existing event handlers or create new array
    const existingHandlers = Reflect.getMetadata(METADATA_KEYS.EVENT_HANDLERS, target.constructor) || [];
    
    // Add this handler
    existingHandlers.push({ propertyKey, config });
    
    // Store updated handlers
    Reflect.defineMetadata(METADATA_KEYS.EVENT_HANDLERS, existingHandlers, target.constructor);

    // Store original method
    const originalMethod = descriptor.value;
    Reflect.defineMetadata(METADATA_KEYS.ORIGINAL_METHOD, originalMethod, target, propertyKey);

    // Wrap the method with error handling
    descriptor.value = async function (...args: any[]) {
      try {
        await originalMethod.apply(this, args);
      } catch (error) {
        console.error(`Event handler ${config.eventType} failed:`, error);
        
        // Could implement retry logic here based on config.maxRetries
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * @UEPValidate - Method decorator for automatic request validation
 */
export function UEPValidate(schema?: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [payload, request] = args;

      // Perform validation if schema is provided
      if (schema && payload) {
        // Implementation would validate payload against schema
        // For now, just a placeholder
        if (typeof payload !== 'object') {
          throw new Error('Invalid payload format');
        }
      }

      return await originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * @UEPRateLimit - Method decorator for rate limiting
 */
export function UEPRateLimit(options: { requestsPerSecond?: number; requestsPerMinute?: number }) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [payload, request] = args;
      const agentId = request?.agent?.id || 'unknown';
      const now = Date.now();

      // Check rate limits
      if (options.requestsPerSecond) {
        const key = `${agentId}:${propertyKey}:second`;
        const current = requestCounts.get(key) || { count: 0, resetTime: now + 1000 };
        
        if (now > current.resetTime) {
          current.count = 0;
          current.resetTime = now + 1000;
        }
        
        if (current.count >= options.requestsPerSecond) {
          throw new Error('Rate limit exceeded: requests per second');
        }
        
        current.count++;
        requestCounts.set(key, current);
      }

      return await originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * @UEPTrace - Method decorator for automatic tracing
 */
export function UEPTrace(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const operation = operationName || `${target.constructor.name}.${propertyKey}`;
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        console.debug(`Traced operation ${operation} completed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`Traced operation ${operation} failed after ${duration}ms:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Utility function to get agent configuration
 */
export function getAgentConfig(agentClass: any): UEPAgentConfig | null {
  return Reflect.getMetadata(METADATA_KEYS.AGENT_CONFIG, agentClass) || null;
}

/**
 * Utility function to get agent capabilities
 */
export function getAgentCapabilities(agentClass: any): Array<{ propertyKey: string; config: UEPCapabilityConfig }> {
  return Reflect.getMetadata(METADATA_KEYS.CAPABILITIES, agentClass) || [];
}

/**
 * Utility function to get agent event handlers
 */
export function getAgentEventHandlers(agentClass: any): Array<{ propertyKey: string; config: UEPEventHandlerConfig }> {
  return Reflect.getMetadata(METADATA_KEYS.EVENT_HANDLERS, agentClass) || [];
}

/**
 * Utility function to create agent manifest
 */
export function createAgentManifest(agentClass: any) {
  const config = getAgentConfig(agentClass);
  const capabilities = getAgentCapabilities(agentClass);

  if (!config) {
    throw new Error('Agent configuration not found');
  }

  return {
    name: config.name,
    version: config.version,
    description: config.description || '',
    type: config.type,
    capabilities: capabilities.map(({ config: capConfig }) => ({
      name: capConfig.name,
      version: capConfig.version || '1.0.0',
      description: capConfig.description || '',
      schema: {
        request: capConfig.schema?.request || {},
        response: capConfig.schema?.response || {}
      },
      metadata: capConfig.metadata
    })),
    resources: config.resources,
    healthCheck: config.healthCheck ? {
      endpoint: config.healthCheck.endpoint || '/health',
      interval: config.healthCheck.interval || 30000,
      timeout: 5000
    } : undefined
  };
}

/**
 * Export the agent registry for external use
 */
export const AgentRegistry = UEPAgentRegistry.getInstance();

/**
 * Utility function to start all registered agents
 */
export async function startAllAgents(connectionOptions: Omit<UEPClientOptions, 'agent'>): Promise<void> {
  const registry = UEPAgentRegistry.getInstance();
  const agents = registry.getAllAgents();

  for (const agent of agents) {
    const config = getAgentConfig(agent.constructor);
    if (config) {
      const clientOptions: UEPClientOptions = {
        ...connectionOptions,
        agent: {
          id: config.name,
          type: config.type,
          capability: config.name,
          version: config.version
        }
      };

      await registry.startAgent(config.name, clientOptions);
    }
  }
}

/**
 * Utility function to stop all registered agents
 */
export async function stopAllAgents(): Promise<void> {
  const registry = UEPAgentRegistry.getInstance();
  const agents = registry.getAllAgents();

  for (const agent of agents) {
    const config = getAgentConfig(agent.constructor);
    if (config) {
      await registry.stopAgent(config.name);
    }
  }
}

export {
  UEPAgentConfig,
  UEPCapabilityConfig,
  UEPEventHandlerConfig,
  METADATA_KEYS
};