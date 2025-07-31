/**
 * Context7 Middleware for Node.js Express Microservices
 * 
 * Service boundary handlers implementing Context7 methodology:
 * - Context extraction on inbound requests
 * - Context injection on outbound calls
 * - Async boundary preservation
 * - Request/response lifecycle integration
 * 
 * Research-driven implementation based on TaskMaster methodology:
 * - Express middleware patterns for service boundaries
 * - AsyncLocalStorage for async context preservation
 * - OpenTelemetry integration for standardized context management
 */

import { Request, Response, NextFunction } from 'express';
import * as api from '@opentelemetry/api';
import { AsyncLocalStorage } from 'async_hooks';
import { 
  Context7PropagationUtils, 
  UEPMessage, 
  HTTPHeadersCarrier,
  Context7UEPPropagator
} from './context7-propagators.js';

// Context7 Request Interface Extension
export interface Context7Request extends Request {
  context7?: {
    traceContext: api.Context;
    startTime: number;
    requestId: string;
    baggage: api.Baggage;
    spanContext?: api.SpanContext;
  };
}

// Context7 Response Interface Extension  
export interface Context7Response extends Response {
  context7?: {
    injected: boolean;
    traceId?: string;
    spanId?: string;
  };
}

// Context7 Async Local Storage for context preservation
const context7AsyncStorage = new AsyncLocalStorage<{
  context: api.Context;
  requestId: string;
  startTime: number;
}>();

/**
 * Context7 Service Boundary Middleware
 * 
 * Implements Context7 Principle 1: Explicit Context Boundaries
 * Extracts context from inbound requests and preserves across async boundaries
 */
export function context7ServiceBoundaryMiddleware() {
  return (req: Context7Request, res: Context7Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || 
                     req.headers['x-correlation-id'] as string ||
                     `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Extract context from HTTP headers using OpenTelemetry
      const extractedContext = Context7PropagationUtils.extractHTTPContext(req.headers);
      
      // Get or create span context
      let spanContext = api.trace.getSpanContext(extractedContext);
      let activeContext = extractedContext;
      
      // If no span context, create a new root context
      if (!spanContext || !api.trace.isSpanContextValid(spanContext)) {
        const tracer = api.trace.getTracer('context7-middleware');
        const span = tracer.startSpan(`${req.method} ${req.path}`, {
          kind: api.SpanKind.SERVER,
          attributes: {
            'http.method': req.method,
            'http.url': req.url,
            'http.route': req.route?.path || req.path,
            'http.user_agent': req.headers['user-agent'] || 'unknown',
            'context7.boundary': 'http-ingress',
            'context7.request.id': requestId,
            'context7.service.boundary': 'true'
          }
        });
        
        activeContext = api.trace.setSpan(extractedContext, span);
        spanContext = span.spanContext();
      }

      // Enrich baggage with request context
      let baggage = api.propagation.getBaggage(activeContext) || api.propagation.createBaggage();
      baggage = baggage.setEntry('http.request.id', { value: requestId });
      baggage = baggage.setEntry('http.method', { value: req.method });
      baggage = baggage.setEntry('http.path', { value: req.path });
      baggage = baggage.setEntry('context7.boundary.entry', { value: 'http-service' });
      baggage = baggage.setEntry('context7.timestamp', { value: startTime.toString() });
      
      activeContext = api.propagation.setBaggage(activeContext, baggage);

      // Store in request object
      req.context7 = {
        traceContext: activeContext,
        startTime,
        requestId,
        baggage,
        spanContext
      };

      // Store in response object for injection
      res.context7 = {
        injected: false,
        traceId: spanContext?.traceId,
        spanId: spanContext?.spanId
      };

      // Set response headers for downstream tracing
      if (spanContext) {
        res.setHeader('x-trace-id', spanContext.traceId);
        res.setHeader('x-span-id', spanContext.spanId);
        res.setHeader('x-request-id', requestId);
      }

      // Run within async local storage for context preservation
      context7AsyncStorage.run(
        {
          context: activeContext,
          requestId,
          startTime
        },
        () => {
          // Run within OpenTelemetry context
          api.context.with(activeContext, () => {
            next();
          });
        }
      );

    } catch (error) {
      console.error('Context7 boundary middleware error:', error);
      // Continue without context in case of error
      next();
    }
  };
}

/**
 * Context7 Response Injection Middleware
 * 
 * Injects context into response headers before sending
 * Implements Context7 Principle 2: Multi-Carrier Support
 */
export function context7ResponseInjectionMiddleware() {
  return (req: Context7Request, res: Context7Response, next: NextFunction): void => {
    // Override res.send to inject context before sending
    const originalSend = res.send;
    
    res.send = function(this: Context7Response, body?: any) {
      if (!this.context7?.injected && req.context7) {
        // Inject current context into response headers
        const currentContext = req.context7.traceContext;
        const headers: Record<string, string> = {};
        
        Context7PropagationUtils.injectHTTPContext(currentContext, headers);
        
        // Set headers on response
        Object.entries(headers).forEach(([key, value]) => {
          this.setHeader(key, value);
        });

        // Add Context7 metadata
        this.setHeader('x-context7-propagated', 'true');
        this.setHeader('x-context7-boundary', 'http-egress');
        
        // Calculate request duration
        const duration = Date.now() - req.context7.startTime;
        this.setHeader('x-request-duration-ms', duration.toString());
        
        this.context7!.injected = true;
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
}

/**
 * Context7 Outbound Request Interceptor
 * 
 * Utility for injecting context into outbound HTTP requests
 * Implements Context7 Principle 2: Multi-Carrier Support
 */
export class Context7OutboundInterceptor {
  /**
   * Inject context into outbound HTTP request options
   */
  static injectHTTPRequest(requestOptions: {
    headers?: Record<string, string>;
    [key: string]: any;
  }): void {
    const asyncStore = context7AsyncStorage.getStore();
    const currentContext = asyncStore?.context || api.context.active();
    
    if (!requestOptions.headers) {
      requestOptions.headers = {};
    }

    // Inject trace context
    Context7PropagationUtils.injectHTTPContext(currentContext, requestOptions.headers);
    
    // Add Context7 markers
    requestOptions.headers['x-context7-propagated'] = 'true';
    requestOptions.headers['x-context7-boundary'] = 'http-egress';
    
    // Add correlation ID if available
    const baggage = api.propagation.getBaggage(currentContext);
    const requestId = baggage?.getEntry('http.request.id')?.value;
    if (requestId) {
      requestOptions.headers['x-correlation-id'] = requestId;
    }
  }

  /**
   * Inject context into outbound UEP message
   */
  static injectUEPMessage(message: UEPMessage): UEPMessage {
    const asyncStore = context7AsyncStorage.getStore();
    const currentContext = asyncStore?.context || api.context.active();
    
    return Context7PropagationUtils.injectUEPContext(currentContext, message);
  }

  /**
   * Create instrumented HTTP client wrapper
   */
  static wrapHTTPClient<T>(client: T): T {
    // This would wrap HTTP client methods to automatically inject context
    // Implementation depends on specific HTTP client (axios, fetch, etc.)
    return client;
  }
}

/**
 * Context7 UEP Message Middleware
 * 
 * Handles context extraction/injection for UEP protocol messages
 * Implements Context7 integration with custom protocols
 */
export class Context7UEPMiddleware {
  private static readonly uepPropagator = new Context7UEPPropagator();

  /**
   * Process inbound UEP message with context extraction
   */
  static async processInboundMessage<T>(
    message: UEPMessage,
    handler: (message: UEPMessage, context: api.Context) => Promise<T>
  ): Promise<T> {
    // Extract context from UEP message
    const extractedContext = Context7PropagationUtils.extractUEPContext(message);
    
    // Validate context integrity
    const integrity = Context7PropagationUtils.validateContextIntegrity(extractedContext);
    if (!integrity.isValid) {
      console.warn('Context7 UEP message integrity issues:', integrity.errors);
    }

    // Create span for UEP message processing
    const tracer = api.trace.getTracer('context7-uep-middleware');
    const span = tracer.startSpan(`uep.${message.type}`, {
      kind: api.SpanKind.SERVER,
      attributes: {
        'uep.message.id': message.id,
        'uep.message.type': message.type,
        'uep.message.version': message.version,
        'uep.message.source': message.source,
        'uep.message.destination': message.destination,
        'context7.boundary': 'uep-ingress',
        'context7.protocol': 'uep'
      }
    }, extractedContext);

    const activeContext = api.trace.setSpan(extractedContext, span);

    try {
      // Run handler within context
      return await api.context.with(activeContext, async () => {
        return context7AsyncStorage.run(
          {
            context: activeContext,
            requestId: message.id,
            startTime: Date.now()
          },
          () => handler(message, activeContext)
        );
      });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: api.SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Process outbound UEP message with context injection
   */
  static processOutboundMessage(message: UEPMessage): UEPMessage {
    const asyncStore = context7AsyncStorage.getStore();
    const currentContext = asyncStore?.context || api.context.active();
    
    // Inject context into message
    const enrichedMessage = Context7PropagationUtils.injectUEPMessage(currentContext, message);
    
    // Add Context7 metadata
    if (!enrichedMessage.metadata) {
      enrichedMessage.metadata = {};
    }
    
    enrichedMessage.metadata['context7.boundary'] = 'uep-egress';
    enrichedMessage.metadata['context7.timestamp'] = Date.now().toString();
    
    return enrichedMessage;
  }
}

/**
 * Context7 Async Boundary Preservation Utilities
 * 
 * Implements Context7 Principle 3: Asynchronous Context Preservation
 */
export class Context7AsyncUtils {
  /**
   * Wrap Promise to preserve context
   */
  static wrapPromise<T>(promise: Promise<T>): Promise<T> {
    const asyncStore = context7AsyncStorage.getStore();
    const currentContext = asyncStore?.context || api.context.active();
    
    return new Promise<T>((resolve, reject) => {
      api.context.with(currentContext, () => {
        promise
          .then(result => resolve(result))
          .catch(error => reject(error));
      });
    });
  }

  /**
   * Wrap callback to preserve context
   */
  static wrapCallback<T extends any[]>(
    context: api.Context,
    callback: (...args: T) => void
  ): (...args: T) => void {
    return (...args: T) => {
      api.context.with(context, () => {
        const asyncStore = context7AsyncStorage.getStore();
        if (asyncStore) {
          context7AsyncStorage.run(asyncStore, () => {
            callback(...args);
          });
        } else {
          callback(...args);
        }
      });
    };
  }

  /**
   * Wrap setTimeout to preserve context
   */
  static setTimeout(
    callback: () => void,
    delay: number
  ): NodeJS.Timeout {
    const asyncStore = context7AsyncStorage.getStore();
    const currentContext = asyncStore?.context || api.context.active();
    
    return setTimeout(() => {
      api.context.with(currentContext, () => {
        if (asyncStore) {
          context7AsyncStorage.run(asyncStore, callback);
        } else {
          callback();
        }
      });
    }, delay);
  }

  /**
   * Get current Context7 state
   */
  static getCurrentState(): {
    context: api.Context;
    requestId?: string;
    startTime?: number;
    traceId?: string;
    spanId?: string;
  } {
    const asyncStore = context7AsyncStorage.getStore();
    const currentContext = asyncStore?.context || api.context.active();
    const spanContext = api.trace.getSpanContext(currentContext);
    
    return {
      context: currentContext,
      requestId: asyncStore?.requestId,
      startTime: asyncStore?.startTime,
      traceId: spanContext?.traceId,
      spanId: spanContext?.spanId
    };
  }
}

/**
 * Context7 Health Check Middleware
 * 
 * Validates context propagation health
 */
export function context7HealthCheckMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === '/health/context7') {
      const state = Context7AsyncUtils.getCurrentState();
      const baggage = api.propagation.getBaggage(state.context);
      
      const health = {
        status: 'healthy',
        context7: {
          traceId: state.traceId,
          spanId: state.spanId,
          hasValidContext: !!(state.traceId && state.spanId),
          baggageEntries: baggage?.getAllEntries().length || 0,
          asyncStorageActive: !!context7AsyncStorage.getStore(),
          timestamp: Date.now()
        }
      };
      
      res.json(health);
      return;
    }
    
    next();
  };
}

/**
 * Context7 Error Handler Middleware
 * 
 * Handles context-related errors and provides debugging information
 */
export function context7ErrorHandlerMiddleware() {
  return (error: Error, req: Context7Request, res: Context7Response, next: NextFunction): void => {
    // Add context information to error
    if (req.context7) {
      const contextError = Object.assign(error, {
        context7: {
          traceId: req.context7.spanContext?.traceId,
          spanId: req.context7.spanContext?.spanId,
          requestId: req.context7.requestId,
          startTime: req.context7.startTime,
          duration: Date.now() - req.context7.startTime
        }
      });
      
      // Record exception in active span
      const currentSpan = api.trace.getActiveSpan();
      if (currentSpan) {
        currentSpan.recordException(contextError);
        currentSpan.setStatus({ 
          code: api.SpanStatusCode.ERROR, 
          message: error.message 
        });
      }
    }
    
    next(error);
  };
}

// Export configured middleware stack
export const context7MiddlewareStack = [
  context7ServiceBoundaryMiddleware(),
  context7ResponseInjectionMiddleware(),
  context7HealthCheckMiddleware()
];

// Export async storage for direct access
export { context7AsyncStorage };