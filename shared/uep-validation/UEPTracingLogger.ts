/**
 * UEP Protocol Violation Logging and Distributed Tracing
 * 
 * Provides comprehensive logging, audit trails, and distributed tracing
 * for UEP protocol validation violations and agent interactions.
 * Integrates with OpenTelemetry for enterprise-grade observability.
 */

import { EventEmitter } from 'events';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

export interface UEPTracingConfig {
  serviceName: string;
  enableDistributedTracing: boolean;
  enableAuditLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  traceExporter: 'console' | 'jaeger' | 'zipkin' | 'otlp';
  samplingRate: number;
  batchTimeout: number;
  maxExportBatchSize: number;
  auditLogRetention: number; // days
}

export interface ProtocolViolationLog {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  agentId: string;
  capability: string;
  violationType: string;
  violation: {
    code: string;
    message: string;
    path?: string;
    expectedValue?: any;
    actualValue?: any;
    correctable: boolean;
  };
  context: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    requestId: string;
    sessionId?: string;
  };
  metadata: {
    userAgent?: string;
    clientIp?: string;
    protocolVersion: string;
    schemaVersion: string;
    validationEngine: string;
  };
  impact: {
    affectedOperations: string[];
    downstreamEffects: string[];
    businessImpact: 'none' | 'low' | 'medium' | 'high';
  };
  resolution?: {
    action: string;
    correctedValue?: any;
    timestamp: Date;
    resolvedBy: string;
  };
}

export interface DistributedTraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'ok' | 'error' | 'timeout';
  tags: Record<string, any>;
  logs: TraceLog[];
  baggage?: Record<string, string>;
}

export interface TraceLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, any>;
}

export interface AuditTrail {
  id: string;
  timestamp: Date;
  agentId: string;
  operation: string;
  outcome: 'success' | 'failure' | 'partial';
  details: {
    method: string;
    capability: string;
    inputSize: number;
    outputSize?: number;
    processingTime: number;
    validationResult: 'passed' | 'failed' | 'corrected';
  };
  compliance: {
    uepVersion: string;
    protocolCompliant: boolean;
    violations: number;
    corrections: number;
  };
  traceContext: {
    traceId: string;
    spanId: string;
  };
}

/**
 * UEP Tracing and Logging Manager
 */
export class UEPTracingLogger extends EventEmitter {
  private config: UEPTracingConfig;
  private tracer: any;
  private violationLogs: Map<string, ProtocolViolationLog> = new Map();
  private auditTrails: Map<string, AuditTrail> = new Map();
  private activeSpans: Map<string, DistributedTraceSpan> = new Map();
  private logBuffer: ProtocolViolationLog[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: UEPTracingConfig) {
    super();
    this.config = config;
    this.initializeTracing();
    this.setupLogFlushing();
  }

  /**
   * Log protocol violation with distributed tracing
   */
  async logProtocolViolation(
    violation: {
      agentId: string;
      capability: string;
      violationType: string;
      violation: any;
      impact?: any;
    },
    traceContext?: {
      traceId?: string;
      spanId?: string;
    }
  ): Promise<string> {
    const violationId = this.generateViolationId();
    const currentTrace = traceContext || this.getCurrentTraceContext();

    const violationLog: ProtocolViolationLog = {
      id: violationId,
      timestamp: new Date(),
      severity: this.determineSeverity(violation.violation),
      agentId: violation.agentId,
      capability: violation.capability,
      violationType: violation.violationType,
      violation: violation.violation,
      context: {
        traceId: currentTrace.traceId || this.generateTraceId(),
        spanId: currentTrace.spanId || this.generateSpanId(),
        parentSpanId: currentTrace.parentSpanId,
        requestId: this.generateRequestId(),
        sessionId: this.getSessionId()
      },
      metadata: {
        protocolVersion: '1.0.0',
        schemaVersion: '1.0.0',
        validationEngine: 'UEP-Validation-v1.0.0'
      },
      impact: violation.impact || {
        affectedOperations: [],
        downstreamEffects: [],
        businessImpact: 'low'
      }
    };

    // Store violation log
    this.violationLogs.set(violationId, violationLog);

    // Add to buffer for batch processing
    this.logBuffer.push(violationLog);

    // Create distributed trace span for the violation
    await this.createViolationSpan(violationLog);

    // Emit event for real-time monitoring
    this.emit('protocol-violation', violationLog);

    // Log based on severity
    this.logViolationToConsole(violationLog);

    return violationId;
  }

  /**
   * Start distributed trace span
   */
  async startSpan(
    operationName: string,
    options?: {
      parentContext?: any;
      tags?: Record<string, any>;
      agentId?: string;
      capability?: string;
    }
  ): Promise<string> {
    const spanId = this.generateSpanId();
    const traceId = options?.parentContext?.traceId || this.generateTraceId();

    const span: DistributedTraceSpan = {
      traceId,
      spanId,
      parentSpanId: options?.parentContext?.spanId,
      operationName,
      startTime: new Date(),
      status: 'ok',
      tags: {
        'service.name': this.config.serviceName,
        'uep.agent_id': options?.agentId,
        'uep.capability': options?.capability,
        'uep.protocol_version': '1.0.0',
        ...options?.tags
      },
      logs: [],
      baggage: options?.parentContext?.baggage
    };

    this.activeSpans.set(spanId, span);

    // Create OpenTelemetry span if tracing is enabled
    if (this.config.enableDistributedTracing && this.tracer) {
      const otelSpan = this.tracer.startSpan(operationName, {
        kind: SpanKind.SERVER,
        attributes: span.tags
      });
      
      // Store reference for finishing later
      span.otelSpan = otelSpan;
    }

    return spanId;
  }

  /**
   * Finish distributed trace span
   */
  async finishSpan(
    spanId: string,
    options?: {
      status?: 'ok' | 'error' | 'timeout';
      error?: Error;
      tags?: Record<string, any>;
    }
  ): Promise<void> {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      console.warn(`Attempted to finish non-existent span: ${spanId}`);
      return;
    }

    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = options?.status || 'ok';

    if (options?.tags) {
      span.tags = { ...span.tags, ...options.tags };
    }

    if (options?.error) {
      span.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: options.error.message,
        fields: {
          'error.object': options.error,
          'error.kind': options.error.name,
          'error.stack': options.error.stack
        }
      });
    }

    // Finish OpenTelemetry span
    if (span.otelSpan) {
      if (options?.error) {
        span.otelSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: options.error.message
        });
      }
      span.otelSpan.end();
    }

    // Remove from active spans
    this.activeSpans.delete(spanId);

    // Emit span finished event
    this.emit('span-finished', span);
  }

  /**
   * Add log entry to active span
   */
  addSpanLog(
    spanId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    fields?: Record<string, any>
  ): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: new Date(),
        level,
        message,
        fields
      });

      // Add to OpenTelemetry span as event
      if (span.otelSpan) {
        span.otelSpan.addEvent(message, {
          level,
          ...fields
        });
      }
    }
  }

  /**
   * Create audit trail entry
   */
  async createAuditTrail(
    operation: {
      agentId: string;
      operation: string;
      method: string;
      capability: string;
      outcome: 'success' | 'failure' | 'partial';
      details: any;
      compliance: any;
    },
    traceContext?: { traceId: string; spanId: string }
  ): Promise<string> {
    const auditId = this.generateAuditId();
    const currentTrace = traceContext || this.getCurrentTraceContext();

    const auditTrail: AuditTrail = {
      id: auditId,
      timestamp: new Date(),
      agentId: operation.agentId,
      operation: operation.operation,
      outcome: operation.outcome,
      details: {
        method: operation.method,
        capability: operation.capability,
        inputSize: operation.details.inputSize || 0,
        outputSize: operation.details.outputSize,
        processingTime: operation.details.processingTime || 0,
        validationResult: operation.details.validationResult || 'passed'
      },
      compliance: {
        uepVersion: '1.0.0',
        protocolCompliant: operation.compliance.protocolCompliant !== false,
        violations: operation.compliance.violations || 0,
        corrections: operation.compliance.corrections || 0
      },
      traceContext: {
        traceId: currentTrace.traceId || this.generateTraceId(),
        spanId: currentTrace.spanId || this.generateSpanId()
      }
    };

    this.auditTrails.set(auditId, auditTrail);

    // Emit audit event
    this.emit('audit-trail-created', auditTrail);

    return auditId;
  }

  /**
   * Query violation logs
   */
  queryViolationLogs(filter?: {
    agentId?: string;
    capability?: string;
    severity?: string;
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }): ProtocolViolationLog[] {
    let results = Array.from(this.violationLogs.values());

    if (filter) {
      if (filter.agentId) {
        results = results.filter(log => log.agentId === filter.agentId);
      }
      if (filter.capability) {
        results = results.filter(log => log.capability === filter.capability);
      }
      if (filter.severity) {
        results = results.filter(log => log.severity === filter.severity);
      }
      if (filter.timeRange) {
        results = results.filter(log => 
          log.timestamp >= filter.timeRange!.start && 
          log.timestamp <= filter.timeRange!.end
        );
      }
      if (filter.limit) {
        results = results.slice(0, filter.limit);
      }
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): DistributedTraceSpan[] {
    return Array.from(this.activeSpans.values())
      .filter(span => span.traceId === traceId)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Generate violation metrics report
   */
  generateViolationReport(timeRange?: { start: Date; end: Date }): any {
    const logs = this.queryViolationLogs({ timeRange });
    
    const report = {
      totalViolations: logs.length,
      bySeverity: {
        critical: logs.filter(l => l.severity === 'critical').length,
        high: logs.filter(l => l.severity === 'high').length,
        medium: logs.filter(l => l.severity === 'medium').length,
        low: logs.filter(l => l.severity === 'low').length
      },
      byAgent: {} as Record<string, number>,
      byCapability: {} as Record<string, number>,
      byViolationType: {} as Record<string, number>,
      timeRange: timeRange || { start: new Date(0), end: new Date() },
      trends: this.calculateViolationTrends(logs)
    };

    // Calculate breakdowns
    logs.forEach(log => {
      report.byAgent[log.agentId] = (report.byAgent[log.agentId] || 0) + 1;
      report.byCapability[log.capability] = (report.byCapability[log.capability] || 0) + 1;
      report.byViolationType[log.violationType] = (report.byViolationType[log.violationType] || 0) + 1;
    });

    return report;
  }

  /**
   * Initialize distributed tracing
   */
  private initializeTracing(): void {
    if (!this.config.enableDistributedTracing) return;

    // Initialize OpenTelemetry tracer
    this.tracer = trace.getTracer(this.config.serviceName, '1.0.0');
    
    console.log(`UEP Tracing: Initialized for service ${this.config.serviceName}`);
  }

  /**
   * Setup log flushing
   */
  private setupLogFlushing(): void {
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.config.batchTimeout);
  }

  /**
   * Flush logs to persistent storage
   */
  private flushLogs(): void {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = this.logBuffer.splice(0, this.config.maxExportBatchSize);
    
    // In production, this would send to log aggregation service
    if (this.config.enableAuditLogging) {
      console.log(`UEP Tracing: Flushing ${logsToFlush.length} violation logs`);
    }

    // Emit batch flush event
    this.emit('logs-flushed', logsToFlush);
  }

  /**
   * Create violation span
   */
  private async createViolationSpan(violation: ProtocolViolationLog): Promise<void> {
    if (!this.config.enableDistributedTracing) return;

    const spanId = await this.startSpan('uep.protocol_violation', {
      parentContext: {
        traceId: violation.context.traceId,
        spanId: violation.context.parentSpanId
      },
      tags: {
        'uep.violation.type': violation.violationType,
        'uep.violation.severity': violation.severity,
        'uep.violation.code': violation.violation.code,
        'uep.agent_id': violation.agentId,
        'uep.capability': violation.capability
      },
      agentId: violation.agentId,
      capability: violation.capability
    });

    this.addSpanLog(spanId, 'error', `Protocol violation: ${violation.violation.message}`, {
      violationId: violation.id,
      correctable: violation.violation.correctable,
      expectedValue: violation.violation.expectedValue,
      actualValue: violation.violation.actualValue
    });

    await this.finishSpan(spanId, {
      status: 'error',
      tags: {
        'uep.violation.resolved': !!violation.resolution
      }
    });
  }

  /**
   * Determine violation severity
   */
  private determineSeverity(violation: any): 'low' | 'medium' | 'high' | 'critical' {
    if (violation.code.includes('SECURITY') || violation.code.includes('AUTH')) {
      return 'critical';
    }
    if (violation.code.includes('REQUIRED') || violation.code.includes('TYPE_MISMATCH')) {
      return 'high';
    }
    if (violation.code.includes('FORMAT') || violation.code.includes('VALIDATION')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Log violation to console
   */
  private logViolationToConsole(violation: ProtocolViolationLog): void {
    const logData = {
      violationId: violation.id,
      timestamp: violation.timestamp.toISOString(),
      severity: violation.severity,
      agent: violation.agentId,
      capability: violation.capability,
      type: violation.violationType,
      message: violation.violation.message,
      traceId: violation.context.traceId
    };

    switch (violation.severity) {
      case 'critical':
        console.error('🚨 UEP CRITICAL VIOLATION:', logData);
        break;
      case 'high':
        console.error('❌ UEP HIGH VIOLATION:', logData);
        break;
      case 'medium':
        console.warn('⚠️ UEP MEDIUM VIOLATION:', logData);
        break;
      case 'low':
        console.info('ℹ️ UEP LOW VIOLATION:', logData);
        break;
    }
  }

  /**
   * Calculate violation trends
   */
  private calculateViolationTrends(logs: ProtocolViolationLog[]): any {
    // Simple trend calculation - in production would be more sophisticated
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      lastWeek: logs.filter(l => l.timestamp >= lastWeek).length,
      lastMonth: logs.filter(l => l.timestamp >= lastMonth).length,
      trend: 'stable' // Would calculate actual trend
    };
  }

  /**
   * Get current trace context
   */
  private getCurrentTraceContext(): { traceId?: string; spanId?: string; parentSpanId?: string } {
    // In production, this would extract from OpenTelemetry context
    return {};
  }

  /**
   * Get session ID
   */
  private getSessionId(): string | undefined {
    // In production, this would extract from request context
    return undefined;
  }

  // ID generation utilities
  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown logger
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Flush remaining logs
    this.flushLogs();

    // Finish all active spans
    for (const [spanId] of this.activeSpans) {
      await this.finishSpan(spanId, { status: 'ok' });
    }

    this.removeAllListeners();
  }
}