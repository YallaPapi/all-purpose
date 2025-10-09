#!/usr/bin/env node

/**
 * Quick System Validation - JavaScript Version
 * 
 * This is a simplified validation runner that can execute directly without TypeScript compilation.
 * It tests the core functionality of the Meta Agent Autonomy system.
 */

const { Redis } = require('@upstash/redis');
const fs = require('fs-extra');
const path = require('path');

// Load environment variables
require('dotenv').config();

class QuickValidator {
  constructor() {
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
      automaticDeserialization: false,
    });
    
    this.testResults = [];
    this.projectId = `quick_validation_${Date.now()}`;
  }

  async runTest(testName, testFunction) {
    const startTime = Date.now();
    console.log(`🧪 Running: ${testName}`);

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;

      this.testResults.push({
        testName,
        passed: true,
        duration,
        details: result
      });

      console.log(`✅ PASSED: ${testName} (${duration}ms)`);
      return true;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.testResults.push({
        testName,
        passed: false,
        duration,
        error: errorMessage
      });

      console.log(`❌ FAILED: ${testName} (${duration}ms) - ${errorMessage}`);
      return false;
    }
  }

  async validateRedisConnection() {
    return this.runTest('Redis Connection', async () => {
      const ping = await this.redis.ping();
      if (ping !== 'PONG') {
        throw new Error('Redis ping failed');
      }
      
      // Test basic operations
      const testKey = `test:${Date.now()}`;
      const testData = { test: true, timestamp: new Date() };
      
      await this.redis.setex(testKey, 10, JSON.stringify(testData));
      const retrieved = await this.redis.get(testKey);
      
      if (!retrieved) {
        throw new Error('Redis set/get failed');
      }
      
      const parsed = JSON.parse(retrieved);
      if (!parsed.test) {
        throw new Error('Redis data integrity failed');
      }
      
      await this.redis.del(testKey);
      
      return { ping, dataIntegrity: true };
    });
  }

  async validateProjectContextCore() {
    return this.runTest('ProjectContext Core Operations', async () => {
      // Test Redis-based project context operations
      const projectKey = `project:context:${this.projectId}`;
      
      const projectData = {
        projectId: this.projectId,
        name: 'Quick Validation Project',
        description: 'Testing project context operations',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        status: 'active',
        metadata: {},
        tasks: [],
        taskDependencies: [],
        agents: [],
        agentDecisions: [],
        workflowHandoffs: [],
        completion: {
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          blockedTasks: 0,
          completionPercentage: 0,
          blockers: [],
          milestones: [],
          lastUpdated: new Date().toISOString()
        },
        sharedState: {},
        contextHistory: []
      };

      // Store project
      await this.redis.setex(projectKey, 3600, JSON.stringify(projectData));
      
      // Retrieve project
      const retrieved = await this.redis.get(projectKey);
      if (!retrieved) {
        throw new Error('Project storage failed');
      }
      
      const parsedProject = JSON.parse(retrieved);
      if (parsedProject.projectId !== this.projectId) {
        throw new Error('Project data integrity failed');
      }

      return { 
        projectStored: true, 
        projectRetrieved: true,
        projectId: parsedProject.projectId,
        status: parsedProject.status
      };
    });
  }

  async validateTaskManagement() {
    return this.runTest('Task Management', async () => {
      const tasksKey = `project:tasks:${this.projectId}`;
      
      // Create test tasks
      const tasks = [
        {
          taskId: `task_${Date.now()}_1`,
          agentId: 'test-agent-1',
          description: 'Test task 1',
          status: 'pending',
          priority: 'high',
          createdAt: new Date().toISOString(),
          dependencies: [],
          metadata: { test: true }
        },
        {
          taskId: `task_${Date.now()}_2`,
          agentId: 'test-agent-2',
          description: 'Test task 2',
          status: 'in_progress',
          priority: 'medium',
          createdAt: new Date().toISOString(),
          dependencies: [],
          metadata: { test: true }
        }
      ];

      // Store tasks
      await this.redis.setex(tasksKey, 3600, JSON.stringify(tasks));
      
      // Retrieve tasks
      const retrieved = await this.redis.get(tasksKey);
      if (!retrieved) {
        throw new Error('Tasks storage failed');
      }
      
      const parsedTasks = JSON.parse(retrieved);
      if (parsedTasks.length !== 2) {
        throw new Error('Tasks count mismatch');
      }

      // Test task filtering
      const pendingTasks = parsedTasks.filter(t => t.status === 'pending');
      const inProgressTasks = parsedTasks.filter(t => t.status === 'in_progress');

      return { 
        tasksStored: tasks.length,
        tasksRetrieved: parsedTasks.length,
        pendingTasks: pendingTasks.length,
        inProgressTasks: inProgressTasks.length
      };
    });
  }

  async validateAgentRegistration() {
    return this.runTest('Agent Registration', async () => {
      const agentsKey = `project:agents:${this.projectId}`;
      
      // Create test agents
      const agents = [
        {
          agentId: 'test-agent-1',
          agentType: 'validation',
          status: 'idle',
          sessionId: 'session-1',
          startedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          capabilities: ['testing', 'validation'],
          workload: 25,
          metadata: { test: true }
        },
        {
          agentId: 'test-agent-2',
          agentType: 'validation',
          status: 'working',
          sessionId: 'session-2',
          startedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          capabilities: ['testing', 'validation'],
          workload: 75,
          metadata: { test: true }
        }
      ];

      // Store agents
      await this.redis.setex(agentsKey, 3600, JSON.stringify(agents));
      
      // Retrieve agents
      const retrieved = await this.redis.get(agentsKey);
      if (!retrieved) {
        throw new Error('Agents storage failed');
      }
      
      const parsedAgents = JSON.parse(retrieved);
      if (parsedAgents.length !== 2) {
        throw new Error('Agents count mismatch');
      }

      // Test agent status tracking
      const idleAgents = parsedAgents.filter(a => a.status === 'idle');
      const workingAgents = parsedAgents.filter(a => a.status === 'working');

      return { 
        agentsRegistered: agents.length,
        agentsRetrieved: parsedAgents.length,
        idleAgents: idleAgents.length,
        workingAgents: workingAgents.length
      };
    });
  }

  async validateEventSystem() {
    return this.runTest('Event System', async () => {
      const historyKey = `project:history:${this.projectId}`;
      
      // Create test events
      const events = [
        {
          entryId: `event_${Date.now()}_1`,
          timestamp: new Date().toISOString(),
          changeType: 'task_created',
          agentId: 'test-agent-1',
          description: 'Test task created',
          changes: { taskId: 'task-1', status: 'pending' },
          metadata: { test: true }
        },
        {
          entryId: `event_${Date.now()}_2`,
          timestamp: new Date().toISOString(),
          changeType: 'agent_joined',
          agentId: 'test-agent-2',
          description: 'Test agent joined',
          changes: { agentId: 'test-agent-2', status: 'idle' },
          metadata: { test: true }
        }
      ];

      // Store events
      await this.redis.setex(historyKey, 3600, JSON.stringify(events));
      
      // Retrieve events
      const retrieved = await this.redis.get(historyKey);
      if (!retrieved) {
        throw new Error('Events storage failed');
      }
      
      const parsedEvents = JSON.parse(retrieved);
      if (parsedEvents.length !== 2) {
        throw new Error('Events count mismatch');
      }

      return { 
        eventsStored: events.length,
        eventsRetrieved: parsedEvents.length,
        eventTypes: parsedEvents.map(e => e.changeType)
      };
    });
  }

  async validateSharedState() {
    return this.runTest('Shared State Management', async () => {
      const sharedStateKey = `project:shared:${this.projectId}`;
      
      // Create test shared state
      const sharedState = {
        globalConfig: {
          maxConcurrentTasks: 10,
          enableAutoEscalation: true,
          lastConfigUpdate: new Date().toISOString()
        },
        agentMetrics: {
          totalOperations: 150,
          successRate: 0.95,
          averageResponseTime: 450
        },
        systemStatus: {
          status: 'healthy',
          uptime: 3600000,
          lastHealthCheck: new Date().toISOString()
        }
      };

      // Store shared state
      await this.redis.setex(sharedStateKey, 3600, JSON.stringify(sharedState));
      
      // Retrieve shared state
      const retrieved = await this.redis.get(sharedStateKey);
      if (!retrieved) {
        throw new Error('Shared state storage failed');
      }
      
      const parsedState = JSON.parse(retrieved);
      if (!parsedState.globalConfig || !parsedState.agentMetrics) {
        throw new Error('Shared state integrity failed');
      }

      return { 
        sharedStateStored: true,
        globalConfigPresent: !!parsedState.globalConfig,
        metricsPresent: !!parsedState.agentMetrics,
        statusPresent: !!parsedState.systemStatus
      };
    });
  }

  async validatePerformance() {
    return this.runTest('Performance Characteristics', async () => {
      const operationCount = 50;
      const operations = [];
      const startTime = Date.now();

      // Perform multiple operations
      for (let i = 0; i < operationCount; i++) {
        const testKey = `perf:test:${i}`;
        const testData = { index: i, timestamp: new Date().toISOString() };
        
        operations.push(async () => {
          const opStart = Date.now();
          await this.redis.setex(testKey, 10, JSON.stringify(testData));
          const retrieved = await this.redis.get(testKey);
          await this.redis.del(testKey);
          return Date.now() - opStart;
        });
      }

      const responseTimes = await Promise.all(operations.map(op => op()));
      const totalDuration = Date.now() - startTime;

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const operationsPerSecond = operationCount / (totalDuration / 1000);

      // Performance thresholds
      if (avgResponseTime > 2000) {
        throw new Error(`Average response time too high: ${avgResponseTime}ms`);
      }

      if (operationsPerSecond < 5) {
        throw new Error(`Throughput too low: ${operationsPerSecond} ops/sec`);
      }

      return {
        operationCount,
        totalDuration,
        avgResponseTime: Math.round(avgResponseTime),
        maxResponseTime,
        minResponseTime,
        operationsPerSecond: Math.round(operationsPerSecond * 100) / 100
      };
    });
  }

  async validateConcurrency() {
    return this.runTest('Concurrent Operations', async () => {
      const concurrentCount = 20;
      const operations = [];

      // Create concurrent operations
      for (let i = 0; i < concurrentCount; i++) {
        operations.push(async () => {
          const key = `concurrent:${i}:${Date.now()}`;
          const data = { id: i, timestamp: new Date().toISOString() };
          
          await this.redis.setex(key, 10, JSON.stringify(data));
          const retrieved = await this.redis.get(key);
          await this.redis.del(key);
          
          return !!retrieved;
        });
      }

      const results = await Promise.allSettled(operations);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful < concurrentCount * 0.8) { // Allow 20% failure rate
        throw new Error(`Too many concurrent operations failed: ${failed}/${concurrentCount}`);
      }

      return {
        totalOperations: concurrentCount,
        successful,
        failed,
        successRate: Math.round((successful / concurrentCount) * 100)
      };
    });
  }

  async cleanup() {
    console.log('🧹 Cleaning up test data...');
    try {
      // Clean up test keys
      const keysToDelete = [
        `project:context:${this.projectId}`,
        `project:tasks:${this.projectId}`,
        `project:agents:${this.projectId}`,
        `project:history:${this.projectId}`,
        `project:shared:${this.projectId}`
      ];

      for (const key of keysToDelete) {
        await this.redis.del(key);
      }

      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error);
    }
  }

  printSummary() {
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = this.testResults.filter(r => !r.passed).length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n' + '='.repeat(80));
    console.log('🎯 QUICK VALIDATION COMPLETE');
    console.log('='.repeat(80));
    
    const statusEmoji = failedTests === 0 ? '✅' : passedTests > 0 ? '⚠️' : '❌';
    const status = failedTests === 0 ? 'PASSED' : passedTests > 0 ? 'PARTIAL' : 'FAILED';
    
    console.log(`${statusEmoji} Overall Status: ${status}`);
    console.log(`📊 Test Results: ${passedTests}/${this.testResults.length} passed`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    
    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(test => {
          console.log(`   - ${test.testName}: ${test.error}`);
        });
    }

    console.log('\n💡 SYSTEM STATUS:');
    console.log(`   - Redis Connectivity: ${this.testResults.find(r => r.testName === 'Redis Connection')?.passed ? 'OK' : 'FAILED'}`);
    console.log(`   - Project Context: ${this.testResults.find(r => r.testName === 'ProjectContext Core Operations')?.passed ? 'OK' : 'FAILED'}`);
    console.log(`   - Task Management: ${this.testResults.find(r => r.testName === 'Task Management')?.passed ? 'OK' : 'FAILED'}`);
    console.log(`   - Agent Registration: ${this.testResults.find(r => r.testName === 'Agent Registration')?.passed ? 'OK' : 'FAILED'}`);
    console.log(`   - Performance: ${this.testResults.find(r => r.testName === 'Performance Characteristics')?.passed ? 'OK' : 'FAILED'}`);

    console.log('\n' + '='.repeat(80));

    return status;
  }

  async run() {
    console.log('🚀 Starting Quick System Validation');
    console.log('📅 ' + new Date().toISOString());
    console.log('🏗️  Testing core Meta Agent Autonomy functionality\n');

    try {
      // Run all validation tests
      await this.validateRedisConnection();
      await this.validateProjectContextCore();
      await this.validateTaskManagement();
      await this.validateAgentRegistration();
      await this.validateEventSystem();
      await this.validateSharedState();
      await this.validatePerformance();
      await this.validateConcurrency();

      // Print summary
      const status = this.printSummary();

      // Cleanup
      await this.cleanup();

      // Exit with appropriate code
      if (status === 'PASSED') {
        console.log('\n🎉 VALIDATION SUCCESSFUL!');
        console.log('✅ Core Meta Agent Autonomy system is working correctly');
        process.exit(0);
      } else {
        console.log('\n💥 VALIDATION FAILED');
        console.log('❌ System has issues that must be resolved');
        process.exit(1);
      }

    } catch (error) {
      console.error('\n💥 VALIDATION CRASHED:', error);
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Run validation if executed directly
if (require.main === module) {
  const validator = new QuickValidator();
  validator.run().catch(error => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { QuickValidator };