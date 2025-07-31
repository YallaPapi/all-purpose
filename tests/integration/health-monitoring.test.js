/**
 * Health Monitoring Integration Tests
 * 
 * Tests for agent health monitoring, real-time updates,
 * health aggregation, alerting, and monitoring dashboard
 */

const request = require('supertest');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const TestAgentSimulator = require('../e2e/test-agent-simulator');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';
const TEST_TIMEOUT = 30000;

describe('Health Monitoring Integration Tests', () => {
  let redisClient;
  let redisSub;
  let agents = [];
  let app;
  let healthEventCollector;
  
  beforeAll(async () => {
    // Initialize Redis clients
    redisClient = new Redis(REDIS_URL);
    redisSub = new Redis(REDIS_URL);
    
    // Get Express app instance if local testing
    if (process.env.TEST_MODE === 'local') {
      app = require('../../app/api/observability/route').default;
    }
    
    // Setup health event collector
    healthEventCollector = new HealthEventCollector(redisSub);
    await healthEventCollector.start();
    
    // Clear existing data
    await clearHealthData();
  });
  
  afterAll(async () => {
    // Cleanup agents
    for (const agent of agents) {
      try {
        await agent.shutdown();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Stop event collector and close connections
    await healthEventCollector.stop();
    await clearHealthData();
    if (redisSub) redisSub.disconnect();
    if (redisClient) redisClient.disconnect();
  });
  
  beforeEach(async () => {
    // Reset agents and clear events
    for (const agent of agents) {
      try {
        await agent.shutdown();
      } catch (error) {
        // Ignore
      }
    }
    agents = [];
    healthEventCollector.clear();
  });
  
  async function clearHealthData() {
    const keys = await redisClient.keys('health:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
  
  describe('Health Status Reporting', () => {
    test('should collect real-time health metrics', async () => {
      // Create agent
      const agent = new TestAgentSimulator({
        agentName: 'Health Metrics Test'
      });
      await agent.connect();
      await agent.register();
      agents.push(agent);
      
      // Wait for initial health report
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Get health metrics
      const response = await request(app || API_BASE_URL)
        .get(`/api/health/agents/${agent.agentId}`)
        .expect(200);
      
      expect(response.body).toMatchObject({
        agentId: agent.agentId,
        status: 'healthy',
        metrics: {
          uptime: expect.any(Number),
          memoryUsage: expect.any(Number),
          tasksCompleted: 0,
          tasksReceived: 0,
          successRate: 1
        },
        lastHealthCheck: expect.any(String)
      });
    });
    
    test('should track health state transitions', async () => {
      const agent = new TestAgentSimulator({
        agentName: 'State Transition Test'
      });
      await agent.connect();
      await agent.register();
      agents.push(agent);
      
      // Transition through states
      const states = ['healthy', 'degraded', 'critical', 'healthy'];
      
      for (const state of states) {
        await redisClient.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
          type: 'set_health_state',
          state
        }));
        
        // Small delay for state change
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Get health history
      const response = await request(app || API_BASE_URL)
        .get(`/api/health/agents/${agent.agentId}/history`)
        .expect(200);
      
      expect(response.body.transitions).toHaveLength(states.length);
      expect(response.body.transitions.map(t => t.state)).toEqual(states);
    });
    
    test('should calculate health scores', async () => {
      // Create agents with different health states
      const configs = [
        { agentName: 'Healthy Agent', healthState: 'healthy' },
        { agentName: 'Degraded Agent', healthState: 'degraded' },
        { agentName: 'Critical Agent', healthState: 'critical' }
      ];
      
      for (const config of configs) {
        const agent = new TestAgentSimulator(config);
        await agent.connect();
        await agent.register();
        agents.push(agent);
      }
      
      // Get overall health score
      const response = await request(app || API_BASE_URL)
        .get('/api/health/score')
        .expect(200);
      
      expect(response.body).toMatchObject({
        overallScore: expect.any(Number),
        breakdown: {
          healthy: 1,
          degraded: 1,
          critical: 1,
          offline: 0
        },
        healthPercentage: expect.any(Number)
      });
      
      // Score should reflect mixed health
      expect(response.body.overallScore).toBeGreaterThan(0);
      expect(response.body.overallScore).toBeLessThan(100);
    });
  });
  
  describe('Real-Time Health Updates', () => {
    test('should stream health updates via SSE', async (done) => {
      const agent = new TestAgentSimulator({
        agentName: 'SSE Health Test'
      });
      await agent.connect();
      await agent.register();
      agents.push(agent);
      
      const eventSource = request(app || API_BASE_URL)
        .get('/api/health/stream')
        .set('Accept', 'text/event-stream');
      
      let eventCount = 0;
      
      eventSource.on('data', (chunk) => {
        const data = chunk.toString();
        if (data.includes('event: health-update')) {
          eventCount++;
          
          if (eventCount >= 2) {
            eventSource.abort();
            done();
          }
        }
      });
      
      // Trigger health updates
      setTimeout(async () => {
        await agent.reportHealth();
      }, 1000);
      
      setTimeout(async () => {
        await redisClient.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
          type: 'set_health_state',
          state: 'degraded'
        }));
      }, 2000);
    }, TEST_TIMEOUT);
    
    test('should provide WebSocket health updates', async () => {
      // Note: This test requires WebSocket support
      // Showing structure for reference
      
      const agent = new TestAgentSimulator({
        agentName: 'WebSocket Health Test'
      });
      await agent.connect();
      await agent.register();
      agents.push(agent);
      
      // In real implementation:
      // const ws = new WebSocket(`ws://localhost:3000/api/health/ws`);
      // ws.on('message', (data) => { ... });
      
      // For now, verify WebSocket endpoint exists
      const response = await request(app || API_BASE_URL)
        .get('/api/health/ws/info')
        .expect(200);
      
      expect(response.body.websocketEnabled).toBe(true);
    });
  });
  
  describe('Health Aggregation', () => {
    test('should aggregate health by agent type', async () => {
      // Create multiple agents of different types
      const agentTypes = [
        { type: 'processor', count: 3 },
        { type: 'monitor', count: 2 },
        { type: 'coordinator', count: 1 }
      ];
      
      for (const { type, count } of agentTypes) {
        for (let i = 0; i < count; i++) {
          const agent = new TestAgentSimulator({
            agentName: `${type}-${i}`,
            agentType: type
          });
          await agent.connect();
          await agent.register();
          agents.push(agent);
        }
      }
      
      const response = await request(app || API_BASE_URL)
        .get('/api/health/aggregate/by-type')
        .expect(200);
      
      expect(response.body.aggregation).toMatchObject({
        processor: {
          total: 3,
          healthy: 3,
          degraded: 0,
          critical: 0
        },
        monitor: {
          total: 2,
          healthy: 2,
          degraded: 0,
          critical: 0
        },
        coordinator: {
          total: 1,
          healthy: 1,
          degraded: 0,
          critical: 0
        }
      });
    });
    
    test('should aggregate health metrics', async () => {
      // Create agents and simulate some task execution
      for (let i = 0; i < 3; i++) {
        const agent = new TestAgentSimulator({
          agentName: `Metrics Agent ${i}`
        });
        await agent.connect();
        await agent.register();
        agents.push(agent);
        
        // Execute some tasks
        for (let j = 0; j < 5; j++) {
          await redisClient.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
            type: 'execute_task',
            task: { taskId: uuidv4() }
          }));
        }
      }
      
      // Wait for task completion
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const response = await request(app || API_BASE_URL)
        .get('/api/health/aggregate/metrics')
        .expect(200);
      
      expect(response.body).toMatchObject({
        totalAgents: 3,
        averageUptime: expect.any(Number),
        totalTasksCompleted: expect.any(Number),
        averageSuccessRate: expect.any(Number),
        averageMemoryUsage: expect.any(Number)
      });
      
      expect(response.body.totalTasksCompleted).toBeGreaterThan(0);
    });
  });
  
  describe('Health Alerting', () => {
    test('should trigger alerts for critical health states', async () => {
      const agent = new TestAgentSimulator({
        agentName: 'Alert Test Agent'
      });
      await agent.connect();
      await agent.register();
      agents.push(agent);
      
      // Subscribe to alerts
      const alerts = [];
      await redisSub.subscribe('health:alerts');
      redisSub.on('message', (channel, message) => {
        if (channel === 'health:alerts') {
          alerts.push(JSON.parse(message));
        }
      });
      
      // Trigger critical state
      await redisClient.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
        type: 'set_health_state',
        state: 'critical'
      }));
      
      // Wait for alert
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'health-critical',
        agentId: agent.agentId,
        severity: 'high',
        message: expect.stringContaining('critical')
      });
    });
    
    test('should detect agent failures', async () => {
      const agent = new TestAgentSimulator({
        agentName: 'Failure Detection Test'
      });
      await agent.connect();
      await agent.register();
      agents.push(agent);
      
      // Simulate sudden failure
      await redisClient.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
        type: 'simulate_failure',
        failureType: 'crash'
      }));
      
      // Wait for detection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await request(app || API_BASE_URL)
        .get('/api/health/alerts/recent')
        .expect(200);
      
      const failureAlert = response.body.alerts.find(a => 
        a.type === 'agent-failure' && a.agentId === agent.agentId
      );
      
      expect(failureAlert).toBeDefined();
    });
    
    test('should alert on degraded system health', async () => {
      // Create multiple agents and degrade some
      for (let i = 0; i < 5; i++) {
        const agent = new TestAgentSimulator({
          agentName: `System Health Agent ${i}`
        });
        await agent.connect();
        await agent.register();
        agents.push(agent);
        
        // Degrade half the agents
        if (i < 3) {
          await redisClient.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
            type: 'set_health_state',
            state: 'degraded'
          }));
        }
      }
      
      // Check system health alert
      const response = await request(app || API_BASE_URL)
        .get('/api/health/system/status')
        .expect(200);
      
      expect(response.body.systemHealth).toBe('degraded');
      expect(response.body.alerts).toContainEqual(
        expect.objectContaining({
          type: 'system-degraded',
          message: expect.stringContaining('60% of agents')
        })
      );
    });
  });
  
  describe('Health Dashboard API', () => {
    test('should provide dashboard overview data', async () => {
      // Setup diverse agent ecosystem
      const agentConfigs = [
        { agentType: 'processor', healthState: 'healthy' },
        { agentType: 'processor', healthState: 'degraded' },
        { agentType: 'monitor', healthState: 'healthy' },
        { agentType: 'coordinator', healthState: 'critical' }
      ];
      
      for (const config of agentConfigs) {
        const agent = new TestAgentSimulator(config);
        await agent.connect();
        await agent.register();
        agents.push(agent);
      }
      
      const response = await request(app || API_BASE_URL)
        .get('/api/health/dashboard/overview')
        .expect(200);
      
      expect(response.body).toMatchObject({
        summary: {
          totalAgents: 4,
          healthyAgents: 2,
          degradedAgents: 1,
          criticalAgents: 1,
          offlineAgents: 0
        },
        byType: expect.any(Object),
        recentEvents: expect.any(Array),
        alerts: expect.any(Array),
        trends: {
          health: expect.any(Array),
          performance: expect.any(Array)
        }
      });
    });
    
    test('should provide time-series health data', async () => {
      const agent = new TestAgentSimulator({
        agentName: 'Time Series Test'
      });
      await agent.connect();
      await agent.register();
      agents.push(agent);
      
      // Generate health data over time
      const states = ['healthy', 'degraded', 'healthy', 'critical', 'healthy'];
      for (const state of states) {
        await redisClient.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
          type: 'set_health_state',
          state
        }));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const response = await request(app || API_BASE_URL)
        .get('/api/health/timeseries')
        .query({
          agentId: agent.agentId,
          period: '1h',
          interval: '1m'
        })
        .expect(200);
      
      expect(response.body.timeseries).toBeInstanceOf(Array);
      expect(response.body.timeseries.length).toBeGreaterThan(0);
      expect(response.body.timeseries[0]).toHaveProperty('timestamp');
      expect(response.body.timeseries[0]).toHaveProperty('health');
    });
  });
  
  describe('Health Monitoring Performance', () => {
    test('should handle high-frequency health updates', async () => {
      // Create multiple agents reporting frequently
      const agentCount = 10;
      const updateInterval = 100; // 100ms
      
      for (let i = 0; i < agentCount; i++) {
        const agent = new TestAgentSimulator({
          agentName: `High Freq Agent ${i}`
        });
        await agent.connect();
        await agent.register();
        agents.push(agent);
        
        // Start rapid health reporting
        const intervalId = setInterval(() => {
          agent.reportHealth();
        }, updateInterval);
        
        // Store interval for cleanup
        agent._healthInterval = intervalId;
      }
      
      // Let it run for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Stop rapid reporting
      agents.forEach(agent => {
        if (agent._healthInterval) {
          clearInterval(agent._healthInterval);
        }
      });
      
      // Verify system handled the load
      const response = await request(app || API_BASE_URL)
        .get('/api/health/performance/stats')
        .expect(200);
      
      expect(response.body.healthUpdatesProcessed).toBeGreaterThan(400); // At least 400 updates
      expect(response.body.droppedUpdates).toBe(0);
      expect(response.body.averageProcessingTime).toBeLessThan(50); // Less than 50ms
    });
    
    test('should implement health data retention policies', async () => {
      const agent = new TestAgentSimulator({
        agentName: 'Retention Test'
      });
      await agent.connect();
      await agent.register();
      agents.push(agent);
      
      // Generate old health data
      const oldTimestamp = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      await redisClient.zadd(
        `health:history:${agent.agentId}`,
        oldTimestamp,
        JSON.stringify({
          timestamp: new Date(oldTimestamp).toISOString(),
          status: 'healthy'
        })
      );
      
      // Run retention cleanup
      const response = await request(app || API_BASE_URL)
        .post('/api/health/maintenance/cleanup')
        .send({
          retentionDays: 3
        })
        .expect(200);
      
      expect(response.body.cleaned).toBeGreaterThan(0);
      
      // Verify old data removed
      const history = await redisClient.zrange(
        `health:history:${agent.agentId}`,
        0,
        -1
      );
      
      history.forEach(entry => {
        const data = JSON.parse(entry);
        const entryTime = new Date(data.timestamp).getTime();
        expect(Date.now() - entryTime).toBeLessThan(3 * 24 * 60 * 60 * 1000);
      });
    });
  });
});

// Helper class for collecting health events
class HealthEventCollector {
  constructor(redisSub) {
    this.redisSub = redisSub;
    this.events = [];
  }
  
  async start() {
    await this.redisSub.subscribe('health:reports', 'health:alerts', 'agent:events');
    this.redisSub.on('message', (channel, message) => {
      this.events.push({
        channel,
        message: JSON.parse(message),
        timestamp: new Date()
      });
    });
  }
  
  async stop() {
    await this.redisSub.unsubscribe();
  }
  
  clear() {
    this.events = [];
  }
  
  getEvents(channel) {
    return this.events.filter(e => e.channel === channel);
  }
}

module.exports = {
  HealthEventCollector,
  TEST_TIMEOUT
};