/**
 * End-to-End Tests for Agent Discovery and Coordination System
 * 
 * Tests the complete agent lifecycle including registration, discovery,
 * health monitoring, task execution, and failure scenarios
 */

const TestAgentSimulator = require('./test-agent-simulator');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

// Test configuration
const TEST_REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';
const TEST_TIMEOUT = 30000; // 30 seconds

describe('Agent Discovery and Coordination E2E Tests', () => {
  let redisClient;
  let agents = [];
  
  beforeAll(async () => {
    // Initialize Redis client for test verification
    redisClient = new Redis(TEST_REDIS_URL);
    
    // Clear any existing test data
    await cleanupTestData();
  });
  
  afterAll(async () => {
    // Shutdown all test agents
    for (const agent of agents) {
      try {
        await agent.shutdown();
      } catch (error) {
        console.error('Error shutting down agent:', error);
      }
    }
    
    // Clean up test data
    await cleanupTestData();
    
    // Close Redis connection
    if (redisClient) {
      redisClient.disconnect();
    }
  });
  
  afterEach(async () => {
    // Clean up agents created in each test
    for (const agent of agents) {
      try {
        await agent.shutdown();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    agents = [];
  });
  
  async function cleanupTestData() {
    // Remove all test agents
    const keys = await redisClient.keys('agent:test-*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    
    // Clean up test-related keys
    const testKeys = await redisClient.keys('test:*');
    if (testKeys.length > 0) {
      await redisClient.del(...testKeys);
    }
  }
  
  async function createAndRegisterAgent(config = {}) {
    const agent = new TestAgentSimulator(config);
    await agent.connect();
    await agent.register();
    agents.push(agent);
    return agent;
  }
  
  describe('Agent Registration', () => {
    test('should successfully register a new agent', async () => {
      const agent = await createAndRegisterAgent({
        agentName: 'Registration Test Agent',
        capabilities: ['test', 'registration']
      });
      
      // Verify agent is registered in Redis
      const agentData = await redisClient.hget(`agent:${agent.agentId}`, 'data');
      expect(agentData).toBeTruthy();
      
      const parsedData = JSON.parse(agentData);
      expect(parsedData.agentId).toBe(agent.agentId);
      expect(parsedData.agentName).toBe('Registration Test Agent');
      expect(parsedData.capabilities).toEqual(['test', 'registration']);
      
      // Verify agent is in active agents set
      const isActive = await redisClient.sismember('agents:active', agent.agentId);
      expect(isActive).toBe(1);
    }, TEST_TIMEOUT);
    
    test('should handle multiple agent registrations', async () => {
      const agentCount = 5;
      const registeredAgents = [];
      
      // Register multiple agents concurrently
      const registrationPromises = Array.from({ length: agentCount }, (_, i) => 
        createAndRegisterAgent({
          agentName: `Multi-Agent-${i}`,
          capabilities: ['test', 'multi'],
          agentType: 'multi-test'
        })
      );
      
      const results = await Promise.all(registrationPromises);
      registeredAgents.push(...results);
      
      // Verify all agents are registered
      const activeAgents = await redisClient.smembers('agents:active');
      const testAgents = activeAgents.filter(id => id.startsWith('test-agent-'));
      
      expect(testAgents.length).toBeGreaterThanOrEqual(agentCount);
    }, TEST_TIMEOUT);
  });
  
  describe('Agent Discovery', () => {
    test('should discover agents by capabilities', async () => {
      // Register agents with different capabilities
      const agent1 = await createAndRegisterAgent({
        agentName: 'Capability Agent 1',
        capabilities: ['data-processing', 'analytics']
      });
      
      const agent2 = await createAndRegisterAgent({
        agentName: 'Capability Agent 2',
        capabilities: ['data-processing', 'reporting']
      });
      
      const agent3 = await createAndRegisterAgent({
        agentName: 'Capability Agent 3',
        capabilities: ['monitoring', 'alerting']
      });
      
      // Set up discovery response listener
      const discoveryResults = [];
      const sub = new Redis(TEST_REDIS_URL);
      const queryId = uuidv4();
      
      await sub.subscribe(`discovery:response:${queryId}`);
      
      const responsePromise = new Promise((resolve) => {
        const responses = [];
        sub.on('message', (channel, message) => {
          responses.push(JSON.parse(message));
          if (responses.length >= 2) {
            resolve(responses);
          }
        });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(responses), 5000);
      });
      
      // Publish discovery query
      const pub = new Redis(TEST_REDIS_URL);
      await pub.publish('agent:discovery', JSON.stringify({
        queryId,
        capabilities: ['data-processing'],
        timestamp: new Date().toISOString()
      }));
      
      const responses = await responsePromise;
      
      // Verify we discovered the correct agents
      expect(responses.length).toBe(2);
      const agentIds = responses.map(r => r.agentId);
      expect(agentIds).toContain(agent1.agentId);
      expect(agentIds).toContain(agent2.agentId);
      expect(agentIds).not.toContain(agent3.agentId);
      
      // Cleanup
      sub.disconnect();
      pub.disconnect();
    }, TEST_TIMEOUT);
    
    test('should discover agents by type', async () => {
      // Register agents with different types
      const agent1 = await createAndRegisterAgent({
        agentName: 'Type Test Agent 1',
        agentType: 'processor'
      });
      
      const agent2 = await createAndRegisterAgent({
        agentName: 'Type Test Agent 2',
        agentType: 'processor'
      });
      
      const agent3 = await createAndRegisterAgent({
        agentName: 'Type Test Agent 3',
        agentType: 'monitor'
      });
      
      // Set up discovery response listener
      const sub = new Redis(TEST_REDIS_URL);
      const queryId = uuidv4();
      
      await sub.subscribe(`discovery:response:${queryId}`);
      
      const responsePromise = new Promise((resolve) => {
        const responses = [];
        sub.on('message', (channel, message) => {
          responses.push(JSON.parse(message));
          if (responses.length >= 2) {
            resolve(responses);
          }
        });
        
        setTimeout(() => resolve(responses), 5000);
      });
      
      // Publish discovery query
      const pub = new Redis(TEST_REDIS_URL);
      await pub.publish('agent:discovery', JSON.stringify({
        queryId,
        agentType: 'processor',
        timestamp: new Date().toISOString()
      }));
      
      const responses = await responsePromise;
      
      // Verify results
      expect(responses.length).toBe(2);
      expect(responses.every(r => r.agentType === 'processor')).toBe(true);
      
      // Cleanup
      sub.disconnect();
      pub.disconnect();
    }, TEST_TIMEOUT);
  });
  
  describe('Health Monitoring', () => {
    test('should track agent health status', async () => {
      const agent = await createAndRegisterAgent({
        agentName: 'Health Test Agent'
      });
      
      // Wait for initial health check
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Verify health report exists
      const healthData = await redisClient.hget(`agent:${agent.agentId}`, 'health');
      expect(healthData).toBeTruthy();
      
      const health = JSON.parse(healthData);
      expect(health.status).toBe('healthy');
      expect(health.agentId).toBe(agent.agentId);
      expect(health.metrics).toBeDefined();
      expect(health.metrics.tasksCompleted).toBe(0);
    }, TEST_TIMEOUT);
    
    test('should update health state on demand', async () => {
      const agent = await createAndRegisterAgent({
        agentName: 'Health State Test Agent'
      });
      
      // Set up event listener
      const sub = new Redis(TEST_REDIS_URL);
      await sub.subscribe('agent:events');
      
      const stateChangePromise = new Promise((resolve) => {
        sub.on('message', (channel, message) => {
          const event = JSON.parse(message);
          if (event.eventType === 'health_state_changed' && 
              event.agentId === agent.agentId) {
            resolve(event);
          }
        });
      });
      
      // Send command to change health state
      const pub = new Redis(TEST_REDIS_URL);
      await pub.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
        type: 'set_health_state',
        state: 'degraded'
      }));
      
      const event = await stateChangePromise;
      
      expect(event.newState).toBe('degraded');
      expect(agent.healthState).toBe('degraded');
      
      // Cleanup
      sub.disconnect();
      pub.disconnect();
    }, TEST_TIMEOUT);
  });
  
  describe('Task Execution', () => {
    test('should execute tasks successfully', async () => {
      const agent = await createAndRegisterAgent({
        agentName: 'Task Execution Agent',
        capabilities: ['task-execution']
      });
      
      // Set up task event listener
      const sub = new Redis(TEST_REDIS_URL);
      await sub.subscribe('task:events');
      
      const taskCompletePromise = new Promise((resolve) => {
        sub.on('message', (channel, message) => {
          const event = JSON.parse(message);
          if (event.eventType === 'task_completed') {
            resolve(event);
          }
        });
      });
      
      // Send task execution command
      const taskId = uuidv4();
      const pub = new Redis(TEST_REDIS_URL);
      await pub.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
        type: 'execute_task',
        task: {
          taskId,
          type: 'test-task',
          payload: { test: true }
        }
      }));
      
      const event = await taskCompletePromise;
      
      expect(event.taskId).toBe(taskId);
      expect(event.agentId).toBe(agent.agentId);
      expect(event.result.status).toBe('success');
      
      // Cleanup
      sub.disconnect();
      pub.disconnect();
    }, TEST_TIMEOUT);
    
    test('should track task metrics', async () => {
      const agent = await createAndRegisterAgent({
        agentName: 'Task Metrics Agent'
      });
      
      // Execute multiple tasks
      const pub = new Redis(TEST_REDIS_URL);
      const taskCount = 3;
      
      for (let i = 0; i < taskCount; i++) {
        await pub.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
          type: 'execute_task',
          task: {
            taskId: uuidv4(),
            type: 'test-task'
          }
        }));
      }
      
      // Wait for tasks to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check metrics
      expect(agent.tasksReceived).toBe(taskCount);
      
      // Cleanup
      pub.disconnect();
    }, TEST_TIMEOUT);
  });
  
  describe('Failure Scenarios', () => {
    test('should handle agent crash', async () => {
      const agent = await createAndRegisterAgent({
        agentName: 'Crash Test Agent'
      });
      
      const agentId = agent.agentId;
      
      // Simulate crash
      const pub = new Redis(TEST_REDIS_URL);
      await pub.publish(`agent:${agentId}:commands`, JSON.stringify({
        type: 'simulate_failure',
        failureType: 'crash'
      }));
      
      // Wait for crash to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify agent is no longer active
      const isActive = await redisClient.sismember('agents:active', agentId);
      expect(isActive).toBe(0);
      
      // Cleanup
      pub.disconnect();
    }, TEST_TIMEOUT);
    
    test('should handle degraded performance', async () => {
      const agent = await createAndRegisterAgent({
        agentName: 'Degraded Performance Agent',
        responseDelay: 100
      });
      
      // Set up monitoring
      const sub = new Redis(TEST_REDIS_URL);
      await sub.subscribe(`discovery:response:test-query`);
      
      let responseTime1, responseTime2;
      
      // Measure initial response time
      const pub = new Redis(TEST_REDIS_URL);
      const startTime1 = Date.now();
      
      await pub.publish('agent:discovery', JSON.stringify({
        queryId: 'test-query',
        timestamp: new Date().toISOString()
      }));
      
      await new Promise((resolve) => {
        sub.once('message', (channel, message) => {
          responseTime1 = Date.now() - startTime1;
          resolve();
        });
      });
      
      // Simulate slow response
      await pub.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
        type: 'simulate_failure',
        failureType: 'slow_response'
      }));
      
      // Wait for change to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Measure degraded response time
      const startTime2 = Date.now();
      await pub.publish('agent:discovery', JSON.stringify({
        queryId: 'test-query',
        timestamp: new Date().toISOString()
      }));
      
      await new Promise((resolve) => {
        sub.once('message', (channel, message) => {
          responseTime2 = Date.now() - startTime2;
          resolve();
        });
        
        // Timeout after 10 seconds
        setTimeout(resolve, 10000);
      });
      
      // Verify response time increased significantly
      expect(responseTime2).toBeGreaterThan(responseTime1 + 4000);
      
      // Cleanup
      sub.disconnect();
      pub.disconnect();
    }, TEST_TIMEOUT);
    
    test('should handle network partition', async () => {
      const agent = await createAndRegisterAgent({
        agentName: 'Network Partition Agent'
      });
      
      const agentId = agent.agentId;
      
      // Simulate network partition
      const pub = new Redis(TEST_REDIS_URL);
      await pub.publish(`agent:${agentId}:commands`, JSON.stringify({
        type: 'simulate_failure',
        failureType: 'network_partition'
      }));
      
      // Wait for disconnection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to send a command - should not receive response
      const sub = new Redis(TEST_REDIS_URL);
      await sub.subscribe('task:events');
      
      let taskCompleted = false;
      sub.on('message', (channel, message) => {
        const event = JSON.parse(message);
        if (event.agentId === agentId) {
          taskCompleted = true;
        }
      });
      
      await pub.publish(`agent:${agentId}:commands`, JSON.stringify({
        type: 'execute_task',
        task: { taskId: uuidv4() }
      }));
      
      // Wait to see if task completes
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      expect(taskCompleted).toBe(false);
      
      // Cleanup
      sub.disconnect();
      pub.disconnect();
    }, TEST_TIMEOUT);
  });
  
  describe('Broadcast Messaging', () => {
    test('should handle system-wide broadcasts', async () => {
      // Create multiple agents
      const agentCount = 3;
      const createdAgents = [];
      
      for (let i = 0; i < agentCount; i++) {
        const agent = await createAndRegisterAgent({
          agentName: `Broadcast Test Agent ${i}`
        });
        createdAgents.push(agent);
      }
      
      // Verify all agents are active
      const activeBefore = await redisClient.smembers('agents:active');
      const testAgentsBefore = activeBefore.filter(id => id.startsWith('test-agent-'));
      expect(testAgentsBefore.length).toBeGreaterThanOrEqual(agentCount);
      
      // Send broadcast shutdown
      const pub = new Redis(TEST_REDIS_URL);
      await pub.publish('agent:broadcast', JSON.stringify({
        type: 'system_shutdown',
        timestamp: new Date().toISOString()
      }));
      
      // Wait for shutdown to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify all agents have shut down
      const activeAfter = await redisClient.smembers('agents:active');
      const testAgentsAfter = activeAfter.filter(id => 
        createdAgents.some(agent => agent.agentId === id)
      );
      expect(testAgentsAfter.length).toBe(0);
      
      // Clear agents array to prevent double shutdown in cleanup
      agents = agents.filter(agent => 
        !createdAgents.some(ca => ca.agentId === agent.agentId)
      );
      
      // Cleanup
      pub.disconnect();
    }, TEST_TIMEOUT);
  });
});

// Export helper functions for use in other tests
module.exports = {
  createAndRegisterAgent,
  cleanupTestData,
  TEST_REDIS_URL,
  TEST_TIMEOUT
};