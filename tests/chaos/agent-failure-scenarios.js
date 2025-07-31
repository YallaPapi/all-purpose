/**
 * Agent Failure Chaos Test Scenarios
 * 
 * Chaos engineering tests for agent failures, crashes,
 * and unexpected behaviors in the system
 */

const { ChaosToolkit } = require('@chaostoolkit/chaostoolkit-lib');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const TestAgentSimulator = require('../e2e/test-agent-simulator');

// Chaos test configuration
const CHAOS_CONFIG = {
  redis: {
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379'
  },
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000'
  },
  agents: {
    defaultCount: 10,
    criticalAgentTypes: ['coordinator', 'monitor']
  },
  scenarios: {
    failureRate: 0.3, // 30% of agents will fail
    cascadeDelay: 2000, // 2s between cascade failures
    recoveryTime: 10000 // 10s recovery period
  }
};

class AgentFailureChaosTests {
  constructor() {
    this.redisClient = new Redis(CHAOS_CONFIG.redis.url);
    this.agents = [];
    this.metrics = {
      totalFailures: 0,
      recoveryAttempts: 0,
      cascadeFailures: 0,
      systemDowntime: 0
    };
  }
  
  async setup() {
    console.log('🔧 Setting up chaos test environment...');
    
    // Clear any existing test data
    await this.clearTestData();
    
    // Create baseline agents
    await this.createBaselineAgents();
    
    // Start monitoring
    await this.startMonitoring();
    
    console.log('✅ Chaos test environment ready');
  }
  
  async teardown() {
    console.log('🧹 Cleaning up chaos test...');
    
    // Shutdown all agents
    for (const agent of this.agents) {
      try {
        await agent.shutdown();
      } catch (error) {
        // Agent may already be crashed
      }
    }
    
    // Clear test data
    await this.clearTestData();
    
    // Close connections
    this.redisClient.disconnect();
    
    console.log('✅ Cleanup completed');
  }
  
  async createBaselineAgents() {
    const agentTypes = [
      { type: 'coordinator', count: 2, critical: true },
      { type: 'processor', count: 4, critical: false },
      { type: 'monitor', count: 2, critical: true },
      { type: 'executor', count: 2, critical: false }
    ];
    
    for (const { type, count, critical } of agentTypes) {
      for (let i = 0; i < count; i++) {
        const agent = new TestAgentSimulator({
          agentName: `Chaos-${type}-${i}`,
          agentType: type,
          capabilities: this.getCapabilitiesForType(type),
          metadata: { critical, chaosTest: true }
        });
        
        await agent.connect();
        await agent.register();
        this.agents.push(agent);
      }
    }
    
    console.log(`Created ${this.agents.length} baseline agents`);
  }
  
  getCapabilitiesForType(type) {
    const capabilityMap = {
      coordinator: ['coordination', 'orchestration', 'workflow'],
      processor: ['data-processing', 'transformation', 'validation'],
      monitor: ['monitoring', 'health-check', 'alerting'],
      executor: ['execution', 'task-processing', 'completion']
    };
    
    return capabilityMap[type] || ['generic'];
  }
  
  async clearTestData() {
    const patterns = ['chaos-*', 'agent:Chaos-*', 'test:chaos:*'];
    
    for (const pattern of patterns) {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    }
  }
  
  async startMonitoring() {
    // Monitor system health during chaos tests
    this.monitoringInterval = setInterval(async () => {
      const health = await this.checkSystemHealth();
      
      if (!health.healthy) {
        this.metrics.systemDowntime += 1;
      }
      
      // Log critical issues
      if (health.criticalAgentsDown > 0) {
        console.log(`⚠️  ${health.criticalAgentsDown} critical agents down!`);
      }
    }, 1000);
  }
  
  async checkSystemHealth() {
    const activeAgents = await this.redisClient.smembers('agents:active');
    const chaosAgents = activeAgents.filter(id => id.includes('Chaos-'));
    
    let criticalAgentsDown = 0;
    let healthyAgents = 0;
    
    for (const agentId of chaosAgents) {
      const healthData = await this.redisClient.hget(`agent:${agentId}`, 'health');
      if (healthData) {
        const health = JSON.parse(healthData);
        if (health.status === 'healthy') {
          healthyAgents++;
        }
      }
      
      const agentData = await this.redisClient.hget(`agent:${agentId}`, 'data');
      if (agentData) {
        const agent = JSON.parse(agentData);
        if (agent.metadata?.critical && (!healthData || JSON.parse(healthData).status !== 'healthy')) {
          criticalAgentsDown++;
        }
      }
    }
    
    return {
      healthy: healthyAgents >= this.agents.length * 0.6, // 60% threshold
      totalAgents: chaosAgents.length,
      healthyAgents,
      criticalAgentsDown
    };
  }
  
  // Chaos Scenario 1: Random Agent Failures
  async testRandomAgentFailures() {
    console.log('\n🎯 Chaos Scenario: Random Agent Failures');
    
    const scenario = {
      title: 'Random Agent Failures',
      description: 'Randomly kill agents and observe system recovery',
      hypothesis: 'System should maintain 60% availability and recover failed agents'
    };
    
    console.log(`Hypothesis: ${scenario.hypothesis}`);
    
    // Record steady state
    const steadyState = await this.checkSystemHealth();
    console.log(`Steady state: ${steadyState.healthyAgents}/${steadyState.totalAgents} healthy`);
    
    // Inject failures
    const failureCount = Math.floor(this.agents.length * CHAOS_CONFIG.scenarios.failureRate);
    const failedAgents = [];
    
    for (let i = 0; i < failureCount; i++) {
      const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
      
      if (!failedAgents.includes(agent.agentId)) {
        console.log(`💥 Killing agent: ${agent.agentName}`);
        
        await this.injectAgentFailure(agent, 'crash');
        failedAgents.push(agent.agentId);
        this.metrics.totalFailures++;
        
        // Small delay between failures
        await this.delay(500);
      }
    }
    
    // Monitor recovery
    console.log('\n⏱️  Monitoring recovery...');
    const recoveryStart = Date.now();
    let recovered = false;
    
    while (Date.now() - recoveryStart < CHAOS_CONFIG.scenarios.recoveryTime) {
      const health = await this.checkSystemHealth();
      
      if (health.healthyAgents >= steadyState.healthyAgents * 0.9) {
        recovered = true;
        console.log(`✅ System recovered in ${Date.now() - recoveryStart}ms`);
        break;
      }
      
      await this.delay(1000);
    }
    
    // Verify hypothesis
    const result = {
      scenario: scenario.title,
      hypothesis: scenario.hypothesis,
      passed: recovered,
      metrics: {
        failuresInjected: failureCount,
        recoveryTime: recovered ? Date.now() - recoveryStart : 'timeout',
        finalHealth: await this.checkSystemHealth()
      }
    };
    
    console.log('\nScenario Result:', JSON.stringify(result, null, 2));
    return result;
  }
  
  // Chaos Scenario 2: Cascading Failures
  async testCascadingFailures() {
    console.log('\n🎯 Chaos Scenario: Cascading Failures');
    
    const scenario = {
      title: 'Cascading Failures',
      description: 'Kill critical agents to trigger cascade failures',
      hypothesis: 'System should prevent cascade failures through circuit breakers'
    };
    
    console.log(`Hypothesis: ${scenario.hypothesis}`);
    
    // Find critical agents
    const criticalAgents = this.agents.filter(a => 
      CHAOS_CONFIG.agents.criticalAgentTypes.includes(a.agentType)
    );
    
    if (criticalAgents.length === 0) {
      console.log('No critical agents found, skipping scenario');
      return;
    }
    
    // Kill first critical agent
    const firstAgent = criticalAgents[0];
    console.log(`💥 Killing critical agent: ${firstAgent.agentName}`);
    await this.injectAgentFailure(firstAgent, 'crash');
    
    // Monitor for cascade
    console.log('\n⏱️  Monitoring for cascade failures...');
    const cascadeStart = Date.now();
    let cascadeDetected = false;
    const failuresBefore = this.metrics.totalFailures;
    
    while (Date.now() - cascadeStart < CHAOS_CONFIG.scenarios.cascadeDelay * 3) {
      const health = await this.checkSystemHealth();
      
      // Check if more agents failed
      const currentFailures = await this.countFailedAgents();
      if (currentFailures > failuresBefore + 1) {
        cascadeDetected = true;
        this.metrics.cascadeFailures = currentFailures - failuresBefore - 1;
        console.log(`⚠️  Cascade detected! ${this.metrics.cascadeFailures} additional failures`);
      }
      
      await this.delay(500);
    }
    
    // Verify circuit breakers activated
    const circuitBreakerStatus = await this.checkCircuitBreakers();
    
    const result = {
      scenario: scenario.title,
      hypothesis: scenario.hypothesis,
      passed: !cascadeDetected || circuitBreakerStatus.activated,
      metrics: {
        initialFailure: firstAgent.agentName,
        cascadeFailures: this.metrics.cascadeFailures,
        circuitBreakersActivated: circuitBreakerStatus.activated,
        containmentTime: cascadeDetected ? Date.now() - cascadeStart : 0
      }
    };
    
    console.log('\nScenario Result:', JSON.stringify(result, null, 2));
    return result;
  }
  
  // Chaos Scenario 3: Slow Agent Degradation
  async testSlowAgentDegradation() {
    console.log('\n🎯 Chaos Scenario: Slow Agent Degradation');
    
    const scenario = {
      title: 'Slow Agent Degradation',
      description: 'Gradually degrade agent performance',
      hypothesis: 'System should detect and isolate degraded agents'
    };
    
    console.log(`Hypothesis: ${scenario.hypothesis}`);
    
    // Select agents to degrade
    const degradeCount = Math.floor(this.agents.length * 0.4);
    const degradedAgents = [];
    
    for (let i = 0; i < degradeCount; i++) {
      const agent = this.agents[i];
      console.log(`🐌 Degrading agent: ${agent.agentName}`);
      
      // Gradually increase response time
      for (let delay of [100, 500, 2000, 5000]) {
        agent.responseDelay = delay;
        await this.delay(2000);
        
        // Check if agent was isolated
        const isActive = await this.redisClient.sismember('agents:active', agent.agentId);
        if (!isActive) {
          console.log(`✅ Agent ${agent.agentName} isolated at ${delay}ms delay`);
          degradedAgents.push({ agent: agent.agentName, isolatedAt: delay });
          break;
        }
      }
    }
    
    const result = {
      scenario: scenario.title,
      hypothesis: scenario.hypothesis,
      passed: degradedAgents.length === degradeCount,
      metrics: {
        agentsDegraded: degradeCount,
        agentsIsolated: degradedAgents.length,
        averageIsolationDelay: degradedAgents.reduce((sum, d) => sum + d.isolatedAt, 0) / degradedAgents.length || 0
      }
    };
    
    console.log('\nScenario Result:', JSON.stringify(result, null, 2));
    return result;
  }
  
  // Chaos Scenario 4: Memory Leak Simulation
  async testMemoryLeakResilience() {
    console.log('\n🎯 Chaos Scenario: Memory Leak Resilience');
    
    const scenario = {
      title: 'Memory Leak Resilience',
      description: 'Simulate memory leaks in agents',
      hypothesis: 'System should detect and restart agents with memory leaks'
    };
    
    console.log(`Hypothesis: ${scenario.hypothesis}`);
    
    // Inject memory leaks
    const leakAgents = this.agents.slice(0, 3);
    
    for (const agent of leakAgents) {
      console.log(`💾 Injecting memory leak in: ${agent.agentName}`);
      await this.injectAgentFailure(agent, 'memory_leak');
    }
    
    // Monitor memory usage and restarts
    console.log('\n⏱️  Monitoring memory and restarts...');
    const monitoringDuration = 30000; // 30 seconds
    const startTime = Date.now();
    const restartedAgents = new Set();
    
    while (Date.now() - startTime < monitoringDuration) {
      for (const agent of leakAgents) {
        const healthData = await this.redisClient.hget(`agent:${agent.agentId}`, 'health');
        
        if (healthData) {
          const health = JSON.parse(healthData);
          
          // Check if agent was restarted (uptime reset)
          if (health.metrics?.uptime < 5000) {
            restartedAgents.add(agent.agentId);
            console.log(`♻️  Agent ${agent.agentName} was restarted`);
          }
          
          // Check memory usage
          if (health.metrics?.memoryUsage > 500 * 1024 * 1024) { // 500MB
            console.log(`⚠️  High memory usage in ${agent.agentName}: ${Math.round(health.metrics.memoryUsage / 1024 / 1024)}MB`);
          }
        }
      }
      
      await this.delay(5000);
    }
    
    const result = {
      scenario: scenario.title,
      hypothesis: scenario.hypothesis,
      passed: restartedAgents.size === leakAgents.length,
      metrics: {
        agentsWithLeaks: leakAgents.length,
        agentsRestarted: restartedAgents.size,
        monitoringDuration: monitoringDuration
      }
    };
    
    console.log('\nScenario Result:', JSON.stringify(result, null, 2));
    return result;
  }
  
  // Chaos Scenario 5: Byzantine Behavior
  async testByzantineAgents() {
    console.log('\n🎯 Chaos Scenario: Byzantine Agent Behavior');
    
    const scenario = {
      title: 'Byzantine Agent Behavior',
      description: 'Agents sending invalid or conflicting data',
      hypothesis: 'System should detect and quarantine byzantine agents'
    };
    
    console.log(`Hypothesis: ${scenario.hypothesis}`);
    
    // Make some agents byzantine
    const byzantineCount = 2;
    const byzantineAgents = [];
    
    for (let i = 0; i < byzantineCount; i++) {
      const agent = this.agents[i];
      console.log(`😈 Making agent byzantine: ${agent.agentName}`);
      
      // Configure agent to send invalid responses
      agent.on('discovery_query', async (query) => {
        // Send conflicting responses
        const responses = [
          { status: 'healthy', capabilities: ['invalid'] },
          { status: 'invalid-status', capabilities: null },
          { error: 'Byzantine response' }
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
      });
      
      byzantineAgents.push(agent);
    }
    
    // Test system detection
    console.log('\n⏱️  Testing byzantine detection...');
    const detectionStart = Date.now();
    const quarantinedAgents = new Set();
    
    // Send discovery queries
    for (let i = 0; i < 10; i++) {
      await this.redisClient.publish('agent:discovery', JSON.stringify({
        queryId: uuidv4(),
        capabilities: ['data-processing'],
        timestamp: new Date().toISOString()
      }));
      
      await this.delay(1000);
      
      // Check for quarantined agents
      for (const agent of byzantineAgents) {
        const isQuarantined = await this.redisClient.sismember('agents:quarantined', agent.agentId);
        if (isQuarantined) {
          quarantinedAgents.add(agent.agentId);
          console.log(`🚫 Agent ${agent.agentName} quarantined`);
        }
      }
    }
    
    const result = {
      scenario: scenario.title,
      hypothesis: scenario.hypothesis,
      passed: quarantinedAgents.size === byzantineCount,
      metrics: {
        byzantineAgents: byzantineCount,
        detectedAndQuarantined: quarantinedAgents.size,
        detectionTime: Date.now() - detectionStart
      }
    };
    
    console.log('\nScenario Result:', JSON.stringify(result, null, 2));
    return result;
  }
  
  // Helper methods
  async injectAgentFailure(agent, failureType) {
    await this.redisClient.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
      type: 'simulate_failure',
      failureType
    }));
  }
  
  async countFailedAgents() {
    const activeAgents = await this.redisClient.smembers('agents:active');
    return this.agents.length - activeAgents.filter(id => id.includes('Chaos-')).length;
  }
  
  async checkCircuitBreakers() {
    // Check if circuit breakers are activated
    const circuitBreakerKeys = await this.redisClient.keys('circuit-breaker:*');
    let activated = 0;
    
    for (const key of circuitBreakerKeys) {
      const state = await this.redisClient.get(key);
      if (state === 'open') {
        activated++;
      }
    }
    
    return {
      total: circuitBreakerKeys.length,
      activated,
      percentage: circuitBreakerKeys.length > 0 ? (activated / circuitBreakerKeys.length) * 100 : 0
    };
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Run all scenarios
  async runAllScenarios() {
    console.log('🚀 Starting Agent Failure Chaos Tests\n');
    
    const results = [];
    
    try {
      await this.setup();
      
      // Run each scenario with recovery time between
      const scenarios = [
        () => this.testRandomAgentFailures(),
        () => this.testCascadingFailures(),
        () => this.testSlowAgentDegradation(),
        () => this.testMemoryLeakResilience(),
        () => this.testByzantineAgents()
      ];
      
      for (const scenario of scenarios) {
        const result = await scenario();
        results.push(result);
        
        // Recovery period between scenarios
        console.log('\n⏸️  Recovery period...\n');
        await this.delay(10000);
        
        // Reset agents
        await this.resetAgents();
      }
      
      // Summary
      console.log('\n📊 Chaos Test Summary');
      console.log('====================');
      
      const passed = results.filter(r => r.passed).length;
      console.log(`Total Scenarios: ${results.length}`);
      console.log(`Passed: ${passed}`);
      console.log(`Failed: ${results.length - passed}`);
      console.log(`Success Rate: ${(passed / results.length * 100).toFixed(2)}%`);
      
      console.log('\nDetailed Results:');
      results.forEach(r => {
        console.log(`- ${r.scenario}: ${r.passed ? '✅ PASSED' : '❌ FAILED'}`);
      });
      
    } finally {
      clearInterval(this.monitoringInterval);
      await this.teardown();
    }
    
    return results;
  }
  
  async resetAgents() {
    // Reset all agents to healthy state
    for (const agent of this.agents) {
      if (agent.isRunning) {
        agent.healthState = 'healthy';
        agent.responseDelay = 0;
        agent.failureRate = 0;
        await agent.updateHealthState();
      } else {
        // Restart crashed agents
        await agent.connect();
        await agent.register();
      }
    }
  }
}

// Export for use in test runner
module.exports = AgentFailureChaosTests;

// Run if executed directly
if (require.main === module) {
  const chaosTests = new AgentFailureChaosTests();
  
  chaosTests.runAllScenarios()
    .then(results => {
      process.exit(results.every(r => r.passed) ? 0 : 1);
    })
    .catch(error => {
      console.error('Chaos test failed:', error);
      process.exit(1);
    });
}