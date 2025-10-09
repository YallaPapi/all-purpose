/**
 * UEP Protocol Client Types
 * 
 * Core TypeScript interfaces and types for UEP protocol client libraries.
 * Provides strict typing for request/response patterns and protocol compliance.
 * 
 * Compatible with:
 * - TypeScript 5.2+
 * - OpenAPI 3.1 schema validation
 * - UEP Protocol v1.0+
 */

/**
 * UEP Protocol Version Information
 */
export interface UEPProtocolInfo {
  readonly id: string;
  readonly version: string;
  readonly capability: string;
  readonly compatibility: readonly string[];
}

/**
 * UEP Agent Information
 */
export interface UEPAgentInfo {
  readonly id: string;
  readonly type: 'meta' | 'domain' | 'factory' | 'orchestrator';
  readonly capability: string;
  readonly instance: string;
  readonly version: string;
  readonly status: 'initializing' | 'ready' | 'busy' | 'error' | 'shutdown';
}

/**
 * UEP Message Routing Information
 */
export interface UEPRouting {
  readonly subject: string;
  readonly replyTo?: string;
  readonly correlationId?: string;
  readonly messageType: 'command' | 'event' | 'query' | 'response';
  readonly priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * UEP Tracing Context
 */
export interface UEPTracingContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly baggage?: Readonly<Record<string, string>>;
  readonly sampled?: boolean;
}

/**
 * UEP Message Headers
 */
export interface UEPHeaders extends Record<string, string> {
  readonly 'uep-protocol-version'?: string;
  readonly 'uep-agent-id'?: string;
  readonly 'uep-capability'?: string;
  readonly 'uep-trace-id'?: string;
  readonly 'uep-span-id'?: string;
  readonly 'content-type'?: string;
  readonly 'accept'?: string;
}

/**
 * UEP Message Envelope (Base Interface)
 */
export interface UEPMessage<TPayload = unknown> {
  readonly id: string;
  readonly timestamp: Date;
  readonly version: string;
  readonly protocol: UEPProtocolInfo;
  readonly routing: UEPRouting;
  readonly agent: UEPAgentInfo;
  readonly tracing: UEPTracingContext;
  readonly payload: TPayload;
  readonly headers?: UEPHeaders;
}

/**
 * UEP Request Message
 */
export interface UEPRequest<TPayload = unknown> extends UEPMessage<TPayload> {
  readonly routing: UEPRouting & {
    readonly messageType: 'command' | 'query';
    readonly replyTo: string;
    readonly timeout?: number;
  };
  readonly expectResponse: true;
}

/**
 * UEP Response Message
 */
export interface UEPResponse<TPayload = unknown> extends UEPMessage<TPayload> {
  readonly routing: UEPRouting & {
    readonly messageType: 'response';
    readonly correlationId: string;
  };
  readonly success: boolean;
  readonly error?: UEPError;
}

/**
 * UEP Event Message
 */
export interface UEPEvent<TPayload = unknown> extends UEPMessage<TPayload> {
  readonly routing: UEPRouting & {
    readonly messageType: 'event';
  };
  readonly eventType: string;
  readonly eventVersion: string;
}

/**
 * UEP Error Information
 */
export interface UEPError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: Error;
  readonly retryable: boolean;
  readonly timestamp: Date;
}

/**
 * UEP Capability Definition
 */
export interface UEPCapability {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly schema: {
    readonly request: unknown; // JSON Schema object
    readonly response: unknown; // JSON Schema object
  };
  readonly metadata?: {
    readonly tags?: readonly string[];
    readonly deprecated?: boolean;
    readonly experimental?: boolean;
    readonly rateLimits?: {
      readonly requestsPerSecond?: number;
      readonly requestsPerMinute?: number;
    };
  };
}

/**
 * UEP Agent Manifest
 */
export interface UEPAgentManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly type: UEPAgentInfo['type'];
  readonly capabilities: readonly UEPCapability[];
  readonly dependencies?: readonly string[];
  readonly resources?: {
    readonly memory?: string;
    readonly cpu?: string;
  };
  readonly healthCheck?: {
    readonly endpoint: string;
    readonly interval: number;
    readonly timeout: number;
  };
}

/**
 * UEP Service Registry Entry
 */
export interface UEPServiceEntry {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly endpoint: string;
  readonly status: 'healthy' | 'unhealthy' | 'unknown';
  readonly capabilities: readonly UEPCapability[];
  readonly metadata: {
    readonly registeredAt: Date;
    readonly lastHealthCheck: Date;
    readonly instance: string;
    readonly region?: string;
    readonly zone?: string;
  };
  readonly tags?: Readonly<Record<string, string>>;
}

/**
 * UEP Connection Configuration
 */
export interface UEPConnectionConfig {
  readonly servers: readonly string[];
  readonly namespace?: string;
  readonly authentication?: {
    readonly type: 'token' | 'credentials' | 'certificate';
    readonly token?: string;
    readonly username?: string;
    readonly password?: string;
    readonly cert?: string;
    readonly key?: string;
    readonly ca?: string;
  };
  readonly tls?: {
    readonly enabled: boolean;
    readonly verifyHost?: boolean;
    readonly minVersion?: string;
  };
  readonly timeouts?: {
    readonly connect?: number;
    readonly request?: number;
    readonly keepAlive?: number;
  };
  readonly retry?: {
    readonly maxAttempts?: number;
    readonly backoffMultiplier?: number;
    readonly maxDelay?: number;
  };
}

/**
 * UEP Client Options
 */
export interface UEPClientOptions {
  readonly connection: UEPConnectionConfig;
  readonly agent: Pick<UEPAgentInfo, 'id' | 'type' | 'capability' | 'version'>;
  readonly tracing?: {
    readonly enabled: boolean;
    readonly serviceName?: string;
    readonly sampleRate?: number;
  };
  readonly validation?: {
    readonly enabled: boolean;
    readonly strictMode?: boolean;
    readonly schemaValidation?: boolean;
  };
  readonly performance?: {
    readonly maxConcurrentRequests?: number;
    readonly messageBufferSize?: number;
    readonly compressionEnabled?: boolean;
  };
  readonly monitoring?: {
    readonly metricsEnabled?: boolean;
    readonly healthCheckEnabled?: boolean;
    readonly loggingLevel?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  };
}

/**
 * UEP Request Options
 */
export interface UEPRequestOptions {
  readonly timeout?: number;
  readonly priority?: UEPRouting['priority'];
  readonly headers?: Partial<UEPHeaders>;
  readonly expectResponse?: boolean;
  readonly retryPolicy?: {
    readonly maxAttempts: number;
    readonly backoffMultiplier: number;
    readonly retryableErrors: readonly string[];
  };
  readonly tracing?: {
    readonly parentSpanId?: string;
    readonly baggage?: Record<string, string>;
  };
}

/**
 * UEP Subscription Options
 */
export interface UEPSubscriptionOptions {
  readonly subject: string;
  readonly queue?: string;
  readonly durableName?: string;
  readonly autoAck?: boolean;
  readonly maxInFlight?: number;
  readonly deliverPolicy?: 'all' | 'last' | 'new' | 'by_start_sequence' | 'by_start_time';
  readonly ackPolicy?: 'none' | 'all' | 'explicit';
  readonly replayPolicy?: 'instant' | 'original';
  readonly filterSubject?: string;
  readonly rateLimitBps?: number;
  readonly heartbeatInterval?: number;
  readonly flowControl?: boolean;
}

/**
 * UEP Health Status
 */
export interface UEPHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly checks: readonly {
    readonly name: string;
    readonly status: 'pass' | 'fail' | 'warn';
    readonly message?: string;
    readonly duration: number;
    readonly timestamp: Date;
  }[];
  readonly uptime: number;
  readonly version: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * UEP Metrics
 */
export interface UEPMetrics {
  readonly messages: {
    readonly sent: number;
    readonly received: number;
    readonly failed: number;
    readonly pending: number;
  };
  readonly latency: {
    readonly average: number;
    readonly p50: number;
    readonly p95: number;
    readonly p99: number;
  };
  readonly connections: {
    readonly active: number;
    readonly total: number;
    readonly errors: number;
  };
  readonly memory: {
    readonly used: number;
    readonly available: number;
    readonly utilization: number;
  };
  readonly timestamp: Date;
}

/**
 * Type Guards for UEP Messages
 */
export const UEPTypeGuards = {
  isUEPMessage: <T>(obj: unknown): obj is UEPMessage<T> => {
    return typeof obj === 'object' && obj !== null &&
           'id' in obj && 'timestamp' in obj && 'version' in obj &&
           'protocol' in obj && 'routing' in obj && 'agent' in obj &&
           'tracing' in obj && 'payload' in obj;
  },

  isUEPRequest: <T>(obj: unknown): obj is UEPRequest<T> => {
    return UEPTypeGuards.isUEPMessage(obj) &&
           ('expectResponse' in obj && obj.expectResponse === true) &&
           ('routing' in obj && typeof obj.routing === 'object' && obj.routing !== null &&
            'replyTo' in obj.routing);
  },

  isUEPResponse: <T>(obj: unknown): obj is UEPResponse<T> => {
    return UEPTypeGuards.isUEPMessage(obj) &&
           ('success' in obj && typeof obj.success === 'boolean') &&
           ('routing' in obj && typeof obj.routing === 'object' && obj.routing !== null &&
            'messageType' in obj.routing && obj.routing.messageType === 'response');
  },

  isUEPEvent: <T>(obj: unknown): obj is UEPEvent<T> => {
    return UEPTypeGuards.isUEPMessage(obj) &&
           ('eventType' in obj && typeof obj.eventType === 'string') &&
           ('eventVersion' in obj && typeof obj.eventVersion === 'string');
  },

  isUEPError: (obj: unknown): obj is UEPError => {
    return typeof obj === 'object' && obj !== null &&
           'code' in obj && 'message' in obj && 'retryable' in obj && 'timestamp' in obj;
  }
} as const;

/**
 * UEP Protocol Constants
 */
export const UEPConstants = {
  PROTOCOL_VERSION: '1.0.0',
  DEFAULT_TIMEOUT: 30000,
  MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
  DEFAULT_NAMESPACE: 'uep',
  
  MESSAGE_TYPES: {
    COMMAND: 'command',
    QUERY: 'query',
    EVENT: 'event',
    RESPONSE: 'response'
  } as const,

  AGENT_TYPES: {
    META: 'meta',
    DOMAIN: 'domain',
    FACTORY: 'factory',
    ORCHESTRATOR: 'orchestrator'
  } as const,

  PRIORITIES: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
  } as const,

  HEADER_NAMES: {
    PROTOCOL_VERSION: 'uep-protocol-version',
    AGENT_ID: 'uep-agent-id',
    CAPABILITY: 'uep-capability',
    TRACE_ID: 'uep-trace-id',
    SPAN_ID: 'uep-span-id'
  } as const

} as const;

/**
 * Export all types for external use
 */
export type {
  UEPProtocolInfo,
  UEPAgentInfo,
  UEPRouting,
  UEPTracingContext,
  UEPHeaders,
  UEPMessage,
  UEPRequest,
  UEPResponse,
  UEPEvent,
  UEPError,
  UEPCapability,
  UEPAgentManifest,
  UEPServiceEntry,
  UEPConnectionConfig,
  UEPClientOptions,
  UEPRequestOptions,
  UEPSubscriptionOptions,
  UEPHealthStatus,
  UEPMetrics
};