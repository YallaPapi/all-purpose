#!/usr/bin/env node

/**
 * Test Parallel Task Execution with Queue Groups
 * 
 * Uses NATS queue groups to ensure each task is processed by only one agent
 */

import { connect } from 'nats';

async function testParallelExecution() {
  console.log('🧪 Testing Parallel Task Execution with Queue Groups\n');

  const nc = await connect({
    servers: 'nats://localhost:4222',
    user: 'factory',
    pass: 'factory-secret'
  });

  try {
    // Track task timing
    const taskTimings = new Map();
    const taskCompletions = new Map();

    // Subscribe to task events
    const startSub = nc.subscribe('task.started');
    (async () => {
      for await (const msg of startSub) {
        const data = JSON.parse(msg.string());
        if (!taskTimings.has(data.taskId)) {
          taskTimings.set(data.taskId, { start: Date.now(), agentId: data.agentId });
          console.log(`🔄 Task ${data.taskId} started by ${data.agentId}`);
        }
      }
    })();

    const completeSub = nc.subscribe('task.completed');
    (async () => {
      for await (const msg of completeSub) {
        const data = JSON.parse(msg.string());
        if (!taskCompletions.has(data.taskId)) {
          const timing = taskTimings.get(data.taskId);
          if (timing) {
            timing.end = Date.now();
            timing.duration = timing.end - timing.start;
            taskCompletions.set(data.taskId, true);
            console.log(`✅ Task ${data.taskId} completed by ${data.agentId} in ${timing.duration}ms`);
          }
        }
      }
    })();

    // Create mock agents with queue group
    const agents = [];
    for (let i = 1; i <= 3; i++) {
      agents.push(createMockAgent(`agent-${i}`, nc));
    }

    // Wait for agents to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create parallel tasks
    console.log('\n📋 Creating 6 independent tasks...\n');
    const tasks = [];
    const startTime = Date.now();

    for (let i = 1; i <= 6; i++) {
      const taskId = `parallel-task-${i}`;
      tasks.push(taskId);
      
      // Publish task to queue group
      await nc.publish('agent.type.worker.task', JSON.stringify({
        id: taskId,
        type: 'process-data',
        payload: { data: `Task ${i} data`, processingTime: 2000 } // 2 seconds each
      }));
      
      // Small delay to ensure distribution
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Wait for all tasks to complete
    console.log('⏳ Waiting for parallel execution...\n');
    
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const completed = Array.from(taskCompletions.keys()).length;
        if (completed === tasks.length) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Calculate results
    const totalTime = Date.now() - startTime;
    console.log('\n📊 Parallel Execution Results:');
    console.log(`   Total tasks: ${tasks.length}`);
    console.log(`   Agents used: ${agents.length}`);
    console.log(`   Total execution time: ${totalTime}ms`);
    console.log(`   Sequential time would be: ${tasks.length * 2000}ms`);
    console.log(`   Speedup: ${((tasks.length * 2000) / totalTime).toFixed(2)}x`);
    
    // Show task distribution
    console.log('\n📈 Task Distribution:');
    const agentWork = new Map();
    for (const [taskId, timing] of taskTimings) {
      const agent = timing.agentId;
      if (!agentWork.has(agent)) {
        agentWork.set(agent, []);
      }
      agentWork.get(agent).push({ taskId, duration: timing.duration });
    }
    
    for (const [agent, work] of agentWork) {
      console.log(`   ${agent}: ${work.length} tasks (${work.map(w => w.taskId).join(', ')})`);
    }
    
    console.log('\n✅ Parallel execution test completed successfully!');
    
    // Cleanup
    await nc.drain();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await nc.drain();
    process.exit(1);
  }
}

function createMockAgent(agentId, nc) {
  console.log(`🤖 Starting ${agentId}...`);
  
  // Subscribe with queue group "workers" to ensure load balancing
  const sub = nc.subscribe('agent.type.worker.task', { queue: 'workers' });
  
  (async () => {
    for await (const msg of sub) {
      const task = JSON.parse(msg.string());
      
      // Notify task started
      await nc.publish('task.started', JSON.stringify({
        taskId: task.id,
        agentId: agentId,
        timestamp: new Date()
      }));
      
      // Simulate processing
      const processingTime = task.payload.processingTime || 1000;
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Notify completion
      await nc.publish('task.completed', JSON.stringify({
        taskId: task.id,
        agentId: agentId,
        success: true,
        result: { processed: true },
        timestamp: new Date()
      }));
    }
  })();

  // Register agent
  nc.publish('agent.register', JSON.stringify({
    id: agentId,
    type: 'worker',
    status: 'idle',
    capabilities: ['data-processing'],
    timestamp: new Date()
  }));

  return agentId;
}

// Run test
testParallelExecution().catch(console.error);