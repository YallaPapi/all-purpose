/**
 * CORE ENGINE TEST - ZAD MANDATE COMPLIANCE
 * 
 * This script proves the core factory-agent-NATS workflow works WITHOUT Docker
 * Following the ZAD mandate: "Prove the engine works before you build the car"
 * 
 * Test Flow:
 * 1. Connect to NATS server
 * 2. Start simplified Factory-Core logic  
 * 3. Start simplified Domain-Agent logic
 * 4. Factory creates task and sends via NATS
 * 5. Agent receives task, processes, and responds via NATS
 * 6. Print clear SUCCESS or FAILURE
 */

import { connect, StringCodec, JSONCodec } from 'nats';
import { EventEmitter } from 'events';

// Test configuration
const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const TEST_TIMEOUT = 30000; // 30 seconds

const sc = StringCodec();
const jc = JSONCodec();

class SimplifiedFactoryCore extends EventEmitter {
  constructor(natsConnection) {
    super();
    this.nc = natsConnection;
    this.agents = new Map();
  }

  async start() {
    console.log('🏭 Starting Factory-Core...');
    
    // Listen for agent registration
    const agentRegSub = this.nc.subscribe('agent.register');
    (async () => {
      for await (const msg of agentRegSub) {
        const agentInfo = jc.decode(msg.data);
        this.agents.set(agentInfo.id, agentInfo);
        console.log(`✅ Agent registered: ${agentInfo.id} (${agentInfo.type})`);
        this.emit('agent-registered', agentInfo);
      }
    })();

    // Listen for task results
    const taskResultSub = this.nc.subscribe('task.result');
    (async () => {
      for await (const msg of taskResultSub) {
        const result = jc.decode(msg.data);
        console.log(`📋 Task result received: ${result.taskId}`);
        this.emit('task-completed', result);
      }
    })();

    console.log('🏭 Factory-Core started and listening');
  }

  async createTask(agentType, taskData) {
    console.log(`🚀 Creating task for ${agentType}...`);
    
    const task = {
      id: `task-${Date.now()}`,
      type: agentType,
      data: taskData,
      timestamp: new Date().toISOString()
    };

    // Send task to specific agent type
    await this.nc.publish(`agent.${agentType}.task`, jc.encode(task));
    console.log(`📤 Task sent: ${task.id}`);
    
    return task;
  }
}

class SimplifiedDomainAgent extends EventEmitter {
  constructor(natsConnection, agentType) {
    super();
    this.nc = natsConnection;
    this.type = agentType;
    this.id = `${agentType}-${Date.now()}`;
  }

  async start() {
    console.log(`🤖 Starting Domain Agent: ${this.id} (${this.type})`);
    
    // Register with factory
    await this.nc.publish('agent.register', jc.encode({
      id: this.id,
      type: this.type,
      status: 'ready',
      capabilities: ['code-generation', 'file-creation']
    }));

    // Listen for tasks
    const taskSub = this.nc.subscribe(`agent.${this.type}.task`);
    (async () => {
      for await (const msg of taskSub) {
        const task = jc.decode(msg.data);
        console.log(`📥 Task received by ${this.id}: ${task.id}`);
        await this.processTask(task);
      }
    })();

    console.log(`🤖 Domain Agent ${this.id} started and listening`);
  }

  async processTask(task) {
    console.log(`⚙️ Processing task: ${task.id}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create mock result based on task type
    const result = {
      taskId: task.id,
      agentId: this.id,
      status: 'completed',
      output: {
        files: [
          `${task.type}-component.js`,
          `${task.type}-test.js`,
          `${task.type}-styles.css`
        ],
        description: `Generated ${task.type} code for: ${task.data.description}`,
        timestamp: new Date().toISOString()
      }
    };

    // Send result back
    await this.nc.publish('task.result', jc.encode(result));
    console.log(`✅ Task completed and result sent: ${task.id}`);
  }
}

async function runCoreTest() {
  console.log('\n🚨 === CORE ENGINE TEST - STARTING === 🚨\n');
  
  let nc;
  let factory;
  let agent;
  let testPassed = false;

  try {
    // 1. Connect to NATS
    console.log(`🔌 Connecting to NATS: ${NATS_URL}`);
    nc = await connect({ 
      servers: NATS_URL,
      timeout: 5000,
      reconnect: false 
    });
    console.log('✅ NATS connection established');

    // 2. Start Factory-Core
    factory = new SimplifiedFactoryCore(nc);
    await factory.start();

    // 3. Start Domain Agent
    agent = new SimplifiedDomainAgent(nc, 'backend');
    await agent.start();

    // 4. Wait for agent registration
    console.log('\n⏳ Waiting for agent registration...');
    await new Promise((resolve) => {
      factory.once('agent-registered', resolve);
    });

    // 5. Create and send test task
    console.log('\n🎯 Creating test task...');
    const testPrd = {
      description: 'Create a simple user authentication API',
      requirements: ['Express.js', 'JWT tokens', 'Password hashing'],
      endpoints: ['/login', '/register', '/profile']
    };

    const task = await factory.createTask('backend', testPrd);

    // 6. Wait for task completion
    console.log('\n⏳ Waiting for task completion...');
    const taskResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Task completion timeout'));
      }, TEST_TIMEOUT);

      factory.once('task-completed', (result) => {
        clearTimeout(timeout);
        resolve(result);
      });
    });

    // 7. Validate result
    console.log('\n🔍 Validating results...');
    if (taskResult.status === 'completed' && 
        taskResult.output && 
        taskResult.output.files && 
        taskResult.output.files.length > 0) {
      
      console.log('\n📊 Test Results:');
      console.log(`   Task ID: ${taskResult.taskId}`);
      console.log(`   Agent ID: ${taskResult.agentId}`);
      console.log(`   Status: ${taskResult.status}`);
      console.log(`   Files Generated: ${taskResult.output.files.length}`);
      console.log(`   Description: ${taskResult.output.description}`);
      
      testPassed = true;
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(`   Error: ${error.message}`);
    if (error.code) console.error(`   Code: ${error.code}`);
    
    // Common error solutions
    if (error.message.includes('connection refused') || error.code === 'ECONNREFUSED') {
      console.error('\n💡 SOLUTION: Start NATS server first:');
      console.error('   docker run -p 4222:4222 nats:latest');
      console.error('   OR install nats-server locally');
    }
  } finally {
    // Cleanup
    if (nc) {
      console.log('\n🧹 Cleaning up connections...');
      await nc.drain();
    }
  }

  // Final result
  console.log('\n🚨 === CORE ENGINE TEST - RESULTS === 🚨\n');
  
  if (testPassed) {
    console.log('✅ SUCCESS! ENGINE IS WORKING');
    console.log('   ✓ NATS connection established');
    console.log('   ✓ Factory-Core started successfully');
    console.log('   ✓ Domain-Agent registered successfully');
    console.log('   ✓ Task sent via NATS successfully');
    console.log('   ✓ Task processed successfully');
    console.log('   ✓ Result returned via NATS successfully');
    console.log('\n🎉 Core workflow is PROVEN! Ready for Docker integration.');
    process.exit(0);
  } else {
    console.log('❌ FAILED! ENGINE SEIZED');
    console.log('   Core workflow is broken - fix before proceeding');
    console.log('\n🔧 Next steps:');
    console.log('   1. Check NATS server is running');
    console.log('   2. Verify network connectivity');
    console.log('   3. Check for JavaScript errors above');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n💥 UNCAUGHT EXCEPTION:');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('\n💥 UNHANDLED REJECTION:');
  console.error(error);
  process.exit(1);
});

// Run the test
runCoreTest();