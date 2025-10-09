/**
 * E2E Test Setup
 * 
 * Setup specifically for end-to-end tests
 */

const Redis = require('ioredis');
const { spawn } = require('child_process');
const path = require('path');

// E2E test configuration
global.e2eConfig = {
  services: {
    startTimeout: 30000,
    healthCheckInterval: 1000
  },
  agents: {
    defaultCount: 3,
    startupDelay: 2000
  }
};

// Track spawned processes for cleanup
global.e2eProcesses = [];

beforeAll(async () => {
  console.log('🚀 Starting E2E test environment...');
  
  // Start required services if not running
  if (process.env.E2E_START_SERVICES !== 'false') {
    await startRequiredServices();
  }
  
  // Wait for services to be healthy
  await waitForServicesHealth();
  
  console.log('✅ E2E test environment ready');
});

afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Terminate all spawned processes
  for (const proc of global.e2eProcesses) {
    try {
      process.kill(proc.pid, 'SIGTERM');
    } catch (error) {
      // Process may have already exited
    }
  }
  
  // Wait for processes to terminate
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ E2E cleanup completed');
});

async function startRequiredServices() {
  // Start Redis if not running
  if (!(await isRedisRunning())) {
    console.log('Starting Redis...');
    const redisProcess = spawn('redis-server', [], {
      detached: true,
      stdio: 'ignore'
    });
    global.e2eProcesses.push(redisProcess);
    
    // Wait for Redis to start
    await global.testUtils.waitFor(isRedisRunning, 10000);
  }
  
  // Start API server if not running
  if (!(await isApiServerRunning())) {
    console.log('Starting API server...');
    const apiProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../..'),
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    global.e2eProcesses.push(apiProcess);
    
    // Wait for API to start
    await global.testUtils.waitFor(isApiServerRunning, 20000);
  }
}

async function isRedisRunning() {
  try {
    const redis = new Redis({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
      retryStrategy: () => null
    });
    
    await redis.connect();
    await redis.ping();
    redis.disconnect();
    return true;
  } catch (error) {
    return false;
  }
}

async function isApiServerRunning() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function waitForServicesHealth() {
  const checks = [
    { name: 'Redis', check: isRedisRunning },
    { name: 'API Server', check: isApiServerRunning }
  ];
  
  for (const { name, check } of checks) {
    console.log(`Waiting for ${name}...`);
    
    try {
      await global.testUtils.waitFor(check, global.e2eConfig.services.startTimeout);
      console.log(`✓ ${name} is ready`);
    } catch (error) {
      throw new Error(`${name} failed to start within timeout`);
    }
  }
}

// E2E test helpers
global.e2eHelpers = {
  // Start test agents
  startTestAgents: async (count = global.e2eConfig.agents.defaultCount) => {
    const agents = [];
    
    for (let i = 0; i < count; i++) {
      const agentProcess = spawn('node', [
        path.resolve(__dirname, '../e2e/test-agent-simulator.js')
      ], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          AGENT_NAME: `E2E-Agent-${i}`,
          AGENT_TYPE: 'e2e-test'
        }
      });
      
      global.e2eProcesses.push(agentProcess);
      agents.push(agentProcess);
    }
    
    // Wait for agents to register
    await new Promise(resolve => setTimeout(resolve, global.e2eConfig.agents.startupDelay));
    
    return agents;
  },
  
  // Clean up all test data
  cleanupE2EData: async () => {
    const redis = new Redis();
    
    // Clear all test-related keys
    const patterns = [
      'test:*',
      'test-*',
      'e2e:*',
      'agent:test-*',
      'agent:e2e-*'
    ];
    
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
    
    redis.disconnect();
  },
  
  // Wait for system to stabilize
  waitForSystemStability: async (duration = 3000) => {
    await new Promise(resolve => setTimeout(resolve, duration));
  }
};

// Set longer timeout for E2E tests
jest.setTimeout(60000);