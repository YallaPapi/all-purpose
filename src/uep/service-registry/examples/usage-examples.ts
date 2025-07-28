/**
 * Service Registry Usage Examples
 * Task 220.4: Demonstrates how to use the service registration patterns
 */

import { ConsulServiceRegistry, ConsulConfig } from '../ConsulServiceRegistry.js';
import { AgentLifecycleManager, AgentConfig } from '../AgentLifecycleManager.js';
import { 
  samplePRDParserRegistration, 
  sampleScaffoldGeneratorRegistration,
  sampleQueries 
} from './sample-registrations.js';

// Example 1: Basic Service Registry Usage
export async function basicRegistryExample() {
  console.log('=== Basic Service Registry Example ===');
  
  const consulConfig: ConsulConfig = {
    host: process.env.CONSUL_HOST || 'localhost',
    port: process.env.CONSUL_PORT || '8500',
    secure: process.env.CONSUL_SECURE === 'true',
    token: process.env.CONSUL_TOKEN,
    promisify: true
  };

  const registry = new ConsulServiceRegistry(consulConfig);

  try {
    // Register agents
    console.log('Registering agents...');
    await registry.registerAgent(samplePRDParserRegistration);
    await registry.registerAgent(sampleScaffoldGeneratorRegistration);

    // Discover agents
    console.log('Discovering PRD parser agents...');
    const prdParsers = await registry.discoverAgents(sampleQueries.findPRDParsers);
    console.log(`Found ${prdParsers.agents.length} PRD parser agents`);

    // Get specific agent
    console.log('Getting specific agent...');
    const agent = await registry.getAgent(samplePRDParserRegistration.agentId);
    console.log(`Agent found: ${agent?.agentName} (${agent?.status})`);

    // Update agent metrics
    console.log('Updating agent metrics...');
    await registry.updateAgent({
      agentId: samplePRDParserRegistration.agentId,
      lastHeartbeat: new Date().toISOString(),
      currentMetrics: {
        ...samplePRDParserRegistration.currentMetrics,
        currentLoad: 45.0,
        queueLength: 2,
        lastUpdated: new Date().toISOString()
      }
    });

    // Perform health check
    console.log('Performing health check...');
    const isHealthy = await registry.performHealthCheck(samplePRDParserRegistration.agentId);
    console.log(`Agent health status: ${isHealthy ? 'healthy' : 'unhealthy'}`);

    // Discover available agents with load balancing
    console.log('Finding available agents for load balancing...');
    const availableAgents = await registry.discoverAgents(sampleQueries.findAvailableAgents);
    console.log(`Found ${availableAgents.agents.length} available agents sorted by load`);

    // Cleanup
    console.log('Cleaning up...');
    await registry.deregisterAgent(samplePRDParserRegistration.agentId);
    await registry.deregisterAgent(sampleScaffoldGeneratorRegistration.agentId);
    await registry.shutdown();

    console.log('Basic registry example completed successfully');

  } catch (error) {
    console.error('Basic registry example failed:', error);
    throw error;
  }
}

// Example 2: Agent Lifecycle Management
export async function lifecycleManagementExample() {
  console.log('=== Agent Lifecycle Management Example ===');

  const consulConfig: ConsulConfig = {
    host: 'localhost',
    port: '8500',
    secure: false,
    promisify: true
  };

  const agentConfig: AgentConfig = {
    agentType: 'prd-parser',
    agentName: 'example-prd-parser',
    port: 3001,
    capabilities: [
      {
        name: 'document-parsing',
        version: '2.0.0',
        description: 'Parse various document formats into structured data'
      },
      {
        name: 'requirements-extraction',
        version: '1.5.0',
        description: 'Extract requirements from parsed documents'
      }
    ],
    environment: 'development',
    configuration: {
      maxDocumentSize: '10MB',
      supportedFormats: ['markdown', 'docx', 'pdf'],
      debugMode: true
    },
    featureFlags: {
      enhancedParsing: true,
      experimentalFormats: false
    },
    labels: {
      'team': 'uep-core',
      'version': '2.0.0'
    }
  };

  const lifecycleManager = new AgentLifecycleManager(agentConfig, consulConfig);

  // Set up event listeners
  lifecycleManager.on('starting', (agentType) => {
    console.log(`🚀 Agent starting: ${agentType}`);
  });

  lifecycleManager.on('registered', (metadata) => {
    console.log(`✅ Agent registered: ${metadata.agentId} (${metadata.agentName})`);
  });

  lifecycleManager.on('healthCheckStarted', (agentId) => {
    console.log(`🏥 Health check started for: ${agentId}`);
  });

  lifecycleManager.on('metricsStarted', (agentId) => {
    console.log(`📊 Metrics started for: ${agentId}`);
  });

  lifecycleManager.on('updated', (agentId, update) => {
    console.log(`🔄 Agent updated: ${agentId}`);
  });

  lifecycleManager.on('stopping', (agentId) => {
    console.log(`🛑 Agent stopping: ${agentId}`);
  });

  lifecycleManager.on('deregistered', (agentId) => {
    console.log(`❌ Agent deregistered: ${agentId}`);
  });

  lifecycleManager.on('error', (error) => {
    console.error(`💥 Lifecycle error: ${error.message}`);
  });

  try {
    // Start the agent
    await lifecycleManager.startup();

    const agentId = lifecycleManager.getAgentId();
    console.log(`Agent ID: ${agentId}`);

    // Simulate some work and metric updates
    console.log('Simulating agent work...');
    
    setTimeout(async () => {
      await lifecycleManager.updateMetrics({
        currentLoad: 25.0,
        averageResponseTime: 150.5,
        queueLength: 3
      });
    }, 2000);

    setTimeout(async () => {
      await lifecycleManager.updateStatus('healthy');
    }, 3000);

    setTimeout(async () => {
      await lifecycleManager.updateConfiguration({
        maxConcurrentTasks: 5,
        cacheEnabled: true
      });
    }, 4000);

    // Let it run for a while
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Graceful shutdown
    console.log('Initiating graceful shutdown...');
    await lifecycleManager.gracefulShutdown();

    console.log('Lifecycle management example completed successfully');

  } catch (error) {
    console.error('Lifecycle management example failed:', error);
    throw error;
  }
}

// Example 3: Advanced Service Discovery
export async function advancedDiscoveryExample() {
  console.log('=== Advanced Service Discovery Example ===');

  const consulConfig: ConsulConfig = {
    host: 'localhost',
    port: '8500',
    secure: false,
    promisify: true
  };

  const registry = new ConsulServiceRegistry(consulConfig);

  try {
    // Register multiple agents with different characteristics
    const agents = [
      { ...samplePRDParserRegistration, agentId: 'prd-parser-1' },
      { ...samplePRDParserRegistration, agentId: 'prd-parser-2', currentMetrics: { ...samplePRDParserRegistration.currentMetrics, currentLoad: 75.0 } },
      { ...sampleScaffoldGeneratorRegistration, agentId: 'scaffold-gen-1' },
      { ...sampleScaffoldGeneratorRegistration, agentId: 'scaffold-gen-2', environment: 'staging' }
    ];

    console.log('Registering test agents...');
    for (const agent of agents) {
      await registry.registerAgent(agent);
    }

    // Example 1: Find agents by type with load balancing
    console.log('\n1. Finding PRD parsers with load balancing:');
    const prdParsers = await registry.discoverAgents({
      agentType: 'prd-parser',
      healthyOnly: true,
      maxLoad: 80,
      sortBy: 'load',
      sortOrder: 'asc'
    });
    console.log(`Found ${prdParsers.agents.length} PRD parsers:`);
    prdParsers.agents.forEach(agent => {
      console.log(`  - ${agent.agentId}: ${agent.currentMetrics.currentLoad}% load`);
    });

    // Example 2: Find agents by capability
    console.log('\n2. Finding agents with project-scaffolding capability:');
    const scaffoldAgents = await registry.discoverAgents({
      capabilities: ['project-scaffolding'],
      healthyOnly: true,
      environment: 'production'
    });
    console.log(`Found ${scaffoldAgents.agents.length} scaffold generators in production`);

    // Example 3: Find best available agent
    console.log('\n3. Finding best available agent (lowest load):');
    const bestAgent = await registry.discoverAgents({
      healthyOnly: true,
      maxLoad: 50,
      sortBy: 'load',
      sortOrder: 'asc',
      limit: 1
    });
    if (bestAgent.agents.length > 0) {
      const agent = bestAgent.agents[0];
      console.log(`Best agent: ${agent.agentId} (${agent.currentMetrics.currentLoad}% load)`);
    }

    // Example 4: Find agents by environment and cluster
    console.log('\n4. Finding staging environment agents:');
    const stagingAgents = await registry.discoverAgents({
      environment: 'staging',
      cluster: 'uep-prod-cluster'
    });
    console.log(`Found ${stagingAgents.agents.length} agents in staging`);

    // Example 5: Performance-based filtering
    console.log('\n5. Finding high-performance agents:');
    const performantAgents = await registry.discoverAgents({
      maxLoad: 30,
      maxResponseTime: 200,
      maxErrorRate: 0.01,
      sortBy: 'response_time',
      sortOrder: 'asc'
    });
    console.log(`Found ${performantAgents.agents.length} high-performance agents`);

    // Example 6: Pagination
    console.log('\n6. Paginated results:');
    const page1 = await registry.discoverAgents({
      healthyOnly: true,
      sortBy: 'registration_time',
      sortOrder: 'desc',
      limit: 2,
      offset: 0
    });
    console.log(`Page 1 (${page1.agents.length}/${page1.totalCount} agents):`);
    page1.agents.forEach(agent => {
      console.log(`  - ${agent.agentId} (registered: ${agent.registrationTime})`);
    });

    // Cleanup
    console.log('\nCleaning up...');
    for (const agent of agents) {
      await registry.deregisterAgent(agent.agentId);
    }
    await registry.shutdown();

    console.log('Advanced discovery example completed successfully');

  } catch (error) {
    console.error('Advanced discovery example failed:', error);
    throw error;
  }
}

// Example 4: Event-driven Architecture
export async function eventDrivenExample() {
  console.log('=== Event-driven Architecture Example ===');

  const consulConfig: ConsulConfig = {
    host: 'localhost',
    port: '8500',
    secure: false,
    promisify: true
  };

  const registry = new ConsulServiceRegistry(consulConfig);

  // Set up comprehensive event logging
  registry.on('agentRegistered', (metadata) => {
    console.log(`📋 Agent registered: ${metadata.agentName} (${metadata.agentType})`);
    console.log(`   Capabilities: ${metadata.capabilities.map(c => c.name).join(', ')}`);
    console.log(`   Environment: ${metadata.environment}`);
  });

  registry.on('agentDeregistered', (agentId) => {
    console.log(`🗑️  Agent deregistered: ${agentId}`);
  });

  registry.on('agentUpdated', (agentId, update) => {
    console.log(`🔄 Agent updated: ${agentId}`);
    if (update.status) {
      console.log(`   Status: ${update.status}`);
    }
    if (update.currentMetrics) {
      console.log(`   Load: ${update.currentMetrics.currentLoad}%`);
    }
  });

  registry.on('healthCheckPassed', (agentId) => {
    console.log(`💚 Health check passed: ${agentId}`);
  });

  registry.on('healthCheckFailed', (agentId, error) => {
    console.log(`💔 Health check failed: ${agentId} - ${error.message}`);
  });

  registry.on('discoveryQuery', (query, result) => {
    console.log(`🔍 Service discovery query executed:`);
    console.log(`   Query: ${JSON.stringify(query)}`);
    console.log(`   Results: ${result.agents.length}/${result.totalCount} agents`);
    console.log(`   Execution time: ${result.executionTime}ms`);
  });

  registry.on('error', (error) => {
    console.error(`❌ Registry error: ${error.message}`);
  });

  try {
    // Register an agent and observe events
    console.log('Registering agent with event monitoring...');
    await registry.registerAgent(samplePRDParserRegistration);

    // Wait a bit for health checks
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update the agent and observe events
    console.log('Updating agent...');
    await registry.updateAgent({
      agentId: samplePRDParserRegistration.agentId,
      lastHeartbeat: new Date().toISOString(),
      status: 'healthy',
      currentMetrics: {
        ...samplePRDParserRegistration.currentMetrics,
        currentLoad: 50.0,
        lastUpdated: new Date().toISOString()
      }
    });

    // Perform discovery and observe events
    console.log('Performing discovery...');
    await registry.discoverAgents({
      agentType: 'prd-parser',
      healthyOnly: true
    });

    // Cleanup
    console.log('Cleaning up...');
    await registry.deregisterAgent(samplePRDParserRegistration.agentId);
    await registry.shutdown();

    console.log('Event-driven example completed successfully');

  } catch (error) {
    console.error('Event-driven example failed:', error);
    throw error;
  }
}

// Main execution function
export async function runAllExamples() {
  console.log('🚀 Running Service Registry Examples\n');

  try {
    await basicRegistryExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await lifecycleManagementExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await advancedDiscoveryExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await eventDrivenExample();
    
    console.log('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Examples failed:', error);
    process.exit(1);
  }
}

// Command-line execution
if (require.main === module) {
  runAllExamples();
}