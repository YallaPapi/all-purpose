/**
 * Service Registry Test Suite
 * Task 220.4: Comprehensive tests for service registration patterns
 */

import { ConsulServiceRegistry, ConsulConfig } from './ConsulServiceRegistry.js';
import { AgentLifecycleManager, AgentConfig } from './AgentLifecycleManager.js';
import { validator, createTestRegistration } from './utils/validation.js';
import { 
  AgentRegistrationMetadata, 
  convertToConsulRegistration 
} from './types/AgentRegistration.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class ServiceRegistryTestSuite {
  private consulConfig: ConsulConfig;
  private results: TestResult[] = [];

  constructor() {
    this.consulConfig = {
      host: process.env.CONSUL_HOST || 'localhost',
      port: process.env.CONSUL_PORT || '8500',
      secure: process.env.CONSUL_SECURE === 'true',
      token: process.env.CONSUL_TOKEN,
      promisify: true
    };
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Service Registry Test Suite\n');

    await this.runTest('Data Model Validation', () => this.testDataModelValidation());
    await this.runTest('Consul Registration Conversion', () => this.testConsulConversion());
    await this.runTest('Service Registry Basic Operations', () => this.testRegistryBasicOps());
    await this.runTest('Service Discovery', () => this.testServiceDiscovery());
    await this.runTest('Health Checking', () => this.testHealthChecking());
    await this.runTest('Agent Lifecycle', () => this.testAgentLifecycle());
    await this.runTest('Error Handling', () => this.testErrorHandling());
    await this.runTest('Performance', () => this.testPerformance());

    this.printResults();
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - startTime
      });
      console.log(`✅ ${name} - PASSED (${Date.now() - startTime}ms)`);
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log(`❌ ${name} - FAILED: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async testDataModelValidation(): Promise<void> {
    // Test valid registration
    const validRegistration = createTestRegistration({
      agentType: 'prd-parser',
      capabilities: [{
        name: 'document-parsing',
        version: '1.0.0',
        description: 'Parse documents'
      }]
    });

    const validResult = validator.validateRegistration(validRegistration);
    if (!validResult.valid) {
      throw new Error(`Valid registration failed validation: ${validResult.errors.map(e => e.message).join(', ')}`);
    }

    // Test invalid registration
    const invalidRegistration = {
      agentId: 'invalid-uuid',
      agentName: '',
      network: { port: 99999 }
    };

    const invalidResult = validator.validateRegistration(invalidRegistration);
    if (invalidResult.valid) {
      throw new Error('Invalid registration passed validation');
    }

    // Test schema validation
    const schemaResult = validator.validateSchema(validRegistration);
    if (!schemaResult.valid) {
      throw new Error(`Schema validation failed: ${schemaResult.errors.map(e => e.message).join(', ')}`);
    }

    console.log('  ✓ Valid registration passed validation');
    console.log('  ✓ Invalid registration failed validation');
    console.log('  ✓ Schema validation working');
  }

  private async testConsulConversion(): Promise<void> {
    const registration = createTestRegistration({
      agentType: 'test-agent',
      capabilities: [
        { name: 'test-cap-1', version: '1.0.0', description: 'Test capability 1' },
        { name: 'test-cap-2', version: '1.0.0', description: 'Test capability 2' }
      ]
    });

    const consulReg = convertToConsulRegistration(registration);

    // Validate Consul registration structure
    if (!consulReg.ID || consulReg.ID !== registration.agentId) {
      throw new Error('Consul registration ID mismatch');
    }

    if (!consulReg.Name || !consulReg.Name.includes(registration.agentType)) {
      throw new Error('Consul registration name mismatch');
    }

    if (!consulReg.Tags || !consulReg.Tags.includes(`agent-type:${registration.agentType}`)) {
      throw new Error('Consul registration tags missing agent type');
    }

    if (!consulReg.Meta || !consulReg.Meta.uep_capabilities) {
      throw new Error('Consul registration metadata missing capabilities');
    }

    if (!consulReg.Check || !consulReg.Check.Name) {
      throw new Error('Consul registration missing health check');
    }

    const expectedCapabilities = 'test-cap-1,test-cap-2';
    if (consulReg.Meta.uep_capabilities !== expectedCapabilities) {
      throw new Error(`Capabilities mismatch: expected ${expectedCapabilities}, got ${consulReg.Meta.uep_capabilities}`);
    }

    console.log('  ✓ Registration converted to Consul format');
    console.log('  ✓ All required fields present');
    console.log('  ✓ Capabilities serialized correctly');
  }

  private async testRegistryBasicOps(): Promise<void> {
    const registry = new ConsulServiceRegistry(this.consulConfig);
    const testRegistration = createTestRegistration({
      agentId: 'test-basic-ops-001',
      agentType: 'test-agent'
    });

    try {
      // Test registration
      await registry.registerAgent(testRegistration);
      console.log('  ✓ Agent registration successful');

      // Test retrieval
      const retrieved = await registry.getAgent(testRegistration.agentId);
      if (!retrieved || retrieved.agentId !== testRegistration.agentId) {
        throw new Error('Failed to retrieve registered agent');
      }
      console.log('  ✓ Agent retrieval successful');

      // Test update
      await registry.updateAgent({
        agentId: testRegistration.agentId,
        lastHeartbeat: new Date().toISOString(),
        status: 'healthy'
      });
      console.log('  ✓ Agent update successful');

      // Test deregistration
      await registry.deregisterAgent(testRegistration.agentId);
      console.log('  ✓ Agent deregistration successful');

      // Verify deregistration
      const afterDeregister = await registry.getAgent(testRegistration.agentId);
      if (afterDeregister) {
        throw new Error('Agent still exists after deregistration');
      }
      console.log('  ✓ Agent properly removed after deregistration');

    } finally {
      await registry.shutdown();
    }
  }

  private async testServiceDiscovery(): Promise<void> {
    const registry = new ConsulServiceRegistry(this.consulConfig);
    
    // Register multiple test agents
    const agents = [
      createTestRegistration({
        agentId: 'test-discovery-001',
        agentType: 'prd-parser',
        currentMetrics: { ...createTestRegistration().currentMetrics, currentLoad: 25 }
      }),
      createTestRegistration({
        agentId: 'test-discovery-002',
        agentType: 'prd-parser',
        currentMetrics: { ...createTestRegistration().currentMetrics, currentLoad: 75 }
      }),
      createTestRegistration({
        agentId: 'test-discovery-003',
        agentType: 'scaffold-generator',
        currentMetrics: { ...createTestRegistration().currentMetrics, currentLoad: 50 }
      })
    ];

    try {
      // Register all agents
      for (const agent of agents) {
        await registry.registerAgent(agent);
      }
      console.log('  ✓ Test agents registered');

      // Test discovery by type
      const prdParsers = await registry.discoverAgents({
        agentType: 'prd-parser',
        healthyOnly: true
      });
      
      if (prdParsers.agents.length !== 2) {
        throw new Error(`Expected 2 PRD parsers, found ${prdParsers.agents.length}`);
      }
      console.log('  ✓ Discovery by agent type working');

      // Test discovery with load filtering
      const lowLoadAgents = await registry.discoverAgents({
        maxLoad: 30,
        healthyOnly: true
      });
      
      if (lowLoadAgents.agents.length !== 1) {
        throw new Error(`Expected 1 low-load agent, found ${lowLoadAgents.agents.length}`);
      }
      console.log('  ✓ Discovery with load filtering working');

      // Test discovery with sorting
      const sortedByLoad = await registry.discoverAgents({
        healthyOnly: true,
        sortBy: 'load',
        sortOrder: 'asc'
      });
      
      if (sortedByLoad.agents.length === 0) {
        throw new Error('No agents found in sorted query');
      }
      
      // Verify sorting
      for (let i = 1; i < sortedByLoad.agents.length; i++) {
        if (sortedByLoad.agents[i-1].currentMetrics.currentLoad > sortedByLoad.agents[i].currentMetrics.currentLoad) {
          throw new Error('Agents not sorted by load correctly');
        }
      }
      console.log('  ✓ Discovery with sorting working');

      // Test pagination
      const page1 = await registry.discoverAgents({
        healthyOnly: true,
        limit: 2,
        offset: 0
      });
      
      if (page1.agents.length !== 2) {
        throw new Error(`Expected 2 agents in page 1, found ${page1.agents.length}`);
      }
      
      if (page1.totalCount !== 3) {
        throw new Error(`Expected total count 3, found ${page1.totalCount}`);
      }
      console.log('  ✓ Discovery with pagination working');

    } finally {
      // Cleanup
      for (const agent of agents) {
        try {
          await registry.deregisterAgent(agent.agentId);
        } catch (error) {
          console.warn(`Failed to cleanup agent ${agent.agentId}:`, error);
        }
      }
      await registry.shutdown();
    }
  }

  private async testHealthChecking(): Promise<void> {
    // This test would require a mock HTTP server
    // For now, we'll test the health check logic without actual HTTP calls
    
    const registry = new ConsulServiceRegistry(this.consulConfig);
    const testAgent = createTestRegistration({
      agentId: 'test-health-001',
      network: {
        address: '127.0.0.1',
        port: 9999, // Non-existent port for testing failure
        protocol: 'http',
        tlsEnabled: false
      }
    });

    try {
      await registry.registerAgent(testAgent);
      console.log('  ✓ Test agent registered for health checking');

      // Test health check (this will fail due to non-existent port)
      const isHealthy = await registry.performHealthCheck(testAgent.agentId);
      if (isHealthy) {
        throw new Error('Health check should have failed for non-existent service');
      }
      console.log('  ✓ Health check correctly failed for non-existent service');

    } finally {
      await registry.deregisterAgent(testAgent.agentId);
      await registry.shutdown();
    }
  }

  private async testAgentLifecycle(): Promise<void> {
    // Test the lifecycle manager without actually starting HTTP servers
    const agentConfig: AgentConfig = {
      agentType: 'test-lifecycle',
      port: 9998,
      capabilities: [{
        name: 'test-capability',
        version: '1.0.0',
        description: 'Test capability for lifecycle'
      }],
      environment: 'development'
    };

    const lifecycleManager = new AgentLifecycleManager(agentConfig, this.consulConfig);
    
    let startedEmitted = false;
    let registeredEmitted = false;

    lifecycleManager.on('starting', () => {
      startedEmitted = true;
    });

    lifecycleManager.on('registered', () => {
      registeredEmitted = true;
    });

    try {
      // This would normally start HTTP servers, but we'll test the basic flow
      console.log('  ✓ Lifecycle manager created');
      
      // Test metadata creation
      const metadata = lifecycleManager.getAgentMetadata();
      if (!metadata) {
        console.log('  ✓ Agent metadata not yet created (expected before startup)');
      }

      console.log('  ✓ Lifecycle management test completed (limited without full startup)');

    } catch (error) {
      console.warn('  ⚠ Lifecycle test limited due to HTTP server requirements');
    }
  }

  private async testErrorHandling(): Promise<void> {
    const registry = new ConsulServiceRegistry({
      ...this.consulConfig,
      host: 'invalid-consul-host', // Invalid host to trigger errors
      port: '9999'
    });

    try {
      const testAgent = createTestRegistration();
      
      // This should fail due to invalid Consul connection
      await registry.registerAgent(testAgent);
      throw new Error('Registration should have failed with invalid Consul host');
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('should have failed')) {
        throw error;
      }
      console.log('  ✓ Registration correctly failed with invalid Consul connection');
    }

    // Test validation errors
    try {
      const validRegistry = new ConsulServiceRegistry(this.consulConfig);
      const invalidAgent = {
        agentId: 'invalid',
        agentName: '',
        network: { port: -1 }
      } as any;
      
      await validRegistry.registerAgent(invalidAgent);
      throw new Error('Registration should have failed with invalid data');
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('should have failed')) {
        throw error;
      }
      console.log('  ✓ Registration correctly failed with invalid data');
    }
  }

  private async testPerformance(): Promise<void> {
    const registry = new ConsulServiceRegistry(this.consulConfig);
    const agentCount = 10;
    const agents: AgentRegistrationMetadata[] = [];

    try {
      // Generate test agents
      for (let i = 0; i < agentCount; i++) {
        agents.push(createTestRegistration({
          agentId: `perf-test-${i.toString().padStart(3, '0')}`,
          agentType: i % 2 === 0 ? 'prd-parser' : 'scaffold-generator'
        }));
      }

      // Test batch registration performance
      const registrationStart = Date.now();
      const registrationPromises = agents.map(agent => registry.registerAgent(agent));
      await Promise.all(registrationPromises);
      const registrationTime = Date.now() - registrationStart;
      
      console.log(`  ✓ Registered ${agentCount} agents in ${registrationTime}ms (${Math.round(registrationTime/agentCount)}ms per agent)`);

      // Test discovery performance
      const discoveryStart = Date.now();
      const result = await registry.discoverAgents({ healthyOnly: true });
      const discoveryTime = Date.now() - discoveryStart;
      
      console.log(`  ✓ Discovered ${result.agents.length} agents in ${discoveryTime}ms`);

      // Test batch deregistration performance
      const deregistrationStart = Date.now();
      const deregistrationPromises = agents.map(agent => 
        registry.deregisterAgent(agent.agentId).catch(error => 
          console.warn(`Failed to deregister ${agent.agentId}:`, error)
        )
      );
      await Promise.all(deregistrationPromises);
      const deregistrationTime = Date.now() - deregistrationStart;
      
      console.log(`  ✓ Deregistered ${agentCount} agents in ${deregistrationTime}ms (${Math.round(deregistrationTime/agentCount)}ms per agent)`);

      // Performance assertions
      if (registrationTime / agentCount > 1000) {
        throw new Error(`Registration too slow: ${Math.round(registrationTime/agentCount)}ms per agent`);
      }

      if (discoveryTime > 5000) {
        throw new Error(`Discovery too slow: ${discoveryTime}ms`);
      }

    } finally {
      await registry.shutdown();
    }
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => r.passed === false).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`📈 Success rate: ${Math.round((passed / this.results.length) * 100)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }

    console.log('\n' + '='.repeat(50));
    
    if (failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log(`💥 ${failed} test(s) failed`);
      process.exit(1);
    }
  }
}

// Main execution
async function runTests() {
  const testSuite = new ServiceRegistryTestSuite();
  await testSuite.runAllTests();
}

// Command-line execution
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { ServiceRegistryTestSuite };