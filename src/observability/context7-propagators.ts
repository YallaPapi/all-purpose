/**
 * Context7 Custom Propagators for UEP Protocol Integration
 * 
 * Implements Context7-compliant trace context propagation with custom propagators
 * for Unified Execution Protocol (UEP) and enhanced multi-protocol support.
 * 
 * Research-driven implementation based on TaskMaster methodology:
 * - Custom propagator patterns for non-HTTP protocols
 * - Context boundary management for UEP messages
 * - High-fidelity context preservation across async boundaries
 */

import * as api from '@opentelemetry/api';
import { 
  TextMapPropagator, 
  TraceFlags, 
  SpanContext, 
  TraceState 
} from '@opentelemetry/api';

// Context7 UEP Message Interface
export interface UEPMessage {
  id: string;
  type: string;
  version: string;
  source: string;
  destination: string;
  timestamp: number;
  payload: any;
  metadata?: {
    traceContext?: Record<string, string>;
    baggage?: Record<string, string>;
    [key: string]: any;
  };
}

// Context7 Carrier Interface for Protocol Abstraction
export interface Context7Carrier {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  keys(): string[];
}

/**
 * Context7 UEP Protocol Propagator
 * 
 * Implements custom propagation for UEP messages with Context7 methodology:
 * - Explicit boundary management at UEP protocol level
 * - Context fidelity preservation across message boundaries
 * - UEP-specific baggage enrichment
 */
export class Context7UEPPropagator implements TextMapPropagator {
  private readonly _fields = [
    'traceparent',
    'tracestate', 
    'baggage',
    'uep-agent-id',
    'uep-task-id',
    'uep-workflow-id',
    'uep-message-id',
    'context7-boundary'
  ];

  fields(): string[] {
    return this._fields;
  }

  /**
   * Inject trace context into UEP message carrier
   * Context7 Principle: Explicit boundary management
   */
  inject(context: api.Context, carrier: any, setter: api.TextMapSetter): void {
    const spanContext = api.trace.getSpanContext(context);
    const baggage = api.propagation.getBaggage(context);

    // Inject standard W3C trace context
    if (spanContext && api.trace.isSpanContextValid(spanContext)) {
      const traceparent = this._buildTraceParent(spanContext);
      setter.set(carrier, 'traceparent', traceparent);

      if (spanContext.traceState) {
        setter.set(carrier, 'tracestate', spanContext.traceState.serialize());
      }

      // Context7 boundary marker
      setter.set(carrier, 'context7-boundary', 'uep-protocol');
    }

    // Inject baggage with UEP-specific enrichment
    if (baggage) {
      const baggageHeader = this._serializeBaggage(baggage);
      if (baggageHeader) {
        setter.set(carrier, 'baggage', baggageHeader);
      }

      // Extract UEP-specific baggage for direct injection
      const uepAgentId = baggage.getEntry('uep.agent.id');
      const uepTaskId = baggage.getEntry('uep.task.id');
      const uepWorkflowId = baggage.getEntry('uep.workflow.id');
      const uepMessageId = baggage.getEntry('uep.message.id');

      if (uepAgentId) setter.set(carrier, 'uep-agent-id', uepAgentId.value);
      if (uepTaskId) setter.set(carrier, 'uep-task-id', uepTaskId.value);
      if (uepWorkflowId) setter.set(carrier, 'uep-workflow-id', uepWorkflowId.value);
      if (uepMessageId) setter.set(carrier, 'uep-message-id', uepMessageId.value);
    }
  }

  /**
   * Extract trace context from UEP message carrier
   * Context7 Principle: Context fidelity preservation
   */
  extract(context: api.Context, carrier: any, getter: api.TextMapGetter): api.Context {
    let extractedContext = context;

    // Extract W3C trace context
    const traceparent = getter.get(carrier, 'traceparent');
    if (traceparent && Array.isArray(traceparent)) {
      // Handle array case from OpenTelemetry
      const traceparentValue = traceparent[0];
      if (traceparentValue) {
        const spanContext = this._parseTraceParent(traceparentValue);
        if (spanContext) {
          // Add tracestate if present
          const tracestate = getter.get(carrier, 'tracestate');
          if (tracestate && Array.isArray(tracestate) && tracestate[0]) {
            spanContext.traceState = TraceState.fromString(tracestate[0]);
          }

          extractedContext = api.trace.setSpanContext(extractedContext, spanContext);
        }
      }
    } else if (typeof traceparent === 'string') {
      const spanContext = this._parseTraceParent(traceparent);
      if (spanContext) {
        const tracestate = getter.get(carrier, 'tracestate');
        if (typeof tracestate === 'string') {
          spanContext.traceState = TraceState.fromString(tracestate);
        }
        extractedContext = api.trace.setSpanContext(extractedContext, spanContext);
      }
    }

    // Extract and reconstruct baggage with UEP enrichment
    let baggage = api.propagation.getBaggage(extractedContext) || api.propagation.createBaggage();

    // Extract standard baggage
    const baggageHeader = getter.get(carrier, 'baggage');
    if (baggageHeader) {
      const baggageValue = Array.isArray(baggageHeader) ? baggageHeader[0] : baggageHeader;
      if (baggageValue) {
        baggage = this._parseBaggage(baggageValue, baggage);
      }
    }

    // Extract UEP-specific context
    const uepAgentId = getter.get(carrier, 'uep-agent-id');
    const uepTaskId = getter.get(carrier, 'uep-task-id');
    const uepWorkflowId = getter.get(carrier, 'uep-workflow-id');
    const uepMessageId = getter.get(carrier, 'uep-message-id');

    if (uepAgentId) {
      const value = Array.isArray(uepAgentId) ? uepAgentId[0] : uepAgentId;
      baggage = baggage.setEntry('uep.agent.id', { value });
    }
    if (uepTaskId) {
      const value = Array.isArray(uepTaskId) ? uepTaskId[0] : uepTaskId;
      baggage = baggage.setEntry('uep.task.id', { value });
    }
    if (uepWorkflowId) {
      const value = Array.isArray(uepWorkflowId) ? uepWorkflowId[0] : uepWorkflowId;
      baggage = baggage.setEntry('uep.workflow.id', { value });
    }
    if (uepMessageId) {
      const value = Array.isArray(uepMessageId) ? uepMessageId[0] : uepMessageId;
      baggage = baggage.setEntry('uep.message.id', { value });
    }

    // Add Context7 boundary marker
    const boundary = getter.get(carrier, 'context7-boundary');
    if (boundary) {
      const value = Array.isArray(boundary) ? boundary[0] : boundary;
      baggage = baggage.setEntry('context7.boundary', { value });
    }

    extractedContext = api.propagation.setBaggage(extractedContext, baggage);
    return extractedContext;
  }

  /**
   * Build W3C traceparent header
   */
  private _buildTraceParent(spanContext: SpanContext): string {
    const version = '00';
    const traceId = spanContext.traceId.padStart(32, '0');
    const spanId = spanContext.spanId.padStart(16, '0');
    const flags = spanContext.traceFlags.toString(16).padStart(2, '0');
    return `${version}-${traceId}-${spanId}-${flags}`;
  }

  /**
   * Parse W3C traceparent header
   */
  private _parseTraceParent(traceparent: string): SpanContext | null {
    const parts = traceparent.split('-');
    if (parts.length !== 4) return null;

    const [version, traceId, spanId, flags] = parts;
    
    // Validate format
    if (version !== '00') return null;
    if (!/^[0-9a-f]{32}$/.test(traceId)) return null;
    if (!/^[0-9a-f]{16}$/.test(spanId)) return null;
    if (!/^[0-9a-f]{2}$/.test(flags)) return null;

    // Validate non-zero values
    if (traceId === '0'.repeat(32)) return null;
    if (spanId === '0'.repeat(16)) return null;

    return {
      traceId,
      spanId,
      traceFlags: parseInt(flags, 16),
      isRemote: true
    };
  }

  /**
   * Serialize baggage to header format
   */
  private _serializeBaggage(baggage: api.Baggage): string {
    const entries: string[] = [];
    baggage.getAllEntries().forEach(([key, entry]) => {
      let serialized = `${encodeURIComponent(key)}=${encodeURIComponent(entry.value)}`;
      if (entry.metadata) {
        const metadata = Object.entries(entry.metadata)
          .map(([k, v]) => `${k}=${v}`)
          .join(';');
        serialized += `;${metadata}`;
      }
      entries.push(serialized);
    });
    return entries.join(',');
  }

  /**
   * Parse baggage from header format
   */
  private _parseBaggage(baggageHeader: string, existingBaggage: api.Baggage): api.Baggage {
    let baggage = existingBaggage;
    
    const entries = baggageHeader.split(',');
    for (const entry of entries) {
      const parts = entry.trim().split('=', 2);
      if (parts.length === 2) {
        const key = decodeURIComponent(parts[0].trim());
        const value = decodeURIComponent(parts[1].trim());
        baggage = baggage.setEntry(key, { value });
      }
    }
    
    return baggage;
  }
}

/**
 * Context7 Composite Propagator
 * 
 * Combines multiple propagators for comprehensive protocol support:
 * - W3C Trace Context for HTTP/gRPC
 * - UEP Propagator for UEP protocol
 * - Baggage propagation for all protocols
 */
export class Context7CompositePropagator implements TextMapPropagator {
  private readonly _propagators: TextMapPropagator[];
  private readonly _fields: string[];

  constructor(propagators: TextMapPropagator[]) {
    this._propagators = propagators;
    this._fields = Array.from(
      new Set(propagators.flatMap(p => p.fields()))
    );
  }

  fields(): string[] {
    return this._fields;
  }

  inject(context: api.Context, carrier: any, setter: api.TextMapSetter): void {
    for (const propagator of this._propagators) {
      propagator.inject(context, carrier, setter);
    }
  }

  extract(context: api.Context, carrier: any, getter: api.TextMapGetter): api.Context {
    return this._propagators.reduce(
      (ctx, propagator) => propagator.extract(ctx, carrier, getter),
      context
    );
  }
}

/**
 * Context7 UEP Message Carrier Adapter
 * 
 * Adapts UEP message format to OpenTelemetry carrier interface
 * for seamless context propagation
 */
export class UEPMessageCarrier implements Context7Carrier {
  constructor(private message: UEPMessage) {
    if (!this.message.metadata) {
      this.message.metadata = {};
    }
    if (!this.message.metadata.traceContext) {
      this.message.metadata.traceContext = {};
    }
  }

  get(key: string): string | undefined {
    return this.message.metadata?.traceContext?.[key];
  }

  set(key: string, value: string): void {
    if (!this.message.metadata) {
      this.message.metadata = {};
    }
    if (!this.message.metadata.traceContext) {
      this.message.metadata.traceContext = {};
    }
    this.message.metadata.traceContext[key] = value;
  }

  keys(): string[] {
    return Object.keys(this.message.metadata?.traceContext || {});
  }

  getMessage(): UEPMessage {
    return this.message;
  }
}

/**
 * Context7 HTTP Headers Carrier Adapter
 * 
 * Standard HTTP headers adapter with Context7 enhancements
 */
export class HTTPHeadersCarrier implements Context7Carrier {
  constructor(private headers: Record<string, string | string[] | undefined>) {}

  get(key: string): string | undefined {
    const value = this.headers[key.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  set(key: string, value: string): void {
    this.headers[key.toLowerCase()] = value;
  }

  keys(): string[] {
    return Object.keys(this.headers);
  }

  getHeaders(): Record<string, string | string[] | undefined> {
    return this.headers;
  }
}

/**
 * Context7 Propagation Utilities
 * 
 * High-level utilities for Context7-compliant propagation
 */
export class Context7PropagationUtils {
  private static readonly uepPropagator = new Context7UEPPropagator();
  
  /**
   * Inject context into UEP message
   */
  static injectUEPContext(context: api.Context, message: UEPMessage): UEPMessage {
    const carrier = new UEPMessageCarrier(message);
    this.uepPropagator.inject(context, carrier, {
      set: (carrier: any, key: string, value: string) => carrier.set(key, value)
    });
    return carrier.getMessage();
  }

  /**
   * Extract context from UEP message
   */
  static extractUEPContext(message: UEPMessage): api.Context {
    const carrier = new UEPMessageCarrier(message);
    return this.uepPropagator.extract(api.context.active(), carrier, {
      get: (carrier: any, key: string) => carrier.get(key),
      keys: (carrier: any) => carrier.keys()
    });
  }

  /**
   * Inject context into HTTP headers
   */
  static injectHTTPContext(context: api.Context, headers: Record<string, string>): void {
    api.propagation.inject(context, headers);
  }

  /**
   * Extract context from HTTP headers
   */
  static extractHTTPContext(headers: Record<string, string | string[] | undefined>): api.Context {
    return api.propagation.extract(api.context.active(), headers);
  }

  /**
   * Create Context7-enriched baggage
   */
  static createUEPBaggage(uepMetadata: {
    agentId?: string;
    taskId?: string;
    workflowId?: string;
    messageId?: string;
    protocolVersion?: string;
  }): api.Baggage {
    let baggage = api.propagation.createBaggage();

    if (uepMetadata.agentId) {
      baggage = baggage.setEntry('uep.agent.id', { value: uepMetadata.agentId });
    }
    if (uepMetadata.taskId) {
      baggage = baggage.setEntry('uep.task.id', { value: uepMetadata.taskId });
    }
    if (uepMetadata.workflowId) {
      baggage = baggage.setEntry('uep.workflow.id', { value: uepMetadata.workflowId });
    }
    if (uepMetadata.messageId) {
      baggage = baggage.setEntry('uep.message.id', { value: uepMetadata.messageId });
    }
    if (uepMetadata.protocolVersion) {
      baggage = baggage.setEntry('uep.protocol.version', { value: uepMetadata.protocolVersion });
    }

    // Add Context7 markers
    baggage = baggage.setEntry('context7.propagation', { value: 'uep-enhanced' });
    baggage = baggage.setEntry('context7.timestamp', { value: Date.now().toString() });

    return baggage;
  }

  /**
   * Validate context integrity (Context7 Principle 4)
   */
  static validateContextIntegrity(context: api.Context): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    const spanContext = api.trace.getSpanContext(context);
    if (!spanContext) {
      result.isValid = false;
      result.errors.push('No span context found');
    } else {
      if (!api.trace.isSpanContextValid(spanContext)) {
        result.isValid = false;
        result.errors.push('Invalid span context');
      }
      
      if (!spanContext.traceId || spanContext.traceId === '0'.repeat(32)) {
        result.isValid = false;
        result.errors.push('Invalid trace ID');
      }
      
      if (!spanContext.spanId || spanContext.spanId === '0'.repeat(16)) {
        result.isValid = false;
        result.errors.push('Invalid span ID');
      }
    }

    const baggage = api.propagation.getBaggage(context);
    if (!baggage?.getEntry('context7.propagation')) {
      result.warnings.push('Missing Context7 propagation marker');
    }

    return result;
  }
}

// Export default configured propagator
export const context7Propagator = new Context7CompositePropagator([
  new Context7UEPPropagator(),
  // Add other propagators as needed
]);

/**
 * Initialize Context7 propagation globally
 */
export function initializeContext7Propagation(): void {
  // Set the global propagator to include Context7 support
  api.propagation.setGlobalPropagator(context7Propagator);
  
  console.log('Context7 propagation initialized with UEP protocol support');
}