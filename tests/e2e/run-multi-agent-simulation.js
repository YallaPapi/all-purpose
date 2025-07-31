/**
 * Multi-Agent Simulation Runner
 * 
 * Demonstrates the test agent simulator with multiple agents
 * performing various tasks and interactions
 */

const TestAgentSimulator = require('./test-agent-simulator');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

// Configuration
const REDIS_URL = process.env.KV_REST_API_URL || 'redis://localhost:6379';
const AGENT_COUNT = 5;
const SIMULATION_DURATION = 60000; // 1 minute

class MultiAgentSimulation {
  constructor() {
    this.agents = [];
    this.redisClient = null;
    this.redisPub = null;
    this.redisSub = null;
    this.stats = {
      tasksIssued: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      discoveryQueries: 0,
      healthChecks: 0,
      agentFailures: 0
    };
  }

  async initialize() {
    console.log('🚀 Initializing Multi-Agent Simulation...\n');
    
    // Initialize Redis connections
    this.redisClient = new Redis(REDIS_URL);
    this.redisPub = new Redis(REDIS_URL);
    this.redisSub = new Redis(REDIS_URL);
    
    // Subscribe to events for monitoring
    await this.redisSub.subscribe('agent:events', 'task:events', 'health:reports');
    this.redisSub.on('message', this.handleMonitoringEvent.bind(this));
    
    // Clean up any existing test data
    await this.cleanup();
  }

  async createAgents() {
    console.log(`📦 Creating ${AGENT_COUNT} test agents...\n`);
    
    const agentConfigs = [
      {
        agentName: 'Data Processor Alpha',
        agentType: 'processor',
        capabilities: ['data-processing', 'analytics', 'transformation']
      },
      {
        agentName: 'Monitor Beta',
        agentType: 'monitor',
        capabilities: ['monitoring', 'alerting', 'health-check']
      },
      {
        agentName: 'Reporter Gamma',
        agentType: 'reporter',
        capabilities: ['reporting', 'analytics', 'visualization']
      },
      {
        agentName: 'Coordinator Delta',
        agentType: 'coordinator',
        capabilities: ['coordination', 'task-distribution', 'workflow']
      },
      {
        agentName: 'Executor Epsilon',
        agentType: 'executor',
        capabilities: ['execution', 'processing', 'validation']
      }
    ];
    
    for (let i = 0; i < AGENT_COUNT; i++) {
      const config = agentConfigs[i % agentConfigs.length];
      const agent = new TestAgentSimulator({
        ...config,
        agentName: `${config.agentName}-${i}`,
        responseDelay: Math.random() * 200, // 0-200ms delay
        failureRate: 0.05 // 5% failure rate
      });
      
      await agent.connect();
      await agent.register();
      this.agents.push(agent);
      
      console.log(`✅ Registered: ${agent.agentName} (${agent.agentId})`);
    }
    
    console.log('\n');
  }

  async runSimulation() {
    console.log('🎮 Starting simulation activities...\n');
    
    // Start various simulation activities
    const activities = [
      this.simulateTaskDistribution(),
      this.simulateDiscoveryQueries(),
      this.simulateHealthMonitoring(),
      this.simulateFailureScenarios(),
      this.simulateLoadPatterns()
    ];
    
    // Run simulation for specified duration
    const simulationPromise = Promise.all(activities);
    const timeoutPromise = new Promise(resolve => 
      setTimeout(resolve, SIMULATION_DURATION)
    );
    
    await Promise.race([simulationPromise, timeoutPromise]);
    
    console.log('\n⏱️  Simulation completed!');
  }

  async simulateTaskDistribution() {
    const taskInterval = setInterval(async () => {
      try {
        // Select a random agent with execution capabilities
        const executors = this.agents.filter(a => 
          a.capabilities.includes('execution') || 
          a.capabilities.includes('processing')
        );
        
        if (executors.length === 0) return;
        
        const agent = executors[Math.floor(Math.random() * executors.length)];
        const taskId = uuidv4();
        
        await this.redisPub.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
          type: 'execute_task',
          task: {
            taskId,
            type: 'simulation-task',
            priority: Math.random() > 0.8 ? 'high' : 'normal',
            payload: {
              data: `Task data ${taskId}`,
              complexity: Math.floor(Math.random() * 10) + 1
            }
          }
        }));
        
        this.stats.tasksIssued++;
        console.log(`📋 Issued task ${taskId.slice(0, 8)} to ${agent.agentName}`);
      } catch (error) {
        console.error('Error in task distribution:', error);
      }
    }, 2000); // Issue task every 2 seconds
    
    setTimeout(() => clearInterval(taskInterval), SIMULATION_DURATION - 5000);
  }

  async simulateDiscoveryQueries() {
    const discoveryInterval = setInterval(async () => {
      try {
        const queryTypes = [
          { capabilities: ['processing'] },
          { capabilities: ['monitoring'] },
          { agentType: 'coordinator' },
          { capabilities: ['analytics', 'reporting'] }
        ];
        
        const query = queryTypes[Math.floor(Math.random() * queryTypes.length)];
        const queryId = uuidv4();
        
        // Set up response listener
        const responseKey = `discovery:response:${queryId}`;
        await this.redisClient.del(responseKey); // Clear any existing data
        
        await this.redisPub.publish('agent:discovery', JSON.stringify({
          queryId,
          ...query,
          timestamp: new Date().toISOString()
        }));
        
        this.stats.discoveryQueries++;
        console.log(`🔍 Discovery query: ${JSON.stringify(query)}`);
        
        // Check responses after a delay
        setTimeout(async () => {
          const responses = await this.redisClient.lrange(responseKey, 0, -1);
          console.log(`   → Found ${responses.length} matching agents`);
        }, 1000);
      } catch (error) {
        console.error('Error in discovery query:', error);
      }
    }, 5000); // Query every 5 seconds
    
    setTimeout(() => clearInterval(discoveryInterval), SIMULATION_DURATION - 5000);
  }

  async simulateHealthMonitoring() {
    const healthInterval = setInterval(async () => {
      try {
        // Request health check from random agent
        const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
        
        await this.redisPub.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
          type: 'health_check'
        }));
        
        this.stats.healthChecks++;
      } catch (error) {
        console.error('Error in health monitoring:', error);
      }
    }, 3000); // Health check every 3 seconds
    
    setTimeout(() => clearInterval(healthInterval), SIMULATION_DURATION - 5000);
  }

  async simulateFailureScenarios() {
    const failureInterval = setInterval(async () => {
      try {
        // Randomly introduce failures
        if (Math.random() > 0.9) { // 10% chance
          const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
          const failureTypes = ['degraded', 'slow_response'];
          const failureType = failureTypes[Math.floor(Math.random() * failureTypes.length)];
          
          await this.redisPub.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
            type: 'simulate_failure',
            failureType
          }));
          
          this.stats.agentFailures++;
          console.log(`⚠️  Simulated ${failureType} for ${agent.agentName}`);
          
          // Recover after some time
          setTimeout(async () => {
            await this.redisPub.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
              type: 'set_health_state',
              state: 'healthy'
            }));
            console.log(`✅ Recovered ${agent.agentName}`);
          }, 10000);
        }
      } catch (error) {
        console.error('Error in failure simulation:', error);
      }
    }, 8000); // Check every 8 seconds
    
    setTimeout(() => clearInterval(failureInterval), SIMULATION_DURATION - 15000);
  }

  async simulateLoadPatterns() {
    // Simulate varying load patterns
    let phase = 0;
    const loadInterval = setInterval(async () => {
      phase = (phase + 1) % 3;
      
      switch (phase) {
        case 0: // Low load
          console.log('\n📊 Load Pattern: LOW\n');
          break;
        case 1: // Medium load
          console.log('\n📊 Load Pattern: MEDIUM\n');
          // Issue burst of tasks
          for (let i = 0; i < 3; i++) {
            const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
            await this.redisPub.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
              type: 'execute_task',
              task: {
                taskId: uuidv4(),
                type: 'burst-task'
              }
            }));
          }
          break;
        case 2: // High load
          console.log('\n📊 Load Pattern: HIGH\n');
          // Issue many tasks
          for (let i = 0; i < 10; i++) {
            const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
            await this.redisPub.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
              type: 'execute_task',
              task: {
                taskId: uuidv4(),
                type: 'load-task'
              }
            }));
          }
          break;
      }
    }, 15000); // Change load pattern every 15 seconds
    
    setTimeout(() => clearInterval(loadInterval), SIMULATION_DURATION - 5000);
  }

  handleMonitoringEvent(channel, message) {
    try {
      const event = JSON.parse(message);
      
      switch (channel) {
        case 'task:events':
          if (event.eventType === 'task_completed') {
            this.stats.tasksCompleted++;
          } else if (event.eventType === 'task_failed') {
            this.stats.tasksFailed++;
          }
          break;
        case 'agent:events':
          // Log significant agent events
          if (event.eventType === 'agent_shutdown' || 
              event.eventType === 'health_state_changed') {
            console.log(`🔔 Agent Event: ${event.eventType} - ${event.agentId}`);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling monitoring event:', error);
    }
  }

  async printStats() {
    console.log('\n📈 Simulation Statistics:');
    console.log('========================');
    console.log(`Tasks Issued:      ${this.stats.tasksIssued}`);
    console.log(`Tasks Completed:   ${this.stats.tasksCompleted}`);
    console.log(`Tasks Failed:      ${this.stats.tasksFailed}`);
    console.log(`Discovery Queries: ${this.stats.discoveryQueries}`);
    console.log(`Health Checks:     ${this.stats.healthChecks}`);
    console.log(`Agent Failures:    ${this.stats.agentFailures}`);
    
    const successRate = this.stats.tasksIssued > 0 
      ? ((this.stats.tasksCompleted / this.stats.tasksIssued) * 100).toFixed(2)
      : 0;
    console.log(`\nTask Success Rate: ${successRate}%`);
    
    // Print agent status
    console.log('\n🤖 Agent Status:');
    console.log('================');
    for (const agent of this.agents) {
      console.log(`${agent.agentName}:`);
      console.log(`  Status: ${agent.healthState}`);
      console.log(`  Tasks: ${agent.tasksCompleted}/${agent.tasksReceived}`);
      console.log(`  Running: ${agent.isRunning}`);
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    // Shutdown all agents
    for (const agent of this.agents) {
      try {
        await agent.shutdown();
      } catch (error) {
        console.error(`Error shutting down agent ${agent.agentId}:`, error);
      }
    }
    
    // Clean up Redis data
    const keys = await this.redisClient.keys('test-*');
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
    
    // Close Redis connections
    if (this.redisSub) this.redisSub.disconnect();
    if (this.redisPub) this.redisPub.disconnect();
    if (this.redisClient) this.redisClient.disconnect();
    
    console.log('✅ Cleanup completed');
  }

  async run() {
    try {
      await this.initialize();
      await this.createAgents();
      await this.runSimulation();
      await this.printStats();
    } catch (error) {
      console.error('❌ Simulation error:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the simulation
if (require.main === module) {
  const simulation = new MultiAgentSimulation();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('        MULTI-AGENT SIMULATION TEST RUNNER');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\nAgents: ${AGENT_COUNT}`);
  console.log(`Duration: ${SIMULATION_DURATION / 1000} seconds`);
  console.log(`Redis: ${REDIS_URL}`);
  console.log('\n═══════════════════════════════════════════════════════\n');
  
  simulation.run()
    .then(() => {
      console.log('\n✨ Simulation completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Simulation failed:', error);
      process.exit(1);
    });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Interrupted - shutting down gracefully...');
    await simulation.cleanup();
    process.exit(0);
  });
}

module.exports = MultiAgentSimulation;