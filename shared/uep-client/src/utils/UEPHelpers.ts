/**
 * UEP Utility Helpers
 * 
 * Collection of utility functions for creating, parsing, and manipulating
 * UEP protocol messages with proper validation and type safety.
 * 
 * Features:
 * - Message factory functions
 * - Parsing and validation utilities
 * - Tracing context manipulation
 * - Error handling helpers
 */

import { v4 as uuidv4 } from 'uuid';
import {
  UEPClient,
  UEPMessage,
  UEPRequest,
  UEPResponse,
  UEPEvent,
  UEPClientOptions,
  UEPAgentInfo,
  UEPProtocolInfo,
  UEPTracingContext,
  UEPTypeGuards,
  UEPConstants
} from '../core/UEPTypes.js';
import { UEPMessageValidator, ValidationResult } from '../core/UEPMessageValidator.js';

/**
 * Message Creation Options
 */
interface MessageCreationOptions {
  id?: string;
  timestamp?: Date;
  version?: string;
  headers?: Record<string, string>;
  tracing?: Partial<UEPTracingContext>;
}

/**
 * Create a UEP client with sensible defaults
 */
export function createUEPClient(
  agentId: string,
  agentType: 'meta' | 'domain' | 'factory' | 'orchestrator',
  options?: Partial<UEPClientOptions>
): UEPClient {
  const defaultOptions: UEPClientOptions = {
    connection: {
      servers: ['nats://localhost:4222'],
      namespace: 'uep',
      timeouts: {
        connect: 10000,
        request: 30000,
        keepAlive: 60000
      }
    },
    agent: {
      id: agentId,
      type: agentType,
      capability: agentId,
      version: '1.0.0'
    },
    tracing: {
      enabled: true,
      serviceName: agentId,
      sampleRate: 1.0
    },
    validation: {
      enabled: true,
      strictMode: false,
      schemaValidation: true
    },
    monitoring: {
      metricsEnabled: true,
      healthCheckEnabled: true,
      loggingLevel: 'info'
    }
  };

  const mergedOptions = deepMerge(defaultOptions, options || {});
  return new UEPClient(mergedOptions);
}

/**
 * Create a generic UEP message
 */
export function createUEPMessage<T>(
  payload: T,
  messageType: 'command' | 'event' | 'query' | 'response',
  subject: string,
  agent: UEPAgentInfo,
  options: MessageCreationOptions = {}
): UEPMessage<T> {
  return {
    id: options.id || uuidv4(),
    timestamp: options.timestamp || new Date(),
    version: options.version || UEPConstants.PROTOCOL_VERSION,
    protocol: createDefaultProtocolInfo(agent.capability),
    routing: {
      subject,
      messageType,
      priority: 'normal'
    },
    agent,
    tracing: {
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      ...options.tracing
    },
    payload,
    headers: options.headers
  };
}

/**
 * Create a UEP request message
 */
export function createUEPRequest<T>(
  payload: T,
  capability: string,
  agent: UEPAgentInfo,
  options: MessageCreationOptions & {
    replyTo?: string;
    correlationId?: string;
    timeout?: number;
    messageType?: 'command' | 'query';
  } = {}
): UEPRequest<T> {
  const replyTo = options.replyTo || `_INBOX.${uuidv4()}`;
  const correlationId = options.correlationId || uuidv4();

  const message = createUEPMessage(
    payload,
    options.messageType || 'command',
    buildSubject(agent.type, capability),
    agent,
    options
  );

  return {
    ...message,
    routing: {
      ...message.routing,
      messageType: options.messageType || 'command',
      replyTo,
      correlationId,
      timeout: options.timeout
    },
    expectResponse: true
  } as UEPRequest<T>;
}

/**
 * Create a UEP response message
 */
export function createUEPResponse<T>(
  payload: T,
  originalRequest: UEPRequest<any>,
  agent: UEPAgentInfo,
  options: MessageCreationOptions & {
    success?: boolean;
    error?: Error;
  } = {}
): UEPResponse<T> {
  const success = options.success !== false && !options.error;

  const message = createUEPMessage(
    payload,
    'response',
    originalRequest.routing.replyTo!,
    agent,
    {
      ...options,
      tracing: {
        ...originalRequest.tracing,
        parentSpanId: originalRequest.tracing.spanId,
        spanId: generateSpanId()
      }
    }
  );

  return {
    ...message,
    routing: {
      ...message.routing,
      messageType: 'response',
      correlationId: originalRequest.routing.correlationId || originalRequest.id
    },
    success,
    error: options.error ? {
      code: 'PROCESSING_ERROR',
      message: options.error.message,
      retryable: false,
      timestamp: new Date()
    } : undefined
  } as UEPResponse<T>;
}

/**
 * Create a UEP event message
 */
export function createUEPEvent<T>(
  payload: T,
  eventType: string,
  agent: UEPAgentInfo,
  options: MessageCreationOptions & {
    eventVersion?: string;
  } = {}
): UEPEvent<T> {
  const message = createUEPMessage(
    payload,
    'event',
    buildSubject(agent.type, `events.${eventType}`),
    agent,
    options
  );

  return {
    ...message,
    routing: {
      ...message.routing,
      messageType: 'event'
    },
    eventType,
    eventVersion: options.eventVersion || '1.0.0'
  } as UEPEvent<T>;
}

/**
 * Parse a UEP message from JSON string
 */
export function parseUEPMessage<T>(data: string | object): UEPMessage<T> {
  let parsed: any;

  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch (error) {
      throw new Error(`Invalid JSON data: ${error.message}`);
    }
  } else {
    parsed = data;
  }

  if (!UEPTypeGuards.isUEPMessage(parsed)) {
    throw new Error('Data is not a valid UEP message');
  }

  // Convert timestamp to Date object if it's a string
  if (typeof parsed.timestamp === 'string') {
    parsed.timestamp = new Date(parsed.timestamp);
  }

  return parsed as UEPMessage<T>;
}

/**
 * Validate a UEP message using the validator
 */
export async function validateUEPMessage<T>(
  message: UEPMessage<T>,
  validator?: UEPMessageValidator
): Promise<ValidationResult> {
  if (!validator) {
    validator = new UEPMessageValidator({
      enabled: true,
      strictMode: false,
      schemaValidation: true
    });
  }

  if (UEPTypeGuards.isUEPRequest(message)) {
    return await validator.validateRequest(message);
  } else if (UEPTypeGuards.isUEPResponse(message)) {
    return await validator.validateResponse(message);
  } else if (UEPTypeGuards.isUEPEvent(message)) {
    return await validator.validateEvent(message);
  } else {
    return await validator.validateMessage(message);
  }
}

/**
 * Extract tracing context from a UEP message
 */
export function extractTraceFromMessage(message: UEPMessage<any>): UEPTracingContext {
  return {
    traceId: message.tracing.traceId,
    spanId: message.tracing.spanId,
    parentSpanId: message.tracing.parentSpanId,
    baggage: message.tracing.baggage,
    sampled: message.tracing.sampled
  };
}

/**
 * Inject tracing context into a UEP message
 */
export function injectTraceIntoMessage<T>(
  message: UEPMessage<T>,
  tracingContext: Partial<UEPTracingContext>
): UEPMessage<T> {
  return {
    ...message,
    tracing: {
      ...message.tracing,
      ...tracingContext
    }
  };
}

/**
 * Create a child tracing context from a parent message
 */
export function createChildTraceContext(parentMessage: UEPMessage<any>): UEPTracingContext {
  return {
    traceId: parentMessage.tracing.traceId,
    spanId: generateSpanId(),
    parentSpanId: parentMessage.tracing.spanId,
    baggage: parentMessage.tracing.baggage,
    sampled: parentMessage.tracing.sampled
  };
}

/**
 * Build subject name according to UEP conventions
 */
export function buildSubject(
  agentType: string,
  capability: string,
  namespace: string = 'uep'
): string {
  return `${namespace}.${agentType}.${capability}`;
}

/**
 * Extract capability from subject
 */
export function extractCapabilityFromSubject(subject: string): string | null {
  const parts = subject.split('.');
  if (parts.length >= 3) {
    return parts.slice(2).join('.');
  }
  return null;
}

/**
 * Create default protocol info
 */
export function createDefaultProtocolInfo(capability: string): UEPProtocolInfo {
  return {
    id: 'uep-protocol',
    version: UEPConstants.PROTOCOL_VERSION,
    capability,
    compatibility: [UEPConstants.PROTOCOL_VERSION]
  };
}

/**
 * Create default agent info
 */
export function createDefaultAgentInfo(
  id: string,
  type: 'meta' | 'domain' | 'factory' | 'orchestrator',
  capability: string,
  version: string = '1.0.0'
): UEPAgentInfo {
  return {
    id,
    type,
    capability,
    instance: process.env.HOSTNAME || 'localhost',
    version,
    status: 'ready'
  };
}

/**
 * Generate a trace ID (32-character hex string)
 */
export function generateTraceId(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Generate a span ID (16-character hex string)
 */
export function generateSpanId(): string {
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Check if a message is a request that expects a response
 */
export function isRequestMessage(message: UEPMessage<any>): message is UEPRequest<any> {
  return UEPTypeGuards.isUEPRequest(message);
}

/**
 * Check if a message is a response to a request
 */
export function isResponseMessage(message: UEPMessage<any>): message is UEPResponse<any> {
  return UEPTypeGuards.isUEPResponse(message);
}

/**
 * Check if a message is an event
 */
export function isEventMessage(message: UEPMessage<any>): message is UEPEvent<any> {
  return UEPTypeGuards.isUEPEvent(message);
}

/**
 * Create a correlation ID for message tracking
 */
export function createCorrelationId(): string {
  return uuidv4();
}

/**
 * Format message for logging (removes sensitive data)
 */
export function formatMessageForLogging(message: UEPMessage<any>): object {
  return {
    id: message.id,
    timestamp: message.timestamp,
    messageType: message.routing.messageType,
    subject: message.routing.subject,
    agentId: message.agent.id,
    traceId: message.tracing.traceId,
    spanId: message.tracing.spanId,
    payloadType: typeof message.payload,
    success: 'success' in message ? message.success : undefined
  };
}

/**
 * Calculate message size in bytes
 */
export function calculateMessageSize(message: UEPMessage<any>): number {
  return new TextEncoder().encode(JSON.stringify(message)).length;
}

/**
 * Check if message exceeds size limit
 */
export function isMessageTooLarge(message: UEPMessage<any>, maxSize: number = UEPConstants.MAX_MESSAGE_SIZE): boolean {
  return calculateMessageSize(message) > maxSize;
}

/**
 * Create an error response from an exception
 */
export function createErrorResponse<T>(
  error: Error,
  originalRequest: UEPRequest<any>,
  agent: UEPAgentInfo,
  retryable: boolean = false
): UEPResponse<T> {
  return createUEPResponse<T>(
    null as any,
    originalRequest,
    agent,
    {
      success: false,
      error
    }
  );
}

/**
 * Deep merge utility function
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

/**
 * Check if value is an object
 */
function isObject(value: any): value is object {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Sleep utility function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  backoffMultiplier: number = 2,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        break;
      }

      const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}

export {
  MessageCreationOptions
};