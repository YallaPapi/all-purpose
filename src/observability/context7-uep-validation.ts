/**
 * Context7 UEP Protocol Trace Context Validation
 * 
 * Comprehensive validation suite for UEP protocol trace context propagation
 * implementing multi-hop, async boundary, and protocol compatibility testing.
 * 
 * Research-driven implementation based on TaskMaster methodology:
 * - Multi-hop validation across HTTP -> UEP -> gRPC boundaries
 * - Async message flow context preservation testing
 * - Protocol version compatibility validation
 * - Context integrity verification across service boundaries
 */

import * as api from '@opentelemetry/api';
import { 
  UEPMessage, 
  Context7PropagationUtils,
  Context7UEPPropagator 
} from './context7-propagators.js';
import { 
  Context7AsyncUtils,
  Context7UEPMiddleware 
} from './context7-middleware.js';

/**
 * UEP Protocol Version Interface
 */
export interface UEPProtocolVersion {
  major: number;
  minor: number;
  patch: number;
  features: string[];
  traceContextSupport: boolean;
}

/**
 * Trace Context Validation Result
 */
export interface TraceContextValidationResult {
  isValid: boolean;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  traceFlags?: number;
  baggage?: Record<string, string>;
  errors: string[];
  warnings: string[];
  protocolCompliance: {
    uepVersion: string;
    contextFieldsPresent: boolean;
    baggageComplete: boolean;
    spanContinuity: boolean;
  };
}

/**
 * Multi-Hop Trace Validation Configuration
 */
export interface MultiHopTraceConfig {
  services: Array<{
    name: string;
    protocol: 'http' | 'uep' | 'grpc';
    version: string;
    endpoint: string;
  }>;
  expectedHops: number;
  timeoutMs: number;
  validateAsync: boolean;
}

/**
 * Context7 UEP Protocol Validator
 * 
 * Implements comprehensive trace context validation for UEP protocol integration
 */
export class Context7UEPValidator {
  private static readonly SUPPORTED_UEP_VERSIONS: UEPProtocolVersion[] = [
    {
      major: 1,
      minor: 0,
      patch: 0,
      features: ['basic-messaging'],
      traceContextSupport: false
    },
    {
      major: 2,
      minor: 0,
      patch: 0,
      features: ['basic-messaging', 'trace-context', 'async-processing'],
      traceContextSupport: true
    },
    {
      major: 2,
      minor: 1,
      patch: 0,
      features: ['basic-messaging', 'trace-context', 'async-processing', 'baggage-propagation'],
      traceContextSupport: true
    }
  ];

  /**
   * Validate trace context in UEP message
   */
  static validateUEPMessageContext(message: UEPMessage): TraceContextValidationResult {
    const result: TraceContextValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      protocolCompliance: {
        uepVersion: message.version,
        contextFieldsPresent: false,
        baggageComplete: false,
        spanContinuity: false
      }
    };

    // Check if UEP protocol version supports trace context
    const protocolVersion = this.parseUEPVersion(message.version);
    const supportedVersion = this.SUPPORTED_UEP_VERSIONS.find(v => 
      v.major === protocolVersion.major && 
      v.minor === protocolVersion.minor
    );

    if (!supportedVersion) {
      result.isValid = false;
      result.errors.push(`Unsupported UEP protocol version: ${message.version}`);
      return result;
    }

    if (!supportedVersion.traceContextSupport) {
      result.warnings.push(`UEP protocol version ${message.version} does not support trace context`);
    }

    // Validate trace context fields
    const traceContext = message.metadata?.traceContext;
    if (!traceContext) {
      if (supportedVersion.traceContextSupport) {
        result.isValid = false;
        result.errors.push('Missing trace context metadata in UEP message');
      }
      return result;
    }

    result.protocolCompliance.contextFieldsPresent = true;

    // Validate W3C traceparent format
    const traceparent = traceContext['traceparent'];
    if (!traceparent) {
      result.isValid = false;
      result.errors.push('Missing traceparent header');
    } else {
      const traceparentValidation = this.validateTraceparent(traceparent);
      if (!traceparentValidation.isValid) {
        result.isValid = false;
        result.errors.push(...traceparentValidation.errors);
      } else {
        result.traceId = traceparentValidation.traceId;
        result.spanId = traceparentValidation.spanId;
        result.parentSpanId = traceparentValidation.parentSpanId;
        result.traceFlags = traceparentValidation.traceFlags;
        result.protocolCompliance.spanContinuity = true;
      }
    }

    // Validate baggage
    const baggage = traceContext['baggage'];
    if (baggage) {
      try {
        const parsedBaggage = this.parseBaggageHeader(baggage);
        result.baggage = parsedBaggage;
        result.protocolCompliance.baggageComplete = this.validateBaggageCompleteness(parsedBaggage);
      } catch (error) {
        result.warnings.push(`Invalid baggage format: ${(error as Error).message}`);
      }
    }

    // Validate UEP-specific context fields
    this.validateUEPSpecificContext(message, result);

    return result;
  }

  /**
   * Validate multi-hop trace propagation
   */
  static async validateMultiHopTracePropagation(
    config: MultiHopTraceConfig
  ): Promise<{
    success: boolean;
    traceId?: string;
    hops: Array<{
      service: string;
      protocol: string;
      success: boolean;
      traceId?: string;
      spanId?: string;
      duration: number;
      errors: string[];
    }>;
    totalDuration: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const tracer = api.trace.getTracer('context7-uep-validator');
    
    // Create root span for multi-hop validation
    const rootSpan = tracer.startSpan('validate-multi-hop-trace', {
      attributes: {
        'test.type': 'multi-hop-validation',
        'test.services.count': config.services.length,
        'test.expected.hops': config.expectedHops
      }
    });

    const rootContext = api.trace.setSpan(api.context.active(), rootSpan);
    const rootSpanContext = rootSpan.spanContext();

    const result = {
      success: true,
      traceId: rootSpanContext.traceId,
      hops: [] as any[],
      totalDuration: 0,
      errors: [] as string[]
    };

    try {
      // Execute multi-hop trace validation within root context
      await api.context.with(rootContext, async () => {
        let currentContext = rootContext;
        
        for (let i = 0; i < config.services.length; i++) {
          const service = config.services[i];
          const hopStartTime = Date.now();
          
          const hopResult = {
            service: service.name,
            protocol: service.protocol,
            success: false,
            duration: 0,
            errors: [] as string[]
          };

          try {
            // Simulate service call with context propagation
            const simulatedResult = await this.simulateServiceCall(
              service,
              currentContext,
              i === 0 ? rootSpanContext.traceId : undefined
            );

            hopResult.success = simulatedResult.success;
            hopResult.traceId = simulatedResult.traceId;
            hopResult.spanId = simulatedResult.spanId;
            hopResult.errors = simulatedResult.errors;

            // Update current context for next hop
            if (simulatedResult.context) {
              currentContext = simulatedResult.context;
            }

          } catch (error) {
            hopResult.success = false;
            hopResult.errors.push(`Service call failed: ${(error as Error).message}`);
            result.success = false;
          }

          hopResult.duration = Date.now() - hopStartTime;
          result.hops.push(hopResult);

          // Early exit if hop failed and not configured for async validation
          if (!hopResult.success && !config.validateAsync) {
            result.success = false;
            result.errors.push(`Multi-hop validation failed at ${service.name}`);
            break;
          }
        }

        // Validate trace continuity across all hops
        if (result.success) {
          const continuityValidation = this.validateTraceContinuity(result.hops, rootSpanContext.traceId);
          if (!continuityValidation.isValid) {
            result.success = false;
            result.errors.push(...continuityValidation.errors);
          }
        }
      });

    } catch (error) {
      result.success = false;
      result.errors.push(`Multi-hop validation error: ${(error as Error).message}`);
    } finally {
      rootSpan.end();
    }

    result.totalDuration = Date.now() - startTime;
    return result;
  }

  /**
   * Validate async boundary context preservation
   */
  static async validateAsyncBoundaryPreservation(): Promise<{
    success: boolean;
    tests: Array<{
      name: string;
      success: boolean;
      traceId?: string;
      spanId?: string;
      preservedContext: boolean;
      errors: string[];
    }>;
    errors: string[];
  }> {
    const result = {
      success: true,
      tests: [] as any[],
      errors: [] as string[]
    };

    const tracer = api.trace.getTracer('context7-async-validator');
    const rootSpan = tracer.startSpan('validate-async-boundaries');
    const rootContext = api.trace.setSpan(api.context.active(), rootSpan);
    const rootSpanContext = rootSpan.spanContext();

    try {
      await api.context.with(rootContext, async () => {
        // Test 1: Promise.resolve() boundary
        const promiseTest = await this.testPromiseBoundary(rootContext, rootSpanContext.traceId);
        result.tests.push(promiseTest);

        // Test 2: setTimeout() boundary  
        const timeoutTest = await this.testTimeoutBoundary(rootContext, rootSpanContext.traceId);
        result.tests.push(timeoutTest);

        // Test 3: UEP message processing boundary
        const uepMessageTest = await this.testUEPMessageBoundary(rootContext, rootSpanContext.traceId);
        result.tests.push(uepMessageTest);

        // Test 4: Context7AsyncUtils.wrapPromise() boundary
        const wrappedPromiseTest = await this.testWrappedPromiseBoundary(rootContext, rootSpanContext.traceId);
        result.tests.push(wrappedPromiseTest);

        // Check overall success
        result.success = result.tests.every(test => test.success);
        if (!result.success) {
          result.errors.push('One or more async boundary tests failed');
        }
      });

    } catch (error) {
      result.success = false;
      result.errors.push(`Async boundary validation error: ${(error as Error).message}`);
    } finally {
      rootSpan.end();
    }

    return result;
  }

  /**
   * Validate protocol version compatibility
   */
  static validateProtocolVersionCompatibility(
    sourceVersion: string,
    targetVersion: string
  ): {
    compatible: boolean;
    contextPreserved: boolean;
    warnings: string[];
    errors: string[];
    upgradeRequired: boolean;
  } {
    const result = {
      compatible: true,
      contextPreserved: true,
      warnings: [] as string[],
      errors: [] as string[],
      upgradeRequired: false
    };

    const sourceV = this.parseUEPVersion(sourceVersion);
    const targetV = this.parseUEPVersion(targetVersion);

    const sourceDef = this.SUPPORTED_UEP_VERSIONS.find(v => 
      v.major === sourceV.major && v.minor === sourceV.minor
    );
    const targetDef = this.SUPPORTED_UEP_VERSIONS.find(v => 
      v.major === targetV.major && v.minor === targetV.minor
    );

    if (!sourceDef || !targetDef) {
      result.compatible = false;
      result.contextPreserved = false;
      result.errors.push('Unsupported protocol version detected');
      return result;
    }

    // Check trace context support compatibility
    if (sourceDef.traceContextSupport && !targetDef.traceContextSupport) {
      result.contextPreserved = false;
      result.warnings.push('Downgrading from trace context support to non-supporting version');
    }

    if (!sourceDef.traceContextSupport && targetDef.traceContextSupport) {
      result.upgradeRequired = true;
      result.warnings.push('Upgrading to trace context supporting version');
    }

    // Check major version compatibility
    if (targetV.major > sourceV.major) {
      result.upgradeRequired = true;
      result.warnings.push(`Major version upgrade required: ${sourceVersion} -> ${targetVersion}`);
    }

    if (targetV.major < sourceV.major) {
      result.compatible = false;
      result.errors.push(`Major version downgrade not supported: ${sourceVersion} -> ${targetVersion}`);
    }

    return result;
  }

  /**
   * Generate comprehensive validation report
   */
  static async generateValidationReport(): Promise<{
    timestamp: string;
    overall: 'pass' | 'fail' | 'warning';
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
      warnings: number;
    };
    uepProtocolSupport: any;
    multiHopValidation: any;
    asyncBoundaryTests: any;
    protocolCompatibility: any;
    recommendations: string[];
  }> {
    console.log('🔍 Starting comprehensive Context7 UEP validation...');

    const report = {
      timestamp: new Date().toISOString(),
      overall: 'pass' as 'pass' | 'fail' | 'warning',
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      uepProtocolSupport: {},
      multiHopValidation: {},
      asyncBoundaryTests: {},
      protocolCompatibility: {},
      recommendations: [] as string[]
    };

    try {
      // Test 1: UEP Protocol Support
      console.log('  📋 Testing UEP protocol trace context support...');
      const testMessage: UEPMessage = {
        id: 'test-msg-001',
        type: 'test-message',
        version: '2.1.0',
        source: 'test-service-a',
        destination: 'test-service-b',
        timestamp: Date.now(),
        payload: { test: true },
        metadata: {
          traceContext: {
            'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
            'baggage': 'uep.agent.id=test-agent,context7.boundary=uep-protocol'
          }
        }
      };

      report.uepProtocolSupport = this.validateUEPMessageContext(testMessage);
      report.summary.totalTests++;
      if (report.uepProtocolSupport.isValid) {
        report.summary.passed++;
      } else {
        report.summary.failed++;
      }

      // Test 2: Multi-hop validation
      console.log('  🔗 Testing multi-hop trace propagation...');
      const multiHopConfig: MultiHopTraceConfig = {
        services: [
          { name: 'gateway', protocol: 'http', version: '1.0.0', endpoint: 'http://gateway:3000' },
          { name: 'processor', protocol: 'uep', version: '2.1.0', endpoint: 'uep://processor:4000' },
          { name: 'storage', protocol: 'grpc', version: '1.0.0', endpoint: 'grpc://storage:5000' }
        ],
        expectedHops: 3,
        timeoutMs: 5000,
        validateAsync: true
      };

      report.multiHopValidation = await this.validateMultiHopTracePropagation(multiHopConfig);
      report.summary.totalTests++;
      if (report.multiHopValidation.success) {
        report.summary.passed++;
      } else {
        report.summary.failed++;
      }

      // Test 3: Async boundary preservation
      console.log('  ⚡ Testing async boundary context preservation...');
      report.asyncBoundaryTests = await this.validateAsyncBoundaryPreservation();
      report.summary.totalTests++;
      if (report.asyncBoundaryTests.success) {
        report.summary.passed++;
      } else {
        report.summary.failed++;
      }

      // Test 4: Protocol compatibility
      console.log('  🔄 Testing protocol version compatibility...');
      const compatibilityTests = [
        { source: '1.0.0', target: '2.0.0' },
        { source: '2.0.0', target: '2.1.0' },
        { source: '2.1.0', target: '2.0.0' }
      ];

      report.protocolCompatibility = compatibilityTests.map(test => ({
        ...test,
        result: this.validateProtocolVersionCompatibility(test.source, test.target)
      }));

      report.summary.totalTests += compatibilityTests.length;
      compatibilityTests.forEach(test => {
        const result = this.validateProtocolVersionCompatibility(test.source, test.target);
        if (result.compatible) {
          report.summary.passed++;
        } else {
          report.summary.failed++;
        }
        if (result.warnings.length > 0) {
          report.summary.warnings++;
        }
      });

      // Generate recommendations
      if (report.summary.failed > 0) {
        report.overall = 'fail';
        report.recommendations.push('Address failed validation tests before production deployment');
      } else if (report.summary.warnings > 0) {
        report.overall = 'warning';
        report.recommendations.push('Review warnings and consider protocol upgrades');
      }

      if (!report.uepProtocolSupport.protocolCompliance.baggageComplete) {
        report.recommendations.push('Ensure complete baggage propagation for enhanced observability');
      }

      if (!report.multiHopValidation.success) {
        report.recommendations.push('Fix multi-hop trace propagation issues for distributed tracing');
      }

      console.log(`✅ Validation completed: ${report.summary.passed}/${report.summary.totalTests} tests passed`);
      
    } catch (error) {
      report.overall = 'fail';
      report.summary.failed++;
      report.recommendations.push(`Fix validation framework error: ${(error as Error).message}`);
    }

    return report;
  }

  // Private helper methods

  private static parseUEPVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  }

  private static validateTraceparent(traceparent: string): {
    isValid: boolean;
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    traceFlags?: number;
    errors: string[];
  } {
    const result = { isValid: true, errors: [] as string[] };
    
    const parts = traceparent.split('-');
    if (parts.length !== 4) {
      result.isValid = false;
      result.errors.push('Invalid traceparent format: must have 4 parts');
      return result;
    }

    const [version, traceId, spanId, flags] = parts;
    
    if (version !== '00') {
      result.isValid = false;
      result.errors.push(`Unsupported traceparent version: ${version}`);
    }

    if (!/^[0-9a-f]{32}$/.test(traceId)) {
      result.isValid = false;
      result.errors.push('Invalid trace ID format');
    } else {
      result.traceId = traceId;
    }

    if (!/^[0-9a-f]{16}$/.test(spanId)) {
      result.isValid = false;
      result.errors.push('Invalid span ID format');
    } else {
      result.spanId = spanId;
    }

    if (!/^[0-9a-f]{2}$/.test(flags)) {
      result.isValid = false;
      result.errors.push('Invalid flags format');
    } else {
      result.traceFlags = parseInt(flags, 16);
    }

    return result;
  }

  private static parseBaggageHeader(baggage: string): Record<string, string> {
    const result: Record<string, string> = {};
    const entries = baggage.split(',');
    
    for (const entry of entries) {
      const [key, value] = entry.trim().split('=', 2);
      if (key && value) {
        result[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
    
    return result;
  }

  private static validateBaggageCompleteness(baggage: Record<string, string>): boolean {
    const requiredFields = ['context7.boundary', 'context7.propagation'];
    return requiredFields.every(field => field in baggage);
  }

  private static validateUEPSpecificContext(message: UEPMessage, result: TraceContextValidationResult): void {
    const traceContext = message.metadata?.traceContext || {};
    
    // Check for UEP-specific headers
    const uepHeaders = ['uep-agent-id', 'uep-task-id', 'uep-workflow-id'];
    const presentHeaders = uepHeaders.filter(header => header in traceContext);
    
    if (presentHeaders.length === 0) {
      result.warnings.push('No UEP-specific context headers found');
    }

    // Validate Context7 boundary marker
    const boundary = traceContext['context7-boundary'];
    if (!boundary) {
      result.warnings.push('Missing Context7 boundary marker');
    } else if (boundary !== 'uep-protocol') {
      result.warnings.push(`Unexpected Context7 boundary: ${boundary}`);
    }
  }

  private static async simulateServiceCall(
    service: { name: string; protocol: string; version: string; endpoint: string },
    context: api.Context,
    expectedTraceId?: string
  ): Promise<{
    success: boolean;
    traceId?: string;
    spanId?: string;
    context?: api.Context;
    errors: string[];
  }> {
    // Simulate service call with context propagation
    const tracer = api.trace.getTracer('context7-validator');
    
    return new Promise((resolve) => {
      api.context.with(context, () => {
        const span = tracer.startSpan(`${service.protocol}-call-${service.name}`, {
          attributes: {
            'service.name': service.name,
            'service.protocol': service.protocol,
            'service.version': service.version,
            'service.endpoint': service.endpoint
          }
        });

        const spanContext = span.spanContext();
        const newContext = api.trace.setSpan(context, span);

        setTimeout(() => {
          span.end();
          
          const result = {
            success: true,
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
            context: newContext,
            errors: [] as string[]
          };

          // Validate trace continuity
          if (expectedTraceId && spanContext.traceId !== expectedTraceId) {
            result.success = false;
            result.errors.push(`Trace ID mismatch: expected ${expectedTraceId}, got ${spanContext.traceId}`);
          }

          resolve(result);
        }, 50); // Simulate async processing
      });
    });
  }

  private static validateTraceContinuity(
    hops: Array<{ traceId?: string; spanId?: string; service: string }>,
    expectedTraceId: string
  ): { isValid: boolean; errors: string[] } {
    const result = { isValid: true, errors: [] as string[] };

    for (const hop of hops) {
      if (!hop.traceId) {
        result.isValid = false;
        result.errors.push(`Missing trace ID in ${hop.service}`);
      } else if (hop.traceId !== expectedTraceId) {
        result.isValid = false;
        result.errors.push(`Trace ID mismatch in ${hop.service}: expected ${expectedTraceId}, got ${hop.traceId}`);
      }

      if (!hop.spanId) {
        result.isValid = false;
        result.errors.push(`Missing span ID in ${hop.service}`);
      }
    }

    return result;
  }

  private static async testPromiseBoundary(
    context: api.Context,
    expectedTraceId: string
  ): Promise<{ name: string; success: boolean; traceId?: string; spanId?: string; preservedContext: boolean; errors: string[] }> {
    const result = {
      name: 'Promise Boundary Test',
      success: false,
      preservedContext: false,
      errors: [] as string[]
    };

    try {
      await api.context.with(context, async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            const currentSpan = api.trace.getActiveSpan();
            if (currentSpan) {
              const spanContext = currentSpan.spanContext();
              result.traceId = spanContext.traceId;
              result.spanId = spanContext.spanId;
              result.preservedContext = spanContext.traceId === expectedTraceId;
              result.success = result.preservedContext;
            } else {
              result.errors.push('No active span found after promise boundary');
            }
            resolve();
          }, 10);
        });
      });
    } catch (error) {
      result.errors.push(`Promise boundary test error: ${(error as Error).message}`);
    }

    return result;
  }

  private static async testTimeoutBoundary(
    context: api.Context,
    expectedTraceId: string
  ): Promise<{ name: string; success: boolean; traceId?: string; spanId?: string; preservedContext: boolean; errors: string[] }> {
    const result = {
      name: 'Timeout Boundary Test',
      success: false,
      preservedContext: false,
      errors: [] as string[]
    };

    try {
      await new Promise<void>((resolve) => {
        api.context.with(context, () => {
          Context7AsyncUtils.setTimeout(() => {
            const currentSpan = api.trace.getActiveSpan();
            if (currentSpan) {
              const spanContext = currentSpan.spanContext();
              result.traceId = spanContext.traceId;
              result.spanId = spanContext.spanId;
              result.preservedContext = spanContext.traceId === expectedTraceId;
              result.success = result.preservedContext;
            } else {
              result.errors.push('No active span found after timeout boundary');
            }
            resolve();
          }, 10);
        });
      });
    } catch (error) {
      result.errors.push(`Timeout boundary test error: ${(error as Error).message}`);
    }

    return result;
  }

  private static async testUEPMessageBoundary(
    context: api.Context,
    expectedTraceId: string
  ): Promise<{ name: string; success: boolean; traceId?: string; spanId?: string; preservedContext: boolean; errors: string[] }> {
    const result = {
      name: 'UEP Message Boundary Test',
      success: false,
      preservedContext: false,
      errors: [] as string[]
    };

    try {
      const testMessage: UEPMessage = {
        id: 'boundary-test-001',
        type: 'test-boundary',
        version: '2.1.0',
        source: 'test-service',
        destination: 'boundary-validator',
        timestamp: Date.now(),
        payload: { test: true }
      };

      // Inject context into message
      const enrichedMessage = Context7PropagationUtils.injectUEPContext(context, testMessage);
      
      // Process message through UEP middleware
      await Context7UEPMiddleware.processInboundMessage(
        enrichedMessage,
        async (msg, extractedContext) => {
          const currentSpan = api.trace.getActiveSpan();
          if (currentSpan) {
            const spanContext = currentSpan.spanContext();
            result.traceId = spanContext.traceId;
            result.spanId = spanContext.spanId;
            result.preservedContext = spanContext.traceId === expectedTraceId;
            result.success = result.preservedContext;
          } else {
            result.errors.push('No active span found in UEP message handler');
          }
          
          return { processed: true };
        }
      );
    } catch (error) {
      result.errors.push(`UEP message boundary test error: ${(error as Error).message}`);
    }

    return result;
  }

  private static async testWrappedPromiseBoundary(
    context: api.Context,
    expectedTraceId: string
  ): Promise<{ name: string; success: boolean; traceId?: string; spanId?: string; preservedContext: boolean; errors: string[] }> {
    const result = {
      name: 'Wrapped Promise Boundary Test',
      success: false,
      preservedContext: false,
      errors: [] as string[]
    };

    try {
      await api.context.with(context, async () => {
        const wrappedPromise = Context7AsyncUtils.wrapPromise(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              const currentSpan = api.trace.getActiveSpan();
              if (currentSpan) {
                const spanContext = currentSpan.spanContext();
                result.traceId = spanContext.traceId;
                result.spanId = spanContext.spanId;
                result.preservedContext = spanContext.traceId === expectedTraceId;
                result.success = result.preservedContext;
              } else {
                result.errors.push('No active span found in wrapped promise');
              }
              resolve();
            }, 10);
          })
        );

        await wrappedPromise;
      });
    } catch (error) {
      result.errors.push(`Wrapped promise boundary test error: ${(error as Error).message}`);
    }

    return result;
  }
}

console.log('✅ Context7 UEP validation utilities loaded');