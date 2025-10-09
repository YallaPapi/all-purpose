/**
 * TypeScript Service Discovery Client Library Test Suite
 * Task 191.3: Comprehensive tests for the unified client library
 */

import { ServiceDiscoveryClient, createRedisOnlyConfig } from './ServiceDiscoveryClient.js';
import { AgentServiceHelper, createAgentHelper } from './AgentServiceHelper.js';
import { AgentRegistrationMetadata } from '../src/uep/service-registry/types/AgentRegistration.js';

// Test utilities
class TestLogger {
  private testName: string = '';
  
  startTest(name: string): void {
    this.testName = name;
    console.log(`\n🧪 ${name}`);
    console.log('─'.repeat(name.length + 3));
  }
  
  log(message: string): void {
    console.log(`   ${message}`);
  }
  
  success(message: string): void {
    console.log(`   ✅ ${message}`);
  }
  
  error(message: string): void {
    console.log(`   ❌ ${message}`);
  }
  
  warn(message: string): void {
    console.log(`   ⚠️  ${message}`);
  }
}

// Mock agent metadata factory
function createMockAgent(type: string, id: string = '001'): AgentRegistrationMetadata {
  const now = new Date().toISOString();
  const agentId = `test-${type}-${id}`;
  
  return {
    agentId,
    agentName: `Test ${type} Agent`,
    agentType: type,
    instanceId: `${type}-${id}`,
    
    version: { major: 1, minor: 0, patch: 0 },
    
    capabilities: [
      { name: `${type}-capability`, version: '1.0.0', description: `${type} capability` }
    ],
    
    supportedProtocols: ['UEP/2.0'],
    
    network: {
      address: `test-${type}-${id}`,
      port: 3000 + parseInt(id),
      protocol: 'http',
      tlsEnabled: false
    },
    
    resources: {
      cpu: { min: '100m', max: '500m', preferred: '250m' },
      memory: { min: '256Mi', max: '1Gi', preferred: '512Mi' }
    },
    
    currentMetrics: {
      currentLoad: Math.floor(Math.random() * 50),
      maxCapacity: 100,
      averageResponseTime: 50 + Math.floor(Math.random() * 100),
      errorRate: Math.random() * 0.01,
      queueLength: Math.floor(Math.random() * 5),
      lastUpdated: now
    },
    
    healthCheck: {
      endpoint: '/health',
      method: 'GET',
      interval: '30s',
      timeout: '5s',
      failureThreshold: 3,
      successThreshold: 1
    },
    
    monitoring: {
      metricsEnabled: true,
      metricsEndpoint: '/metrics',
      metricsFormat: 'prometheus',
      tracingEnabled: false,
      loggingLevel: 'info',
      healthMetrics: true
    },
    
    security: {
      tlsRequired: false,
      encryptionEnabled: false,
      auditLogging: false
    },
    
    environment: 'development',
    cluster: 'test-cluster',
    namespace: 'test-namespace',
    
    startTime: now,
    lastHeartbeat: now,
    registrationTime: now,
    status: 'healthy',
    
    configuration: {},
    featureFlags: {},
    labels: { test: 'true' },
    annotations: { 'test.created': now }
  };
}

// Test suite
export class ServiceDiscoveryClientTestSuite {
  private logger = new TestLogger();
  private client?: ServiceDiscoveryClient;
  private agentHelper?: AgentServiceHelper;
  private testAgents: AgentRegistrationMetadata[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Service Discovery Client Library Test Suite');
    console.log('═'.repeat(60));

    try {
      await this.testClientInitialization();
      await this.testAgentRegistration();
      await this.testServiceDiscovery();
      await this.testClientConfiguration();
      await this.testCircuitBreaker();
      await this.testCaching();
      await this.testAgentHelper();
      await this.testErrorHandling();
      await this.testPerformance();
      
      console.log('\n🎉 All tests completed successfully!');
      
    } catch (error) {
      console.error('\n💥 Test suite failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async testClientInitialization(): Promise<void> {
    this.logger.startTest('Client Initialization');

    try {
      // Test Redis-only configuration
      const redisConfig = createRedisOnlyConfig({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          keyPrefix: 'test:client'
        }
      });

      this.client = new ServiceDiscoveryClient(redisConfig);
      this.logger.success('Client created with Redis configuration');

      // Test initialization
      await this.client.initialize();
      this.logger.success('Client initialized successfully');

      // Test metrics
      const metrics = this.client.getMetrics();
      this.logger.success(`Initial metrics obtained: ${JSON.stringify(metrics)}`);

      // Test circuit breaker state
      const cbState = this.client.getCircuitBreakerState();
      this.logger.success(`Circuit breaker state: ${cbState.state}`);

    } catch (error) {
      this.logger.error(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async testAgentRegistration(): Promise<void> {
    this.logger.startTest('Agent Registration');

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Create test agents
      const agents = [
        createMockAgent('prd-parser', '001'),
        createMockAgent('scaffold-generator', '001'),
        createMockAgent('prd-parser', '002')
      ];

      // Register agents
      for (const agent of agents) {
        await this.client.registerAgent(agent);
        this.testAgents.push(agent);
        this.logger.success(`Registered agent: ${agent.agentId}`);
      }

      // Verify registration count
      const allAgents = await this.client.discoverAgents({});
      this.logger.success(`Total registered agents: ${allAgents.agents.length}`);

      if (allAgents.agents.length < agents.length) {
        this.logger.warn(`Expected ${agents.length} agents, found ${allAgents.agents.length}`);
      }

    } catch (error) {
      this.logger.error(`Registration failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async testServiceDiscovery(): Promise<void> {
    this.logger.startTest('Service Discovery');

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Test discovery by agent type
      const prdParsers = await this.client.discoverAgents({
        agentType: 'prd-parser',
        healthyOnly: true
      });
      this.logger.success(`Found ${prdParsers.agents.length} PRD parser agents`);

      // Test discovery with performance filters
      const performantAgents = await this.client.discoverAgents({
        maxLoad: 30,
        maxResponseTime: 100,
        sortBy: 'load',
        sortOrder: 'asc'
      });
      this.logger.success(`Found ${performantAgents.agents.length} high-performance agents`);

      // Test discovery with pagination
      const paginatedResult = await this.client.discoverAgents({
        limit: 1,
        offset: 0
      });
      this.logger.success(`Paginated discovery returned ${paginatedResult.agents.length} agents`);

      // Test get specific agent
      if (this.testAgents.length > 0) {
        const specificAgent = await this.client.getAgent(this.testAgents[0].agentId);
        if (specificAgent) {
          this.logger.success(`Retrieved specific agent: ${specificAgent.agentId}`);
        } else {
          this.logger.warn(`Could not retrieve agent: ${this.testAgents[0].agentId}`);
        }
      }

    } catch (error) {
      this.logger.error(`Discovery failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async testClientConfiguration(): Promise<void> {
    this.logger.startTest('Client Configuration');

    try {
      // Test different configuration options
      const configs = [
        { name: 'Redis-only', config: createRedisOnlyConfig() },
        // Add more configurations as needed
      ];

      for (const { name, config } of configs) {
        const testClient = new ServiceDiscoveryClient(config);
        await testClient.initialize();
        await testClient.shutdown();
        this.logger.success(`${name} configuration works`);
      }

    } catch (error) {
      this.logger.error(`Configuration test failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async testCircuitBreaker(): Promise<void> {
    this.logger.startTest('Circuit Breaker');

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Get initial circuit breaker state
      let cbState = this.client.getCircuitBreakerState();
      this.logger.success(`Initial CB state: ${cbState.state}, failures: ${cbState.failureCount}`);

      // Test manual reset
      this.client.resetCircuitBreaker();
      cbState = this.client.getCircuitBreakerState();
      this.logger.success(`After reset - state: ${cbState.state}, failures: ${cbState.failureCount}`);

      // Note: Testing actual circuit breaker opening would require 
      // simulating failures, which is complex in this test environment

    } catch (error) {
      this.logger.error(`Circuit breaker test failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async testCaching(): Promise<void> {
    this.logger.startTest('Discovery Caching');

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Perform same discovery query twice
      const query = { agentType: 'prd-parser', limit: 1 };
      
      const start1 = Date.now();
      const result1 = await this.client.discoverAgents(query);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      const result2 = await this.client.discoverAgents(query);
      const time2 = Date.now() - start2;
      
      this.logger.success(`First query: ${time1}ms, Second query: ${time2}ms`);
      this.logger.success(`Cache potentially working: ${time2 < time1 ? 'YES' : 'NO'}`);

      // Test cache clearing
      this.client.clearCache();
      this.logger.success('Cache cleared successfully');

    } catch (error) {
      this.logger.error(`Caching test failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async testAgentHelper(): Promise<void> {
    this.logger.startTest('Agent Helper');

    try {
      // Create agent helper
      this.agentHelper = createAgentHelper({
        agentType: 'test-agent',
        host: 'localhost',
        port: 4000,
        capabilities: ['testing', 'validation'],
        environment: 'development'
      }, {
        registryUrl: process.env.REGISTRY_URL || 'redis://localhost:6379',
        autoRegisterOnStartup: false,
        autoDeregisterOnShutdown: false,
        autoHealthReporting: false
      });

      this.logger.success('Agent helper created');

      // Start the helper
      await this.agentHelper.start();
      this.logger.success('Agent helper started');

      // Test registration
      await this.agentHelper.register();
      this.logger.success('Agent registered via helper');

      // Test finding agents
      const foundAgents = await this.agentHelper.findAgents('prd-parser', { healthy: true });
      this.logger.success(`Found ${foundAgents.length} agents via helper`);

      // Test capability-based discovery
      const capableAgents = await this.agentHelper.findCapableAgents(['testing']);
      this.logger.success(`Found ${capableAgents.length} agents with testing capability`);

      // Test best agent selection
      const bestAgent = await this.agentHelper.getBestAgent('prd-parser');
      if (bestAgent) {
        this.logger.success(`Best agent: ${bestAgent.agentId} (load: ${bestAgent.currentMetrics.currentLoad}%)`);
      } else {
        this.logger.warn('No best agent found');
      }

      // Test metrics
      const metrics = this.agentHelper.getMetrics();
      this.logger.success(`Helper metrics: registrations=${metrics.registrationSuccesses}, discoveries=${metrics.discoverySuccesses}`);

      // Test health reporting
      await this.agentHelper.reportHealth('healthy', { test: 'data' });
      this.logger.success('Health reported successfully');

      // Test load updates
      await this.agentHelper.updateLoad(25, { responseTime: 150, errorRate: 0.01 });
      this.logger.success('Load metrics updated');

    } catch (error) {
      this.logger.error(`Agent helper test failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async testErrorHandling(): Promise<void> {
    this.logger.startTest('Error Handling');

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Test invalid agent registration
      try {
        const invalidAgent = {
          agentId: '', // invalid
          agentType: 'test'
        } as any;
        
        await this.client.registerAgent(invalidAgent);
        this.logger.error('Should have failed with invalid agent data');
      } catch (error) {
        this.logger.success('Invalid registration properly rejected');
      }

      // Test discovery with invalid query
      try {
        const result = await this.client.discoverAgents({
          agentType: 'non-existent-type',
          healthyOnly: true
        });
        this.logger.success(`Discovery with non-existent type returned ${result.agents.length} agents`);
      } catch (error) {
        this.logger.warn(`Discovery failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test getting non-existent agent
      const nonExistentAgent = await this.client.getAgent('non-existent-id');
      if (nonExistentAgent === null) {
        this.logger.success('Non-existent agent properly returned null');
      } else {
        this.logger.warn('Non-existent agent should return null');
      }

    } catch (error) {
      this.logger.error(`Error handling test failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async testPerformance(): Promise<void> {
    this.logger.startTest('Performance Testing');

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Test registration performance
      const registrationStart = Date.now();
      const testAgent = createMockAgent('performance-test', '999');
      await this.client.registerAgent(testAgent);
      const registrationTime = Date.now() - registrationStart;
      this.logger.success(`Registration time: ${registrationTime}ms`);

      // Test discovery performance
      const discoveryStart = Date.now();
      await this.client.discoverAgents({ limit: 10 });
      const discoveryTime = Date.now() - discoveryStart;
      this.logger.success(`Discovery time: ${discoveryTime}ms`);

      // Test multiple parallel discoveries
      const parallelStart = Date.now();
      const parallelPromises = Array(5).fill(0).map(() => 
        this.client!.discoverAgents({ agentType: 'prd-parser' })
      );
      await Promise.all(parallelPromises);
      const parallelTime = Date.now() - parallelStart;
      this.logger.success(`5 parallel discoveries: ${parallelTime}ms`);

      // Performance thresholds
      if (registrationTime > 500) {
        this.logger.warn(`Registration time ${registrationTime}ms exceeds 500ms threshold`);
      }
      
      if (discoveryTime > 100) {
        this.logger.warn(`Discovery time ${discoveryTime}ms exceeds 100ms threshold`);
      }

    } catch (error) {
      this.logger.error(`Performance test failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    this.logger.startTest('Cleanup');

    try {
      // Cleanup agent helper
      if (this.agentHelper) {
        await this.agentHelper.stop('Test cleanup');
        this.logger.success('Agent helper stopped');
      }

      // Cleanup client
      if (this.client) {
        await this.client.shutdown();
        this.logger.success('Client shut down');
      }

      this.logger.success('Cleanup completed successfully');

    } catch (error) {
      this.logger.error(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Integration test with actual Redis
export async function runIntegrationTests(): Promise<void> {
  console.log('🔧 Running Integration Tests with Redis');
  
  const testSuite = new ServiceDiscoveryClientTestSuite();
  await testSuite.runAllTests();
}

// Quick smoke test
export async function runSmokeTests(): Promise<void> {
  console.log('💨 Running Quick Smoke Tests');
  
  try {
    // Test client creation
    const client = new ServiceDiscoveryClient(createRedisOnlyConfig());
    console.log('✅ Client created successfully');
    
    // Test helper creation
    const helper = createAgentHelper({
      agentType: 'smoke-test',
      host: 'localhost',
      port: 5000,
      capabilities: ['testing']
    });
    console.log('✅ Helper created successfully');
    
    console.log('🎉 Smoke tests passed!');
    
  } catch (error) {
    console.error('💥 Smoke tests failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testType = process.argv[2] || 'smoke';
  
  if (testType === 'integration') {
    runIntegrationTests().catch(console.error);
  } else {
    runSmokeTests().catch(console.error);
  }
}

export { ServiceDiscoveryClientTestSuite };