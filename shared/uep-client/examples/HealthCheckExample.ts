/**
 * UEP Health Check Integration Example
 * 
 * Demonstrates how to integrate health check endpoints with UEP agents
 * for container orchestration and monitoring.
 */

import {
  UEPAgent,
  UEPCapability,
  UEPEventHandler,
  UEPRequest,
  UEPEvent,
  createUEPClient,
  startAllAgents,
  UEPDefaults
} from '../src/index.js';

import {
  UEPHealthCheck,
  UEPHealthMiddleware,
  initializeUEPHealth,
  HealthChecks
} from '../src/health/UEPHealthMiddleware.js';

/**
 * Example agent with integrated health checks
 */
@UEPAgent({
  name: 'monitoring-agent',
  version: '1.0.0',
  type: 'domain',
  description: 'Agent with comprehensive health monitoring',
  healthCheck: {
    endpoint: '/health',
    interval: 30000
  },
  resources: {
    memory: '256Mi',
    cpu: '0.25'
  }
})
export class MonitoringAgent {
  private isHealthy = true;
  private requestCount = 0;
  private lastError: Error | null = null;
  private startTime = Date.now();

  /**
   * Main processing capability
   */
  @UEPCapability({
    name: 'monitor-system',
    version: '1.0.0',
    description: 'Monitor system health and performance',
    timeout: 10000
  })
  async monitorSystem(
    payload: { 
      metrics: string[];
      duration?: number;
    },
    request: UEPRequest<any>
  ): Promise<{
    status: string;
    metrics: Record<string, any>;
    timestamp: string;
  }> {
    this.requestCount++;

    try {
      // Simulate monitoring work
      await this.sleep(payload.duration || 1000);

      const metrics: Record<string, any> = {};
      
      for (const metric of payload.metrics) {
        switch (metric) {
          case 'cpu':
            metrics.cpu = this.getCpuUsage();
            break;
          case 'memory':
            metrics.memory = this.getMemoryUsage();
            break;
          case 'requests':
            metrics.requests = this.requestCount;
            break;
          case 'uptime':
            metrics.uptime = Date.now() - this.startTime;
            break;
          default:
            metrics[metric] = Math.random() * 100;
        }
      }

      return {
        status: 'success',
        metrics,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.lastError = error as Error;
      this.isHealthy = false;
      throw error;
    }
  }

  /**
   * Get agent status capability
   */
  @UEPCapability({
    name: 'get-agent-status',
    version: '1.0.0',
    description: 'Get current agent status and health'
  })
  async getStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    uptime: number;
    requestCount: number;
    lastError?: string;
    memory: NodeJS.MemoryUsage;
  }> {
    return {
      status: this.isHealthy ? 'healthy' : 'unhealthy',
      uptime: Date.now() - this.startTime,
      requestCount: this.requestCount,
      lastError: this.lastError?.message,
      memory: process.memoryUsage()
    };
  }

  /**
   * Health check for database connectivity
   */
  @UEPHealthCheck('database-connection', { 
    interval: 60000, 
    timeout: 5000, 
    critical: true 
  })
  async checkDatabaseHealth(): Promise<{ connected: boolean; latency: number }> {
    const startTime = Date.now();
    
    // Simulate database connection check
    await this.sleep(Math.random() * 100);
    
    const connected = Math.random() > 0.1; // 90% success rate
    const latency = Date.now() - startTime;
    
    if (!connected) {
      throw new Error('Database connection failed');
    }

    return { connected, latency };
  }

  /**
   * Health check for external API
   */
  @UEPHealthCheck('external-api', { 
    interval: 30000, 
    timeout: 3000, 
    critical: false 
  })
  async checkExternalApiHealth(): Promise<{ available: boolean; responseTime: number }> {
    const startTime = Date.now();
    
    // Simulate external API check
    await this.sleep(Math.random() * 200);
    
    const available = Math.random() > 0.2; // 80% success rate
    const responseTime = Date.now() - startTime;
    
    if (!available) {
      // Non-critical check - don't fail health check
      console.warn('External API is not available');
    }

    return { available, responseTime };
  }

  /**
   * Health check for resource usage
   */
  @UEPHealthCheck('resource-usage', { 
    interval: 15000, 
    critical: false 
  })
  async checkResourceUsage(): Promise<{
    memory: { used: number; percentage: number };
    cpu: { usage: number };
  }> {
    const memUsage = process.memoryUsage();
    const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    // Warn if memory usage is high
    if (memPercentage > 80) {
      console.warn(`High memory usage: ${memPercentage.toFixed(1)}%`);
    }

    return {
      memory: {
        used: memUsage.heapUsed,
        percentage: memPercentage
      },
      cpu: {
        usage: this.getCpuUsage()
      }
    };
  }

  /**
   * Handle system events
   */
  @UEPEventHandler({
    eventType: 'system.health-alert',
    version: '1.0.0',
    queue: 'monitoring-alerts'
  })
  async handleHealthAlert(
    payload: {
      alertType: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      source: string;
    },
    event: UEPEvent<any>
  ): Promise<void> {
    console.log(`🚨 Health Alert [${payload.severity.toUpperCase()}]: ${payload.message}`);
    console.log(`   Source: ${payload.source}`);
    console.log(`   Type: ${payload.alertType}`);

    // Handle critical alerts
    if (payload.severity === 'critical') {
      this.isHealthy = false;
      console.error('Agent marked as unhealthy due to critical alert');
    }
  }

  /**
   * Private helper methods
   */
  private getCpuUsage(): number {
    const cpuUsage = process.cpuUsage();
    return (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
  }

  private getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Example usage of health check system
 */
export async function runHealthCheckExample(): Promise<void> {
  try {
    console.log('🏥 Starting UEP Health Check Example...');

    // Create UEP client
    const clientOptions = UEPDefaults.createClientOptions('monitoring-agent', 'domain');
    clientOptions.connection.servers = ['nats://localhost:4222'];
    clientOptions.monitoring.healthCheckEnabled = true;

    // Start all agents (this will register our MonitoringAgent)
    await startAllAgents(clientOptions);
    console.log('✅ Monitoring Agent started');

    // Create UEP client instance for health middleware
    const { createUEPClient } = await import('../src/index.js');
    const client = createUEPClient('health-client', 'meta', clientOptions);
    await client.connect();

    // Initialize health middleware with custom checks
    const healthMiddleware = await initializeUEPHealth(
      {
        healthServer: {
          port: 8080,
          enableDetailedDiagnostics: true,
          enableMetricsEndpoint: true,
          enableComplianceEndpoint: true
        },
        autoStart: true,
        enableGracefulShutdown: true,
        customChecks: [
          // Add external service health check
          HealthChecks.externalApi('https://httpbin.org/status/200', 5000),
          
          // Add memory usage check
          HealthChecks.memory(85),
          
          // Add custom business logic check
          async () => {
            const startTime = Date.now();
            
            try {
              // Simulate business logic check
              const isBusinessLogicHealthy = Math.random() > 0.05; // 95% success
              
              return {
                name: 'business-logic',
                status: isBusinessLogicHealthy ? 'pass' : 'fail',
                message: isBusinessLogicHealthy 
                  ? 'Business logic is functioning correctly'
                  : 'Business logic validation failed',
                duration: Date.now() - startTime,
                metadata: {
                  lastCheck: new Date().toISOString(),
                  customMetric: Math.random() * 100
                }
              };
            } catch (error) {
              return {
                name: 'business-logic',
                status: 'fail',
                message: `Business logic check failed: ${error.message}`,
                duration: Date.now() - startTime,
                metadata: { error: error.message }
              };
            }
          }
        ]
      },
      client
    );

    console.log('✅ Health middleware initialized');

    // Display available health endpoints
    const port = healthMiddleware.getHealthServerPort();
    console.log('\n🌐 Available Health Endpoints:');
    console.log(`   Health Check:    http://localhost:${port}/health`);
    console.log(`   Readiness:       http://localhost:${port}/ready`);
    console.log(`   Liveness:        http://localhost:${port}/live`);
    console.log(`   UEP Compliance:  http://localhost:${port}/uep/compliance`);
    console.log(`   Metrics:         http://localhost:${port}/metrics`);
    console.log(`   Diagnostics:     http://localhost:${port}/diagnostics`);

    // Simulate some activity
    console.log('\n📊 Simulating agent activity...');
    
    setInterval(async () => {
      try {
        // Send a monitoring request
        const response = await client.request('monitor-system', {
          metrics: ['cpu', 'memory', 'requests', 'uptime'],
          duration: 500
        });

        if (Math.random() > 0.8) { // 20% chance
          console.log(`📈 Monitoring result: ${JSON.stringify(response.payload.metrics, null, 2)}`);
        }

        // Occasionally send health alerts
        if (Math.random() > 0.95) { // 5% chance
          await client.sendEvent('system.health-alert', {
            alertType: 'performance',
            severity: Math.random() > 0.8 ? 'high' : 'medium',
            message: 'System performance degradation detected',
            source: 'monitoring-agent'
          });
        }

      } catch (error) {
        console.error('❌ Error during activity simulation:', error.message);
      }
    }, 2000);

    // Log health status periodically
    setInterval(async () => {
      try {
        const statusResponse = await client.request('get-agent-status', {});
        const status = statusResponse.payload;
        
        console.log(`💓 Agent Status: ${status.status} | ` +
                   `Uptime: ${Math.floor(status.uptime / 1000)}s | ` +
                   `Requests: ${status.requestCount} | ` +
                   `Memory: ${Math.floor(status.memory.heapUsed / 1024 / 1024)}MB`);
      } catch (error) {
        console.error('❌ Error getting agent status:', error.message);
      }
    }, 10000);

    // Keep the example running
    console.log('\n✨ Health check example is running...');
    console.log('   Press Ctrl+C to stop');

  } catch (error) {
    console.error('❌ Failed to start health check example:', error);
    process.exit(1);
  }
}

/**
 * Example of testing health endpoints programmatically
 */
export async function testHealthEndpoints(): Promise<void> {
  const baseUrl = 'http://localhost:8080';
  const endpoints = [
    '/health',
    '/ready',
    '/live',
    '/uep/compliance',
    '/metrics',
    '/diagnostics'
  ];

  console.log('🧪 Testing health endpoints...\n');

  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const startTime = Date.now();
      
      const response = await fetch(url);
      const duration = Date.now() - startTime;
      
      console.log(`${response.ok ? '✅' : '❌'} ${endpoint}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Duration: ${duration}ms`);
      
      if (response.ok) {
        try {
          const data = await response.json();
          if (endpoint === '/health') {
            console.log(`   Overall Status: ${data.status}`);
            console.log(`   Checks: ${Object.keys(data.checks).length}`);
          } else if (endpoint === '/uep/compliance') {
            console.log(`   Compliant: ${data.compliant}`);
            console.log(`   Version: ${data.version}`);
          }
        } catch (e) {
          console.log('   Response: Non-JSON');
        }
      }
      
      console.log();
    } catch (error) {
      console.log(`❌ ${endpoint}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'run';
  
  if (command === 'run') {
    runHealthCheckExample().catch(console.error);
  } else if (command === 'test') {
    testHealthEndpoints().catch(console.error);
  } else {
    console.log('Usage: node HealthCheckExample.js [run|test]');
    console.log('  run  - Start the health check example (default)');
    console.log('  test - Test health endpoints');
    process.exit(1);
  }
}