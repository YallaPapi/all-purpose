/**
 * Workflow Execution Integration Tests
 * 
 * Tests for workflow orchestration, task distribution,
 * error recovery, compensation, and long-running workflows
 */

const request = require('supertest');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const TestAgentSimulator = require('../e2e/test-agent-simulator');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379';
const TEST_TIMEOUT = 30000;

describe('Workflow Execution Integration Tests', () => {
  let redisClient;
  let redisPub;
  let redisSub;
  let agents = [];
  let workflowEventCollector;
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
    
    // Setup workflow event collector
    workflowEventCollector = new WorkflowEventCollector(redisSub);
    await workflowEventCollector.start();
    
    // Setup test agents
    await setupWorkflowAgents();
    
    // Clear existing data
    await clearWorkflowData();
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
    
    // Stop collectors and close connections
    await workflowEventCollector.stop();
    await clearWorkflowData();
    if (redisSub) redisSub.disconnect();
    if (redisPub) redisPub.disconnect();
    if (redisClient) redisClient.disconnect();
  });
  
  beforeEach(async () => {
    workflowEventCollector.clear();
  });
  
  async function setupWorkflowAgents() {
    const agentConfigs = [
      {
        agentName: 'Data Processor',
        agentType: 'processor',
        capabilities: ['data-processing', 'validation', 'transformation']
      },
      {
        agentName: 'ML Analyzer',
        agentType: 'analyzer',
        capabilities: ['machine-learning', 'analysis', 'prediction']
      },
      {
        agentName: 'Report Generator',
        agentType: 'reporter',
        capabilities: ['reporting', 'visualization', 'export']
      },
      {
        agentName: 'Notification Service',
        agentType: 'notifier',
        capabilities: ['notification', 'alerting', 'messaging']
      },
      {
        agentName: 'Storage Service',
        agentType: 'storage',
        capabilities: ['storage', 'persistence', 'retrieval']
      }
    ];
    
    for (const config of agentConfigs) {
      const agent = new TestAgentSimulator(config);
      await agent.connect();
      await agent.register();
      agents.push(agent);
    }
  }
  
  async function clearWorkflowData() {
    const keys = await redisClient.keys('workflow:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
  
  describe('Workflow Definition and Creation', () => {
    test('should create a simple sequential workflow', async () => {
      const workflowDef = {
        name: 'Simple Data Pipeline',
        description: 'Process data through multiple stages',
        steps: [
          {
            id: 'process-data',
            type: 'task',
            capabilities: ['data-processing'],
            input: { data: 'test-data' }
          },
          {
            id: 'analyze-data',
            type: 'task',
            capabilities: ['analysis'],
            input: { useOutput: 'process-data' }
          },
          {
            id: 'generate-report',
            type: 'task',
            capabilities: ['reporting'],
            input: { useOutput: 'analyze-data' }
          }
        ]
      };
      
      const response = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send(workflowDef)
        .expect(201);
      
      expect(response.body).toMatchObject({
        workflowId: expect.any(String),
        status: 'created',
        steps: workflowDef.steps
      });
      
      // Verify workflow stored
      const stored = await redisClient.get(`workflow:${response.body.workflowId}`);
      expect(stored).toBeTruthy();
    });
    
    test('should create a parallel workflow', async () => {
      const workflowDef = {
        name: 'Parallel Processing',
        steps: [
          {
            id: 'fetch-data',
            type: 'task',
            capabilities: ['data-processing']
          },
          {
            id: 'parallel-tasks',
            type: 'parallel',
            steps: [
              {
                id: 'process-1',
                type: 'task',
                capabilities: ['processing']
              },
              {
                id: 'process-2',
                type: 'task',
                capabilities: ['analysis']
              },
              {
                id: 'process-3',
                type: 'task',
                capabilities: ['validation']
              }
            ]
          },
          {
            id: 'aggregate',
            type: 'task',
            capabilities: ['transformation'],
            waitFor: ['process-1', 'process-2', 'process-3']
          }
        ]
      };
      
      const response = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send(workflowDef)
        .expect(201);
      
      expect(response.body.workflowId).toBeDefined();
    });
    
    test('should create a conditional workflow', async () => {
      const workflowDef = {
        name: 'Conditional Processing',
        steps: [
          {
            id: 'validate-input',
            type: 'task',
            capabilities: ['validation']
          },
          {
            id: 'conditional-branch',
            type: 'conditional',
            condition: {
              field: 'validate-input.result.isValid',
              operator: 'equals',
              value: true
            },
            then: [
              {
                id: 'process-valid',
                type: 'task',
                capabilities: ['processing']
              }
            ],
            else: [
              {
                id: 'handle-invalid',
                type: 'task',
                capabilities: ['notification']
              }
            ]
          }
        ]
      };
      
      const response = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send(workflowDef)
        .expect(201);
      
      expect(response.body.workflowId).toBeDefined();
    });
    
    test('should validate workflow definitions', async () => {
      const invalidWorkflow = {
        name: 'Invalid Workflow',
        steps: [
          {
            id: 'missing-type',
            capabilities: ['processing']
            // Missing required 'type' field
          }
        ]
      };
      
      const response = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send(invalidWorkflow)
        .expect(400);
      
      expect(response.body.error).toContain('Invalid workflow definition');
    });
  });
  
  describe('Workflow Execution', () => {
    test('should execute a sequential workflow', async () => {
      // Create workflow
      const createResponse = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send({
          name: 'Sequential Execution Test',
          steps: [
            {
              id: 'step-1',
              type: 'task',
              capabilities: ['data-processing'],
              input: { value: 10 }
            },
            {
              id: 'step-2',
              type: 'task',
              capabilities: ['transformation'],
              input: { multiply: 2, useOutput: 'step-1' }
            },
            {
              id: 'step-3',
              type: 'task',
              capabilities: ['storage'],
              input: { useOutput: 'step-2' }
            }
          ]
        })
        .expect(201);
      
      const workflowId = createResponse.body.workflowId;
      
      // Execute workflow
      const execResponse = await request(app || API_BASE_URL)
        .post(`/api/workflows/${workflowId}/execute`)
        .send({
          context: { userId: 'test-user' }
        })
        .expect(202);
      
      expect(execResponse.body).toMatchObject({
        executionId: expect.any(String),
        status: 'running'
      });
      
      // Wait for completion
      await waitForWorkflowCompletion(workflowId, execResponse.body.executionId);
      
      // Verify execution results
      const statusResponse = await request(app || API_BASE_URL)
        .get(`/api/workflows/${workflowId}/executions/${execResponse.body.executionId}`)
        .expect(200);
      
      expect(statusResponse.body).toMatchObject({
        status: 'completed',
        steps: {
          'step-1': { status: 'completed' },
          'step-2': { status: 'completed' },
          'step-3': { status: 'completed' }
        }
      });
    });
    
    test('should execute parallel steps concurrently', async () => {
      // Create workflow with parallel steps
      const createResponse = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send({
          name: 'Parallel Execution Test',
          steps: [
            {
              id: 'parallel-group',
              type: 'parallel',
              steps: [
                {
                  id: 'task-a',
                  type: 'task',
                  capabilities: ['processing']
                },
                {
                  id: 'task-b',
                  type: 'task',
                  capabilities: ['analysis']
                },
                {
                  id: 'task-c',
                  type: 'task',
                  capabilities: ['validation']
                }
              ]
            }
          ]
        })
        .expect(201);
      
      const workflowId = createResponse.body.workflowId;
      
      // Execute and track timing
      const startTime = Date.now();
      
      const execResponse = await request(app || API_BASE_URL)
        .post(`/api/workflows/${workflowId}/execute`)
        .expect(202);
      
      await waitForWorkflowCompletion(workflowId, execResponse.body.executionId);
      
      const duration = Date.now() - startTime;
      
      // Verify parallel execution (should be faster than sequential)
      expect(duration).toBeLessThan(5000); // All tasks should complete within 5 seconds
      
      // Check all tasks completed
      const events = workflowEventCollector.getEvents('workflow:events');
      const taskCompletions = events.filter(e => 
        e.message.eventType === 'task_completed' &&
        e.message.executionId === execResponse.body.executionId
      );
      
      expect(taskCompletions).toHaveLength(3);
    });
    
    test('should handle conditional branching', async () => {
      // Create conditional workflow
      const createResponse = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send({
          name: 'Conditional Branch Test',
          steps: [
            {
              id: 'check-value',
              type: 'task',
              capabilities: ['validation'],
              input: { value: '${context.inputValue}' }
            },
            {
              id: 'branch',
              type: 'conditional',
              condition: {
                field: 'check-value.output.isValid',
                operator: 'equals',
                value: true
              },
              then: [
                {
                  id: 'success-path',
                  type: 'task',
                  capabilities: ['processing']
                }
              ],
              else: [
                {
                  id: 'failure-path',
                  type: 'task',
                  capabilities: ['notification']
                }
              ]
            }
          ]
        })
        .expect(201);
      
      const workflowId = createResponse.body.workflowId;
      
      // Execute with valid input
      const validExec = await request(app || API_BASE_URL)
        .post(`/api/workflows/${workflowId}/execute`)
        .send({
          context: { inputValue: 'valid-data' }
        })
        .expect(202);
      
      await waitForWorkflowCompletion(workflowId, validExec.body.executionId);
      
      // Verify success path taken
      const validStatus = await request(app || API_BASE_URL)
        .get(`/api/workflows/${workflowId}/executions/${validExec.body.executionId}`)
        .expect(200);
      
      expect(validStatus.body.steps['success-path']).toBeDefined();
      expect(validStatus.body.steps['failure-path']).toBeUndefined();
      
      // Execute with invalid input
      const invalidExec = await request(app || API_BASE_URL)
        .post(`/api/workflows/${workflowId}/execute`)
        .send({
          context: { inputValue: '' }
        })
        .expect(202);
      
      await waitForWorkflowCompletion(workflowId, invalidExec.body.executionId);
      
      // Verify failure path taken
      const invalidStatus = await request(app || API_BASE_URL)
        .get(`/api/workflows/${workflowId}/executions/${invalidExec.body.executionId}`)
        .expect(200);
      
      expect(invalidStatus.body.steps['failure-path']).toBeDefined();
      expect(invalidStatus.body.steps['success-path']).toBeUndefined();
    });
  });
  
  describe('Error Handling and Recovery', () => {
    test('should retry failed tasks', async () => {
      // Create agent that fails first attempt
      const failingAgent = new TestAgentSimulator({
        agentName: 'Retry Test Agent',
        capabilities: ['retry-test'],
        failureRate: 1.0 // Always fail initially
      });
      await failingAgent.connect();
      await failingAgent.register();
      agents.push(failingAgent);
      
      // After first attempt, reduce failure rate
      setTimeout(() => {
        failingAgent.failureRate = 0;
      }, 2000);
      
      const createResponse = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send({
          name: 'Retry Test',
          steps: [
            {
              id: 'retry-task',
              type: 'task',
              capabilities: ['retry-test'],
              retry: {
                maxAttempts: 3,
                backoff: 'exponential',
                initialDelay: 1000
              }
            }
          ]
        })
        .expect(201);
      
      const execResponse = await request(app || API_BASE_URL)
        .post(`/api/workflows/${createResponse.body.workflowId}/execute`)
        .expect(202);
      
      await waitForWorkflowCompletion(createResponse.body.workflowId, execResponse.body.executionId);
      
      // Verify retry occurred
      const events = workflowEventCollector.getEvents('workflow:events');
      const retryEvents = events.filter(e => 
        e.message.eventType === 'task_retry' &&
        e.message.stepId === 'retry-task'
      );
      
      expect(retryEvents.length).toBeGreaterThan(0);
    });
    
    test('should execute compensation on failure', async () => {
      const createResponse = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send({
          name: 'Compensation Test',
          steps: [
            {
              id: 'create-resource',
              type: 'task',
              capabilities: ['storage'],
              compensation: {
                id: 'delete-resource',
                type: 'task',
                capabilities: ['storage'],
                input: { action: 'delete', resourceId: '${create-resource.output.id}' }
              }
            },
            {
              id: 'failing-step',
              type: 'task',
              capabilities: ['non-existent'], // Will fail
              retry: { maxAttempts: 1 }
            }
          ]
        })
        .expect(201);
      
      const execResponse = await request(app || API_BASE_URL)
        .post(`/api/workflows/${createResponse.body.workflowId}/execute`)
        .expect(202);
      
      await waitForWorkflowCompletion(createResponse.body.workflowId, execResponse.body.executionId);
      
      // Verify compensation executed
      const statusResponse = await request(app || API_BASE_URL)
        .get(`/api/workflows/${createResponse.body.workflowId}/executions/${execResponse.body.executionId}`)
        .expect(200);
      
      expect(statusResponse.body.status).toBe('failed');
      expect(statusResponse.body.compensation).toMatchObject({
        executed: true,
        steps: ['delete-resource']
      });
    });
    
    test('should handle timeout scenarios', async () => {
      // Create slow agent
      const slowAgent = new TestAgentSimulator({
        agentName: 'Timeout Test Agent',
        capabilities: ['timeout-test'],
        responseDelay: 10000 // 10 second delay
      });
      await slowAgent.connect();
      await slowAgent.register();
      agents.push(slowAgent);
      
      const createResponse = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send({
          name: 'Timeout Test',
          steps: [
            {
              id: 'timeout-task',
              type: 'task',
              capabilities: ['timeout-test'],
              timeout: 2000 // 2 second timeout
            }
          ]
        })
        .expect(201);
      
      const execResponse = await request(app || API_BASE_URL)
        .post(`/api/workflows/${createResponse.body.workflowId}/execute`)
        .expect(202);
      
      await waitForWorkflowCompletion(createResponse.body.workflowId, execResponse.body.executionId, 5000);
      
      const statusResponse = await request(app || API_BASE_URL)
        .get(`/api/workflows/${createResponse.body.workflowId}/executions/${execResponse.body.executionId}`)
        .expect(200);
      
      expect(statusResponse.body.steps['timeout-task']).toMatchObject({
        status: 'failed',
        error: expect.stringContaining('timeout')
      });
    });
  });
  
  describe('Long-Running Workflows', () => {
    test('should support workflow persistence', async () => {
      const createResponse = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send({
          name: 'Long Running Test',
          persistent: true,
          steps: [
            {
              id: 'long-task-1',
              type: 'task',
              capabilities: ['processing']
            },
            {
              id: 'checkpoint',
              type: 'checkpoint'
            },
            {
              id: 'long-task-2',
              type: 'task',
              capabilities: ['analysis']
            }
          ]
        })
        .expect(201);
      
      const execResponse = await request(app || API_BASE_URL)
        .post(`/api/workflows/${createResponse.body.workflowId}/execute`)
        .expect(202);
      
      // Wait for checkpoint
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify checkpoint saved
      const checkpointData = await redisClient.get(
        `workflow:checkpoint:${execResponse.body.executionId}`
      );
      expect(checkpointData).toBeTruthy();
      
      // Simulate restart from checkpoint
      const resumeResponse = await request(app || API_BASE_URL)
        .post(`/api/workflows/${createResponse.body.workflowId}/executions/${execResponse.body.executionId}/resume`)
        .expect(200);
      
      expect(resumeResponse.body.resumedFrom).toBe('checkpoint');
    });
    
    test('should handle workflow suspension and resumption', async () => {
      const createResponse = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send({
          name: 'Suspendable Workflow',
          steps: [
            {
              id: 'before-suspend',
              type: 'task',
              capabilities: ['processing']
            },
            {
              id: 'suspendable-task',
              type: 'task',
              capabilities: ['analysis'],
              suspendable: true
            },
            {
              id: 'after-suspend',
              type: 'task',
              capabilities: ['reporting']
            }
          ]
        })
        .expect(201);
      
      const execResponse = await request(app || API_BASE_URL)
        .post(`/api/workflows/${createResponse.body.workflowId}/execute`)
        .expect(202);
      
      // Wait for first step completion
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Suspend workflow
      const suspendResponse = await request(app || API_BASE_URL)
        .post(`/api/workflows/${createResponse.body.workflowId}/executions/${execResponse.body.executionId}/suspend`)
        .expect(200);
      
      expect(suspendResponse.body.status).toBe('suspended');
      
      // Verify workflow is suspended
      const statusResponse = await request(app || API_BASE_URL)
        .get(`/api/workflows/${createResponse.body.workflowId}/executions/${execResponse.body.executionId}`)
        .expect(200);
      
      expect(statusResponse.body.status).toBe('suspended');
      expect(statusResponse.body.suspendedAt).toBeDefined();
      
      // Resume workflow
      const resumeResponse = await request(app || API_BASE_URL)
        .post(`/api/workflows/${createResponse.body.workflowId}/executions/${execResponse.body.executionId}/resume`)
        .expect(200);
      
      expect(resumeResponse.body.status).toBe('running');
      
      await waitForWorkflowCompletion(createResponse.body.workflowId, execResponse.body.executionId);
    });
  });
  
  describe('Workflow Monitoring and Audit', () => {
    test('should track workflow execution metrics', async () => {
      // Execute multiple workflows
      const workflowIds = [];
      
      for (let i = 0; i < 5; i++) {
        const createResponse = await request(app || API_BASE_URL)
          .post('/api/workflows')
          .send({
            name: `Metrics Test ${i}`,
            steps: [
              {
                id: 'task-1',
                type: 'task',
                capabilities: ['processing']
              }
            ]
          })
          .expect(201);
        
        workflowIds.push(createResponse.body.workflowId);
        
        await request(app || API_BASE_URL)
          .post(`/api/workflows/${createResponse.body.workflowId}/execute`)
          .expect(202);
      }
      
      // Wait for completions
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get workflow metrics
      const metricsResponse = await request(app || API_BASE_URL)
        .get('/api/workflows/metrics')
        .expect(200);
      
      expect(metricsResponse.body).toMatchObject({
        totalExecutions: expect.any(Number),
        successRate: expect.any(Number),
        averageDuration: expect.any(Number),
        byStatus: {
          completed: expect.any(Number),
          failed: expect.any(Number),
          running: expect.any(Number)
        }
      });
      
      expect(metricsResponse.body.totalExecutions).toBeGreaterThanOrEqual(5);
    });
    
    test('should maintain workflow audit trail', async () => {
      const createResponse = await request(app || API_BASE_URL)
        .post('/api/workflows')
        .send({
          name: 'Audit Trail Test',
          auditEnabled: true,
          steps: [
            {
              id: 'audited-task',
              type: 'task',
              capabilities: ['processing']
            }
          ]
        })
        .expect(201);
      
      const execResponse = await request(app || API_BASE_URL)
        .post(`/api/workflows/${createResponse.body.workflowId}/execute`)
        .send({
          context: {
            userId: 'test-user',
            requestId: 'test-request-123'
          }
        })
        .expect(202);
      
      await waitForWorkflowCompletion(createResponse.body.workflowId, execResponse.body.executionId);
      
      // Get audit trail
      const auditResponse = await request(app || API_BASE_URL)
        .get(`/api/workflows/${createResponse.body.workflowId}/executions/${execResponse.body.executionId}/audit`)
        .expect(200);
      
      expect(auditResponse.body.events).toBeInstanceOf(Array);
      expect(auditResponse.body.events.length).toBeGreaterThan(0);
      
      // Verify audit events
      const eventTypes = auditResponse.body.events.map(e => e.type);
      expect(eventTypes).toContain('workflow_started');
      expect(eventTypes).toContain('task_assigned');
      expect(eventTypes).toContain('task_completed');
      expect(eventTypes).toContain('workflow_completed');
      
      // Verify context preserved
      auditResponse.body.events.forEach(event => {
        expect(event.context).toMatchObject({
          userId: 'test-user',
          requestId: 'test-request-123'
        });
      });
    });
  });
  
  // Helper function to wait for workflow completion
  async function waitForWorkflowCompletion(workflowId, executionId, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const response = await request(app || API_BASE_URL)
        .get(`/api/workflows/${workflowId}/executions/${executionId}`)
        .expect(200);
      
      if (response.body.status === 'completed' || response.body.status === 'failed') {
        return response.body;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Workflow execution timeout after ${timeout}ms`);
  }
});

// Helper class for collecting workflow events
class WorkflowEventCollector {
  constructor(redisSub) {
    this.redisSub = redisSub;
    this.events = [];
  }
  
  async start() {
    await this.redisSub.subscribe('workflow:events', 'task:events');
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
  WorkflowEventCollector,
  TEST_TIMEOUT
};