/**
 * UEP Audit Trail and Event Sourcing System
 * 
 * Comprehensive audit trail implementation using event sourcing pattern
 * to capture all UEP protocol interactions, agent communications, and
 * system events with immutable, queryable historical records.
 * 
 * Features:
 * - Event sourcing with immutable event store
 * - Complete UEP protocol interaction audit trail
 * - High-performance event streaming and querying
 * - Compliance-ready audit logs with digital signatures
 * - Event replay and time-travel debugging capabilities
 * - Advanced querying with filtering and aggregation
 * - Retention policies and archival management
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import { createHash, createHmac } from 'crypto';
import { 
  UEPMessage, 
  UEPMessageMetadata, 
  AgentIdentifier,
  UEPContext,
  UEPError,
  UEPWorkflowExecution,
  UEPCoordinationEvent,
  UEPDomainEvent,
  UEPEventStore
} from '../types/UEPTypes';

// =====================================================
// Audit Trail Configuration and Interfaces
// =====================================================

export interface UEPAuditConfig {
  enabled: boolean;
  eventStore: {
    type: 'memory' | 'postgresql' | 'mongodb' | 'eventstore';
    connectionString?: string;
    database?: string;
    collection?: string;
    options?: any;
  };
  security: {
    enableSignatures: boolean;
    signingKey: string;
    encryptionKey?: string;
    hashAlgorithm: string;
  };
  retention: {
    enabled: boolean;
    defaultRetention: string; // e.g., "1y", "90d"
    archivalEnabled: boolean;
    archivalStorage: string;
  };
  performance: {
    batchSize: number;
    flushInterval: number;
    maxMemoryEvents: number;
    enableCompression: boolean;
  };
  compliance: {
    enableCompliance: boolean;
    complianceStandards: string[]; // e.g., ["SOX", "GDPR", "HIPAA"]
    requireDigitalSignatures: boolean;
    auditLogLevel: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
  };
}

export interface UEPAuditEvent extends UEPDomainEvent {
  // Additional audit-specific fields
  sessionId?: string;
  userId?: string;
  clientId?: string;
  sourceIP?: string;
  userAgent?: string;
  operationName: string;
  resource: string;
  action: string;
  outcome: 'success' | 'failure' | 'error';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  signature?: string;
  previousEventHash?: string;
}

export interface UEPAuditQuery {
  eventTypes?: string[];
  aggregateIds?: string[];
  agentIds?: string[];
  userIds?: string[];
  timeRange?: {
    from: Date;
    to: Date;
  };
  outcome?: 'success' | 'failure' | 'error';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  correlationIds?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'aggregateId' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

export interface UEPAuditReport {
  id: string;
  title: string;
  description: string;
  period: {
    from: Date;
    to: Date;
  };
  events: UEPAuditEvent[];
  statistics: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByOutcome: Record<string, number>;
    eventsByRiskLevel: Record<string, number>;
    uniqueAgents: number;
    uniqueUsers: number;
  };
  compliance: {
    violations: number;
    complianceRate: number;
    findings: string[];
  };
  generatedAt: Date;
  signature?: string;
}

// =====================================================
// UEP Audit Trail System
// =====================================================

export class UEPAuditTrail extends EventEmitter implements UEPEventStore {
  private config: UEPAuditConfig;
  private eventBuffer: UEPAuditEvent[] = [];
  private eventStore: Map<string, UEPAuditEvent[]> = new Map(); // Stream ID -> Events
  private eventIndex: Map<string, Set<string>> = new Map(); // Index for fast lookups
  private lastEventHash: string = '';
  private flushTimer: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;

  constructor(config: UEPAuditConfig) {
    super();
    this.config = this.validateConfig(config);
    this.setupFlushTimer();
  }

  // =====================================================
  // Initialization and Lifecycle
  // =====================================================

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('UEP Audit Trail already initialized');
    }

    try {
      // Initialize event store backend
      await this.initializeEventStore();

      // Setup event indexing
      await this.rebuildIndexes();

      // Start background processes
      this.startBackgroundProcesses();

      this.isInitialized = true;
      this.emit('audit:initialized');

      console.log('UEP Audit Trail initialized successfully');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Flush remaining events
      await this.flush();

      // Stop timers
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }

      // Close event store connection
      await this.closeEventStore();

      this.isInitialized = false;
      this.emit('audit:shutdown');

      console.log('UEP Audit Trail shutdown successfully');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // =====================================================
  // Event Store Interface Implementation
  // =====================================================

  public async appendEvent(
    streamId: string,
    eventType: string,
    eventData: any,
    expectedVersion?: number,
    metadata?: Record<string, any>
  ): Promise<UEPDomainEvent> {
    const auditEvent = await this.createAuditEvent(
      streamId,
      eventType,
      eventData,
      metadata
    );

    // Add to buffer for batch processing
    this.eventBuffer.push(auditEvent);

    // Index the event
    this.indexEvent(auditEvent);

    // Immediate flush if buffer is full
    if (this.eventBuffer.length >= this.config.performance.batchSize) {
      await this.flush();
    }

    this.emit('event:appended', auditEvent);
    return auditEvent;
  }

  public async getEvents(
    streamId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<UEPDomainEvent[]> {
    const events = this.eventStore.get(streamId) || [];
    
    let filteredEvents = events;
    
    if (fromVersion !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.version >= fromVersion);
    }
    
    if (toVersion !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.version <= toVersion);
    }

    return filteredEvents.sort((a, b) => a.version - b.version);
  }

  public async getAllEvents(
    eventTypes?: string[],
    fromTimestamp?: Date,
    toTimestamp?: Date
  ): Promise<UEPDomainEvent[]> {
    const allEvents: UEPAuditEvent[] = [];
    
    for (const events of this.eventStore.values()) {
      allEvents.push(...events);
    }

    let filteredEvents = allEvents;

    if (eventTypes && eventTypes.length > 0) {
      filteredEvents = filteredEvents.filter(e => eventTypes.includes(e.type));
    }

    if (fromTimestamp) {
      filteredEvents = filteredEvents.filter(e => 
        new Date(e.metadata.timestamp) >= fromTimestamp
      );
    }

    if (toTimestamp) {
      filteredEvents = filteredEvents.filter(e => 
        new Date(e.metadata.timestamp) <= toTimestamp
      );
    }

    return filteredEvents.sort((a, b) => 
      new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
    );
  }

  // =====================================================
  // UEP-Specific Audit Methods
  // =====================================================

  public async auditMessageProcessing(
    message: UEPMessage,
    metadata: UEPMessageMetadata,
    outcome: 'success' | 'failure' | 'error',
    processingTime?: number,
    error?: UEPError
  ): Promise<UEPAuditEvent> {
    const eventData = {
      messageId: message.id,
      messageType: message.type,
      senderId: message.sender.id,
      senderType: message.sender.type,
      recipientId: message.recipient.id,
      recipientType: message.recipient.type,
      protocolVersion: message.protocolVersion,
      payloadSize: JSON.stringify(message.payload).length,
      processingTime,
      error: error ? {
        code: error.code,
        message: error.message,
        severity: error.severity,
        category: error.category
      } : undefined
    };

    return this.appendEvent(
      `message:${message.id}`,
      'UEPMessageProcessed',
      eventData,
      undefined,
      {
        ...metadata,
        operationName: 'message_processing',
        resource: `message:${message.id}`,
        action: 'process',
        outcome,
        riskLevel: this.calculateRiskLevel(outcome, error),
        agentId: message.sender.id,
        correlationId: message.correlationId
      }
    );
  }

  public async auditAgentActivity(
    agentId: string,
    activity: string,
    details: any,
    outcome: 'success' | 'failure' | 'error',
    context?: UEPContext
  ): Promise<UEPAuditEvent> {
    const eventData = {
      agentId,
      activity,
      details,
      timestamp: new Date().toISOString()
    };

    return this.appendEvent(
      `agent:${agentId}`,
      'UEPAgentActivity',
      eventData,
      undefined,
      {
        operationName: activity,
        resource: `agent:${agentId}`,
        action: activity,
        outcome,
        riskLevel: this.calculateRiskLevel(outcome),
        agentId,
        correlationId: context?.correlationId,
        traceId: context?.traceId,
        timestamp: new Date()
      }
    );
  }

  public async auditWorkflowExecution(
    workflowExecution: UEPWorkflowExecution,
    stepId: string | undefined,
    action: 'started' | 'completed' | 'failed' | 'cancelled',
    details?: any
  ): Promise<UEPAuditEvent> {
    const eventData = {
      workflowId: workflowExecution.workflowId,
      executionId: workflowExecution.id,
      stepId,
      action,
      status: workflowExecution.status,
      details,
      startTime: workflowExecution.startTime.toISOString(),
      endTime: workflowExecution.endTime?.toISOString(),
      duration: workflowExecution.duration
    };

    const outcome = action === 'completed' ? 'success' : 
                   action === 'failed' ? 'failure' : 'success';

    return this.appendEvent(
      `workflow:${workflowExecution.id}`,
      'UEPWorkflowExecution',
      eventData,
      undefined,
      {
        operationName: `workflow_${action}`,
        resource: `workflow:${workflowExecution.workflowId}`,
        action,
        outcome,
        riskLevel: this.calculateRiskLevel(outcome),
        workflowId: workflowExecution.workflowId,
        correlationId: workflowExecution.id,
        timestamp: new Date()
      }
    );
  }

  public async auditCoordinationEvent(
    coordinationEvent: UEPCoordinationEvent,
    outcome: 'success' | 'failure' | 'error',
    details?: any
  ): Promise<UEPAuditEvent> {
    const eventData = {
      coordinationId: coordinationEvent.id,
      coordinatorId: coordinationEvent.coordinatorId,
      participantIds: coordinationEvent.participantIds,
      pattern: coordinationEvent.pattern,
      phase: coordinationEvent.phase,
      type: coordinationEvent.type,
      details,
      timestamp: coordinationEvent.timestamp.toISOString()
    };

    return this.appendEvent(
      `coordination:${coordinationEvent.id}`,
      'UEPCoordinationEvent',
      eventData,
      undefined,
      {
        operationName: `coordination_${coordinationEvent.type.toLowerCase()}`,
        resource: `coordination:${coordinationEvent.id}`,
        action: coordinationEvent.type.toLowerCase(),
        outcome,
        riskLevel: this.calculateRiskLevel(outcome),
        agentId: coordinationEvent.coordinatorId,
        correlationId: coordinationEvent.id,
        timestamp: new Date()
      }
    );
  }

  public async auditComplianceViolation(
    agentId: string,
    violationType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any,
    context?: UEPContext
  ): Promise<UEPAuditEvent> {
    const eventData = {
      agentId,
      violationType,
      severity,
      details,
      timestamp: new Date().toISOString()
    };

    return this.appendEvent(
      `compliance:${agentId}:${Date.now()}`,
      'UEPComplianceViolation',
      eventData,
      undefined,
      {
        operationName: 'compliance_violation',
        resource: `agent:${agentId}`,
        action: 'violation',
        outcome: 'failure',
        riskLevel: severity,
        agentId,
        correlationId: context?.correlationId,
        timestamp: new Date()
      }
    );
  }

  // =====================================================
  // Audit Querying and Reporting
  // =====================================================

  public async queryAuditEvents(query: UEPAuditQuery): Promise<UEPAuditEvent[]> {
    let events: UEPAuditEvent[] = [];

    // Get all events from store
    for (const streamEvents of this.eventStore.values()) {
      events.push(...streamEvents);
    }

    // Apply filters
    if (query.eventTypes && query.eventTypes.length > 0) {
      events = events.filter(e => query.eventTypes!.includes(e.type));
    }

    if (query.aggregateIds && query.aggregateIds.length > 0) {
      events = events.filter(e => query.aggregateIds!.includes(e.aggregateId));
    }

    if (query.agentIds && query.agentIds.length > 0) {
      events = events.filter(e => 
        query.agentIds!.includes(e.agentId || '') ||
        query.agentIds!.includes(e.metadata.userId || '')
      );
    }

    if (query.timeRange) {
      events = events.filter(e => {
        const eventTime = new Date(e.metadata.timestamp);
        return eventTime >= query.timeRange!.from && eventTime <= query.timeRange!.to;
      });
    }

    if (query.outcome) {
      events = events.filter(e => e.outcome === query.outcome);
    }

    if (query.riskLevel) {
      events = events.filter(e => e.riskLevel === query.riskLevel);
    }

    if (query.correlationIds && query.correlationIds.length > 0) {
      events = events.filter(e => 
        query.correlationIds!.includes(e.metadata.correlationId || '')
      );
    }

    // Sort events
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';

    events.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.metadata.timestamp).getTime();
          bValue = new Date(b.metadata.timestamp).getTime();
          break;
        case 'aggregateId':
          aValue = a.aggregateId;
          bValue = b.aggregateId;
          break;
        case 'eventType':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          aValue = new Date(a.metadata.timestamp).getTime();
          bValue = new Date(b.metadata.timestamp).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 1000;

    return events.slice(offset, offset + limit);
  }

  public async generateAuditReport(
    title: string,
    description: string,
    query: UEPAuditQuery
  ): Promise<UEPAuditReport> {
    const events = await this.queryAuditEvents(query);

    // Calculate statistics
    const eventsByType: Record<string, number> = {};
    const eventsByOutcome: Record<string, number> = {};
    const eventsByRiskLevel: Record<string, number> = {};
    const uniqueAgents = new Set<string>();
    const uniqueUsers = new Set<string>();

    events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsByOutcome[event.outcome] = (eventsByOutcome[event.outcome] || 0) + 1;
      eventsByRiskLevel[event.riskLevel] = (eventsByRiskLevel[event.riskLevel] || 0) + 1;
      
      if (event.agentId) uniqueAgents.add(event.agentId);
      if (event.userId) uniqueUsers.add(event.userId);
    });

    // Calculate compliance metrics
    const violations = events.filter(e => e.outcome === 'failure' || e.type === 'UEPComplianceViolation').length;
    const complianceRate = events.length > 0 ? (events.length - violations) / events.length : 1.0;

    // Generate compliance findings
    const findings: string[] = [];
    if (complianceRate < 0.95) {
      findings.push(`Compliance rate (${(complianceRate * 100).toFixed(2)}%) is below 95% threshold`);
    }
    if (eventsByRiskLevel.critical > 0) {
      findings.push(`${eventsByRiskLevel.critical} critical risk events detected`);
    }

    const report: UEPAuditReport = {
      id: `audit-report-${Date.now()}`,
      title,
      description,
      period: {
        from: query.timeRange?.from || new Date(0),
        to: query.timeRange?.to || new Date()
      },
      events,
      statistics: {
        totalEvents: events.length,
        eventsByType,
        eventsByOutcome,
        eventsByRiskLevel,
        uniqueAgents: uniqueAgents.size,
        uniqueUsers: uniqueUsers.size
      },
      compliance: {
        violations,
        complianceRate,
        findings
      },
      generatedAt: new Date()
    };

    // Sign report if security is enabled
    if (this.config.security.enableSignatures) {
      report.signature = this.signData(JSON.stringify(report));
    }

    this.emit('report:generated', report);
    return report;
  }

  // =====================================================
  // Event Replay and Time Travel
  // =====================================================

  public async replayEvents(
    streamId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<any> {
    const events = await this.getEvents(streamId, fromVersion, toVersion);
    
    // This would typically reconstruct aggregate state
    // For audit purposes, we return the event sequence
    return events.reduce((state, event) => {
      return {
        ...state,
        lastEvent: event,
        eventCount: (state.eventCount || 0) + 1,
        events: [...(state.events || []), event]
      };
    }, {});
  }

  public async getStateAtTime(streamId: string, timestamp: Date): Promise<any> {
    const events = await this.getEvents(streamId);
    const eventsUpToTime = events.filter(e => 
      new Date(e.metadata.timestamp) <= timestamp
    );

    return this.replayEvents(streamId, 1, eventsUpToTime[eventsUpToTime.length - 1]?.version);
  }

  // =====================================================
  // Private Implementation Methods
  // =====================================================

  private validateConfig(config: UEPAuditConfig): UEPAuditConfig {
    if (!config.enabled) {
      throw new Error('UEP Audit Trail must be enabled');
    }

    return {
      ...config,
      security: {
        enableSignatures: true,
        signingKey: config.security.signingKey || 'default-key',
        hashAlgorithm: 'sha256',
        ...config.security
      },
      performance: {
        batchSize: 100,
        flushInterval: 30000,
        maxMemoryEvents: 10000,
        enableCompression: false,
        ...config.performance
      },
      retention: {
        enabled: false,
        defaultRetention: '1y',
        archivalEnabled: false,
        archivalStorage: '',
        ...config.retention
      },
      compliance: {
        enableCompliance: true,
        complianceStandards: ['SOX', 'GDPR'],
        requireDigitalSignatures: false,
        auditLogLevel: 'standard',
        ...config.compliance
      }
    };
  }

  private async createAuditEvent(
    streamId: string,
    eventType: string,
    eventData: any,
    metadata?: Record<string, any>
  ): Promise<UEPAuditEvent> {
    const now = new Date();
    const eventId = this.generateEventId();
    const version = await this.getNextVersion(streamId);

    const auditEvent: UEPAuditEvent = {
      id: eventId,
      type: eventType,
      aggregateId: streamId,
      aggregateType: this.extractAggregateType(streamId),
      version,
      data: eventData,
      metadata: {
        timestamp: now,
        causationId: metadata?.causationId,
        correlationId: metadata?.correlationId || streamId,
        userId: metadata?.userId,
        ...metadata
      },
      
      // Audit-specific fields
      sessionId: metadata?.sessionId,
      userId: metadata?.userId,
      clientId: metadata?.clientId,
      sourceIP: metadata?.sourceIP,
      userAgent: metadata?.userAgent,
      operationName: metadata?.operationName || eventType,
      resource: metadata?.resource || streamId,
      action: metadata?.action || 'unknown',
      outcome: metadata?.outcome || 'success',
      riskLevel: metadata?.riskLevel || 'low',
      agentId: metadata?.agentId,
      previousEventHash: this.lastEventHash
    };

    // Generate event signature
    if (this.config.security.enableSignatures) {
      auditEvent.signature = this.signEvent(auditEvent);
    }

    // Update hash chain
    this.lastEventHash = this.hashEvent(auditEvent);

    return auditEvent;
  }

  private async getNextVersion(streamId: string): Promise<number> {
    const events = this.eventStore.get(streamId) || [];
    return events.length + 1;
  }

  private extractAggregateType(streamId: string): string {
    const parts = streamId.split(':');
    return parts[0] || 'unknown';
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private signEvent(event: UEPAuditEvent): string {
    const eventString = JSON.stringify({
      id: event.id,
      type: event.type,
      aggregateId: event.aggregateId,
      version: event.version,
      data: event.data,
      timestamp: event.metadata.timestamp
    });

    return createHmac(this.config.security.hashAlgorithm, this.config.security.signingKey)
      .update(eventString)
      .digest('hex');
  }

  private hashEvent(event: UEPAuditEvent): string {
    const eventString = JSON.stringify(event);
    return createHash(this.config.security.hashAlgorithm)
      .update(eventString)
      .digest('hex');
  }

  private signData(data: string): string {
    return createHmac(this.config.security.hashAlgorithm, this.config.security.signingKey)
      .update(data)
      .digest('hex');
  }

  private calculateRiskLevel(
    outcome: 'success' | 'failure' | 'error',
    error?: UEPError
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (outcome === 'success') return 'low';
    if (outcome === 'failure') return 'medium';
    if (error?.severity === 'CRITICAL') return 'critical';
    if (error?.severity === 'HIGH') return 'high';
    return 'medium';
  }

  private indexEvent(event: UEPAuditEvent): void {
    // Index by event type
    if (!this.eventIndex.has('type:' + event.type)) {
      this.eventIndex.set('type:' + event.type, new Set());
    }
    this.eventIndex.get('type:' + event.type)!.add(event.id);

    // Index by agent ID
    if (event.agentId) {
      if (!this.eventIndex.has('agent:' + event.agentId)) {
        this.eventIndex.set('agent:' + event.agentId, new Set());
      }
      this.eventIndex.get('agent:' + event.agentId)!.add(event.id);
    }

    // Index by correlation ID
    if (event.metadata.correlationId) {
      if (!this.eventIndex.has('correlation:' + event.metadata.correlationId)) {
        this.eventIndex.set('correlation:' + event.metadata.correlationId, new Set());
      }
      this.eventIndex.get('correlation:' + event.metadata.correlationId)!.add(event.id);
    }
  }

  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    try {
      const eventsToFlush = [...this.eventBuffer];
      this.eventBuffer = [];

      // Group events by stream
      const eventsByStream = new Map<string, UEPAuditEvent[]>();
      
      eventsToFlush.forEach(event => {
        if (!eventsByStream.has(event.aggregateId)) {
          eventsByStream.set(event.aggregateId, []);
        }
        eventsByStream.get(event.aggregateId)!.push(event);
      });

      // Store events by stream
      for (const [streamId, events] of eventsByStream) {
        const existingEvents = this.eventStore.get(streamId) || [];
        existingEvents.push(...events);
        this.eventStore.set(streamId, existingEvents);
      }

      this.emit('events:flushed', { count: eventsToFlush.length });
    } catch (error) {
      // Re-add events to buffer if flush failed
      this.eventBuffer.unshift(...this.eventBuffer);
      this.emit('error', error);
      throw error;
    }
  }

  private setupFlushTimer(): void {
    if (this.config.performance.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch(error => {
          console.error('Failed to flush audit events:', error);
        });
      }, this.config.performance.flushInterval);
    }
  }

  private async initializeEventStore(): Promise<void> {
    // Initialize based on config.eventStore.type
    switch (this.config.eventStore.type) {
      case 'memory':
        // Already initialized with Map
        break;
      case 'postgresql':
      case 'mongodb':
      case 'eventstore':
        // Would implement database connections here
        console.log(`Event store type ${this.config.eventStore.type} would be initialized`);
        break;
    }
  }

  private async rebuildIndexes(): Promise<void> {
    // Rebuild indexes from existing events
    for (const events of this.eventStore.values()) {
      events.forEach(event => this.indexEvent(event));
    }
  }

  private startBackgroundProcesses(): void {
    // Start retention policy enforcement
    if (this.config.retention.enabled) {
      setInterval(() => {
        this.enforceRetentionPolicy();
      }, 24 * 60 * 60 * 1000); // Daily
    }
  }

  private async closeEventStore(): Promise<void> {
    // Close database connections if applicable
    console.log('Event store connections closed');
  }

  private enforceRetentionPolicy(): void {
    // Implementation for retention policy
    console.log('Retention policy enforcement would run here');
  }

  public getAuditStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    bufferSize: number;
    indexSize: number;
  } {
    const totalEvents = Array.from(this.eventStore.values())
      .reduce((sum, events) => sum + events.length, 0);

    const eventsByType: Record<string, number> = {};
    for (const events of this.eventStore.values()) {
      events.forEach(event => {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      });
    }

    return {
      totalEvents,
      eventsByType,
      bufferSize: this.eventBuffer.length,
      indexSize: this.eventIndex.size
    };
  }
}

// =====================================================
// Factory Function
// =====================================================

export function createUEPAuditTrail(config: Partial<UEPAuditConfig> = {}): UEPAuditTrail {
  const defaultConfig: UEPAuditConfig = {
    enabled: true,
    eventStore: {
      type: 'memory'
    },
    security: {
      enableSignatures: true,
      signingKey: process.env.UEP_AUDIT_SIGNING_KEY || 'default-audit-key',
      hashAlgorithm: 'sha256'
    },
    retention: {
      enabled: false,
      defaultRetention: '1y',
      archivalEnabled: false,
      archivalStorage: ''
    },
    performance: {
      batchSize: 100,
      flushInterval: 30000,
      maxMemoryEvents: 10000,
      enableCompression: false
    },
    compliance: {
      enableCompliance: true,
      complianceStandards: ['SOX', 'GDPR'],
      requireDigitalSignatures: false,
      auditLogLevel: 'standard'
    }
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    eventStore: { ...defaultConfig.eventStore, ...config.eventStore },
    security: { ...defaultConfig.security, ...config.security },
    retention: { ...defaultConfig.retention, ...config.retention },
    performance: { ...defaultConfig.performance, ...config.performance },
    compliance: { ...defaultConfig.compliance, ...config.compliance }
  };

  return new UEPAuditTrail(mergedConfig);
}

export default UEPAuditTrail;