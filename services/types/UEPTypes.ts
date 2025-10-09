/**
 * Universal Execution Protocol (UEP) Type Definitions
 * 
 * Comprehensive type system for UEP protocol implementation covering
 * messages, agents, coordination, compliance, and monitoring.
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

// =====================================================
// Core Protocol Types
// =====================================================

export type UEPProtocolVersion = '1.0.0' | '1.1.0' | '2.0.0';

export type UEPMessageType = 
  | 'REQUEST' 
  | 'RESPONSE' 
  | 'EVENT' 
  | 'COMMAND' 
  | 'QUERY' 
  | 'NOTIFICATION'
  | 'HEARTBEAT'
  | 'COORDINATION';

export type UEPAgentType = 
  | 'ORCHESTRATOR'
  | 'WORKER' 
  | 'COORDINATOR'
  | 'MONITOR'
  | 'GATEWAY'
  | 'PROCESSOR'
  | 'ANALYZER'
  | 'VALIDATOR';

export type UEPExecutionStatus = 
  | 'PENDING'
  | 'IN_PROGRESS' 
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMEOUT';

// =====================================================
// Agent and Identity Types
// =====================================================

export interface AgentIdentifier {
  id: string;
  type: UEPAgentType;
  version: string;
  capabilities: string[];
  endpoint: string;
  metadata?: Record<string, any>;
}

export interface UEPAgentCapability {
  name: string;
  version: string;
  description: string;
  inputSchema?: any;
  outputSchema?: any;
  constraints?: Record<string, any>;
}

export interface UEPAgentStatus {
  agentId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BUSY' | 'ERROR' | 'SHUTDOWN';
  lastHeartbeat: Date;
  currentLoad: number;
  availableCapabilities: string[];
  error?: string;
}

// =====================================================
// Message Types
// =====================================================

export interface UEPMessage {
  id: string;
  type: UEPMessageType;
  protocolVersion: UEPProtocolVersion;
  sender: AgentIdentifier;
  recipient: AgentIdentifier;
  correlationId: string;
  timestamp: Date;
  ttl?: number;
  priority?: number;
  payload: any;
  metadata: UEPMessageMetadata;
  signature?: string;
}

export interface UEPMessageMetadata {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  operationName: string;
  tags: Record<string, string>;
  baggage?: Record<string, string>;
  encrypted?: boolean;
  compressed?: boolean;
  contentType: string;
  contentEncoding?: string;
  retryCount?: number;
  maxRetries?: number;
}

export interface UEPRequest extends UEPMessage {
  type: 'REQUEST';
  operation: string;
  parameters: Record<string, any>;
  expectedResponseType?: string;
  timeout?: number;
}

export interface UEPResponse extends UEPMessage {
  type: 'RESPONSE';
  requestId: string;
  status: 'SUCCESS' | 'ERROR' | 'PARTIAL';
  result?: any;
  error?: UEPError;
  executionTime?: number;
}

export interface UEPEvent extends UEPMessage {
  type: 'EVENT';
  eventType: string;
  eventData: any;
  source: string;
  aggregateId?: string;
  version?: number;
}

export interface UEPCommand extends UEPMessage {
  type: 'COMMAND';
  commandType: string;
  target: AgentIdentifier;
  parameters: Record<string, any>;
  executionMode: 'SYNC' | 'ASYNC' | 'FIRE_AND_FORGET';
}

// =====================================================
// Error and Validation Types
// =====================================================

export interface UEPError {
  code: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'PROTOCOL' | 'VALIDATION' | 'EXECUTION' | 'SYSTEM' | 'SECURITY';
  details?: Record<string, any>;
  stackTrace?: string;
  timestamp: Date;
  agentId: string;
  correlationId: string;
}

export interface UEPValidationResult {
  valid: boolean;
  errors: UEPValidationError[];
  warnings: UEPValidationWarning[];
  metadata: {
    validatedAt: Date;
    validatorVersion: string;
    schemaVersion: string;
  };
}

export interface UEPValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
  constraint?: any;
}

export interface UEPValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

// =====================================================
// Coordination Types
// =====================================================

export interface UEPCoordinationEvent {
  id: string;
  type: 'START' | 'JOIN' | 'LEAVE' | 'SYNC' | 'COMPLETE' | 'ABORT';
  coordinatorId: string;
  participantIds: string[];
  pattern: 'SEQUENTIAL' | 'PARALLEL' | 'PIPELINE' | 'SCATTER_GATHER' | 'SAGA';
  phase: string;
  data: any;
  timestamp: Date;
  timeout?: number;
}

export interface UEPCoordinationPattern {
  name: string;
  type: 'SEQUENTIAL' | 'PARALLEL' | 'PIPELINE' | 'SCATTER_GATHER' | 'SAGA';
  description: string;
  participants: AgentIdentifier[];
  phases: UEPCoordinationPhase[];
  compensation?: UEPCompensationStrategy;
  timeout: number;
  retryPolicy?: UEPRetryPolicy;
}

export interface UEPCoordinationPhase {
  id: string;
  name: string;
  order: number;
  participants: string[];
  dependencies: string[];
  tasks: UEPCoordinationTask[];
  timeout: number;
  onFailure: 'ABORT' | 'CONTINUE' | 'RETRY' | 'COMPENSATE';
}

export interface UEPCoordinationTask {
  id: string;
  name: string;
  assignee: string;
  operation: string;
  parameters: Record<string, any>;
  timeout: number;
  retries: number;
  compensation?: string;
}

// =====================================================
// Compensation and Recovery Types
// =====================================================

export interface UEPCompensationStrategy {
  type: 'AUTOMATIC' | 'MANUAL' | 'CONDITIONAL';
  actions: UEPCompensationAction[];
  timeout: number;
  retryPolicy: UEPRetryPolicy;
}

export interface UEPCompensationAction {
  id: string;
  name: string;
  type: 'ROLLBACK' | 'UNDO' | 'CLEANUP' | 'NOTIFY' | 'CUSTOM';
  target: string;
  operation: string;
  parameters: Record<string, any>;
  order: number;
  timeout: number;
}

export interface UEPRetryPolicy {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

// =====================================================
// Monitoring and Observability Types
// =====================================================

export interface UEPComplianceReport {
  agentId: string;
  protocolVersion: string;
  complianceRate: number;
  totalMessages: number;
  violations: UEPViolationMetric[];
  lastUpdated: Date;
}

export interface UEPViolationMetric {
  type: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  firstSeen: Date;
  lastSeen: Date;
  examples?: string[];
}

export interface UEPPerformanceReport {
  agentId: string;
  latency: {
    mean: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  throughput: {
    messagesPerSecond: number;
    bytesPerSecond: number;
  };
  errorRate: {
    rate: number;
    count: number;
    types: Record<string, number>;
  };
  coordination: {
    activeAgents: number;
    coordinationEvents: number;
    successfulCoordinations: number;
    failedCoordinations: number;
  };
  timestamp: Date;
}

export interface UEPTraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tags: Record<string, string>;
  logs: UEPTraceLog[];
  status: 'STARTED' | 'FINISHED' | 'ERROR';
  agentId: string;
}

export interface UEPTraceLog {
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  fields?: Record<string, any>;
}

// =====================================================
// Workflow and Execution Types
// =====================================================

export interface UEPWorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'SEQUENTIAL' | 'PARALLEL' | 'CONDITIONAL' | 'EVENT_DRIVEN';
  steps: UEPWorkflowStep[];
  triggers: UEPWorkflowTrigger[];
  timeout: number;
  retryPolicy?: UEPRetryPolicy;
  compensation?: UEPCompensationStrategy;
}

export interface UEPWorkflowStep {
  id: string;
  name: string;
  type: 'AGENT_CALL' | 'DECISION' | 'LOOP' | 'PARALLEL' | 'WAIT' | 'CUSTOM';
  assignee?: string;
  operation?: string;
  parameters: Record<string, any>;
  dependencies: string[];
  timeout: number;
  retries: number;
  onSuccess?: string;
  onFailure?: string;
  condition?: string;
}

export interface UEPWorkflowTrigger {
  type: 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'API' | 'MESSAGE';
  configuration: Record<string, any>;
}

export interface UEPWorkflowExecution {
  id: string;
  workflowId: string;
  status: UEPExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  input: any;
  output?: any;
  error?: UEPError;
  metadata: Record<string, any>;
}

// =====================================================
// Service Discovery Types
// =====================================================

export interface UEPServiceRegistration {
  serviceId: string;
  serviceName: string;
  serviceVersion: string;
  agent: AgentIdentifier;
  health: UEPHealthCheck;
  metadata: Record<string, any>;
  registeredAt: Date;
  lastHeartbeat: Date;
  tags: string[];
}

export interface UEPHealthCheck {
  endpoint: string;
  interval: number;
  timeout: number;
  healthy: boolean;
  lastCheck: Date;
  failureCount: number;
  details?: Record<string, any>;
}

export interface UEPServiceQuery {
  serviceName?: string;
  capabilities?: string[];
  tags?: string[];
  healthyOnly: boolean;
  maxResults?: number;
}

// =====================================================
// Security Types
// =====================================================

export interface UEPSecurityContext {
  userId?: string;
  roles: string[];
  permissions: string[];
  token?: string;
  expiry?: Date;
  attributes: Record<string, any>;
}

export interface UEPAuthenticationResult {
  authenticated: boolean;
  principal?: string;
  roles: string[];
  token?: string;
  expiry?: Date;
  error?: string;
}

export interface UEPAuthorizationResult {
  authorized: boolean;
  permissions: string[];
  restrictions?: Record<string, any>;
  error?: string;
}

// =====================================================
// Configuration Types
// =====================================================

export interface UEPAgentConfig {
  agent: {
    id: string;
    type: UEPAgentType;
    version: string;
    capabilities: UEPAgentCapability[];
  };
  network: {
    port: number;
    host: string;
    protocol: 'http' | 'https' | 'grpc' | 'websocket';
  };
  discovery: {
    enabled: boolean;
    registryUrl?: string;
    heartbeatInterval: number;
    healthCheckEndpoint: string;
  };
  security: {
    authEnabled: boolean;
    tlsEnabled: boolean;
    certificatePath?: string;
    keyPath?: string;
  };
  monitoring: {
    enabled: boolean;
    metricsPort: number;
    tracingEnabled: boolean;
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  };
  coordination: {
    enabled: boolean;
    maxConcurrentCoordinations: number;
    coordinationTimeout: number;
  };
}

// =====================================================
// Utility Types
// =====================================================

export type UEPCallback<T = any> = (error?: Error, result?: T) => void;

export type UEPPromise<T = any> = Promise<T>;

export interface UEPContext {
  traceId: string;
  spanId: string;
  agentId: string;
  correlationId: string;
  metadata: Record<string, any>;
  security?: UEPSecurityContext;
}

export interface UEPExecutionContext extends UEPContext {
  workflowId?: string;
  executionId?: string;
  stepId?: string;
  retryCount: number;
  startTime: Date;
  timeout: number;
  variables: Record<string, any>;
}

// =====================================================
// Event Types for Event Sourcing
// =====================================================

export interface UEPDomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  data: any;
  metadata: {
    timestamp: Date;
    causationId?: string;
    correlationId: string;
    userId?: string;
  };
}

export interface UEPEventStore {
  appendEvent(
    streamId: string,
    eventType: string,
    eventData: any,
    expectedVersion?: number,
    metadata?: Record<string, any>
  ): Promise<UEPDomainEvent>;

  getEvents(
    streamId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<UEPDomainEvent[]>;

  getAllEvents(
    eventTypes?: string[],
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<UEPDomainEvent[]>;
}

// =====================================================
// Type Guards and Validators
// =====================================================

export function isUEPMessage(obj: any): obj is UEPMessage {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.protocolVersion === 'string' &&
    obj.sender && typeof obj.sender.id === 'string' &&
    obj.recipient && typeof obj.recipient.id === 'string';
}

export function isUEPRequest(msg: UEPMessage): msg is UEPRequest {
  return msg.type === 'REQUEST' && 'operation' in msg;
}

export function isUEPResponse(msg: UEPMessage): msg is UEPResponse {
  return msg.type === 'RESPONSE' && 'requestId' in msg;
}

export function isUEPEvent(msg: UEPMessage): msg is UEPEvent {
  return msg.type === 'EVENT' && 'eventType' in msg;
}

export function isUEPCommand(msg: UEPMessage): msg is UEPCommand {
  return msg.type === 'COMMAND' && 'commandType' in msg;
}

// =====================================================
// Constants
// =====================================================

export const UEP_PROTOCOL_VERSIONS: UEPProtocolVersion[] = ['1.0.0', '1.1.0', '2.0.0'];

export const UEP_MESSAGE_TYPES: UEPMessageType[] = [
  'REQUEST', 'RESPONSE', 'EVENT', 'COMMAND', 'QUERY', 'NOTIFICATION', 'HEARTBEAT', 'COORDINATION'
];

export const UEP_AGENT_TYPES: UEPAgentType[] = [
  'ORCHESTRATOR', 'WORKER', 'COORDINATOR', 'MONITOR', 'GATEWAY', 'PROCESSOR', 'ANALYZER', 'VALIDATOR'
];

export const UEP_DEFAULT_TIMEOUT = 30000; // 30 seconds
export const UEP_DEFAULT_RETRY_ATTEMPTS = 3;
export const UEP_DEFAULT_HEARTBEAT_INTERVAL = 10000; // 10 seconds
export const UEP_DEFAULT_METRICS_PORT = 9090;

export default {
  UEP_PROTOCOL_VERSIONS,
  UEP_MESSAGE_TYPES,
  UEP_AGENT_TYPES,
  UEP_DEFAULT_TIMEOUT,
  UEP_DEFAULT_RETRY_ATTEMPTS,
  UEP_DEFAULT_HEARTBEAT_INTERVAL,
  UEP_DEFAULT_METRICS_PORT
};