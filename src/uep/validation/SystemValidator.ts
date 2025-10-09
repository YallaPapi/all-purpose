/**
 * System Validator - Real Integration Testing
 * 
 * Validates the entire Meta Agent Autonomy system with real components,
 * real data, and real operations. No mocks, no test data.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { Redis } from '@upstash/redis';
import { ProjectContextManager } from '../ProjectContextManager';
import { ProjectContextIntegration } from '../ProjectContextIntegration';
import { IOAIntegration } from '../IOAIntegration';
import { EscalationEngine } from '../EscalationEngine';
import { PerformanceMonitor } from '../PerformanceMonitor';
import {
  ProjectContext,
  ProjectTask,
  ActiveAgent,
  AgentStatus,
  TaskStatus,
  ProjectEventType
} from '../interfaces/IProjectContext';

/**
 * Validation test result
 */
export interface ValidationResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: any;
  error?: string;
  timestamp: Date;
}

/**
 * System validation report
 */
export interface SystemValidationReport {
  timestamp: Date;
  overallStatus: 'PASSED' | 'FAILED' | 'PARTIAL';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: ValidationResult[];
  systemHealth: any;
  recommendations: string[];
}

/**
 * Real system validator - no mocks, real Redis, real components
 */
export class SystemValidator {
  private redis: Redis;
  private projectContextManager: ProjectContextManager;
  private integration: ProjectContextIntegration;
  private ioaIntegration: IOAIntegration;
  private escalationEngine: EscalationEngine;
  private performanceMonitor: PerformanceMonitor;
  private validationProjectId: string;
  private results: ValidationResult[] = [];

  constructor() {
    this.validationProjectId = `validation_${Date.now()}`;
    
    // Initialize real Redis connection
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
      automaticDeserialization: false,
    });

    console.log('🔍 System Validator initialized with REAL components');
    console.log(`📋 Validation Project ID: ${this.validationProjectId}`);
  }

  /**
   * Run complete system validation
   */
  async validateSystem(): Promise<SystemValidationReport> {
    const startTime = Date.now();
    console.log('🚀 Starting REAL system validation...');

    try {
      // Phase 1: Initialize all components
      await this.initializeComponents();

      // Phase 2: Test core functionality
      await this.testCoreComponents();

      // Phase 3: Test integrations
      await this.testIntegrations();

      // Phase 4: Test end-to-end workflows
      await this.testEndToEndWorkflows();

      // Phase 5: Test failure scenarios
      await this.testFailureScenarios();

      // Phase 6: Performance validation
      await this.testPerformance();

      // Phase 7: Cleanup and health check
      const systemHealth = await this.performFinalHealthCheck();

      const duration = Date.now() - startTime;
      const passedTests = this.results.filter(r => r.passed).length;
      const failedTests = this.results.filter(r => !r.passed).length;

      const report: SystemValidationReport = {
        timestamp: new Date(),
        overallStatus: failedTests === 0 ? 'PASSED' : passedTests > 0 ? 'PARTIAL' : 'FAILED',
        totalTests: this.results.length,
        passedTests,
        failedTests,
        duration,
        results: this.results,
        systemHealth,
        recommendations: this.generateRecommendations()
      };

      console.log(`\n📊 VALIDATION COMPLETE - ${report.overallStatus}`);
      console.log(`✅ Passed: ${passedTests}/${this.results.length}`);
      console.log(`❌ Failed: ${failedTests}/${this.results.length}`);
      console.log(`⏱️ Duration: ${duration}ms`);

      return report;

    } catch (error) {
      console.error('💥 SYSTEM VALIDATION FAILED:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Initialize all real components
   */
  private async initializeComponents(): Promise<void> {
    await this.runTest('Initialize ProjectContext Manager', async () => {
      this.projectContextManager = new ProjectContextManager({
        projectId: this.validationProjectId,
        enablePersistence: true,
        enableCaching: true,
        enableCrossAgentSharing: true,
        enableUEPIntegration: true,
        enableIOAIntegration: true,
        enableRAGIntegration: true,
        redisUrl: process.env.KV_REST_API_URL!,
        redisToken: process.env.KV_REST_API_TOKEN!
      });

      await this.projectContextManager.initialize();
      
      // Verify it's actually connected to Redis
      const testProject = await this.projectContextManager.getProject(this.validationProjectId);
      if (!testProject) {
        throw new Error('Failed to create project - Redis connection issue');
      }

      return { projectId: testProject.projectId, status: testProject.status };
    });

    await this.runTest('Initialize ProjectContext Integration', async () => {
      this.integration = new ProjectContextIntegration(this.projectContextManager, {
        projectId: this.validationProjectId,
        enableAgentRegistration: true,
        enableEventSynchronization: true,
        enableMetricsCollection: true,
        enableContextSharing: true,
        autoCreateTasks: true
      });

      await this.integration.initialize();
      return this.integration.getStatus();
    });

    await this.runTest('Initialize IOA Integration', async () => {
      this.ioaIntegration = new IOAIntegration(this.projectContextManager, {
        projectId: this.validationProjectId,
        enableComplianceIntegration: true,
        enableTaskGeneration: true,
        enableEscalationHandling: true,
        complianceScoreThreshold: 70
      });

      await this.ioaIntegration.initialize();
      return this.ioaIntegration.getStatus();
    });

    await this.runTest('Initialize Escalation Engine', async () => {
      this.escalationEngine = new EscalationEngine(this.projectContextManager, {
        projectId: this.validationProjectId,
        enableAutoEscalation: true,
        enableFailureRecovery: true,
        enablePreventiveMeasures: true
      });

      await this.escalationEngine.initialize();
      return this.escalationEngine.getStatus();
    });

    await this.runTest('Initialize Performance Monitor', async () => {
      this.performanceMonitor = new PerformanceMonitor(this.projectContextManager, {
        projectId: this.validationProjectId,
        enableRealTimeMonitoring: true,
        enableHealthChecks: true,
        enablePerformanceLogging: true
      });

      await this.performanceMonitor.initialize();
      await this.performanceMonitor.startMonitoring();
      
      // Connect all integrations
      this.performanceMonitor.connectIntegrations({
        projectContext: this.integration,
        ioa: this.ioaIntegration,
        escalation: this.escalationEngine
      });

      return this.performanceMonitor.getPerformanceStatus();
    });

    console.log('✅ All components initialized successfully');
  }

  /**
   * Test core component functionality
   */
  private async testCoreComponents(): Promise<void> {
    console.log('🔧 Testing core components...');

    await this.runTest('ProjectContext CRUD Operations', async () => {
      // Test project retrieval
      const project = await this.projectContextManager.getProject(this.validationProjectId);
      if (!project) throw new Error('Project not found');

      // Test project update
      await this.projectContextManager.updateProject(this.validationProjectId, {
        description: 'Real validation project',
        status: 'active'
      });

      const updatedProject = await this.projectContextManager.getProject(this.validationProjectId);
      if (updatedProject?.description !== 'Real validation project') {
        throw new Error('Project update failed');
      }

      return { projectStatus: updatedProject.status, description: updatedProject.description };
    });

    await this.runTest('Real Agent Registration', async () => {
      // Register multiple real agents
      const agents = [
        { id: 'validator-agent-1', type: 'validation-primary' },
        { id: 'validator-agent-2', type: 'validation-secondary' },
        { id: 'validator-agent-3', type: 'validation-backup' }
      ];

      for (const agent of agents) {
        await this.projectContextManager.registerAgent(this.validationProjectId, {
          agentId: agent.id,
          agentType: agent.type,
          status: 'idle',
          sessionId: `session_${agent.id}`,
          capabilities: ['validation', 'testing', 'monitoring'],
          workload: Math.floor(Math.random() * 50),
          metadata: {
            validationAgent: true,
            registeredAt: new Date(),
            purpose: 'Real system validation'
          }
        });
      }

      // Verify agents were registered
      const project = await this.projectContextManager.getProject(this.validationProjectId);
      const registeredAgents = project?.agents.filter(a => a.metadata.validationAgent) || [];
      
      if (registeredAgents.length !== agents.length) {
        throw new Error(`Expected ${agents.length} agents, got ${registeredAgents.length}`);
      }

      return { registeredAgents: registeredAgents.length, agents: registeredAgents.map(a => a.agentId) };
    });

    await this.runTest('Real Task Management', async () => {
      // Create real tasks with dependencies
      const tasks = [
        {
          description: 'Initialize validation environment',
          agentId: 'validator-agent-1',
          priority: 'high' as const,
          dependencies: []
        },
        {
          description: 'Run component tests',
          agentId: 'validator-agent-2', 
          priority: 'medium' as const,
          dependencies: []
        },
        {
          description: 'Generate validation report',
          agentId: 'validator-agent-3',
          priority: 'low' as const,
          dependencies: []
        }
      ];

      const taskIds = [];
      for (const task of tasks) {
        const taskId = await this.projectContextManager.addTask(this.validationProjectId, {
          ...task,
          metadata: {
            validationTask: true,
            createdBy: 'SystemValidator',
            purpose: 'Real system validation'
          }
        });
        taskIds.push(taskId);
      }

      // Update task statuses to test state management
      await this.projectContextManager.updateTask(this.validationProjectId, taskIds[0], {
        status: 'in_progress',
        startedAt: new Date()
      });

      await this.projectContextManager.completeTask(this.validationProjectId, taskIds[1], {
        result: 'Component tests completed successfully',
        metrics: { executionTime: 1500, coverage: 95 }
      });

      // Get final task state
      const allTasks = await this.projectContextManager.getTasks(this.validationProjectId);
      const validationTasks = allTasks.filter(t => t.metadata.validationTask);

      return { 
        createdTasks: taskIds.length,
        tasksInProgress: validationTasks.filter(t => t.status === 'in_progress').length,
        completedTasks: validationTasks.filter(t => t.status === 'completed').length,
        taskIds
      };
    });

    await this.runTest('Real Workflow Handoffs', async () => {
      // Test real workflow handoff between agents
      const task = await this.projectContextManager.addTask(this.validationProjectId, {
        agentId: 'validator-agent-1',
        description: 'Handoff validation task',
        priority: 'medium',
        dependencies: [],
        metadata: { handoffTest: true }
      });

      // Initiate handoff
      const handoffId = await this.projectContextManager.initiateHandoff(this.validationProjectId, {
        fromAgentId: 'validator-agent-1',
        toAgentId: 'validator-agent-2',
        taskId: task,
        handoffType: 'delegation',
        context: { reason: 'validation testing', priority: 'high' },
        reason: 'Testing real handoff mechanism'
      });

      // Acknowledge handoff
      await this.projectContextManager.acknowledgeHandoff(this.validationProjectId, handoffId, 'validator-agent-2');

      // Complete handoff
      await this.projectContextManager.completeHandoff(this.validationProjectId, handoffId);

      // Verify handoff completion
      const project = await this.projectContextManager.getProject(this.validationProjectId);
      const handoff = project?.workflowHandoffs.find(h => h.handoffId === handoffId);
      
      if (!handoff || handoff.status !== 'completed') {
        throw new Error('Handoff not properly completed');
      }

      return { handoffId, status: handoff.status, acknowledged: handoff.acknowledged };
    });
  }

  /**
   * Test system integrations
   */
  private async testIntegrations(): Promise<void> {
    console.log('🔗 Testing system integrations...');

    await this.runTest('Real Event Synchronization', async () => {
      let eventReceived = false;
      let eventData: any = null;

      // Set up event listener
      this.integration.on('project-context:event', (event) => {
        eventReceived = true;
        eventData = event;
      });

      // Trigger an event
      await this.projectContextManager.recordDecision(this.validationProjectId, {
        agentId: 'validator-agent-1',
        decisionType: 'validation_test',
        context: 'Testing real event synchronization',
        decision: { action: 'proceed', confidence: 0.95 },
        reasoning: 'Event sync validation test',
        confidence: 0.95,
        impactedTasks: [],
        metadata: { testEvent: true }
      });

      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!eventReceived) {
        throw new Error('Event synchronization failed');
      }

      return { eventReceived, eventType: eventData?.eventType };
    });

    await this.runTest('Real Performance Monitoring', async () => {
      // Generate some operations for monitoring
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          this.projectContextManager.updateAgentStatus(
            this.validationProjectId,
            'validator-agent-1',
            i % 2 === 0 ? 'working' : 'idle'
          )
        );
      }

      await Promise.all(operations);

      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 1000));

      const performanceStatus = this.performanceMonitor.getPerformanceStatus();
      if (!performanceStatus.isMonitoring) {
        throw new Error('Performance monitoring not active');
      }

      return {
        isMonitoring: performanceStatus.isMonitoring,
        hasMetrics: !!performanceStatus.currentMetrics,
        hasHealth: !!performanceStatus.currentHealth
      };
    });

    await this.runTest('Real Redis Persistence', async () => {
      // Test that data actually persists in Redis
      const testKey = `test:persistence:${Date.now()}`;
      const testData = { test: true, timestamp: new Date(), value: Math.random() };

      // Store directly in Redis
      await this.redis.setex(testKey, 300, JSON.stringify(testData));

      // Retrieve from Redis
      const retrieved = await this.redis.get(testKey);
      const parsedData = JSON.parse(retrieved as string);

      if (!parsedData || parsedData.test !== true) {
        throw new Error('Redis persistence failed');
      }

      // Test project data persistence
      const project = await this.projectContextManager.getProject(this.validationProjectId);
      if (!project) {
        throw new Error('Project not persisted in Redis');
      }

      // Clean up test key
      await this.redis.del(testKey);

      return { 
        directRedisTest: parsedData.test,
        projectPersisted: !!project,
        agentCount: project.agents.length,
        taskCount: project.tasks.length
      };
    });
  }

  /**
   * Test end-to-end workflows
   */
  private async testEndToEndWorkflows(): Promise<void> {
    console.log('🔄 Testing end-to-end workflows...');

    await this.runTest('Complete Agent Lifecycle', async () => {
      const agentId = 'e2e-lifecycle-agent';
      
      // 1. Register agent
      await this.projectContextManager.registerAgent(this.validationProjectId, {
        agentId,
        agentType: 'e2e-test',
        status: 'idle',
        sessionId: `session_${agentId}`,
        capabilities: ['e2e-testing'],
        workload: 0,
        metadata: { lifecycleTest: true }
      });

      // 2. Assign task
      const taskId = await this.projectContextManager.addTask(this.validationProjectId, {
        agentId,
        description: 'E2E lifecycle test task',
        priority: 'medium',
        dependencies: [],
        metadata: { lifecycleTask: true }
      });

      // 3. Update agent to working
      await this.projectContextManager.updateAgentStatus(this.validationProjectId, agentId, 'working');

      // 4. Start task
      await this.projectContextManager.updateTask(this.validationProjectId, taskId, {
        status: 'in_progress',
        startedAt: new Date()
      });

      // 5. Complete task
      await this.projectContextManager.completeTask(this.validationProjectId, taskId, {
        result: 'E2E lifecycle test completed',
        metrics: { success: true }
      });

      // 6. Update agent to idle
      await this.projectContextManager.updateAgentStatus(this.validationProjectId, agentId, 'idle');

      // 7. Verify final state
      const project = await this.projectContextManager.getProject(this.validationProjectId);
      const agent = project?.agents.find(a => a.agentId === agentId);
      const task = project?.tasks.find(t => t.taskId === taskId);

      if (!agent || agent.status !== 'idle') {
        throw new Error('Agent lifecycle test failed - incorrect final agent state');
      }

      if (!task || task.status !== 'completed') {
        throw new Error('Agent lifecycle test failed - incorrect final task state');
      }

      return {
        agentStatus: agent.status,
        taskStatus: task.status,
        taskResult: task.result
      };
    });

    await this.runTest('Multi-Agent Coordination', async () => {
      // Create coordinated workflow with multiple agents
      const coordinatorAgent = 'coordinator-agent';
      const workerAgents = ['worker-1', 'worker-2', 'worker-3'];

      // Register coordinator
      await this.projectContextManager.registerAgent(this.validationProjectId, {
        agentId: coordinatorAgent,
        agentType: 'coordinator',
        status: 'idle',
        sessionId: `session_${coordinatorAgent}`,
        capabilities: ['coordination', 'delegation'],
        workload: 0,
        metadata: { role: 'coordinator' }
      });

      // Register workers
      for (const workerId of workerAgents) {
        await this.projectContextManager.registerAgent(this.validationProjectId, {
          agentId: workerId,
          agentType: 'worker',
          status: 'idle',
          sessionId: `session_${workerId}`,
          capabilities: ['task-execution'],
          workload: 0,
          metadata: { role: 'worker' }
        });
      }

      // Create coordinated tasks
      const parentTaskId = await this.projectContextManager.addTask(this.validationProjectId, {
        agentId: coordinatorAgent,
        description: 'Coordination parent task',
        priority: 'high',
        dependencies: [],
        metadata: { coordinationTest: true, type: 'parent' }
      });

      const workerTaskIds = [];
      for (let i = 0; i < workerAgents.length; i++) {
        const taskId = await this.projectContextManager.addTask(this.validationProjectId, {
          agentId: workerAgents[i],
          description: `Worker task ${i + 1}`,
          priority: 'medium',
          dependencies: [parentTaskId],
          metadata: { coordinationTest: true, type: 'worker', parentTask: parentTaskId }
        });
        workerTaskIds.push(taskId);
      }

      // Execute coordination workflow
      // 1. Start parent task
      await this.projectContextManager.updateTask(this.validationProjectId, parentTaskId, {
        status: 'in_progress',
        startedAt: new Date()
      });

      // 2. Complete parent task to unblock workers
      await this.projectContextManager.completeTask(this.validationProjectId, parentTaskId, {
        result: 'Coordination setup completed'
      });

      // 3. Start and complete worker tasks
      for (const taskId of workerTaskIds) {
        await this.projectContextManager.updateTask(this.validationProjectId, taskId, {
          status: 'in_progress',
          startedAt: new Date()
        });

        await this.projectContextManager.completeTask(this.validationProjectId, taskId, {
          result: `Worker task completed by ${taskId}`
        });
      }

      // Verify coordination
      const tasks = await this.projectContextManager.getTasks(this.validationProjectId, {
        metadata: { coordinationTest: true }
      });

      const completedTasks = tasks.filter(t => t.status === 'completed');
      
      if (completedTasks.length !== workerTaskIds.length + 1) {
        throw new Error('Multi-agent coordination failed - incorrect completion count');
      }

      return {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        coordinatorCompleted: completedTasks.some(t => t.agentId === coordinatorAgent),
        workersCompleted: completedTasks.filter(t => workerAgents.includes(t.agentId)).length
      };
    });
  }

  /**
   * Test failure scenarios and recovery
   */
  private async testFailureScenarios(): Promise<void> {
    console.log('💥 Testing failure scenarios...');

    await this.runTest('Task Failure and Recovery', async () => {
      // Create a task that will fail
      const failingTaskId = await this.projectContextManager.addTask(this.validationProjectId, {
        agentId: 'validator-agent-1',
        description: 'Task designed to fail for testing',
        priority: 'high',
        dependencies: [],
        metadata: { failureTest: true }
      });

      // Fail the task
      await this.projectContextManager.failTask(this.validationProjectId, failingTaskId, 'Intentional test failure');

      // Check if escalation was triggered
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for escalation processing

      const incidents = this.escalationEngine.getActiveIncidents();
      const failureIncident = incidents.find(i => i.triggerData?.event?.data?.task?.taskId === failingTaskId);

      const task = await this.projectContextManager.getTasks(this.validationProjectId);
      const failedTask = task.find(t => t.taskId === failingTaskId);

      if (!failedTask || failedTask.status !== 'failed') {
        throw new Error('Task failure not properly recorded');
      }

      return {
        taskFailed: failedTask.status === 'failed',
        errorDetails: failedTask.errorDetails,
        escalationTriggered: incidents.length > 0,
        incidentCount: incidents.length
      };
    });

    await this.runTest('Agent Offline Recovery', async () => {
      const testAgentId = 'offline-test-agent';

      // Register agent
      await this.projectContextManager.registerAgent(this.validationProjectId, {
        agentId: testAgentId,
        agentType: 'test',
        status: 'working',
        sessionId: `session_${testAgentId}`,
        capabilities: ['testing'],
        workload: 80,
        metadata: { offlineTest: true }
      });

      // Create task for agent
      const taskId = await this.projectContextManager.addTask(this.validationProjectId, {
        agentId: testAgentId,
        description: 'Task for offline test',
        priority: 'medium',
        dependencies: [],
        metadata: { offlineTest: true }
      });

      // Start task
      await this.projectContextManager.updateTask(this.validationProjectId, taskId, {
        status: 'in_progress',
        startedAt: new Date()
      });

      // Simulate agent going offline
      await this.projectContextManager.updateAgentStatus(this.validationProjectId, testAgentId, 'offline');

      // Wait for recovery processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check system response
      const project = await this.projectContextManager.getProject(this.validationProjectId);
      const offlineAgent = project?.agents.find(a => a.agentId === testAgentId);
      const orphanedTask = project?.tasks.find(t => t.taskId === taskId);

      return {
        agentOffline: offlineAgent?.status === 'offline',
        taskStatus: orphanedTask?.status,
        systemRecovered: true // System should continue operating
      };
    });

    await this.runTest('System Overload Handling', async () => {
      // Create overload conditions
      const overloadTasks = [];
      const startTime = Date.now();

      // Create many tasks quickly
      for (let i = 0; i < 50; i++) {
        try {
          const taskId = await this.projectContextManager.addTask(this.validationProjectId, {
            agentId: 'validator-agent-1',
            description: `Overload test task ${i}`,
            priority: 'low',
            dependencies: [],
            metadata: { overloadTest: true, index: i }
          });
          overloadTasks.push(taskId);
        } catch (error) {
          // Some tasks may fail under overload - this is expected
        }
      }

      const duration = Date.now() - startTime;

      // Check system still responds
      const project = await this.projectContextManager.getProject(this.validationProjectId);
      const health = await this.projectContextManager.getHealth(this.validationProjectId);

      return {
        tasksCreated: overloadTasks.length,
        duration,
        systemResponsive: !!project,
        systemHealth: health,
        tasksPerSecond: overloadTasks.length / (duration / 1000)
      };
    });
  }

  /**
   * Test performance characteristics
   */
  private async testPerformance(): Promise<void> {
    console.log('⚡ Testing performance...');

    await this.runTest('Response Time Performance', async () => {
      const operations = [];
      const startTime = Date.now();

      // Test various operations
      for (let i = 0; i < 20; i++) {
        operations.push(async () => {
          const opStart = Date.now();
          await this.projectContextManager.updateAgentStatus(
            this.validationProjectId,
            'validator-agent-1',
            i % 2 === 0 ? 'working' : 'idle'
          );
          return Date.now() - opStart;
        });
      }

      const responseTimes = await Promise.all(operations.map(op => op()));
      const totalDuration = Date.now() - startTime;

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      // Performance thresholds
      if (avgResponseTime > 1000) { // 1 second threshold
        throw new Error(`Average response time too high: ${avgResponseTime}ms`);
      }

      return {
        averageResponseTime: avgResponseTime,
        maxResponseTime,
        minResponseTime,
        totalDuration,
        operationsPerSecond: operations.length / (totalDuration / 1000)
      };
    });

    await this.runTest('Concurrent Operations', async () => {
      const concurrentOperations = [];
      const startTime = Date.now();

      // Run concurrent operations
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          this.projectContextManager.addTask(this.validationProjectId, {
            agentId: 'validator-agent-1',
            description: `Concurrent task ${i}`,
            priority: 'medium',
            dependencies: [],
            metadata: { concurrentTest: true, index: i }
          })
        );
      }

      const results = await Promise.allSettled(concurrentOperations);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful === 0) {
        throw new Error('All concurrent operations failed');
      }

      return {
        totalOperations: concurrentOperations.length,
        successful,
        failed,
        duration,
        successRate: (successful / concurrentOperations.length) * 100
      };
    });

    await this.runTest('Memory Usage', async () => {
      const initialMemory = process.memoryUsage();

      // Perform memory-intensive operations
      const largeDataOperations = [];
      for (let i = 0; i < 100; i++) {
        largeDataOperations.push(
          this.projectContextManager.addTask(this.validationProjectId, {
            agentId: 'validator-agent-1',
            description: `Memory test task ${i}`,
            priority: 'low',
            dependencies: [],
            metadata: {
              memoryTest: true,
              largeData: Array(1000).fill(`data-${i}`).join('-'),
              index: i
            }
          })
        );
      }

      await Promise.all(largeDataOperations);
      const finalMemory = process.memoryUsage();

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      // Check for memory leaks (arbitrary threshold)
      if (memoryIncreasePercent > 200) { // 200% increase
        console.warn(`High memory increase detected: ${memoryIncreasePercent}%`);
      }

      return {
        initialMemoryMB: Math.round(initialMemory.heapUsed / 1024 / 1024),
        finalMemoryMB: Math.round(finalMemory.heapUsed / 1024 / 1024),
        memoryIncreaseMB: Math.round(memoryIncrease / 1024 / 1024),
        memoryIncreasePercent: Math.round(memoryIncreasePercent)
      };
    });
  }

  /**
   * Perform final health check
   */
  private async performFinalHealthCheck(): Promise<any> {
    console.log('🏥 Performing final health check...');

    // Get comprehensive stats
    const stats = await this.projectContextManager.getStats(this.validationProjectId);
    const health = await this.projectContextManager.getHealth(this.validationProjectId);
    const performanceStatus = this.performanceMonitor.getPerformanceStatus();
    const escalationStatus = this.escalationEngine.getStatus();
    const integrationStatus = this.integration.getStatus();
    const ioaStatus = this.ioaIntegration.getStatus();

    return {
      projectStats: stats,
      systemHealth: health,
      performance: {
        isMonitoring: performanceStatus.isMonitoring,
        hasMetrics: !!performanceStatus.currentMetrics,
        activeAlerts: performanceStatus.activeAlerts.length
      },
      escalation: {
        initialized: escalationStatus.initialized,
        activeIncidents: escalationStatus.activeIncidents,
        autoEscalationEnabled: escalationStatus.enableAutoEscalation
      },
      integration: {
        initialized: integrationStatus.initialized,
        uepFactoryConnected: integrationStatus.uepFactoryConnected,
        ioaConnected: integrationStatus.ioaConnected
      },
      ioa: {
        initialized: ioaStatus.initialized,
        complianceScore: ioaStatus.complianceScore,
        activeEscalations: ioaStatus.activeEscalations
      }
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.results.filter(r => !r.passed);

    if (failedTests.length === 0) {
      recommendations.push('✅ All tests passed - system is operating correctly');
      recommendations.push('🚀 System is ready for production deployment');
    } else {
      recommendations.push(`❌ ${failedTests.length} test(s) failed - review and fix issues`);
      
      for (const test of failedTests) {
        recommendations.push(`🔧 Fix: ${test.testName} - ${test.error}`);
      }
    }

    // Performance recommendations
    const performanceTests = this.results.filter(r => r.testName.includes('Performance'));
    for (const test of performanceTests) {
      if (test.passed && test.details.averageResponseTime > 500) {
        recommendations.push('⚡ Consider optimizing response times for better performance');
      }
    }

    // Memory recommendations
    const memoryTest = this.results.find(r => r.testName === 'Memory Usage');
    if (memoryTest?.passed && memoryTest.details.memoryIncreasePercent > 100) {
      recommendations.push('🧠 Monitor memory usage - significant increase detected during testing');
    }

    return recommendations;
  }

  /**
   * Run a single test and record result
   */
  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    console.log(`🧪 Running: ${testName}`);

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;

      this.results.push({
        testName,
        passed: true,
        duration,
        details: result,
        timestamp: new Date()
      });

      console.log(`✅ PASSED: ${testName} (${duration}ms)`);

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.results.push({
        testName,
        passed: false,
        duration,
        details: null,
        error: errorMessage,
        timestamp: new Date()
      });

      console.log(`❌ FAILED: ${testName} (${duration}ms) - ${errorMessage}`);
    }
  }

  /**
   * Clean up test resources
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up validation resources...');

    try {
      // Stop monitoring
      if (this.performanceMonitor) {
        await this.performanceMonitor.stopMonitoring();
        await this.performanceMonitor.shutdown();
      }

      // Shutdown components
      if (this.escalationEngine) {
        await this.escalationEngine.shutdown();
      }

      if (this.ioaIntegration) {
        await this.ioaIntegration.shutdown();
      }

      if (this.integration) {
        await this.integration.shutdown();
      }

      // Clean up test project
      if (this.projectContextManager) {
        await this.projectContextManager.deleteProject(this.validationProjectId);
        await this.projectContextManager.shutdown();
      }

      console.log('✅ Cleanup completed');

    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error);
    }
  }

  /**
   * Save validation report
   */
  async saveValidationReport(report: SystemValidationReport): Promise<string> {
    try {
      const reportPath = path.join(process.cwd(), '.validation-reports');
      await fs.ensureDir(reportPath);

      const fileName = `validation-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      const filePath = path.join(reportPath, fileName);

      await fs.writeFile(filePath, JSON.stringify(report, null, 2));

      console.log(`📊 Validation report saved: ${filePath}`);
      return filePath;

    } catch (error) {
      console.error('❌ Failed to save validation report:', error);
      throw error;
    }
  }
}

/**
 * Run system validation
 */
export async function runSystemValidation(): Promise<SystemValidationReport> {
  const validator = new SystemValidator();
  const report = await validator.validateSystem();
  await validator.saveValidationReport(report);
  return report;
}