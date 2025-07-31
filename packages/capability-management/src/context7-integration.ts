/**
 * Context7 Integration for Capability Management Service
 * 
 * Demonstrates Context7-compliant trace context propagation implementation
 * Research-driven integration based on TaskMaster methodology
 */

import { Express } from 'express';
import * as api from '@opentelemetry/api';
import {
  context7MiddlewareStack,
  Context7OutboundInterceptor,
  Context7UEPMiddleware,
  Context7AsyncUtils,
  context7AsyncStorage,
  Context7Request,
  Context7Response
} from '../../../src/observability/context7-middleware.js';
import {
  Context7PropagationUtils,
  UEPMessage
} from '../../../src/observability/context7-propagators.js';

/**
 * Integrate Context7 middleware into Express application
 */
export function integrateContext7Middleware(app: Express): void {
  console.log('🔗 Integrating Context7 middleware stack...');
  
  // Apply Context7 middleware stack BEFORE other middleware
  context7MiddlewareStack.forEach(middleware => {
    app.use(middleware);
  });
  
  console.log('✅ Context7 middleware integration complete');
}

/**
 * Context7-enhanced Redis operations
 * Wraps Redis operations to preserve context across async boundaries
 */
export class Context7RedisWrapper {
  constructor(private redis: any) {}

  async get(key: string): Promise<any> {
    const state = Context7AsyncUtils.getCurrentState();
    
    // Create span for Redis operation
    const tracer = api.trace.getTracer('capability-management');
    const span = tracer.startSpan('redis.get', {
      kind: api.SpanKind.CLIENT,
      attributes: {
        'db.system': 'redis',
        'db.operation': 'get',
        'db.redis.key': key,
        'context7.boundary': 'redis-client',
        'context7.request.id': state.requestId || 'unknown'
      }
    });

    try {
      const result = await api.context.with(
        api.trace.setSpan(state.context, span),
        () => this.redis.get(key)
      );
      
      span.setAttributes({
        'db.redis.result.found': !!result,
        'db.redis.result.size': result ? result.length : 0
      });
      
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: api.SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const state = Context7AsyncUtils.getCurrentState();
    
    const tracer = api.trace.getTracer('capability-management');
    const span = tracer.startSpan('redis.set', {
      kind: api.SpanKind.CLIENT,
      attributes: {
        'db.system': 'redis',
        'db.operation': 'set',
        'db.redis.key': key,
        'db.redis.ttl': ttl || 0,
        'context7.boundary': 'redis-client',
        'context7.request.id': state.requestId || 'unknown'
      }
    });

    try {
      await api.context.with(
        api.trace.setSpan(state.context, span),
        () => ttl ? this.redis.setex(key, ttl, value) : this.redis.set(key, value)
      );
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: api.SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  async del(key: string): Promise<number> {
    const state = Context7AsyncUtils.getCurrentState();
    
    const tracer = api.trace.getTracer('capability-management');
    const span = tracer.startSpan('redis.del', {
      kind: api.SpanKind.CLIENT,
      attributes: {
        'db.system': 'redis',
        'db.operation': 'del',
        'db.redis.key': key,
        'context7.boundary': 'redis-client'
      }
    });

    try {
      return await api.context.with(
        api.trace.setSpan(state.context, span),
        () => this.redis.del(key)
      );
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: api.SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const state = Context7AsyncUtils.getCurrentState();
    
    const tracer = api.trace.getTracer('capability-management');
    const span = tracer.startSpan('redis.keys', {
      kind: api.SpanKind.CLIENT,
      attributes: {
        'db.system': 'redis',
        'db.operation': 'keys',
        'db.redis.pattern': pattern,
        'context7.boundary': 'redis-client'
      }
    });

    try {
      const keys = await api.context.with(
        api.trace.setSpan(state.context, span),
        () => this.redis.keys(pattern)
      );
      
      span.setAttributes({
        'db.redis.keys.count': keys.length
      });
      
      return keys;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: api.SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }
}

/**
 * Context7-enhanced HTTP client for outbound capability requests
 */
export class Context7CapabilityClient {
  constructor(private baseUrl: string) {}

  async discoverCapabilities(criteria: any): Promise<any> {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Context7-CapabilityClient/1.0.0'
      },
      body: JSON.stringify(criteria)
    };

    // Inject Context7 context into request
    Context7OutboundInterceptor.injectHTTPRequest(requestOptions);

    const tracer = api.trace.getTracer('capability-management');
    const span = tracer.startSpan('capability.discovery.outbound', {
      kind: api.SpanKind.CLIENT,
      attributes: {
        'http.method': 'POST',
        'http.url': `${this.baseUrl}/api/v1/capabilities/search`,
        'http.request.size': requestOptions.body.length,
        'context7.boundary': 'http-egress',
        'capability.search.criteria.count': Object.keys(criteria).length
      }
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/capabilities/search`, requestOptions);
      
      span.setAttributes({
        'http.status_code': response.status,
        'http.response.size': response.headers.get('content-length') || 0
      });

      if (!response.ok) {
        throw new Error(`Capability discovery failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: api.SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }
}

/**
 * Context7-enhanced UEP message handler for capability management
 */
export class Context7CapabilityUEPHandler {
  static async handleCapabilityRegistration(message: UEPMessage): Promise<UEPMessage> {
    return Context7UEPMiddleware.processInboundMessage(
      message,
      async (msg, context) => {
        const tracer = api.trace.getTracer('capability-management');
        const span = tracer.startSpan('capability.registration.uep', {
          attributes: {
            'uep.message.type': msg.type,
            'uep.capability.id': msg.payload?.capabilityId,
            'uep.agent.id': msg.source,
            'context7.boundary': 'uep-capability-handler'
          }
        }, context);

        try {
          // Simulate capability registration processing
          const result = {
            success: true,
            capabilityId: msg.payload?.capabilityId,
            registeredAt: new Date().toISOString(),
            traceId: api.trace.getSpanContext(context)?.traceId
          };

          // Create response message
          const responseMessage: UEPMessage = {
            id: `resp-${Date.now()}`,
            type: 'capability-registration-response',
            version: '2.0.0',
            source: 'capability-registry',
            destination: msg.source,
            timestamp: Date.now(),
            payload: result
          };

          // Process outbound message with context injection
          return Context7UEPMiddleware.processOutboundMessage(responseMessage);
        } finally {
          span.end();
        }
      }
    );
  }

  static async handleCapabilitySearch(message: UEPMessage): Promise<UEPMessage> {
    return Context7UEPMiddleware.processInboundMessage(
      message,
      async (msg, context) => {
        const tracer = api.trace.getTracer('capability-management');
        const span = tracer.startSpan('capability.search.uep', {
          attributes: {
            'uep.message.type': msg.type,
            'uep.search.criteria': JSON.stringify(msg.payload?.criteria || {}),
            'uep.agent.id': msg.source,
            'context7.boundary': 'uep-capability-search'
          }
        }, context);

        try {
          // Simulate capability search processing
          const mockResults = [
            {
              capabilityId: 'data-processing',
              version: '1.2.0',
              agentId: 'agent-123',
              compatibility: 'full'
            },
            {
              capabilityId: 'file-management',
              version: '2.1.0',
              agentId: 'agent-456',
              compatibility: 'partial'
            }
          ];

          const responseMessage: UEPMessage = {
            id: `search-resp-${Date.now()}`,
            type: 'capability-search-response',
            version: '2.0.0',
            source: 'capability-registry',
            destination: msg.source,
            timestamp: Date.now(),
            payload: {
              results: mockResults,
              totalCount: mockResults.length,
              traceId: api.trace.getSpanContext(context)?.traceId
            }
          };

          span.setAttributes({
            'capability.search.results.count': mockResults.length
          });

          return Context7UEPMiddleware.processOutboundMessage(responseMessage);
        } finally {
          span.end();
        }
      }
    );
  }
}

/**
 * Context7-enhanced route handlers
 */
export function createContext7RouteHandlers() {
  return {
    // Enhanced capability registration handler
    async registerCapability(req: Context7Request, res: Context7Response): Promise<void> {
      const state = Context7AsyncUtils.getCurrentState();
      
      const tracer = api.trace.getTracer('capability-management');
      const span = tracer.startSpan('capability.register', {
        attributes: {
          'capability.id': req.body?.capabilityId,
          'capability.version': req.body?.version,
          'agent.id': req.headers['x-agent-id'] as string,
          'context7.route.handler': 'registerCapability'
        }
      });

      try {
        // Simulate capability registration with Context7 preservation
        const result = await Context7AsyncUtils.wrapPromise(
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                capabilityId: req.body?.capabilityId,
                version: req.body?.version,
                registeredAt: new Date().toISOString(),
                traceId: state.traceId,
                context7: {
                  propagated: true,
                  requestId: state.requestId
                }
              });
            }, 100);
          })
        );

        res.json(result);
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: api.SpanStatusCode.ERROR, message: (error as Error).message });
        res.status(500).json({ error: 'Registration failed' });
      } finally {
        span.end();
      }
    },

    // Enhanced capability search handler
    async searchCapabilities(req: Context7Request, res: Context7Response): Promise<void> {
      const state = Context7AsyncUtils.getCurrentState();
      
      const tracer = api.trace.getTracer('capability-management');
      const span = tracer.startSpan('capability.search', {
        attributes: {
          'search.criteria': JSON.stringify(req.body || {}),
          'agent.id': req.headers['x-agent-id'] as string,
          'context7.route.handler': 'searchCapabilities'
        }
      });

      try {
        // Simulate async capability search with context preservation
        const results = await Context7AsyncUtils.wrapPromise(
          new Promise((resolve) => {
            Context7AsyncUtils.setTimeout(() => {
              resolve([
                {
                  capabilityId: 'document-processing',
                  version: '1.0.0',
                  agentId: 'agent-doc-001',
                  available: true,
                  traceId: state.traceId
                },
                {
                  capabilityId: 'data-transformation',
                  version: '2.1.0',
                  agentId: 'agent-data-002',
                  available: true,
                  traceId: state.traceId
                }
              ]);
            }, 50);
          })
        );

        span.setAttributes({
          'search.results.count': (results as any[]).length
        });

        res.json({
          results,
          totalCount: (results as any[]).length,
          context7: {
            propagated: true,
            requestId: state.requestId,
            traceId: state.traceId
          }
        });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: api.SpanStatusCode.ERROR, message: (error as Error).message });
        res.status(500).json({ error: 'Search failed' });
      } finally {
        span.end();
      }
    }
  };
}

/**
 * Context7 integration validator
 * Validates that Context7 is working correctly
 */
export class Context7IntegrationValidator {
  static validateContextPropagation(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    context7Status: any;
  } {
    const state = Context7AsyncUtils.getCurrentState();
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      context7Status: {
        hasActiveContext: !!state.context,
        hasTraceId: !!state.traceId,
        hasSpanId: !!state.spanId,
        hasRequestId: !!state.requestId,
        asyncStorageActive: !!context7AsyncStorage.getStore(),
        timestamp: Date.now()
      }
    };

    if (!state.traceId) {
      result.isValid = false;
      result.errors.push('No active trace ID found');
    }

    if (!state.spanId) {
      result.isValid = false;
      result.errors.push('No active span ID found');
    }

    if (!context7AsyncStorage.getStore()) {
      result.warnings.push('AsyncLocalStorage not active');
    }

    const integrity = Context7PropagationUtils.validateContextIntegrity(state.context);
    result.errors.push(...integrity.errors);
    result.warnings.push(...integrity.warnings);

    if (integrity.errors.length > 0) {
      result.isValid = false;
    }

    return result;
  }
}

console.log('✅ Context7 integration utilities loaded');