/**
 * Service Registry Integration Tests
 * 
 * Tests for agent registration, deregistration, health reporting,
 * and registry interactions using Redis as backend
 */

const request = require('supertest');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const TestAgentSimulator = require('../e2e/test-agent-simulator');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';
const TEST_TIMEOUT = 20000;

describe('Service Registry Integration Tests', () => {
  let redisClient;
  let testAgent;
  let app;
  
  beforeAll(async () => {
    // Initialize Redis client
    redisClient = new Redis(REDIS_URL);
    
    // Get Express app instance (or use API URL)
    if (process.env.TEST_MODE === 'local') {
      app = require('../../app/api/observability/route').default;
    }
    
    // Clear test data
    await clearTestData();
  });
  
  afterAll(async () => {
    // Cleanup
    if (testAgent) {
      await testAgent.shutdown();
    }
    await clearTestData();
    if (redisClient) {
      redisClient.disconnect();
    }
  });
  
  beforeEach(async () => {
    // Reset state before each test
    await clearTestData();
  });
  
  afterEach(async () => {
    // Cleanup test agents
    if (testAgent) {
      await testAgent.shutdown();
      testAgent = null;
    }
  });
  
  async function clearTestData() {
    const keys = await redisClient.keys('test-*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    
    // Clear agent-related keys
    const agentKeys = await redisClient.keys('agent:test-*');
    if (agentKeys.length > 0) {
      await redisClient.del(...agentKeys);
    }
  }
  
  describe('Agent Registration', () => {
    test('should register a new agent successfully', async () => {
      const agentData = {
        agentId: `test-agent-${uuidv4()}`,
        agentName: 'Registry Test Agent',
        agentType: 'test',
        capabilities: ['processing', 'analytics'],
        version: '1.0.0',
        endpoint: 'http://localhost:8080',
        healthCheckEndpoint: '/health'
      };
      
      // Register via API
      const response = await request(app || API_BASE_URL)
        .post('/api/registry/agents')
        .send(agentData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body).toMatchObject({
        success: true,
        agentId: agentData.agentId,
        registered: true
      });
      
      // Verify in Redis
      const storedData = await redisClient.hget(`agent:${agentData.agentId}`, 'data');
      expect(storedData).toBeTruthy();
      
      const parsed = JSON.parse(storedData);
      expect(parsed.agentName).toBe(agentData.agentName);
      expect(parsed.capabilities).toEqual(agentData.capabilities);
    });
    
    test('should reject duplicate agent registration', async () => {
      const agentId = `test-agent-${uuidv4()}`;
      
      // First registration
      await request(app || API_BASE_URL)
        .post('/api/registry/agents')
        .send({
          agentId,
          agentName: 'First Agent',
          agentType: 'test'
        })
        .expect(201);
      
      // Duplicate registration
      const response = await request(app || API_BASE_URL)
        .post('/api/registry/agents')
        .send({
          agentId,
          agentName: 'Duplicate Agent',
          agentType: 'test'
        })
        .expect(409);
      
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('already registered')
      });
    });
    
    test('should validate required fields', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/registry/agents')
        .send({
          agentName: 'Invalid Agent'
          // Missing required agentId
        })
        .expect(400);
      
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('required')
      });
    });
    
    test('should handle concurrent registrations', async () => {
      const registrationPromises = Array.from({ length: 10 }, (_, i) => 
        request(app || API_BASE_URL)
          .post('/api/registry/agents')
          .send({
            agentId: `test-agent-concurrent-${i}`,
            agentName: `Concurrent Agent ${i}`,
            agentType: 'test',
            capabilities: ['concurrent']
          })
      );
      
      const results = await Promise.all(registrationPromises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe(201);
        expect(result.body.success).toBe(true);
      });
      
      // Verify all are in registry
      const activeAgents = await redisClient.smembers('agents:active');
      const testAgents = activeAgents.filter(id => id.includes('concurrent'));
      expect(testAgents.length).toBe(10);
    });
  });
  
  describe('Agent Deregistration', () => {
    test('should deregister agent successfully', async () => {
      // Register agent first
      testAgent = new TestAgentSimulator({
        agentName: 'Deregistration Test'
      });
      await testAgent.connect();
      await testAgent.register();
      
      // Deregister via API
      const response = await request(app || API_BASE_URL)
        .delete(`/api/registry/agents/${testAgent.agentId}`)
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        deregistered: true
      });
      
      // Verify removed from active agents
      const isActive = await redisClient.sismember('agents:active', testAgent.agentId);
      expect(isActive).toBe(0);
    });
    
    test('should handle deregistration of non-existent agent', async () => {
      const response = await request(app || API_BASE_URL)
        .delete('/api/registry/agents/non-existent-agent')
        .expect(404);
      
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('not found')
      });
    });
  });
  
  describe('Health Reporting', () => {
    test('should update agent health status', async () => {
      testAgent = new TestAgentSimulator({
        agentName: 'Health Report Test'
      });
      await testAgent.connect();
      await testAgent.register();
      
      const healthReport = {
        status: 'healthy',
        metrics: {
          cpu: 45.2,
          memory: 512,
          uptime: 3600
        },
        lastCheck: new Date().toISOString()
      };
      
      const response = await request(app || API_BASE_URL)
        .post(`/api/registry/agents/${testAgent.agentId}/health`)
        .send(healthReport)
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        updated: true
      });
      
      // Verify health data stored
      const storedHealth = await redisClient.hget(`agent:${testAgent.agentId}`, 'health');
      expect(storedHealth).toBeTruthy();
      const parsed = JSON.parse(storedHealth);
      expect(parsed.status).toBe('healthy');
    });
    
    test('should handle invalid health states', async () => {
      testAgent = new TestAgentSimulator();
      await testAgent.connect();
      await testAgent.register();
      
      const response = await request(app || API_BASE_URL)
        .post(`/api/registry/agents/${testAgent.agentId}/health`)
        .send({
          status: 'invalid-state'
        })
        .expect(400);
      
      expect(response.body.error).toContain('Invalid health status');
    });
    
    test('should track health history', async () => {
      testAgent = new TestAgentSimulator();
      await testAgent.connect();
      await testAgent.register();
      
      // Submit multiple health reports
      const healthStates = ['healthy', 'degraded', 'healthy'];
      
      for (const status of healthStates) {
        await request(app || API_BASE_URL)
          .post(`/api/registry/agents/${testAgent.agentId}/health`)
          .send({ status })
          .expect(200);
        
        // Small delay between reports
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Get health history
      const response = await request(app || API_BASE_URL)
        .get(`/api/registry/agents/${testAgent.agentId}/health/history`)
        .expect(200);
      
      expect(response.body.history).toHaveLength(3);
      expect(response.body.history.map(h => h.status)).toEqual(healthStates);
    });
  });
  
  describe('Registry Queries', () => {
    beforeEach(async () => {
      // Register multiple test agents
      const agents = [
        {
          agentName: 'Processor Alpha',
          agentType: 'processor',
          capabilities: ['data-processing', 'transformation']
        },
        {
          agentName: 'Processor Beta',
          agentType: 'processor',
          capabilities: ['data-processing', 'analytics']
        },
        {
          agentName: 'Monitor Gamma',
          agentType: 'monitor',
          capabilities: ['monitoring', 'alerting']
        }
      ];
      
      for (const config of agents) {
        const agent = new TestAgentSimulator(config);
        await agent.connect();
        await agent.register();
      }
    });
    
    test('should list all active agents', async () => {
      const response = await request(app || API_BASE_URL)
        .get('/api/registry/agents')
        .expect(200);
      
      expect(response.body.agents).toBeInstanceOf(Array);
      expect(response.body.agents.length).toBeGreaterThanOrEqual(3);
      expect(response.body.agents[0]).toHaveProperty('agentId');
      expect(response.body.agents[0]).toHaveProperty('status');
    });
    
    test('should filter agents by type', async () => {
      const response = await request(app || API_BASE_URL)
        .get('/api/registry/agents?type=processor')
        .expect(200);
      
      expect(response.body.agents).toHaveLength(2);
      response.body.agents.forEach(agent => {
        expect(agent.agentType).toBe('processor');
      });
    });
    
    test('should filter agents by capabilities', async () => {
      const response = await request(app || API_BASE_URL)
        .get('/api/registry/agents?capabilities=data-processing')
        .expect(200);
      
      expect(response.body.agents).toHaveLength(2);
      response.body.agents.forEach(agent => {
        expect(agent.capabilities).toContain('data-processing');
      });
    });
    
    test('should filter agents by health status', async () => {
      const response = await request(app || API_BASE_URL)
        .get('/api/registry/agents?status=healthy')
        .expect(200);
      
      response.body.agents.forEach(agent => {
        expect(agent.status).toBe('healthy');
      });
    });
    
    test('should support pagination', async () => {
      const response = await request(app || API_BASE_URL)
        .get('/api/registry/agents?limit=2&offset=0')
        .expect(200);
      
      expect(response.body.agents).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        limit: 2,
        offset: 0,
        total: expect.any(Number)
      });
    });
  });
  
  describe('Service Registry Resilience', () => {
    test('should handle Redis connection failure gracefully', async () => {
      // Temporarily disconnect Redis
      await redisClient.disconnect();
      
      const response = await request(app || API_BASE_URL)
        .get('/api/registry/agents')
        .expect(503);
      
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Service temporarily unavailable')
      });
      
      // Reconnect for cleanup
      redisClient = new Redis(REDIS_URL);
    });
    
    test('should implement retry logic for failed registrations', async () => {
      // Mock intermittent Redis failures
      let attemptCount = 0;
      const originalHset = redisClient.hset.bind(redisClient);
      
      redisClient.hset = jest.fn(async (...args) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Redis connection error');
        }
        return originalHset(...args);
      });
      
      const response = await request(app || API_BASE_URL)
        .post('/api/registry/agents')
        .send({
          agentId: `test-retry-${uuidv4()}`,
          agentName: 'Retry Test Agent',
          agentType: 'test'
        })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(attemptCount).toBe(3); // Should retry and succeed on 3rd attempt
      
      // Restore original function
      redisClient.hset = originalHset;
    });
    
    test('should clean up stale agent entries', async () => {
      // Register agent that will become stale
      const staleAgent = {
        agentId: `test-stale-${uuidv4()}`,
        agentName: 'Stale Agent',
        lastHealthCheck: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      };
      
      await redisClient.hset(
        `agent:${staleAgent.agentId}`,
        'data',
        JSON.stringify(staleAgent)
      );
      await redisClient.sadd('agents:active', staleAgent.agentId);
      
      // Run cleanup
      const response = await request(app || API_BASE_URL)
        .post('/api/registry/cleanup')
        .expect(200);
      
      expect(response.body.cleaned).toBeGreaterThan(0);
      
      // Verify stale agent removed
      const isActive = await redisClient.sismember('agents:active', staleAgent.agentId);
      expect(isActive).toBe(0);
    });
  });
}, TEST_TIMEOUT);

module.exports = {
  clearTestData,
  TEST_TIMEOUT
};