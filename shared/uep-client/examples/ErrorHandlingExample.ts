/**
 * UEP Error Handling Integration Example
 * 
 * Demonstrates comprehensive error handling, validation, and recovery
 * patterns for UEP agents using the standardized error handling system.
 * 
 * This example shows:
 * - Error handler initialization and configuration
 * - Protocol validation integration
 * - Error recovery and resilience patterns
 * - Custom error handling for agent capabilities
 * - Circuit breaker and fallback mechanisms
 * - Monitoring and observability integration
 */

import {
  UEPAgent,
  UEPCapability,
  UEPEventHandler,
  UEPRequest,
  UEPResponse,
  UEPEvent,
  createUEPClient,
  startAllAgents,
  UEPDefaults
} from '../src/index.js';

import {
  initializeUEPErrorSystem,
  UEPError,
  UEPErrorFactory,
  UEPErrorType,
  UEPErrorSeverity,
  CommonErrors,
  ErrorTypeGuards,
  UEPErrorUtils,
  withRecovery
} from '../src/errors/index.js';

/**
 * Example agent with comprehensive error handling
 */
@UEPAgent({
  name: 'resilient-processing-agent',
  version: '1.0.0',
  type: 'domain',
  description: 'Agent demonstrating comprehensive error handling patterns',
  resources: {
    memory: '512Mi',
    cpu: '0.5'
  }
})
export class ResilientProcessingAgent {
  private processingCount = 0;
  private errorCount = 0;
  private lastError: UEPError | null = null;
  private isHealthy = true;

  /**
   * Main processing capability with error handling
   */
  @UEPCapability({
    name: 'process-data',
    version: '1.0.0',
    description: 'Process data with comprehensive error handling',
    timeout: 30000
  })
  async processData(
    payload: {
      data: any[];
      options?: {
        failureRate?: number;
        timeoutMs?: number;
        validateSchema?: boolean;
      };
    },
    request: UEPRequest<any>
  ): Promise<{
    results: any[];
    processed: number;
    errors: number;
    duration: number;
  }> {
    const startTime = Date.now();
    this.processingCount++;

    try {
      // Validate input data
      if (!payload.data || !Array.isArray(payload.data)) {
        throw CommonErrors.validationFailed(
          'Invalid input: data must be an array',
          ['data field is required and must be an array']
        );
      }

      // Simulate processing with potential failures
      const results: any[] = [];
      let errorCount = 0;
      const failureRate = payload.options?.failureRate || 0;

      for (let i = 0; i < payload.data.length; i++) {
        try {
          // Simulate random failures
          if (Math.random() < failureRate) {
            throw new Error(`Processing failed for item ${i}`);
          }

          // Simulate timeout
          if (payload.options?.timeoutMs && Math.random() < 0.1) {
            await this.sleep(payload.options.timeoutMs + 1000);
          }

          // Process item
          const result = await this.processItem(payload.data[i], {
            index: i,
            traceId: request.tracing?.traceId,
            spanId: request.tracing?.spanId
          });

          results.push(result);

        } catch (error) {
          errorCount++;
          this.errorCount++;
          
          // Convert to UEP error for consistent handling
          const uepError = UEPErrorUtils.fromError(error as Error);
          this.lastError = uepError;

          console.warn(`Processing error for item ${i}:`, uepError.message);
          
          // Continue processing other items (resilient behavior)
          results.push({
            error: true,
            message: uepError.message,
            type: uepError.type
          });
        }
      }

      // Update health status based on error rate
      const errorRate = errorCount / payload.data.length;
      this.isHealthy = errorRate < 0.5; // Consider unhealthy if >50% errors

      return {
        results,
        processed: payload.data.length - errorCount,
        errors: errorCount,
        duration: Date.now() - startTime
      };

    } catch (error) {
      this.errorCount++;
      this.isHealthy = false;
      
      // Convert and re-throw as UEP error
      const uepError = UEPErrorUtils.fromError(error as Error);
      this.lastError = uepError;
      
      throw uepError;
    }
  }

  /**
   * Capability that demonstrates timeout handling
   */
  @UEPCapability({
    name: 'slow-operation',
    version: '1.0.0',
    description: 'Demonstrates timeout and retry patterns',
    timeout: 5000
  })
  async slowOperation(
    payload: {
      duration?: number;
      shouldFail?: boolean;
    },
    request: UEPRequest<any>
  ): Promise<{
    completed: boolean;
    duration: number;
    retryCount?: number;
  }> {
    const startTime = Date.now();
    const duration = payload.duration || 1000;

    // Simulate failure
    if (payload.shouldFail) {
      throw CommonErrors.internalError('Simulated failure in slow operation');
    }

    // Simulate slow operation
    await this.sleep(duration);

    // Random timeout simulation
    if (Math.random() < 0.2) { // 20% chance
      throw CommonErrors.timeout('slow-operation', duration);
    }

    return {
      completed: true,
      duration: Date.now() - startTime
    };
  }

  /**
   * Capability for testing external dependencies
   */
  @UEPCapability({
    name: 'call-external-service',
    version: '1.0.0',
    description: 'Demonstrates external service error handling',
    timeout: 10000
  })
  async callExternalService(
    payload: {
      serviceUrl: string;
      retries?: number;
      timeout?: number;
    },
    request: UEPRequest<any>
  ): Promise<{
    success: boolean;
    data?: any;
    attempts: number;
    totalDuration: number;
  }> {
    const startTime = Date.now();
    const maxRetries = payload.retries || 3;
    let attempts = 0;
    let lastError: UEPError | null = null;

    while (attempts < maxRetries) {
      attempts++;
      
      try {
        // Simulate external service call
        const result = await this.simulateExternalCall(
          payload.serviceUrl,
          payload.timeout || 5000
        );

        return {
          success: true,
          data: result,
          attempts,
          totalDuration: Date.now() - startTime
        };

      } catch (error) {
        lastError = UEPErrorUtils.fromError(error as Error);
        
        // Only retry if error is retryable
        if (attempts < maxRetries && UEPErrorUtils.isRetryable(lastError)) {
          const delay = UEPErrorUtils.calculateRetryDelay(attempts - 1);
          console.log(`Retrying external service call (attempt ${attempts + 1}/${maxRetries}) after ${delay}ms`);
          await this.sleep(delay);
          continue;
        }
        
        break;
      }
    }

    // All retries failed
    throw lastError || CommonErrors.internalError('External service call failed');
  }

  /**
   * Get agent status for health checks
   */
  @UEPCapability({
    name: 'get-status',
    version: '1.0.0',
    description: 'Get current agent status and error statistics'
  })
  async getStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    processingCount: number;
    errorCount: number;
    errorRate: number;
    lastError?: {
      type: string;
      message: string;
      timestamp: string;
    };
    uptime: number;
  }> {
    const errorRate = this.processingCount > 0 ? this.errorCount / this.processingCount : 0;

    return {
      status: this.isHealthy ? 'healthy' : 'unhealthy',
      processingCount: this.processingCount,
      errorCount: this.errorCount,
      errorRate,
      lastError: this.lastError ? {
        type: this.lastError.type,
        message: this.lastError.message,
        timestamp: this.lastError.timestamp.toISOString()
      } : undefined,
      uptime: process.uptime()
    };
  }

  /**
   * Handle error events
   */
  @UEPEventHandler({
    eventType: 'system.error',
    version: '1.0.0',
    queue: 'error-handling'
  })
  async handleErrorEvent(
    payload: {
      errorType: string;
      severity: string;
      message: string;
      source: string;
      metadata?: Record<string, any>;
    },
    event: UEPEvent<any>
  ): Promise<void> {
    console.log('🚨 Received error event:', {
      type: payload.errorType,
      severity: payload.severity,
      message: payload.message,
      source: payload.source,
      timestamp: event.timestamp
    });

    // Take action based on error severity
    if (payload.severity === 'critical') {
      console.error('Critical error detected - entering degraded mode');
      this.isHealthy = false;
    }
  }

  /**
   * Private helper methods
   */
  private async processItem(
    item: any,
    context: { index: number; traceId?: string; spanId?: string }
  ): Promise<any> {
    // Simulate item processing with potential errors
    await this.sleep(10 + Math.random() * 50); // 10-60ms processing time

    if (typeof item === 'object' && item !== null) {
      return {
        ...item,
        processed: true,
        processedAt: new Date().toISOString(),
        index: context.index
      };
    }

    return {
      originalValue: item,
      processed: true,
      processedAt: new Date().toISOString(),
      index: context.index
    };
  }

  private async simulateExternalCall(url: string, timeout: number): Promise<any> {
    // Simulate network delay
    await this.sleep(Math.random() * 2000);

    // Simulate various failure scenarios
    const rand = Math.random();
    
    if (rand < 0.2) { // 20% chance
      throw CommonErrors.connectionFailed(url);
    }
    
    if (rand < 0.3) { // 10% chance
      throw CommonErrors.timeout('external-service-call', timeout);
    }
    
    if (rand < 0.35) { // 5% chance
      throw CommonErrors.authenticationFailed('API key invalid');
    }

    // Success
    return {
      status: 'success',
      data: { result: 'External service response' },
      timestamp: new Date().toISOString()
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Example usage of the error handling system
 */
export async function runErrorHandlingExample(): Promise<void> {
  try {
    console.log('🔧 Initializing UEP Error Handling Example...');

    // Create UEP client
    const clientOptions = UEPDefaults.createClientOptions('resilient-agent', 'domain');
    clientOptions.connection.servers = ['nats://localhost:4222'];

    // Initialize comprehensive error handling system
    const { errorHandler, recovery, validator } = await initializeUEPErrorSystem(
      undefined, // Client will be set later
      {
        errorHandler: {
          enableAutoRecovery: true,
          enableCircuitBreaker: true,
          enableErrorRateTracking: true,
          maxErrorRate: 0.2,
          circuitBreakerThreshold: 5
        },
        recovery: {
          maxRetries: 3,
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2,
          jitterEnabled: true,
          fallbackEnabled: true
        },
        validator: {
          strictMode: true,
          enablePerformanceValidation: true,
          enableSecurityValidation: true,
          maxMessageSize: 1024 * 1024 // 1MB
        }
      }
    );

    console.log('✅ Error handling system initialized');

    // Start all agents
    await startAllAgents(clientOptions);
    console.log('✅ Resilient Processing Agent started');

    // Create client for testing
    const client = createUEPClient('error-test-client', 'meta', clientOptions);
    await client.connect();

    // Initialize error handler with client
    errorHandler.initialize(client);
    recovery.initialize(client);

    console.log('✅ Error handling system connected to client');

    // Setup error event listeners
    errorHandler.on('error', (error, context) => {
      console.log(`📊 Error recorded: ${error.type} - ${error.message}`);
    });

    errorHandler.on('circuit-breaker-opened', (event) => {
      console.log('⚡ Circuit breaker opened:', event);
    });

    recovery.on('recovery-success', (event) => {
      console.log('🔄 Recovery successful:', event);
    });

    recovery.on('recovery-failed', (event) => {
      console.log('❌ Recovery failed:', event);
    });

    console.log('\n🧪 Running error handling demonstrations...\n');

    // Demonstration 1: Successful processing
    console.log('1️⃣ Testing successful processing...');
    try {
      const result = await client.request('process-data', {
        data: [1, 2, 3, 4, 5],
        options: { failureRate: 0 }
      });
      console.log('   ✅ Success:', result.payload);
    } catch (error) {
      console.log('   ❌ Unexpected error:', error.message);
    }

    // Demonstration 2: Processing with some failures
    console.log('\n2️⃣ Testing processing with failures...');
    try {
      const result = await client.request('process-data', {
        data: Array.from({ length: 10 }, (_, i) => i),
        options: { failureRate: 0.3 } // 30% failure rate
      });
      console.log('   📊 Results:', {
        processed: result.payload.processed,
        errors: result.payload.errors,
        duration: result.payload.duration
      });
    } catch (error) {
      console.log('   ❌ Processing error:', error.message);
    }

    // Demonstration 3: Timeout handling with recovery
    console.log('\n3️⃣ Testing timeout handling with recovery...');
    const resilientSlowOperation = withRecovery(
      () => client.request('slow-operation', {
        duration: 8000, // Longer than timeout
        shouldFail: false
      }),
      recovery,
      {
        operationId: 'slow-operation-test',
        retryOptions: {
          maxAttempts: 3,
          baseDelay: 1000,
          shouldRetry: (error) => error.type === UEPErrorType.TIMEOUT
        },
        fallback: async () => ({
          payload: {
            completed: false,
            duration: 0,
            fallbackUsed: true
          }
        })
      }
    );

    try {
      const result = await resilientSlowOperation;
      console.log('   📊 Result:', result.payload);
    } catch (error) {
      console.log('   ❌ Operation failed:', error.message);
    }

    // Demonstration 4: External service calls with retry
    console.log('\n4️⃣ Testing external service calls with retry...');
    try {
      const result = await client.request('call-external-service', {
        serviceUrl: 'https://api.example.com/data',
        retries: 3,
        timeout: 5000
      });
      console.log('   📊 External call result:', {
        success: result.payload.success,
        attempts: result.payload.attempts,
        duration: result.payload.totalDuration
      });
    } catch (error) {
      if (ErrorTypeGuards.isUEPError(error)) {
        console.log('   ❌ External service error:', {
          type: error.type,
          message: error.message,
          severity: error.severity
        });
      } else {
        console.log('   ❌ Unexpected error:', error.message);
      }
    }

    // Demonstration 5: Protocol validation
    console.log('\n5️⃣ Testing protocol validation...');
    const invalidMessage = {
      id: 'test',
      // Missing required fields
      payload: { test: true }
    };

    const validationResult = await validator.validateMessage(invalidMessage as any);
    console.log('   📋 Validation result:', {
      valid: validationResult.valid,
      errors: validationResult.errors.length,
      warnings: validationResult.warnings.length,
      violations: validationResult.errors.map(e => e.message)
    });

    // Demonstration 6: Error statistics and monitoring
    console.log('\n6️⃣ Checking error statistics...');
    const statistics = errorHandler.getStatistics();
    console.log('   📊 Error statistics:', {
      totalErrors: statistics.totalErrors,
      errorRate: statistics.errorRate,
      circuitBreakerStatus: statistics.circuitBreakerStatus,
      recentErrors: statistics.recentErrors.length
    });

    // Demonstration 7: Agent status
    console.log('\n7️⃣ Getting agent status...');
    try {
      const status = await client.request('get-status', {});
      console.log('   🏥 Agent status:', status.payload);
    } catch (error) {
      console.log('   ❌ Status check error:', error.message);
    }

    // Demonstration 8: Send error event
    console.log('\n8️⃣ Sending error event...');
    await client.sendEvent('system.error', {
      errorType: 'demonstration',
      severity: 'medium',
      message: 'This is a demonstration error event',
      source: 'error-handling-example',
      metadata: {
        timestamp: new Date().toISOString(),
        component: 'demo'
      }
    });

    console.log('\n✨ Error handling demonstration completed!');
    console.log('   Check the logs above to see comprehensive error handling in action.');

  } catch (error) {
    console.error('❌ Error handling example failed:', error);
  }
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runErrorHandlingExample().catch(console.error);
}