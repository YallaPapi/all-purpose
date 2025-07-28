/**
 * Example UEP Agent Implementation
 * 
 * Demonstrates how to create a UEP-compliant agent using decorators
 * and the client library with proper error handling and validation.
 */

import {
  UEPAgent,
  UEPCapability,
  UEPEventHandler,
  UEPValidate,
  UEPRateLimit,
  UEPTrace,
  UEPRequest,
  UEPEvent,
  createUEPClient,
  startAllAgents,
  UEPDefaults
} from '../src/index.js';

/**
 * Request/Response Types
 */
interface ProcessDataRequest {
  data: string;
  operation: 'transform' | 'validate' | 'analyze';
  options?: {
    format?: string;
    includeMetadata?: boolean;
  };
}

interface ProcessDataResponse {
  result: string;
  metadata?: {
    processingTime: number;
    operation: string;
    timestamp: Date;
  };
}

interface StatusRequest {
  includeDetails?: boolean;
}

interface StatusResponse {
  status: 'healthy' | 'busy' | 'error';
  uptime: number;
  requestsProcessed: number;
  details?: {
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
  };
}

interface DataProcessedEvent {
  requestId: string;
  operation: string;
  duration: number;
  success: boolean;
}

/**
 * Example Parameter Flow Agent
 * 
 * This agent demonstrates the UEP decorator pattern for creating
 * agents with automatic capability exposure and event handling.
 */
@UEPAgent({
  name: 'parameter-flow-agent',
  version: '1.0.0',
  type: 'domain',
  description: 'Agent for processing and transforming parameter flows between components',
  healthCheck: {
    endpoint: '/health',
    interval: 30000
  },
  resources: {
    memory: '512Mi',
    cpu: '0.5'
  }
})
export class ParameterFlowAgent {
  private requestsProcessed = 0;
  private startTime = Date.now();

  /**
   * Process data capability with validation and rate limiting
   */
  @UEPCapability({
    name: 'process-data',
    version: '1.0.0',
    description: 'Process and transform data according to specified operations',
    schema: {
      request: {
        type: 'object',
        required: ['data', 'operation'],
        properties: {
          data: { type: 'string', minLength: 1 },
          operation: { 
            type: 'string', 
            enum: ['transform', 'validate', 'analyze'] 
          },
          options: {
            type: 'object',
            properties: {
              format: { type: 'string' },
              includeMetadata: { type: 'boolean' }
            }
          }
        }
      },
      response: {
        type: 'object',
        required: ['result'],
        properties: {
          result: { type: 'string' },
          metadata: {
            type: 'object',
            properties: {
              processingTime: { type: 'number' },
              operation: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    timeout: 30000,
    rateLimit: {
      requestsPerSecond: 10,
      requestsPerMinute: 100
    },
    metadata: {
      tags: ['data-processing', 'transformation'],
      experimental: false
    }
  })
  @UEPValidate()
  @UEPRateLimit({ requestsPerSecond: 10 })
  @UEPTrace('data-processing')
  async processData(
    payload: ProcessDataRequest, 
    request: UEPRequest<ProcessDataRequest>
  ): Promise<ProcessDataResponse> {
    const startTime = Date.now();

    try {
      console.log(`Processing data for request ${request.id}: ${payload.operation}`);

      // Simulate different operations
      let result: string;
      
      switch (payload.operation) {
        case 'transform':
          result = this.transformData(payload.data, payload.options?.format);
          break;
        case 'validate':
          result = this.validateData(payload.data);
          break;
        case 'analyze':
          result = this.analyzeData(payload.data);
          break;
        default:
          throw new Error(`Unknown operation: ${payload.operation}`);
      }

      const processingTime = Date.now() - startTime;
      this.requestsProcessed++;

      const response: ProcessDataResponse = {
        result,
        ...(payload.options?.includeMetadata && {
          metadata: {
            processingTime,
            operation: payload.operation,
            timestamp: new Date()
          }
        })
      };

      // Emit event for successful processing
      await this.emitDataProcessedEvent({
        requestId: request.id,
        operation: payload.operation,
        duration: processingTime,
        success: true
      });

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Emit event for failed processing
      await this.emitDataProcessedEvent({
        requestId: request.id,
        operation: payload.operation,
        duration: processingTime,
        success: false
      });

      throw error;
    }
  }

  /**
   * Get agent status capability
   */
  @UEPCapability({
    name: 'get-status',
    version: '1.0.0',
    description: 'Get current agent status and health information',
    schema: {
      request: {
        type: 'object',
        properties: {
          includeDetails: { type: 'boolean' }
        }
      },
      response: {
        type: 'object',
        required: ['status', 'uptime', 'requestsProcessed'],
        properties: {
          status: { 
            type: 'string', 
            enum: ['healthy', 'busy', 'error'] 
          },
          uptime: { type: 'number' },
          requestsProcessed: { type: 'number' },
          details: {
            type: 'object',
            properties: {
              memory: { type: 'object' },
              cpu: { type: 'object' }
            }
          }
        }
      }
    },
    timeout: 5000
  })
  @UEPTrace('status-check')
  async getStatus(
    payload: StatusRequest,
    request: UEPRequest<StatusRequest>
  ): Promise<StatusResponse> {
    console.log(`Status check requested by ${request.agent.id}`);

    const uptime = Date.now() - this.startTime;
    
    const response: StatusResponse = {
      status: this.determineStatus(),
      uptime,
      requestsProcessed: this.requestsProcessed
    };

    if (payload.includeDetails) {
      response.details = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      };
    }

    return response;
  }

  /**
   * Handle system events
   */
  @UEPEventHandler({
    eventType: 'system.shutdown',
    version: '1.0.0',
    queue: 'parameter-flow-shutdown',
    autoAck: true
  })
  async handleSystemShutdown(
    payload: any,
    event: UEPEvent<any>
  ): Promise<void> {
    console.log(`Received shutdown event from ${event.agent.id}`);
    
    // Perform cleanup operations
    await this.cleanup();
    
    console.log('Agent shutdown complete');
  }

  /**
   * Handle parameter mapping events
   */
  @UEPEventHandler({
    eventType: 'parameter.mapping.updated',
    version: '1.0.0',
    queue: 'parameter-flow-mapping',
    autoAck: true
  })
  async handleParameterMappingUpdate(
    payload: { mappingId: string; changes: any },
    event: UEPEvent<{ mappingId: string; changes: any }>
  ): Promise<void> {
    console.log(`Parameter mapping updated: ${payload.mappingId}`);
    
    // Update internal parameter mappings
    await this.updateParameterMappings(payload.mappingId, payload.changes);
  }

  /**
   * Private helper methods
   */
  private transformData(data: string, format?: string): string {
    // Simulate data transformation
    switch (format) {
      case 'uppercase':
        return data.toUpperCase();
      case 'lowercase':
        return data.toLowerCase();
      case 'reverse':
        return data.split('').reverse().join('');
      default:
        return `transformed_${data}`;
    }
  }

  private validateData(data: string): string {
    // Simulate data validation
    const isValid = data.length > 0 && data.length < 1000;
    return `validation_${isValid ? 'passed' : 'failed'}_${data.length}_chars`;
  }

  private analyzeData(data: string): string {
    // Simulate data analysis
    const stats = {
      length: data.length,
      words: data.split(/\s+/).length,
      chars: data.replace(/\s/g, '').length,
      vowels: (data.match(/[aeiouAEIOU]/g) || []).length
    };
    
    return `analysis_${JSON.stringify(stats)}`;
  }

  private determineStatus(): 'healthy' | 'busy' | 'error' {
    // Simple status determination logic
    if (this.requestsProcessed > 1000) {
      return 'busy';
    }
    return 'healthy';
  }

  private async emitDataProcessedEvent(eventData: DataProcessedEvent): Promise<void> {
    // In a real implementation, this would emit an event through the UEP client
    console.log('Data processed event:', eventData);
  }

  private async cleanup(): Promise<void> {
    // Perform cleanup operations
    console.log('Performing cleanup...');
  }

  private async updateParameterMappings(mappingId: string, changes: any): Promise<void> {
    // Update parameter mappings
    console.log(`Updating parameter mapping ${mappingId}:`, changes);
  }
}

/**
 * Usage example - how to start the agent
 */
export async function runExampleAgent(): Promise<void> {
  try {
    console.log('Starting Parameter Flow Agent...');

    // Create connection options
    const connectionOptions = UEPDefaults.createClientOptions(
      'parameter-flow-agent',
      'domain'
    );

    // Override connection settings if needed
    connectionOptions.connection.servers = ['nats://localhost:4222'];
    connectionOptions.monitoring.loggingLevel = 'debug';

    // Start all registered agents (the decorator automatically registered our agent)
    await startAllAgents(connectionOptions);

    console.log('Parameter Flow Agent started successfully!');
    console.log('Available capabilities:');
    console.log('  - process-data: Process and transform data');
    console.log('  - get-status: Get agent status');
    console.log('Event handlers:');
    console.log('  - system.shutdown: Handle system shutdown');
    console.log('  - parameter.mapping.updated: Handle parameter mapping updates');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('Shutting down agents...');
      const { stopAllAgents } = await import('../src/index.js');
      await stopAllAgents();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start Parameter Flow Agent:', error);
    process.exit(1);
  }
}

/**
 * Client example - how to interact with the agent
 */
export async function runExampleClient(): Promise<void> {
  try {
    console.log('Starting UEP Client example...');

    // Create a client
    const client = await createUEPClient(
      'example-client',
      'meta',
      {
        connection: {
          servers: ['nats://localhost:4222']
        }
      }
    );

    await client.connect();

    // Send a data processing request
    const processResponse = await client.request<ProcessDataRequest, ProcessDataResponse>(
      'process-data',
      {
        data: 'Hello UEP World!',
        operation: 'transform',
        options: {
          format: 'uppercase',
          includeMetadata: true
        }
      },
      {
        timeout: 10000,
        priority: 'normal'
      }
    );

    console.log('Process data response:', processResponse.payload);

    // Send a status request
    const statusResponse = await client.request<StatusRequest, StatusResponse>(
      'get-status',
      {
        includeDetails: true
      }
    );

    console.log('Status response:', statusResponse.payload);

    // Send an event
    await client.sendEvent('parameter.mapping.updated', {
      mappingId: 'mapping-123',
      changes: {
        newParameter: 'value'
      }
    });

    console.log('Event sent successfully');

    // Disconnect
    await client.disconnect();
    console.log('Client disconnected');

  } catch (error) {
    console.error('Client example failed:', error);
  }
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'agent';
  
  if (mode === 'agent') {
    runExampleAgent().catch(console.error);
  } else if (mode === 'client') {
    runExampleClient().catch(console.error);
  } else {
    console.log('Usage: node ExampleAgent.js [agent|client]');
    process.exit(1);
  }
}