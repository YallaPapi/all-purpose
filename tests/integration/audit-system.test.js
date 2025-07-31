/**
 * Audit System Integration Tests
 * 
 * Tests for audit logging, protocol violations tracking,
 * compliance reporting, and audit data retrieval
 */

const request = require('supertest');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const TestAgentSimulator = require('../e2e/test-agent-simulator');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';
const TEST_TIMEOUT = 20000;

describe('Audit System Integration Tests', () => {
  let redisClient;
  let redisPub;
  let agents = [];
  let app;
  
  beforeAll(async () => {
    // Initialize Redis clients
    redisClient = new Redis(REDIS_URL);
    redisPub = new Redis(REDIS_URL);
    
    // Get Express app instance if local testing
    if (process.env.TEST_MODE === 'local') {
      app = require('../../app/api/observability/route').default;
    }
    
    // Clear existing audit data
    await clearAuditData();
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
    
    await clearAuditData();
    if (redisPub) redisPub.disconnect();
    if (redisClient) redisClient.disconnect();
  });
  
  beforeEach(async () => {
    await clearAuditData();
  });
  
  async function clearAuditData() {
    const keys = await redisClient.keys('audit:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
  
  describe('Audit Event Logging', () => {
    test('should log agent registration events', async () => {
      const agent = new TestAgentSimulator({
        agentName: 'Audit Test Agent'
      });
      await agent.connect();
      
      // Enable audit logging
      await request(app || API_BASE_URL)
        .post('/api/audit/config')
        .send({
          enabled: true,
          logLevel: 'info',
          categories: ['agent-lifecycle']
        })
        .expect(200);
      
      // Register agent
      await agent.register();
      agents.push(agent);
      
      // Wait for audit event
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Query audit logs
      const response = await request(app || API_BASE_URL)
        .get('/api/audit/events')
        .query({
          category: 'agent-lifecycle',
          eventType: 'agent_registered'
        })
        .expect(200);
      
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0]).toMatchObject({
        eventType: 'agent_registered',
        category: 'agent-lifecycle',
        agentId: agent.agentId,
        timestamp: expect.any(String),
        details: expect.objectContaining({
          agentName: 'Audit Test Agent'
        })
      });
    });
    
    test('should log task execution events', async () => {
      const agent = new TestAgentSimulator({
        agentName: 'Task Audit Agent',
        capabilities: ['task-execution']
      });
      await agent.connect();
      await agent.register();
      agents.push(agent);
      
      // Execute task
      const taskId = uuidv4();
      await redisPub.publish(`agent:${agent.agentId}:commands`, JSON.stringify({
        type: 'execute_task',
        task: {
          taskId,
          type: 'audit-test-task',
          payload: { test: true }
        }
      }));
      
      // Wait for task completion
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Query task audit logs
      const response = await request(app || API_BASE_URL)
        .get('/api/audit/events')
        .query({
          category: 'task-execution',
          taskId
        })
        .expect(200);
      
      const eventTypes = response.body.events.map(e => e.eventType);
      expect(eventTypes).toContain('task_assigned');
      expect(eventTypes).toContain('task_completed');
    });
    
    test('should log protocol violations', async () => {
      // Send invalid UEP message
      const response = await request(app || API_BASE_URL)
        .post('/api/uep/validate')
        .send({
          // Missing required UEP fields
          data: 'invalid'
        })
        .expect(400);
      
      // Query violation logs
      const auditResponse = await request(app || API_BASE_URL)
        .get('/api/audit/violations')
        .query({
          severity: 'high'
        })
        .expect(200);
      
      expect(auditResponse.body.violations).toHaveLength(1);
      expect(auditResponse.body.violations[0]).toMatchObject({
        type: 'protocol_violation',
        severity: 'high',
        category: 'uep-validation',
        details: expect.objectContaining({
          error: expect.stringContaining('required')
        })
      });
    });
    
    test('should log security events', async () => {
      // Attempt unauthorized access
      const response = await request(app || API_BASE_URL)
        .delete('/api/registry/agents/protected-agent')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      // Query security audit logs
      const auditResponse = await request(app || API_BASE_URL)
        .get('/api/audit/events')
        .query({
          category: 'security',
          eventType: 'unauthorized_access'
        })
        .expect(200);
      
      expect(auditResponse.body.events).toHaveLength(1);
      expect(auditResponse.body.events[0]).toMatchObject({
        eventType: 'unauthorized_access',
        category: 'security',
        severity: 'warning',
        details: expect.objectContaining({
          endpoint: '/api/registry/agents/protected-agent',
          method: 'DELETE'
        })
      });
    });
  });
  
  describe('Audit Data Filtering and Search', () => {
    beforeEach(async () => {
      // Generate diverse audit events
      const eventTypes = [
        { category: 'agent-lifecycle', eventType: 'agent_registered', severity: 'info' },
        { category: 'task-execution', eventType: 'task_failed', severity: 'warning' },
        { category: 'security', eventType: 'authentication_failed', severity: 'high' },
        { category: 'workflow', eventType: 'workflow_completed', severity: 'info' },
        { category: 'system', eventType: 'configuration_changed', severity: 'medium' }
      ];
      
      for (let i = 0; i < 20; i++) {
        const event = eventTypes[i % eventTypes.length];
        await redisClient.lpush('audit:events', JSON.stringify({
          ...event,
          id: uuidv4(),
          timestamp: new Date(Date.now() - i * 60000).toISOString(), // 1 minute apart
          agentId: `test-agent-${i % 3}`,
          details: {
            index: i,
            test: true
          }
        }));
      }
    });
    
    test('should filter by time range', async () => {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60000);
      
      const response = await request(app || API_BASE_URL)
        .get('/api/audit/events')
        .query({
          startTime: tenMinutesAgo.toISOString(),
          endTime: now.toISOString()
        })
        .expect(200);
      
      expect(response.body.events.length).toBeLessThanOrEqual(10);
      
      // Verify all events are within time range
      response.body.events.forEach(event => {
        const eventTime = new Date(event.timestamp);
        expect(eventTime >= tenMinutesAgo).toBe(true);
        expect(eventTime <= now).toBe(true);
      });
    });
    
    test('should filter by multiple criteria', async () => {
      const response = await request(app || API_BASE_URL)
        .get('/api/audit/events')
        .query({
          category: 'agent-lifecycle,task-execution',
          severity: 'info,warning',
          agentId: 'test-agent-1'
        })
        .expect(200);
      
      response.body.events.forEach(event => {
        expect(['agent-lifecycle', 'task-execution']).toContain(event.category);
        expect(['info', 'warning']).toContain(event.severity);
        expect(event.agentId).toBe('test-agent-1');
      });
    });
    
    test('should support full-text search', async () => {
      // Add event with specific text
      await redisClient.lpush('audit:events', JSON.stringify({
        id: uuidv4(),
        category: 'custom',
        eventType: 'custom_event',
        timestamp: new Date().toISOString(),
        details: {
          message: 'Critical system failure detected in payment processing module'
        }
      }));
      
      const response = await request(app || API_BASE_URL)
        .get('/api/audit/search')
        .query({
          q: 'payment processing'
        })
        .expect(200);
      
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].details.message).toContain('payment processing');
    });
    
    test('should support pagination', async () => {
      const response1 = await request(app || API_BASE_URL)
        .get('/api/audit/events')
        .query({
          limit: 5,
          offset: 0
        })
        .expect(200);
      
      expect(response1.body.events).toHaveLength(5);
      expect(response1.body.pagination).toMatchObject({
        limit: 5,
        offset: 0,
        total: expect.any(Number),
        hasMore: true
      });
      
      const response2 = await request(app || API_BASE_URL)
        .get('/api/audit/events')
        .query({
          limit: 5,
          offset: 5
        })
        .expect(200);
      
      expect(response2.body.events).toHaveLength(5);
      
      // Verify no overlap
      const ids1 = response1.body.events.map(e => e.id);
      const ids2 = response2.body.events.map(e => e.id);
      expect(ids1.some(id => ids2.includes(id))).toBe(false);
    });
  });
  
  describe('Compliance Reporting', () => {
    test('should generate compliance summary report', async () => {
      // Generate events for compliance testing
      const complianceEvents = [
        { category: 'data-access', eventType: 'pii_accessed', userId: 'user-1' },
        { category: 'data-modification', eventType: 'record_updated', userId: 'user-2' },
        { category: 'security', eventType: 'permission_granted', userId: 'admin-1' },
        { category: 'data-deletion', eventType: 'record_deleted', userId: 'user-1' }
      ];
      
      for (const event of complianceEvents) {
        await redisClient.lpush('audit:events', JSON.stringify({
          ...event,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          severity: 'info',
          compliant: true
        }));
      }
      
      const response = await request(app || API_BASE_URL)
        .get('/api/audit/compliance/summary')
        .query({
          period: 'day'
        })
        .expect(200);
      
      expect(response.body).toMatchObject({
        period: 'day',
        totalEvents: expect.any(Number),
        complianceRate: expect.any(Number),
        byCategory: expect.objectContaining({
          'data-access': expect.any(Number),
          'data-modification': expect.any(Number),
          'security': expect.any(Number),
          'data-deletion': expect.any(Number)
        }),
        violations: [],
        recommendations: expect.any(Array)
      });
    });
    
    test('should track GDPR compliance', async () => {
      // Simulate GDPR-related events
      const gdprEvents = [
        {
          category: 'gdpr',
          eventType: 'consent_obtained',
          userId: 'user-123',
          details: { purpose: 'marketing', expiresAt: '2025-01-01' }
        },
        {
          category: 'gdpr',
          eventType: 'data_export_requested',
          userId: 'user-123',
          details: { format: 'json', includeHistory: true }
        },
        {
          category: 'gdpr',
          eventType: 'right_to_erasure',
          userId: 'user-456',
          details: { dataCategories: ['personal', 'usage'] }
        }
      ];
      
      for (const event of gdprEvents) {
        await redisClient.lpush('audit:events', JSON.stringify({
          ...event,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          severity: 'info'
        }));
      }
      
      const response = await request(app || API_BASE_URL)
        .get('/api/audit/compliance/gdpr')
        .expect(200);
      
      expect(response.body).toMatchObject({
        consentRecords: 1,
        dataExportRequests: 1,
        erasureRequests: 1,
        averageResponseTime: expect.any(Number),
        complianceStatus: 'compliant'
      });
    });
  });
  
  describe('Audit Data Export', () => {
    test('should export audit data in JSON format', async () => {
      // Generate sample events
      for (let i = 0; i < 5; i++) {
        await redisClient.lpush('audit:events', JSON.stringify({
          id: uuidv4(),
          category: 'export-test',
          eventType: 'test_event',
          timestamp: new Date().toISOString(),
          details: { index: i }
        }));
      }
      
      const response = await request(app || API_BASE_URL)
        .post('/api/audit/export')
        .send({
          format: 'json',
          filters: {
            category: 'export-test'
          }
        })
        .expect(200);
      
      expect(response.body).toMatchObject({
        exportId: expect.any(String),
        format: 'json',
        status: 'completed',
        downloadUrl: expect.any(String)
      });
    });
    
    test('should export audit data in CSV format', async () => {
      const response = await request(app || API_BASE_URL)
        .post('/api/audit/export')
        .send({
          format: 'csv',
          filters: {
            startTime: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours
            columns: ['timestamp', 'category', 'eventType', 'agentId']
          }
        })
        .expect(200);
      
      expect(response.body.format).toBe('csv');
      
      // Download the export
      const downloadResponse = await request(app || API_BASE_URL)
        .get(response.body.downloadUrl)
        .expect(200);
      
      expect(downloadResponse.headers['content-type']).toContain('text/csv');
    });
  });
  
  describe('Audit System Performance', () => {
    test('should handle high-volume audit logging', async () => {
      const eventCount = 1000;
      const startTime = Date.now();
      
      // Generate many events rapidly
      const promises = [];
      for (let i = 0; i < eventCount; i++) {
        promises.push(
          redisClient.lpush('audit:events', JSON.stringify({
            id: uuidv4(),
            category: 'performance-test',
            eventType: 'bulk_event',
            timestamp: new Date().toISOString(),
            details: { index: i }
          }))
        );
      }
      
      await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // Should handle 1000 events in under 5 seconds
      expect(duration).toBeLessThan(5000);
      
      // Verify all events stored
      const count = await redisClient.llen('audit:events');
      expect(count).toBeGreaterThanOrEqual(eventCount);
    });
    
    test('should implement audit data retention', async () => {
      // Add old audit events
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
      
      for (let i = 0; i < 10; i++) {
        await redisClient.lpush('audit:events', JSON.stringify({
          id: uuidv4(),
          category: 'old-events',
          eventType: 'test_event',
          timestamp: oldDate.toISOString(),
          details: { old: true }
        }));
      }
      
      // Add recent events
      for (let i = 0; i < 5; i++) {
        await redisClient.lpush('audit:events', JSON.stringify({
          id: uuidv4(),
          category: 'recent-events',
          eventType: 'test_event',
          timestamp: new Date().toISOString(),
          details: { recent: true }
        }));
      }
      
      // Run retention cleanup
      const response = await request(app || API_BASE_URL)
        .post('/api/audit/maintenance/cleanup')
        .send({
          retentionDays: 30
        })
        .expect(200);
      
      expect(response.body.removed).toBeGreaterThanOrEqual(10);
      
      // Verify old events removed
      const remainingResponse = await request(app || API_BASE_URL)
        .get('/api/audit/events')
        .query({
          category: 'old-events'
        })
        .expect(200);
      
      expect(remainingResponse.body.events).toHaveLength(0);
    });
  });
  
  describe('Audit Alerting', () => {
    test('should trigger alerts for critical violations', async () => {
      // Configure alert rules
      await request(app || API_BASE_URL)
        .post('/api/audit/alerts/rules')
        .send({
          name: 'Critical Security Violations',
          conditions: {
            category: 'security',
            severity: 'critical'
          },
          actions: ['email', 'webhook'],
          threshold: 1
        })
        .expect(201);
      
      // Generate critical event
      await redisClient.lpush('audit:events', JSON.stringify({
        id: uuidv4(),
        category: 'security',
        eventType: 'unauthorized_system_access',
        severity: 'critical',
        timestamp: new Date().toISOString(),
        details: {
          attacker: 'unknown',
          target: 'admin-panel'
        }
      }));
      
      // Wait for alert processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check alerts
      const alertResponse = await request(app || API_BASE_URL)
        .get('/api/audit/alerts/triggered')
        .expect(200);
      
      expect(alertResponse.body.alerts).toHaveLength(1);
      expect(alertResponse.body.alerts[0]).toMatchObject({
        ruleName: 'Critical Security Violations',
        triggered: true,
        actions: ['email', 'webhook']
      });
    });
    
    test('should aggregate similar violations', async () => {
      // Generate multiple similar violations
      for (let i = 0; i < 10; i++) {
        await redisClient.lpush('audit:events', JSON.stringify({
          id: uuidv4(),
          category: 'protocol',
          eventType: 'invalid_message_format',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          agentId: `agent-${i % 3}`,
          details: {
            error: 'Missing required field: timestamp'
          }
        }));
      }
      
      // Get aggregated violations
      const response = await request(app || API_BASE_URL)
        .get('/api/audit/violations/aggregated')
        .query({
          period: 'hour'
        })
        .expect(200);
      
      expect(response.body.aggregations).toHaveLength(1);
      expect(response.body.aggregations[0]).toMatchObject({
        pattern: 'Missing required field: timestamp',
        count: 10,
        affectedAgents: 3,
        severity: 'medium',
        recommendation: expect.any(String)
      });
    });
  });
}, TEST_TIMEOUT);

module.exports = {
  clearAuditData,
  TEST_TIMEOUT
};