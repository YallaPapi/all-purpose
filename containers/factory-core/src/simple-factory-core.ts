/**
 * Simplified Factory Core - ZAD Mandate Compliance
 * 
 * This is a minimal factory-core implementation that proves the core workflow
 * without all the complex meta-agents that have compilation errors.
 * 
 * Following ZAD mandate: Focus on core functionality first
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { connect, StringCodec, JSONCodec } from 'nats';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3005;

const sc = StringCodec();
const jc = JSONCodec();

// Types
interface Agent {
  id: string;
  type: string;
  registeredAt: string;
  lastSeen: string;
}

interface Task {
  id: string;
  type: string;
  data: any;
  status: string;
  createdAt: string;
  result?: any;
  completedAt?: string;
  agentId?: string;
}

interface AgentRegistration {
  id: string;
  type: string;
  status: string;
  capabilities: string[];
}

interface TaskResult {
  taskId: string;
  status: string;
  output: any;
  agentId: string;
}

// Simple in-memory storage for agents and tasks
const agents = new Map<string, Agent>();
const tasks = new Map<string, Task>();

// Global NATS connection
declare global {
  var natsConnection: any;
}

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'factory-core-simple'
  });
});

// Get registered agents
app.get('/api/agents', (req, res) => {
  const agentList = Array.from(agents.values());
  res.json({
    success: true,
    data: agentList,
    count: agentList.length
  });
});

// Create a new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { agentType, taskData } = req.body;

    if (!agentType || !taskData) {
      return res.status(400).json({
        success: false,
        error: 'agentType and taskData are required'
      });
    }

    const task = {
      id: `task-${Date.now()}`,
      type: agentType,
      data: taskData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    tasks.set(task.id, task);

    // Send task to NATS if connected
    if (global.natsConnection) {
      await global.natsConnection.publish(`agent.${agentType}.task`, jc.encode(task));
      console.log(`📤 Task sent via NATS: ${task.id}`);
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get task status
app.get('/api/tasks/:taskId', (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }

  res.json({
    success: true,
    data: task
  });
});

// Factory status
app.get('/api/factory/status', (req, res) => {
  res.json({
    success: true,
    data: {
      agents: agents.size,
      tasks: tasks.size,
      uptime: process.uptime(),
      natsConnected: !!global.natsConnection
    }
  });
});

async function setupNATS() {
  try {
    console.log('🔌 Connecting to NATS...');
    const nc = await connect({ 
      servers: process.env.NATS_URL || 'nats://localhost:4222',
      timeout: 10000,
      reconnect: true,
      maxReconnectAttempts: 10
    });

    global.natsConnection = nc;
    console.log('✅ NATS connected');

    // Listen for agent registrations
    const agentRegSub = nc.subscribe('agent.register');
    (async () => {
      for await (const msg of agentRegSub) {
        try {
          const agentInfo = jc.decode(msg.data) as AgentRegistration;
          agents.set(agentInfo.id, {
            id: agentInfo.id,
            type: agentInfo.type,
            registeredAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
          });
          console.log(`✅ Agent registered: ${agentInfo.id} (${agentInfo.type})`);
        } catch (error) {
          console.error('Error processing agent registration:', error);
        }
      }
    })();

    // Listen for task results
    const taskResultSub = nc.subscribe('task.result');
    (async () => {
      for await (const msg of taskResultSub) {
        try {
          const result = jc.decode(msg.data) as TaskResult;
          const task = tasks.get(result.taskId);
          if (task) {
            task.status = result.status;
            task.result = result.output;
            task.completedAt = new Date().toISOString();
            task.agentId = result.agentId;
            console.log(`📋 Task completed: ${result.taskId}`);
          }
        } catch (error) {
          console.error('Error processing task result:', error);
        }
      }
    })();

  } catch (error) {
    console.error('❌ NATS connection failed:', error instanceof Error ? error.message : error);
    console.log('⚠️ Running without NATS connectivity');
  }
}

async function startServer() {
  console.log('🏭 Starting Simple Factory Core...');
  
  // Setup NATS connection
  await setupNATS();
  
  // Start HTTP server
  server.listen(port, () => {
    console.log(`🏭 Simple Factory Core running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🔧 API endpoints:`);
    console.log(`   GET  /api/agents - List registered agents`);
    console.log(`   POST /api/tasks - Create new task`);
    console.log(`   GET  /api/tasks/:id - Get task status`);
    console.log(`   GET  /api/factory/status - Factory status`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  server.close();
  if (global.natsConnection) {
    await global.natsConnection.drain();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  server.close();
  if (global.natsConnection) {
    await global.natsConnection.drain();
  }
  process.exit(0);
});

startServer().catch(console.error);