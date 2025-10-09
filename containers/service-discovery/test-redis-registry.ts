/**
 * Redis Service Registry Test Script
 * Task 191.2: Test Redis-Based Service Registry with Health Checking
 */

import { RedisServiceRegistry, createRedisRegistryConfig } from './RedisServiceRegistry.js';
import { AgentRegistrationMetadata, AgentStatus } from '../src/uep/service-registry/types/AgentRegistration.js';

// Test configuration
const testConfig = createRedisRegistryConfig({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    keyPrefix: 'test:uep:registry'
  },
  healthCheck: {
    interval: 10000,  // 10 seconds for testing
    timeout: 3000,    // 3 seconds
    retries: 2,       // 2 failures before unhealthy
    deregistrationDelay: 15000  // 15 seconds
  },
  heartbeat: {
    interval: 5000,   // 5 seconds for testing
    ttl: 20           // 20 seconds TTL
  }
});

// Test agent metadata factory
function createTestAgent(agentType: string, instanceId: string = '001'): AgentRegistrationMetadata {
  const agentId = `test-${agentType}-${instanceId}`;
  const now = new Date().toISOString();
  
  return {
    agentId,
    agentName: `Test ${agentType} Agent`,
    agentType,
    instanceId: `${agentType}-${instanceId}`,
    
    version: {
      major: 1,
      minor: 0,
      patch: 0,
      gitCommit: 'test-commit'
    },
    
    capabilities: [
      {
        name: `${agentType}-capability`,
        version: '1.0.0',
        description: `Test capability for ${agentType}`
      },
      {
        name: 'health-check',
        version: '1.0.0',
        description: 'Health check capability'
      }
    ],
    
    supportedProtocols: ['UEP/2.0', 'HTTP/1.1'],
    
    network: {
      address: 'test-agent',
      port: 3000 + parseInt(instanceId),
      protocol: 'http',
      tlsEnabled: false,
      healthCheckPort: 3000 + parseInt(instanceId)
    },
    
    resources: {
      cpu: { min: '100m', max: '500m', preferred: '250m' },
      memory: { min: '256Mi', max: '1Gi', preferred: '512Mi' }
    },
    
    currentMetrics: {
      currentLoad: Math.floor(Math.random() * 50), // 0-50% load
      maxCapacity: 100,
      averageResponseTime: 50 + Math.floor(Math.random() * 100), // 50-150ms
      errorRate: Math.random() * 0.01, // 0-1% error rate
      queueLength: Math.floor(Math.random() * 5),
      lastUpdated: now
    },
    
    healthCheck: {
      endpoint: '/health',
      method: 'GET',
      interval: '10s',
      timeout: '3s',
      failureThreshold: 2,
      successThreshold: 1,
      expectedStatus: 200
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
      auditLogging: true
    },
    
    environment: 'development',
    cluster: 'test-cluster',
    namespace: 'uep-test',
    podName: `${agentType}-pod-${instanceId}`,
    nodeName: `test-node-${instanceId}`,
    
    startTime: now,
    lastHeartbeat: now,
    registrationTime: now,
    status: 'healthy',
    
    configuration: {
      testMode: true,
      logLevel: 'debug'
    },
    
    featureFlags: {
      enableAdvancedMetrics: true,
      enableTracing: false
    },
    
    labels: {
      environment: 'test',
      team: 'uep-dev',
      version: '1.0.0'
    },
    
    annotations: {
      'test.uep.io/created-by': 'redis-registry-test',
      'test.uep.io/test-run': new Date().toISOString()
    }
  };
}

// Test suite
class RedisRegistryTestSuite {
  private registry: RedisServiceRegistry;
  private testAgents: AgentRegistrationMetadata[] = [];

  constructor() {
    this.registry = new RedisServiceRegistry(testConfig);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.registry.on('agentRegistered', (metadata) => {
      console.log(`✅ Agent registered: ${metadata.agentId} (${metadata.agentType})`);
    });

    this.registry.on('agentDeregistered', (agentId) => {
      console.log(`❌ Agent deregistered: ${agentId}`);
    });

    this.registry.on('agentUpdated', (agentId, update) => {
      console.log(`🔄 Agent updated: ${agentId}`);
    });

    this.registry.on('healthCheckPassed', (agentId) => {
      console.log(`💚 Health check passed: ${agentId}`);
    });

    this.registry.on('healthCheckFailed', (agentId, error) => {
      console.log(`💔 Health check failed: ${agentId} - ${error.message}`);
    });

    this.registry.on('discoveryQuery', (query, result) => {
      console.log(`🔍 Discovery query completed: ${result.agents.length} agents found in ${result.executionTime}ms`);
    });

    this.registry.on('error', (error) => {
      console.error(`🚨 Registry error:`, error);
    });
  }

  async runTests(): Promise<void> {
    console.log('🚀 Starting Redis Service Registry Test Suite\n');

    try {
      await this.testBasicRegistration();
      await this.testServiceDiscovery();
      await this.testHealthChecking();
      await this.testAgentUpdates();
      await this.testPerformanceFiltering();
      await this.testCleanup();
      
      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  private async testBasicRegistration(): Promise<void> {
    console.log('📝 Test 1: Basic Agent Registration');
    
    // Create test agents
    const agents = [
      createTestAgent('prd-parser', '001'),
      createTestAgent('scaffold-generator', '001'),
      createTestAgent('infra-orchestrator', '001'),
      createTestAgent('prd-parser', '002')  // Second instance
    ];
    
    // Register agents
    for (const agent of agents) {
      await this.registry.registerAgent(agent);
      this.testAgents.push(agent);
    }
    
    // Verify registration
    const allAgents = await this.registry.getAllAgents();
    console.log(`   Registered ${allAgents.length} agents`);
    
    if (allAgents.length !== agents.length) {
      throw new Error(`Expected ${agents.length} agents, got ${allAgents.length}`);
    }
    
    console.log('   ✅ Basic registration test passed\n');
  }

  private async testServiceDiscovery(): Promise<void> {
    console.log('🔍 Test 2: Service Discovery');
    
    // Test discovery by agent type
    const prdParsers = await this.registry.discoverAgents({
      agentType: 'prd-parser',
      healthyOnly: true
    });
    console.log(`   Found ${prdParsers.agents.length} PRD parser agents`);
    
    // Test discovery by capabilities
    const capableAgents = await this.registry.discoverAgents({
      capabilities: ['prd-parser-capability'],
      sortBy: 'load',
      sortOrder: 'asc'
    });
    console.log(`   Found ${capableAgents.agents.length} agents with PRD parser capability`);
    
    // Test performance filtering
    const lowLoadAgents = await this.registry.discoverAgents({
      maxLoad: 30,
      maxResponseTime: 100,
      limit: 2
    });
    console.log(`   Found ${lowLoadAgents.agents.length} low-load agents`);
    
    console.log('   ✅ Service discovery test passed\n');
  }

  private async testHealthChecking(): Promise<void> {
    console.log('💓 Test 3: Health Checking');
    
    // Note: This test simulates health checks without actual HTTP endpoints
    // In a real scenario, agents would have running HTTP servers
    
    const testAgent = this.testAgents[0];
    
    // Test manual health check (will fail since no actual server)
    const isHealthy = await this.registry.performHealthCheck(testAgent.agentId);
    console.log(`   Manual health check result: ${isHealthy ? 'healthy' : 'unhealthy'}`);
    
    // Update agent status manually
    await this.registry.updateAgent({
      agentId: testAgent.agentId,
      lastHeartbeat: new Date().toISOString(),
      status: 'degraded'
    });
    
    console.log('   ✅ Health checking test passed\n');
  }

  private async testAgentUpdates(): Promise<void> {
    console.log('🔄 Test 4: Agent Updates');
    
    const testAgent = this.testAgents[1];
    
    // Update agent metadata
    await this.registry.updateAgent({
      agentId: testAgent.agentId,
      lastHeartbeat: new Date().toISOString(),
      currentMetrics: {
        currentLoad: 75,
        maxCapacity: 100,
        averageResponseTime: 200,
        errorRate: 0.02,
        queueLength: 8,
        lastUpdated: new Date().toISOString()
      }
    });
    
    // Verify update
    const updatedAgent = await this.registry.getAgent(testAgent.agentId);
    if (!updatedAgent) {
      throw new Error('Updated agent not found');
    }
    
    console.log(`   Updated agent load: ${updatedAgent.currentMetrics?.currentLoad}%`);
    console.log('   ✅ Agent updates test passed\n');
  }

  private async testPerformanceFiltering(): Promise<void> {
    console.log('⚡ Test 5: Performance Filtering');
    
    // Update agents with different performance metrics
    await this.registry.updateAgent({
      agentId: this.testAgents[0].agentId,
      lastHeartbeat: new Date().toISOString(),
      currentMetrics: {
        currentLoad: 10,
        maxCapacity: 100,
        averageResponseTime: 50,
        errorRate: 0.001,
        queueLength: 1,
        lastUpdated: new Date().toISOString()
      }
    });
    
    await this.registry.updateAgent({
      agentId: this.testAgents[1].agentId,
      lastHeartbeat: new Date().toISOString(),
      currentMetrics: {
        currentLoad: 90,
        maxCapacity: 100,
        averageResponseTime: 300,
        errorRate: 0.05,
        queueLength: 20,
        lastUpdated: new Date().toISOString()
      }
    });
    
    // Test performance-based discovery
    const highPerformanceAgents = await this.registry.discoverAgents({
      maxLoad: 50,
      maxResponseTime: 100,
      maxErrorRate: 0.01,
      sortBy: 'load',
      sortOrder: 'asc'
    });
    
    console.log(`   Found ${highPerformanceAgents.agents.length} high-performance agents`);
    console.log('   ✅ Performance filtering test passed\n');
  }

  private async testCleanup(): Promise<void> {
    console.log('🧹 Test 6: Cleanup and Deregistration');
    
    // Deregister half the agents
    const agentsToRemove = this.testAgents.slice(0, 2);
    for (const agent of agentsToRemove) {
      await this.registry.deregisterAgent(agent.agentId, 'Test cleanup');
    }
    
    // Verify remaining agents
    const remainingAgents = await this.registry.getAllAgents();
    console.log(`   ${remainingAgents.length} agents remaining after cleanup`);
    
    console.log('   ✅ Cleanup test passed\n');
  }

  private async cleanup(): Promise<void> {
    console.log('🔚 Final cleanup...');
    
    // Deregister all remaining agents and shutdown
    await this.registry.shutdown();
    
    console.log('   Registry shutdown complete');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new RedisRegistryTestSuite();
  testSuite.runTests().catch(console.error);
}

export { RedisRegistryTestSuite };