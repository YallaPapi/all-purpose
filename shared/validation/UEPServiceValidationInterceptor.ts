/**
 * UEP Service-to-Service Validation Interceptor
 * 
 * Comprehensive validation interceptor for service-to-service communication
 * implementing HTTP client interceptors, gRPC middleware, circuit breaker
 * integration, retry logic, and distributed caching. Based on TaskMaster
 * research findings (Task 239) and Context7 methodology.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as grpc from '@grpc/grpc-js';
import { trace, context, SpanStatusCode, SpanKind, Span } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import CircuitBreaker from 'opossum';
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { UEPValidationMiddleware, UEPProtocolMessage, UEPValidationResult } from '../../containers/api-gateway/src/validation/UEPValidationMiddleware';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPServiceValidationConfig {
  enableHTTPValidation: boolean;
  enableGRPCValidation: boolean;
  enableRequestValidation: boolean;
  enableResponseValidation: boolean;
  enableCircuitBreaker: boolean;
  enableRetryLogic: boolean;
  enableDistributedCache: boolean;
  circuitBreakerOptions: {
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
    monitoringPeriod: number;
  };
  retryOptions: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  cacheOptions: {
    maxSize: number;
    ttl: number;
    staleWhileRevalidate: number;
  };
  validationTimeout: number;
  strictMode: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
}

export interface UEPServiceRequest {
  serviceId: string;
  method: string;
  endpoint: string;
  headers: Record<string, string>;
  payload?: any;
  metadata?: Record<string, any>;
}

export interface UEPServiceResponse {
  statusCode: number;
  headers: Record<string, string>;
  payload?: any;
  validationResult?: UEPValidationResult;
  fromCache: boolean;
  retryCount: number;
}

export interface UEPValidationMetrics {
  serviceValidationsTotal: Counter;
  serviceValidationErrors: Counter;
  serviceValidationDuration: Histogram;
  circuitBreakerEvents: Counter;
  retryAttemptsTotal: Counter;
  cacheHitRatio: Gauge;
  httpClientValidations: Counter;
  grpcValidations: Counter;
}

// =============================================================================
// UEP Service Validation Interceptor Core Class
// =============================================================================

export class UEPServiceValidationInterceptor extends EventEmitter {
  private readonly config: UEPServiceValidationConfig;
  private readonly validator: UEPValidationMiddleware;
  private readonly tracer = trace.getTracer('uep-service-validation-interceptor', '1.0.0');
  
  // HTTP Client with validation
  private readonly httpClient: AxiosInstance;
  
  // Circuit breakers for different services
  private readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();
  
  // Distributed validation cache
  private readonly validationCache: LRUCache<string, UEPValidationResult>;
  
  // Metrics collection
  private readonly metrics: UEPValidationMetrics;

  constructor(config: Partial<UEPServiceValidationConfig> = {}) {
    super();
    
    this.config = {
      enableHTTPValidation: true,
      enableGRPCValidation: true,
      enableRequestValidation: true,
      enableResponseValidation: true,
      enableCircuitBreaker: true,
      enableRetryLogic: true,
      enableDistributedCache: true,
      circuitBreakerOptions: {
        timeout: 10000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        monitoringPeriod: 10000
      },
      retryOptions: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      },
      cacheOptions: {
        maxSize: 10000,
        ttl: 300000, // 5 minutes
        staleWhileRevalidate: 60000 // 1 minute
      },
      validationTimeout: 5000,
      strictMode: true,
      enableMetrics: true,
      enableTracing: true,
      ...config
    };

    // Initialize validator
    this.validator = new UEPValidationMiddleware({
      strictMode: this.config.strictMode,
      enableCaching: this.config.enableDistributedCache,
      enableMetrics: this.config.enableMetrics,
      enableTracing: this.config.enableTracing
    });

    // Initialize HTTP client with interceptors
    this.httpClient = this.createHTTPClient();
    
    // Initialize validation cache
    this.validationCache = new LRUCache({
      max: this.config.cacheOptions.maxSize,
      ttl: this.config.cacheOptions.ttl,
      allowStale: true,
      updateAgeOnGet: true
    });

    // Initialize metrics
    this.metrics = this.initializeMetrics();
  }

  // =============================================================================
  // HTTP Client with Validation Interceptors
  // =============================================================================

  private createHTTPClient(): AxiosInstance {
    const client = axios.create({
      timeout: this.config.validationTimeout,
      validateStatus: () => true // Don't throw on HTTP errors
    });

    // Request interceptor for validation
    client.interceptors.request.use(
      async (config) => {
        return this.tracer.startActiveSpan('uep.service.http.request.validate', async (span) => {
          try {
            if (!this.config.enableHTTPValidation || !this.config.enableRequestValidation) {
              return config;
            }

            span.setAttributes({
              'http.method': config.method?.toUpperCase() || 'GET',
              'http.url': config.url || '',
              'uep.validation.type': 'request'
            });

            // Validate request payload if present
            if (config.data && typeof config.data === 'object') {
              const validationResult = await this.validateWithCache(
                config.data,
                `${config.method?.toUpperCase()} ${config.url}`
              );

              if (!validationResult.valid && this.config.strictMode) {
                const error = new Error('UEP request validation failed');
                (error as any).validationResult = validationResult;
                throw error;
              }

              // Attach validation result to request
              config.metadata = {
                ...config.metadata,
                uepValidation: validationResult
              };
            }

            // Add UEP headers
            config.headers = {
              ...config.headers,
              'X-UEP-Protocol-Version': '2.0.0',
              'X-UEP-Validation-Enabled': 'true',
              'Content-Type': 'application/json'
            };

            span.setStatus({ code: SpanStatusCode.OK });
            return config;

          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
            
            if (this.config.enableMetrics) {
              this.metrics.httpClientValidations.inc({
                method: config.method?.toUpperCase() || 'GET',
                result: 'error'
              });
            }
            
            throw error;
          }
        });
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for validation
    client.interceptors.response.use(
      async (response) => {
        return this.tracer.startActiveSpan('uep.service.http.response.validate', async (span) => {
          try {
            if (!this.config.enableHTTPValidation || !this.config.enableResponseValidation) {
              return response;
            }

            span.setAttributes({
              'http.status_code': response.status,
              'http.method': response.config.method?.toUpperCase() || 'GET',
              'uep.validation.type': 'response'
            });

            // Validate response payload if present
            if (response.data && typeof response.data === 'object') {
              const validationResult = await this.validateWithCache(
                response.data,
                `${response.config.method?.toUpperCase()} ${response.config.url} response`
              );

              // Attach validation result to response
              (response as any).uepValidation = validationResult;

              if (!validationResult.valid) {
                this.emit('validationWarning', {
                  type: 'response',
                  url: response.config.url,
                  errors: validationResult.errors
                });
              }
            }

            if (this.config.enableMetrics) {
              this.metrics.httpClientValidations.inc({
                method: response.config.method?.toUpperCase() || 'GET',
                result: 'success'
              });
            }

            span.setStatus({ code: SpanStatusCode.OK });
            return response;

          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
            throw error;
          }
        });
      },
      async (error: AxiosError) => {
        // Handle HTTP errors with validation context
        if (this.config.enableMetrics) {
          this.metrics.httpClientValidations.inc({
            method: error.config?.method?.toUpperCase() || 'GET',
            result: 'http_error'
          });
        }
        
        return Promise.reject(error);
      }
    );

    return client;
  }

  // =============================================================================
  // gRPC Validation Middleware
  // =============================================================================

  public createGRPCValidationMiddleware() {
    return {
      // Client interceptor for gRPC calls
      clientInterceptor: (options: any, nextCall: any) => {
        return new grpc.InterceptingCall(nextCall(options), {
          start: (metadata, listener, next) => {
            this.tracer.startActiveSpan('uep.service.grpc.request.validate', async (span) => {
              try {
                if (!this.config.enableGRPCValidation) {
                  return next(metadata, listener);
                }

                span.setAttributes({
                  'rpc.system': 'grpc',
                  'rpc.service': options.method_definition?.service_name || 'unknown',
                  'rpc.method': options.method_definition?.method_name || 'unknown',
                  'uep.validation.type': 'grpc_request'
                });

                // Add UEP metadata
                metadata.set('uep-protocol-version', '2.0.0');
                metadata.set('uep-validation-enabled', 'true');

                if (this.config.enableMetrics) {
                  this.metrics.grpcValidations.inc({
                    service: options.method_definition?.service_name || 'unknown',
                    method: options.method_definition?.method_name || 'unknown',
                    type: 'request'
                  });
                }

                span.setStatus({ code: SpanStatusCode.OK });
                next(metadata, listener);

              } catch (error) {
                span.recordException(error as Error);
                span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
                throw error;
              }
            });
          },

          sendMessage: (message, next) => {
            this.tracer.startActiveSpan('uep.service.grpc.message.validate', async (span) => {
              try {
                if (this.config.enableRequestValidation && message) {
                  const validationResult = await this.validateWithCache(
                    message,
                    `gRPC ${options.method_definition?.service_name}.${options.method_definition?.method_name}`
                  );

                  if (!validationResult.valid && this.config.strictMode) {
                    const error = new Error('UEP gRPC request validation failed');
                    (error as any).validationResult = validationResult;
                    throw error;
                  }
                }

                span.setStatus({ code: SpanStatusCode.OK });
                next(message);

              } catch (error) {
                span.recordException(error as Error);
                span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
                throw error;
              }
            });
          }
        });
      },

      // Server interceptor for gRPC services
      serverInterceptor: (call: any, methodDefinition: any, next: any) => {
        return this.tracer.startActiveSpan('uep.service.grpc.server.validate', async (span) => {
          try {
            span.setAttributes({
              'rpc.system': 'grpc',
              'rpc.service': methodDefinition.service_name || 'unknown',
              'rpc.method': methodDefinition.method_name || 'unknown',
              'uep.validation.type': 'grpc_server'
            });

            if (this.config.enableMetrics) {
              this.metrics.grpcValidations.inc({
                service: methodDefinition.service_name || 'unknown',
                method: methodDefinition.method_name || 'unknown',
                type: 'server'
              });
            }

            span.setStatus({ code: SpanStatusCode.OK });
            return next(call, methodDefinition);

          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
            throw error;
          }
        });
      }
    };
  }

  // =============================================================================
  // Circuit Breaker Integration
  // =============================================================================

  private getCircuitBreaker(serviceId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceId)) {
      const breaker = new CircuitBreaker(
        async (request: UEPServiceRequest) => {
          return this.executeValidatedRequest(request);
        },
        {
          timeout: this.config.circuitBreakerOptions.timeout,
          errorThresholdPercentage: this.config.circuitBreakerOptions.errorThresholdPercentage,
          resetTimeout: this.config.circuitBreakerOptions.resetTimeout,
          rollingCountTimeout: this.config.circuitBreakerOptions.monitoringPeriod,
          name: `uep-service-${serviceId}`
        }
      );

      // Circuit breaker event handlers
      breaker.on('open', () => {
        this.emit('circuitBreakerOpen', { serviceId });
        if (this.config.enableMetrics) {
          this.metrics.circuitBreakerEvents.inc({ service: serviceId, event: 'open' });
        }
      });

      breaker.on('halfOpen', () => {
        this.emit('circuitBreakerHalfOpen', { serviceId });
        if (this.config.enableMetrics) {
          this.metrics.circuitBreakerEvents.inc({ service: serviceId, event: 'half_open' });
        }
      });

      breaker.on('close', () => {
        this.emit('circuitBreakerClose', { serviceId });
        if (this.config.enableMetrics) {
          this.metrics.circuitBreakerEvents.inc({ service: serviceId, event: 'close' });
        }
      });

      this.circuitBreakers.set(serviceId, breaker);
    }

    return this.circuitBreakers.get(serviceId)!;
  }

  // =============================================================================
  // Retry Logic with Validation
  // =============================================================================

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt < this.config.retryOptions.maxAttempts) {
      try {
        const result = await operation();
        
        if (this.config.enableMetrics && attempt > 0) {
          this.metrics.retryAttemptsTotal.inc({
            context,
            result: 'success',
            attempt: attempt.toString()
          });
        }
        
        return result;

      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Don't retry validation errors in strict mode
        if ((error as any).validationResult && this.config.strictMode) {
          break;
        }

        if (attempt < this.config.retryOptions.maxAttempts) {
          const delay = Math.min(
            this.config.retryOptions.baseDelay * Math.pow(this.config.retryOptions.backoffMultiplier, attempt - 1),
            this.config.retryOptions.maxDelay
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          if (this.config.enableMetrics) {
            this.metrics.retryAttemptsTotal.inc({
              context,
              result: 'retry',
              attempt: attempt.toString()
            });
          }
        }
      }
    }

    if (this.config.enableMetrics) {
      this.metrics.retryAttemptsTotal.inc({
        context,
        result: 'failure',
        attempt: attempt.toString()
      });
    }

    throw lastError!;
  }

  // =============================================================================
  // Distributed Validation Caching
  // =============================================================================

  private async validateWithCache(
    data: any,
    context: string
  ): Promise<UEPValidationResult> {
    const cacheKey = this.generateCacheKey(data, context);
    
    // Check cache first
    if (this.config.enableDistributedCache) {
      const cachedResult = this.validationCache.get(cacheKey);
      if (cachedResult) {
        if (this.config.enableMetrics) {
          this.metrics.cacheHitRatio.set(
            this.validationCache.size / (this.validationCache.size + 1)
          );
        }
        
        return {
          ...cachedResult,
          cacheHit: true
        };
      }
    }

    // Perform validation
    const validationResult = this.validator.validateUEPMessage(data, context);
    
    // Cache the result
    if (this.config.enableDistributedCache) {
      this.validationCache.set(cacheKey, validationResult);
    }

    return validationResult;
  }

  private generateCacheKey(data: any, context: string): string {
    const normalizedData = JSON.stringify({ data, context }, Object.keys({ data, context }).sort());
    return createHash('sha256').update(normalizedData).digest('hex');
  }

  // =============================================================================
  // Core Request Execution
  // =============================================================================

  private async executeValidatedRequest(request: UEPServiceRequest): Promise<UEPServiceResponse> {
    return this.tracer.startActiveSpan('uep.service.validated_request', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'uep.service.id': request.serviceId,
          'uep.service.method': request.method,
          'uep.service.endpoint': request.endpoint
        });

        // Execute HTTP request with validation
        const response = await this.httpClient.request({
          method: request.method as any,
          url: request.endpoint,
          data: request.payload,
          headers: request.headers,
          metadata: request.metadata
        });

        const validationTime = Date.now() - startTime;

        if (this.config.enableMetrics) {
          this.metrics.serviceValidationsTotal.inc({
            service: request.serviceId,
            method: request.method,
            result: 'success'
          });

          this.metrics.serviceValidationDuration.observe(
            { service: request.serviceId, method: request.method },
            validationTime / 1000
          );
        }

        span.setStatus({ code: SpanStatusCode.OK });

        return {
          statusCode: response.status,
          headers: response.headers as Record<string, string>,
          payload: response.data,
          validationResult: (response as any).uepValidation,
          fromCache: false,
          retryCount: 0
        };

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        if (this.config.enableMetrics) {
          this.metrics.serviceValidationErrors.inc({
            service: request.serviceId,
            method: request.method,
            error_type: (error as Error).name
          });
        }

        throw error;
      }
    });
  }

  // =============================================================================
  // Public API Methods
  // =============================================================================

  public async callService(request: UEPServiceRequest): Promise<UEPServiceResponse> {
    if (this.config.enableCircuitBreaker) {
      const circuitBreaker = this.getCircuitBreaker(request.serviceId);
      return circuitBreaker.fire(request);
    }

    if (this.config.enableRetryLogic) {
      return this.executeWithRetry(
        () => this.executeValidatedRequest(request),
        `${request.serviceId}:${request.method}:${request.endpoint}`
      );
    }

    return this.executeValidatedRequest(request);
  }

  public getHTTPClient(): AxiosInstance {
    return this.httpClient;
  }

  public getGRPCInterceptors() {
    return this.createGRPCValidationMiddleware();
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics(): UEPValidationMetrics {
    const prefix = 'uep_service_validation_';

    return {
      serviceValidationsTotal: new Counter({
        name: `${prefix}total`,
        help: 'Total service-to-service validations',
        labelNames: ['service', 'method', 'result']
      }),

      serviceValidationErrors: new Counter({
        name: `${prefix}errors_total`,
        help: 'Total service validation errors',
        labelNames: ['service', 'method', 'error_type']
      }),

      serviceValidationDuration: new Histogram({
        name: `${prefix}duration_seconds`,
        help: 'Service validation duration',
        labelNames: ['service', 'method'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
      }),

      circuitBreakerEvents: new Counter({
        name: `${prefix}circuit_breaker_events_total`,
        help: 'Circuit breaker events',
        labelNames: ['service', 'event']
      }),

      retryAttemptsTotal: new Counter({
        name: `${prefix}retry_attempts_total`,
        help: 'Retry attempts',
        labelNames: ['context', 'result', 'attempt']
      }),

      cacheHitRatio: new Gauge({
        name: `${prefix}cache_hit_ratio`,
        help: 'Validation cache hit ratio'
      }),

      httpClientValidations: new Counter({
        name: `${prefix}http_client_validations_total`,
        help: 'HTTP client validations',
        labelNames: ['method', 'result']
      }),

      grpcValidations: new Counter({
        name: `${prefix}grpc_validations_total`,
        help: 'gRPC validations',
        labelNames: ['service', 'method', 'type']
      })
    };
  }

  // =============================================================================
  // Management Methods
  // =============================================================================

  public getStats() {
    return {
      config: this.config,
      cacheStats: {
        size: this.validationCache.size,
        maxSize: this.validationCache.max,
        hitRatio: this.validationCache.size > 0 ? 
          (this.validationCache.size / (this.validationCache.size + this.validationCache.size)) : 0
      },
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([serviceId, breaker]) => ({
        serviceId,
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        stats: breaker.stats
      }))
    };
  }

  public clearCache(): void {
    this.validationCache.clear();
  }

  public async shutdown(): Promise<void> {
    // Close all circuit breakers
    for (const [serviceId, breaker] of this.circuitBreakers) {
      breaker.shutdown();
    }
    
    this.circuitBreakers.clear();
    this.validationCache.clear();
    
    this.emit('shutdown');
  }
}

export default UEPServiceValidationInterceptor;