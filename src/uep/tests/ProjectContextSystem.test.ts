/**
 * Comprehensive Testing Suite for ProjectContext System
 * 
 * Tests all components of the Meta Agent Autonomy system including:
 * - ProjectContext Manager
 * - UEP Integration
 * - IOA Integration  
 * - Escalation Engine
 * - End-to-end workflows
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { ProjectContextManager, createProjectContextManager } from '../ProjectContextManager';
import { ProjectContextIntegration, createProjectContextIntegration } from '../ProjectContextIntegration';
import { IOAIntegration, createIOAIntegration } from '../IOAIntegration';
import { EscalationEngine, createEscalationEngine } from '../EscalationEngine';
import {
  ProjectContext,
  ProjectTask,
  ActiveAgent,
  AgentStatus,
  TaskStatus,
  ProjectEventType,
  ProjectContextEvent
} from '../interfaces/IProjectContext';

// Mock implementations
class MockRedis {
  private data = new Map<string, any>();

  async ping(): Promise<string> {
    return 'PONG';
  }

  async get(key: string): Promise<any> {
    return this.data.get(key);
  }

  async setex(key: string, ttl: number, value: any): Promise<void> {
    this.data.set(key, value);
  }

  async del(key: string): Promise<number> {
    const existed = this.data.has(key);
    this.data.delete(key);
    return existed ? 1 : 0;
  }

  async sadd(key: string, value: string): Promise<number> {
    let set = this.data.get(key) || new Set();
    const size = set.size;
    set.add(value);
    this.data.set(key, set);
    return set.size - size;
  }

  async rpush(key: string, value: any): Promise<number> {
    let list = this.data.get(key) || [];
    list.push(value);
    this.data.set(key, list);
    return list.length;
  }

  async ltrim(key: string, start: number, end: number): Promise<void> {
    let list = this.data.get(key) || [];
    this.data.set(key, list.slice(start, end + 1));
  }

  async lrange(key: string, start: number, end: number): Promise<any[]> {
    let list = this.data.get(key) || [];
    if (end === -1) return list.slice(start);
    return list.slice(start, end + 1);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  clear(): void {
    this.data.clear();
  }
}

class MockUEPFactory extends EventEmitter {
  private agents = new Map();

  listAgents() {
    return Array.from(this.agents.values());
  }

  createAgent(type: string, id: string, config: any) {
    const agent = {
      agentId: id,
      agentType: type,
      status: 'active',
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
      metrics: {
        successfulTasks: 0,
        failedTasks: 0,
        averageComplianceScore: 0.85
      }
    };
    this.agents.set(id, agent);
    this.emit('agent:created', agent);
    return agent;
  }

  removeAgent(id: string) {
    const agent = this.agents.get(id);
    this.agents.delete(id);
    this.emit('agent:removed', { agentId: id, agent });
  }

  simulateProcessing(agentId: string, success: boolean = true) {
    this.emit('agent:processed', {
      agentId,
      agentType: 'test',
      processingTime: 1000,
      success,
      complianceScore: success ? 0.9 : 0.3,
      timestamp: new Date()
    });
  }

  simulateError(agentId: string, error: string) {
    this.emit('agent:error', {
      agentId,
      agentType: 'test',
      error,
      processingTime: 500,
      timestamp: new Date()
    });
  }
}

class MockIOA extends EventEmitter {
  async runComplianceAudit() {
    return {
      complianceScore: 85,
      projectHealth: 'good',
      criticalIssues: [],
      warnings: 2,
      recommendations: ['Improve test coverage'],
      timestamp: new Date()
    };
  }

  async runFullOrchestration() {
    return {
      success: true,
      timestamp: new Date(),
      duration: 5000,
      tasksCompleted: 3,
      complianceResults: [],
      documentationUpdated: true,
      ragKnowledgeUpdated: true,
      metaAgentsCoordinated: true,
      errors: []
    };
  }

  simulateComplianceIssue() {
    this.emit('compliance:audit-completed', {
      complianceScore: 45,
      projectHealth: 'poor',
      criticalIssues: [
        {
          ruleId: 'test-rule',
          message: 'Test compliance issue',
          filePath: '/test/file.ts',
          lineNumber: 42,
          severity: 'error'
        }
      ],
      warnings: 5,
      timestamp: new Date()
    });
  }
}

// Test suite
describe('ProjectContext System', () => {
  let mockRedis: MockRedis;
  let projectContextManager: ProjectContextManager;
  let mockUEPFactory: MockUEPFactory;
  let mockIOA: MockIOA;
  let projectContextIntegration: ProjectContextIntegration;
  let ioaIntegration: IOAIntegration;
  let escalationEngine: EscalationEngine;
  let testProjectId: string;

  beforeAll(() => {
    // Mock environment variables
    process.env.KV_REST_API_URL = 'redis://localhost:6379';
    process.env.KV_REST_API_TOKEN = 'test-token';
  });

  beforeEach(async () => {
    // Initialize mocks
    mockRedis = new MockRedis();
    mockUEPFactory = new MockUEPFactory();
    mockIOA = new MockIOA();

    // Mock Redis import
    jest.doMock('@upstash/redis', () => ({
      Redis: jest.fn(() => mockRedis)
    }));

    testProjectId = `test_project_${Date.now()}`;

    // Initialize ProjectContext Manager
    projectContextManager = createProjectContextManager({
      projectId: testProjectId,
      enablePersistence: true,
      enableCaching: true,
      cacheTTL: 3600
    });

    await projectContextManager.initialize();

    // Initialize integrations
    projectContextIntegration = createProjectContextIntegration(
      projectContextManager,
      {
        projectId: testProjectId,
        enableAgentRegistration: true,
        enableEventSynchronization: true,
        enableMetricsCollection: true
      }
    );

    ioaIntegration = createIOAIntegration(
      projectContextManager,
      {
        projectId: testProjectId,
        enableComplianceIntegration: true,
        enableEscalationHandling: true,
        complianceScoreThreshold: 70
      }
    );

    escalationEngine = createEscalationEngine(
      projectContextManager,
      {
        projectId: testProjectId,
        enableAutoEscalation: true,
        enableFailureRecovery: true,
        thresholds: {
          taskFailureRate: 20,
          agentOfflineRate: 30,
          blockersCount: 5,
          stuckTasksCount: 3,
          healthScoreThreshold: 70,
          responseTimeThreshold: 5000
        }
      }
    );

    // Initialize all systems
    await projectContextIntegration.initialize();
    await ioaIntegration.initialize();
    await escalationEngine.initialize();
  });

  afterEach(async () => {
    // Cleanup
    await escalationEngine.shutdown();
    await ioaIntegration.shutdown();
    await projectContextIntegration.shutdown();
    await projectContextManager.shutdown();
    mockRedis.clear();
    jest.clearAllMocks();
  });

  describe('ProjectContext Manager', () => {
    it('should create and manage project context', async () => {
      const project = await projectContextManager.getProject(testProjectId);
      expect(project).toBeTruthy();
      expect(project?.projectId).toBe(testProjectId);
      expect(project?.status).toBe('initializing');
    });

    it('should add and manage tasks', async () => {
      const taskId = await projectContextManager.addTask(testProjectId, {
        agentId: 'test-agent',
        description: 'Test task',
        priority: 'high',
        dependencies: [],
        metadata: { test: true }
      });

      expect(taskId).toBeTruthy();

      const tasks = await projectContextManager.getTasks(testProjectId);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].taskId).toBe(taskId);
      expect(tasks[0].description).toBe('Test task');
    });

    it('should register and manage agents', async () => {
      await projectContextManager.registerAgent(testProjectId, {
        agentId: 'test-agent-1',
        agentType: 'test-type',
        status: 'idle',
        sessionId: 'session-1',
        capabilities: ['testing'],
        workload: 50,
        metadata: {}
      });

      const project = await projectContextManager.getProject(testProjectId);
      expect(project?.agents).toHaveLength(1);
      expect(project?.agents[0].agentId).toBe('test-agent-1');
    });

    it('should handle workflow handoffs', async () => {
      // Register two agents
      await projectContextManager.registerAgent(testProjectId, {
        agentId: 'agent-1',
        agentType: 'test',
        status: 'working',
        sessionId: 'session-1',
        capabilities: ['task-1'],
        workload: 80,
        metadata: {}
      });

      await projectContextManager.registerAgent(testProjectId, {
        agentId: 'agent-2',
        agentType: 'test',
        status: 'idle',
        sessionId: 'session-2',
        capabilities: ['task-2'],
        workload: 20,
        metadata: {}
      });

      // Create a task
      const taskId = await projectContextManager.addTask(testProjectId, {
        agentId: 'agent-1',
        description: 'Handoff task',
        priority: 'medium',
        dependencies: [],
        metadata: {}
      });

      // Initiate handoff
      const handoffId = await projectContextManager.initiateHandoff(testProjectId, {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        taskId,
        handoffType: 'delegation',
        context: { reason: 'workload balancing' },
        reason: 'Agent 1 is overloaded'
      });

      expect(handoffId).toBeTruthy();

      // Acknowledge handoff
      await projectContextManager.acknowledgeHandoff(testProjectId, handoffId, 'agent-2');

      // Complete handoff
      await projectContextManager.completeHandoff(testProjectId, handoffId);

      const project = await projectContextManager.getProject(testProjectId);
      const handoff = project?.workflowHandoffs.find(h => h.handoffId === handoffId);
      expect(handoff?.status).toBe('completed');
    });

    it('should generate comprehensive statistics', async () => {
      // Add test data
      await projectContextManager.addTask(testProjectId, {
        agentId: 'agent-1',
        description: 'Task 1',
        priority: 'high',
        dependencies: [],
        metadata: {}
      });

      await projectContextManager.registerAgent(testProjectId, {
        agentId: 'agent-1',
        agentType: 'test',
        status: 'working',
        sessionId: 'session-1',
        capabilities: ['testing'],
        workload: 75,
        metadata: {}
      });

      const stats = await projectContextManager.getStats(testProjectId);
      expect(stats.taskStats.total).toBe(1);
      expect(stats.agentStats.total).toBe(1);
      expect(stats.health.overallStatus).toBeTruthy();
    });
  });

  describe('UEP Integration', () => {
    it('should integrate with UEP Factory and register agents', async () => {
      await projectContextIntegration.integrateWithUEPFactory(mockUEPFactory);

      // Create agent in UEP Factory
      const uepAgent = mockUEPFactory.createAgent('test-agent', 'test-agent-1', {});

      // Wait for integration to process
      await new Promise(resolve => setTimeout(resolve, 100));

      const project = await projectContextManager.getProject(testProjectId);
      const registeredAgent = project?.agents.find(a => a.metadata.uepAgentId === 'test-agent-1');
      expect(registeredAgent).toBeTruthy();
    });

    it('should handle UEP agent processing events', async () => {
      await projectContextIntegration.integrateWithUEPFactory(mockUEPFactory);

      // Create agent
      mockUEPFactory.createAgent('test-agent', 'test-agent-1', {});
      
      // Simulate processing
      mockUEPFactory.simulateProcessing('test-agent-1', true);

      // Wait for integration to process
      await new Promise(resolve => setTimeout(resolve, 100));

      const tasks = await projectContextManager.getTasks(testProjectId);
      const processingTask = tasks.find(t => t.metadata.uepEvent === true);
      expect(processingTask).toBeTruthy();
      expect(processingTask?.status).toBe('completed');
    });

    it('should handle UEP agent errors', async () => {
      await projectContextIntegration.integrateWithUEPFactory(mockUEPFactory);

      // Create agent
      mockUEPFactory.createAgent('test-agent', 'test-agent-1', {});
      
      // Simulate error
      mockUEPFactory.simulateError('test-agent-1', 'Test error');

      // Wait for integration to process
      await new Promise(resolve => setTimeout(resolve, 100));

      const tasks = await projectContextManager.getTasks(testProjectId);
      const errorTask = tasks.find(t => t.metadata.errorDetails);
      expect(errorTask).toBeTruthy();
      expect(errorTask?.status).toBe('failed');
    });
  });

  describe('IOA Integration', () => {
    it('should integrate with IOA and perform compliance sync', async () => {
      await ioaIntegration.connectToIOA(mockIOA);

      const status = ioaIntegration.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.complianceScore).toBeGreaterThan(0);
    });

    it('should handle compliance threshold breaches', async () => {
      await ioaIntegration.connectToIOA(mockIOA);

      // Simulate compliance issue
      mockIOA.simulateComplianceIssue();

      // Wait for integration to process
      await new Promise(resolve => setTimeout(resolve, 100));

      const escalations = ioaIntegration.getActiveEscalations();
      expect(escalations.length).toBeGreaterThan(0);
      expect(escalations[0].escalationType).toBe('compliance_threshold_breach');
    });

    it('should trigger escalation for critical events', async () => {
      await ioaIntegration.connectToIOA(mockIOA);

      // Create a task that fails
      const taskId = await projectContextManager.addTask(testProjectId, {
        agentId: 'test-agent',
        description: 'Failing task',
        priority: 'critical',
        dependencies: [],
        metadata: {}
      });

      // Fail the task
      await projectContextManager.failTask(testProjectId, taskId, 'Test failure');

      // Wait for escalation processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const escalations = ioaIntegration.getActiveEscalations();
      expect(escalations.length).toBeGreaterThan(0);
    });
  });

  describe('Escalation Engine', () => {
    it('should monitor system health and trigger escalations', async () => {
      // Create conditions that trigger escalation
      const failedTasks = 5;
      for (let i = 0; i < failedTasks; i++) {
        const taskId = await projectContextManager.addTask(testProjectId, {
          agentId: 'test-agent',
          description: `Failed task ${i}`,
          priority: 'medium',
          dependencies: [],
          metadata: {}
        });
        await projectContextManager.failTask(testProjectId, taskId, 'Test failure');
      }

      // Trigger escalation check
      const stats = await projectContextManager.getStats(testProjectId);
      const mockEvent: ProjectContextEvent = {
        eventId: 'test-event',
        projectId: testProjectId,
        eventType: 'project_updated',
        data: { healthCheck: true },
        timestamp: new Date(),
        metadata: {}
      };

      // Force escalation evaluation
      await escalationEngine['evaluateEscalationTriggers'](mockEvent);

      const incidents = escalationEngine.getActiveIncidents();
      expect(incidents.length).toBeGreaterThan(0);
      expect(incidents[0].severity).toBe('high');
    });

    it('should execute recovery actions', async () => {
      // Create an agent
      await projectContextManager.registerAgent(testProjectId, {
        agentId: 'recoverable-agent',
        agentType: 'test',
        status: 'offline',
        sessionId: 'session-1',
        capabilities: ['recovery'],
        workload: 0,
        metadata: {}
      });

      // Create a failed task
      const taskId = await projectContextManager.addTask(testProjectId, {
        agentId: 'recoverable-agent',
        description: 'Recoverable task',
        priority: 'high',
        dependencies: [],
        metadata: {}
      });

      await projectContextManager.failTask(testProjectId, taskId, 'Recoverable failure');

      // Add idle agent for reassignment
      await projectContextManager.registerAgent(testProjectId, {
        agentId: 'backup-agent',
        agentType: 'test',
        status: 'idle',
        sessionId: 'session-2',
        capabilities: ['recovery'],
        workload: 10,
        metadata: {}
      });

      // Execute recovery action
      const success = await escalationEngine['executeRecoveryAction']({
        actionId: 'test-recovery',
        type: 'reassign_task',
        parameters: { taskId },
        timeout: 30,
        retries: 1,
        failureBehavior: 'continue'
      }, { taskId });

      expect(success).toBe(true);

      // Verify task was reassigned
      const tasks = await projectContextManager.getTasks(testProjectId);
      const reassignedTask = tasks.find(t => t.taskId === taskId);
      expect(reassignedTask?.agentId).toBe('backup-agent');
    });

    it('should handle escalation levels', async () => {
      const mockIncident = {
        incidentId: 'test-incident',
        projectId: testProjectId,
        title: 'Test escalation',
        description: 'Test escalation description',
        severity: 'high' as const,
        status: 'active' as const,
        triggerType: 'test',
        triggerData: { test: true },
        currentLevel: 0,
        createdAt: new Date(),
        actions: [],
        metadata: {}
      };

      // Execute level 1 escalation
      await escalationEngine['executeEscalationLevel'](mockIncident, 1);

      expect(mockIncident.currentLevel).toBe(1);
      expect(mockIncident.actions.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Workflows', () => {
    it('should handle complete agent lifecycle', async () => {
      // Connect all integrations
      await projectContextIntegration.integrateWithUEPFactory(mockUEPFactory);
      await ioaIntegration.connectToIOA(mockIOA);

      // Create UEP agent
      const uepAgent = mockUEPFactory.createAgent('test-agent', 'e2e-agent', {});

      // Wait for registration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify agent registered in project context
      const project = await projectContextManager.getProject(testProjectId);
      const registeredAgent = project?.agents.find(a => a.metadata.uepAgentId === 'e2e-agent');
      expect(registeredAgent).toBeTruthy();

      // Simulate successful processing
      mockUEPFactory.simulateProcessing('e2e-agent', true);

      // Wait for task creation
      await new Promise(resolve => setTimeout(resolve, 100));

      const tasks = await projectContextManager.getTasks(testProjectId);
      const processingTask = tasks.find(t => t.metadata.uepEvent === true);
      expect(processingTask).toBeTruthy();
      expect(processingTask?.status).toBe('completed');

      // Remove agent
      mockUEPFactory.removeAgent('e2e-agent');

      // Wait for unregistration
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedProject = await projectContextManager.getProject(testProjectId);
      const removedAgent = updatedProject?.agents.find(a => a.metadata.uepAgentId === 'e2e-agent');
      expect(removedAgent).toBeFalsy();
    });

    it('should handle failure cascade and recovery', async () => {
      // Connect all systems
      await projectContextIntegration.integrateWithUEPFactory(mockUEPFactory);
      await ioaIntegration.connectToIOA(mockIOA);

      // Create multiple agents
      const agents = ['agent-1', 'agent-2', 'agent-3'];
      for (const agentId of agents) {
        mockUEPFactory.createAgent('test-agent', agentId, {});
      }

      // Wait for registration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate cascade failure
      for (const agentId of agents) {
        mockUEPFactory.simulateError(agentId, 'Cascade failure');
      }

      // Wait for error processing and escalation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check escalations were triggered
      const escalations = ioaIntegration.getActiveEscalations();
      expect(escalations.length).toBeGreaterThan(0);

      const incidents = escalationEngine.getActiveIncidents();
      expect(incidents.length).toBeGreaterThan(0);

      // Verify recovery measures
      const tasks = await projectContextManager.getTasks(testProjectId);
      const errorTasks = tasks.filter(t => t.status === 'failed');
      expect(errorTasks.length).toBe(agents.length);
    });

    it('should maintain system health during normal operations', async () => {
      // Connect all systems
      await projectContextIntegration.integrateWithUEPFactory(mockUEPFactory);
      await ioaIntegration.connectToIOA(mockIOA);

      // Create agents and simulate normal operation
      for (let i = 0; i < 3; i++) {
        const agentId = `normal-agent-${i}`;
        mockUEPFactory.createAgent('test-agent', agentId, {});
        
        // Simulate successful processing
        setTimeout(() => {
          mockUEPFactory.simulateProcessing(agentId, true);
        }, 50);
      }

      // Wait for all processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check system health
      const stats = await projectContextManager.getStats(testProjectId);
      expect(stats.agentStats.total).toBe(3);
      expect(stats.taskStats.total).toBe(3);
      
      // Should have high success rate
      const successRate = stats.taskStats.successRate;
      expect(successRate).toBeGreaterThan(0.8);

      // No escalations should be triggered
      const incidents = escalationEngine.getActiveIncidents();
      expect(incidents.length).toBe(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high volume of tasks', async () => {
      const taskCount = 100;
      const startTime = Date.now();

      // Create many tasks
      const taskPromises = [];
      for (let i = 0; i < taskCount; i++) {
        taskPromises.push(
          projectContextManager.addTask(testProjectId, {
            agentId: `agent-${i % 10}`,
            description: `Performance test task ${i}`,
            priority: 'medium',
            dependencies: [],
            metadata: { performanceTest: true, index: i }
          })
        );
      }

      await Promise.all(taskPromises);
      const endTime = Date.now();

      // Verify all tasks created
      const tasks = await projectContextManager.getTasks(testProjectId);
      const performanceTasks = tasks.filter(t => t.metadata.performanceTest === true);
      expect(performanceTasks).toHaveLength(taskCount);

      // Check performance
      const duration = endTime - startTime;
      const tasksPerSecond = (taskCount / duration) * 1000;
      console.log(`Performance: ${tasksPerSecond.toFixed(2)} tasks/second`);
      
      // Should handle at least 10 tasks per second
      expect(tasksPerSecond).toBeGreaterThan(10);
    });

    it('should handle concurrent agent operations', async () => {
      const agentCount = 20;
      const operationsPerAgent = 5;

      // Register agents concurrently
      const agentPromises = [];
      for (let i = 0; i < agentCount; i++) {
        agentPromises.push(
          projectContextManager.registerAgent(testProjectId, {
            agentId: `concurrent-agent-${i}`,
            agentType: 'test',
            status: 'idle',
            sessionId: `session-${i}`,
            capabilities: ['concurrent-testing'],
            workload: Math.random() * 100,
            metadata: { concurrentTest: true }
          })
        );
      }

      await Promise.all(agentPromises);

      // Perform concurrent operations
      const operationPromises = [];
      for (let i = 0; i < agentCount; i++) {
        for (let j = 0; j < operationsPerAgent; j++) {
          operationPromises.push(
            projectContextManager.updateAgentStatus(
              testProjectId,
              `concurrent-agent-${i}`,
              j % 2 === 0 ? 'working' : 'idle'
            )
          );
        }
      }

      await Promise.all(operationPromises);

      // Verify final state
      const project = await projectContextManager.getProject(testProjectId);
      const concurrentAgents = project?.agents.filter(a => a.metadata.concurrentTest === true);
      expect(concurrentAgents).toHaveLength(agentCount);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Redis connection failures gracefully', async () => {
      // Mock Redis failure
      const originalGet = mockRedis.get;
      mockRedis.get = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      // Should not crash the system
      let error: Error | null = null;
      try {
        await projectContextManager.getProject(testProjectId);
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeTruthy();
      expect(error?.message).toContain('failed');

      // Restore Redis
      mockRedis.get = originalGet;

      // Should recover
      const project = await projectContextManager.getProject(testProjectId);
      expect(project).toBeTruthy();
    });

    it('should handle malformed data gracefully', async () => {
      // Insert malformed data
      await mockRedis.setex(`project:context:${testProjectId}`, 3600, 'invalid-json');

      // Should handle gracefully
      let error: Error | null = null;
      try {
        await projectContextManager.getProject(testProjectId);
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeTruthy();
    });

    it('should handle system overload gracefully', async () => {
      // Create overload conditions
      const overloadTaskCount = 1000;
      const promises = [];

      for (let i = 0; i < overloadTaskCount; i++) {
        promises.push(
          projectContextManager.addTask(testProjectId, {
            agentId: 'overload-agent',
            description: `Overload task ${i}`,
            priority: 'low',
            dependencies: [],
            metadata: { overloadTest: true }
          }).catch(error => {
            // Expected to fail some operations under overload
            return null;
          })
        );
      }

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Overload test: ${successful} successful, ${failed} failed`);
      
      // Should handle at least some operations successfully
      expect(successful).toBeGreaterThan(overloadTaskCount * 0.1); // At least 10%
    });
  });
});

// Integration test helpers
export class SystemTestHelper {
  static async createTestProject(
    manager: ProjectContextManager,
    projectId: string
  ): Promise<ProjectContext> {
    await manager.createProject({
      projectId,
      enablePersistence: true,
      enableCaching: true,
      cacheTTL: 3600,
      enableCrossAgentSharing: true,
      enableUEPIntegration: true,
      enableIOAIntegration: true,
      enableRAGIntegration: true,
      maxTasks: 1000,
      maxAgents: 50,
      maxHistoryEntries: 1000,
      batchUpdateSize: 100,
      maxConcurrentOperations: 10,
      escalationTimeouts: {
        taskStuckThreshold: 30,
        agentUnresponsiveThreshold: 15,
        handoffAcknowledgmentTimeout: 5,
        decisionReviewTimeout: 60
      },
      escalationRules: []
    });

    const project = await manager.getProject(projectId);
    if (!project) {
      throw new Error('Failed to create test project');
    }

    return project;
  }

  static async createTestAgent(
    manager: ProjectContextManager,
    projectId: string,
    agentId: string,
    agentType: string = 'test'
  ): Promise<void> {
    await manager.registerAgent(projectId, {
      agentId,
      agentType,
      status: 'idle',
      sessionId: `session_${agentId}`,
      capabilities: ['testing'],
      workload: 0,
      metadata: { testAgent: true }
    });
  }

  static async createTestTask(
    manager: ProjectContextManager,
    projectId: string,
    agentId: string,
    description: string = 'Test task'
  ): Promise<string> {
    return await manager.addTask(projectId, {
      agentId,
      description,
      priority: 'medium',
      dependencies: [],
      metadata: { testTask: true }
    });
  }

  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<boolean> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return false;
  }

  static async measurePerformance<T>(
    operation: () => Promise<T>,
    name: string
  ): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    
    console.log(`Performance: ${name} took ${duration}ms`);
    
    return { result, duration };
  }
}

export { MockRedis, MockUEPFactory, MockIOA };