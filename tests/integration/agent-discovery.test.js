/**
 * Agent Discovery Integration Tests
 * 
 * Tests for agent discovery mechanisms, capability-based selection,
 * load balancing, and discovery caching
 */

const request = require('supertest');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const TestAgentSimulator = require('../e2e/test-agent-simulator');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';
const TEST_TIMEOUT = 20000;

describe('Agent Discovery Integration Tests', () => {
  let redisClient;
  let redisPub;
  let redisSub;
  let agents = [];
  let app;
  
  beforeAll(async () => {
    // Initialize Redis clients
    redisClient = new Redis(REDIS_URL);
    redisPub = new Redis(REDIS_URL);
    redisSub = new Redis(REDIS_URL);
    
    // Get Express app instance if local testing
    if (process.env.TEST_MODE === 'local') {
      app = require('../../app/api/observability/route').default;
    }
    
    // Setup test agents with various capabilities
    await setupTestAgents();
  });
  
  afterAll(async () => {
    // Cleanup all agents
    for (const agent of agents) {
      try {
        await agent.shutdown();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    
    // Clear test data and close connections
    await clearTestData();
    if (redisSub) redisSub.disconnect();
    if (redisPub) redisPub.disconnect();
    if (redisClient) redisClient.disconnect();
  });
  
  async function setupTestAgents() {
    const agentConfigs = [
      {
        agentName: 'Data Processor 1',
        agentType: 'processor',
        capabilities: ['data-processing', 'transformation', 'validation'],
        responseDelay: 50
      },
      {
        agentName: 'Data Processor 2',
        agentType: 'processor',
        capabilities: ['data-processing', 'analytics', 'reporting'],
        responseDelay: 100
      },
      {
        agentName: 'ML Agent 1',
        agentType: 'ml-agent',
        capabilities: ['machine-learning', 'prediction', 'classification'],
        responseDelay: 200
      },
      {
        agentName: 'Monitor Agent 1',
        agentType: 'monitor',
        capabilities: ['monitoring', 'alerting', 'health-check'],
        responseDelay: 30
      },
      {
        agentName: 'Coordinator Agent',
        agentType: 'coordinator',
        capabilities: ['coordination', 'workflow', 'orchestration'],
        responseDelay: 80
      }
    ];
    
    for (const config of agentConfigs) {
      const agent = new TestAgentSimulator(config);
      await agent.connect();
      await agent.register();
      agents.push(agent);
    }
  }
  
  async function clearTestData() {
    const keys = await redisClient.keys('discovery:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
  
  describe('Capability-Based Discovery', () => {
    test('should discover agents by single capability', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: ['data-processing']
        })
        .expect(200);
      
      expect(response.body.agents).toHaveLength(2);
      response.body.agents.forEach(agent => {
        expect(agent.capabilities).toContain('data-processing');
      });
    });
    
    test('should discover agents by multiple capabilities (AND logic)', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: ['data-processing', 'analytics'],
          requireAll: true
        })
        .expect(200);
      
      expect(response.body.agents).toHaveLength(1);
      expect(response.body.agents[0].agentName).toBe('Data Processor 2');
    });
    
    test('should discover agents by multiple capabilities (OR logic)', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: ['monitoring', 'prediction'],
          requireAll: false
        })
        .expect(200);
      
      expect(response.body.agents).toHaveLength(2);
      const agentTypes = response.body.agents.map(a => a.agentType);
      expect(agentTypes).toContain('monitor');
      expect(agentTypes).toContain('ml-agent');
    });
    
    test('should handle capability version requirements', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: [{
            name: 'data-processing',
            minVersion: '1.0.0'
          }]
        })
        .expect(200);
      
      expect(response.body.agents.length).toBeGreaterThan(0);
    });
    
    test('should return empty results for non-existent capabilities', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: ['non-existent-capability']
        })
        .expect(200);
      
      expect(response.body.agents).toHaveLength(0);
    });
  });
  
  describe('Discovery Filtering and Sorting', () => {
    test('should filter by agent type', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          agentType: 'processor'
        })
        .expect(200);
      
      expect(response.body.agents).toHaveLength(2);
      response.body.agents.forEach(agent => {
        expect(agent.agentType).toBe('processor');
      });
    });
    
    test('should filter by health status', async () => {
      // Set one agent to degraded
      await agents[0].handleCommand({
        type: 'set_health_state',
        state: 'degraded'
      });
      
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          healthStatus: 'healthy'
        })
        .expect(200);
      
      expect(response.body.agents.length).toBe(agents.length - 1);
      response.body.agents.forEach(agent => {
        expect(agent.status).toBe('healthy');
      });
      
      // Reset health state
      await agents[0].handleCommand({
        type: 'set_health_state',
        state: 'healthy'
      });
    });
    
    test('should sort by response time', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: ['monitoring', 'data-processing', 'machine-learning'],
          requireAll: false,
          sortBy: 'responseTime',
          limit: 3
        })
        .expect(200);
      
      // Verify agents are sorted by response time (ascending)
      for (let i = 1; i < response.body.agents.length; i++) {
        const prevTime = response.body.agents[i - 1].metrics.averageResponseTime;
        const currTime = response.body.agents[i].metrics.averageResponseTime;
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });
    
    test('should limit results', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          limit: 2
        })
        .expect(200);
      
      expect(response.body.agents).toHaveLength(2);
      expect(response.body.hasMore).toBe(true);
      expect(response.body.totalCount).toBe(agents.length);
    });
  });
  
  describe('Real-Time Discovery', () => {
    test('should discover newly registered agents', async () => {
      // Initial query
      const initialResponse = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: ['real-time-processing']
        })
        .expect(200);
      
      expect(initialResponse.body.agents).toHaveLength(0);
      
      // Register new agent
      const newAgent = new TestAgentSimulator({
        agentName: 'Real-Time Processor',
        capabilities: ['real-time-processing', 'streaming']
      });
      await newAgent.connect();
      await newAgent.register();
      agents.push(newAgent);
      
      // Query again
      const updatedResponse = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: ['real-time-processing']
        })
        .expect(200);
      
      expect(updatedResponse.body.agents).toHaveLength(1);
      expect(updatedResponse.body.agents[0].agentName).toBe('Real-Time Processor');
    });
    
    test('should exclude deregistered agents', async () => {
      // Create and register temporary agent
      const tempAgent = new TestAgentSimulator({
        agentName: 'Temporary Agent',
        capabilities: ['temporary-capability']
      });
      await tempAgent.connect();
      await tempAgent.register();
      
      // Verify it's discoverable
      const withTempResponse = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: ['temporary-capability']
        })
        .expect(200);
      
      expect(withTempResponse.body.agents).toHaveLength(1);
      
      // Deregister agent
      await tempAgent.shutdown();
      
      // Verify it's no longer discoverable
      const withoutTempResponse = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: ['temporary-capability']
        })
        .expect(200);
      
      expect(withoutTempResponse.body.agents).toHaveLength(0);
    });
  });
  
  describe('Load Balancing and Selection Strategies', () => {
    test('should use round-robin selection', async () => {
      const selectedAgents = [];
      
      // Make multiple requests
      for (let i = 0; i < 6; i++) {
        const response = await request(app || API_BASE_URL)
          .post('/api/discovery/select')
          .send({
            capabilities: ['data-processing'],
            strategy: 'round-robin'
          })
          .expect(200);
        
        selectedAgents.push(response.body.selectedAgent.agentId);
      }
      
      // Verify round-robin distribution
      const agentCounts = {};
      selectedAgents.forEach(id => {
        agentCounts[id] = (agentCounts[id] || 0) + 1;
      });
      
      // Each processor should be selected 3 times
      Object.values(agentCounts).forEach(count => {
        expect(count).toBe(3);
      });
    });
    
    test('should use least-loaded selection', async () => {
      // Simulate load on first processor
      await redisPub.publish(`agent:${agents[0].agentId}:commands`, JSON.stringify({
        type: 'execute_task',
        task: { taskId: uuidv4() }
      }));
      
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/select')
        .send({
          capabilities: ['data-processing'],
          strategy: 'least-loaded'
        })
        .expect(200);
      
      // Should select the second processor (less loaded)
      expect(response.body.selectedAgent.agentName).toBe('Data Processor 2');
    });
    
    test('should use performance-based selection', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/select')
        .send({
          capabilities: ['monitoring', 'data-processing'],
          requireAll: false,
          strategy: 'best-performance'
        })
        .expect(200);
      
      // Monitor agent has lowest response delay (30ms)
      expect(response.body.selectedAgent.agentType).toBe('monitor');
    });
    
    test('should handle sticky sessions', async () => {
      const sessionId = uuidv4();
      const selectedAgents = [];
      
      // Make multiple requests with same session
      for (let i = 0; i < 3; i++) {
        const response = await request(app || API_BASE_URL)
          .post('/api/discovery/select')
          .set('X-Session-ID', sessionId)
          .send({
            capabilities: ['data-processing'],
            strategy: 'sticky'
          })
          .expect(200);
        
        selectedAgents.push(response.body.selectedAgent.agentId);
      }
      
      // Should always select the same agent
      expect(new Set(selectedAgents).size).toBe(1);
    });
  });
  
  describe('Discovery Caching', () => {
    test('should cache discovery results', async () => {
      const queryId = uuidv4();
      
      // First request - cache miss
      const firstResponse = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .set('X-Query-ID', queryId)
        .send({
          capabilities: ['data-processing'],
          useCache: true
        })
        .expect(200);
      
      expect(firstResponse.headers['x-cache']).toBe('miss');
      
      // Second request - cache hit
      const secondResponse = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .set('X-Query-ID', queryId)
        .send({
          capabilities: ['data-processing'],
          useCache: true
        })
        .expect(200);
      
      expect(secondResponse.headers['x-cache']).toBe('hit');
      expect(secondResponse.body).toEqual(firstResponse.body);
    });
    
    test('should invalidate cache on agent changes', async () => {
      const queryId = uuidv4();
      
      // Cache query result
      await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .set('X-Query-ID', queryId)
        .send({
          capabilities: ['cache-test'],
          useCache: true
        })
        .expect(200);
      
      // Register new agent with matching capability
      const newAgent = new TestAgentSimulator({
        agentName: 'Cache Test Agent',
        capabilities: ['cache-test']
      });
      await newAgent.connect();
      await newAgent.register();
      agents.push(newAgent);
      
      // Query again - should get fresh results
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .set('X-Query-ID', queryId)
        .send({
          capabilities: ['cache-test'],
          useCache: true
        })
        .expect(200);
      
      expect(response.headers['x-cache']).toBe('miss');
      expect(response.body.agents).toHaveLength(1);
    });
    
    test('should respect cache TTL', async () => {
      const queryId = uuidv4();
      
      // Set short TTL
      await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .set('X-Query-ID', queryId)
        .send({
          capabilities: ['ttl-test'],
          useCache: true,
          cacheTTL: 1 // 1 second
        })
        .expect(200);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Should be cache miss
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .set('X-Query-ID', queryId)
        .send({
          capabilities: ['ttl-test'],
          useCache: true
        })
        .expect(200);
      
      expect(response.headers['x-cache']).toBe('miss');
    });
  });
  
  describe('Discovery Error Handling', () => {
    test('should handle malformed queries', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: 'not-an-array' // Should be array
        })
        .expect(400);
      
      expect(response.body.error).toContain('Invalid query format');
    });
    
    test('should handle discovery timeouts', async () => {
      // Create slow-responding agent
      const slowAgent = new TestAgentSimulator({
        agentName: 'Slow Agent',
        capabilities: ['slow-capability'],
        responseDelay: 5000 // 5 second delay
      });
      await slowAgent.connect();
      await slowAgent.register();
      agents.push(slowAgent);
      
      const response = await request(app || API_BASE_URL)
        .post('/api/discovery/query')
        .send({
          capabilities: ['slow-capability'],
          timeout: 1000 // 1 second timeout
        })
        .expect(200);
      
      // Should return partial results or empty
      expect(response.body.agents).toHaveLength(0);
      expect(response.body.timedOut).toBe(true);
    });
    
    test('should handle concurrent discovery requests', async () => {
      const requests = Array.from({ length: 20 }, () => 
        request(app || API_BASE_URL)
          .post('/api/discovery/query')
          .send({
            capabilities: ['data-processing']
          })
      );
      
      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.agents).toHaveLength(2);
      });
    });
  });
}, TEST_TIMEOUT);

module.exports = {
  setupTestAgents: async function() {
    // Exported for reuse in other tests
    const configs = [
      { agentType: 'processor', capabilities: ['processing'] },
      { agentType: 'monitor', capabilities: ['monitoring'] }
    ];
    
    const agents = [];
    for (const config of configs) {
      const agent = new TestAgentSimulator(config);
      await agent.connect();
      await agent.register();
      agents.push(agent);
    }
    return agents;
  },
  TEST_TIMEOUT
};