/**
 * Test Agent Simulator for E2E Testing
 * 
 * Simulates real agents for testing the agent discovery and coordination system
 * Based on TaskMaster research insights and ioredis documentation
 */

const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class TestAgentSimulator {
  constructor(config = {}) {
    this.agentId = config.agentId || `test-agent-${uuidv4()}`;
    this.agentName = config.agentName || 'Test Agent Simulator';
    this.agentType = config.agentType || 'test-simulator';
    this.capabilities = config.capabilities || ['test', 'simulation'];
    this.version = config.version || '1.0.0';
    this.healthState = config.initialHealthState || 'healthy';
    this.responseDelay = config.responseDelay || 0;
    this.failureRate = config.failureRate || 0;
    
    // Redis connections - separate for pub/sub as per ioredis best practices
    this.redisUrl = config.redisUrl || process.env.KV_REST_API_URL || 'redis://localhost:6379';
    this.redisPub = null;
    this.redisSub = null;
    this.redisClient = null;
    
    // State tracking
    this.isRegistered = false;
    this.isRunning = false;
    this.lastHealthCheck = null;
    this.tasksCompleted = 0;
    this.tasksReceived = 0;
    
    // Event handlers
    this.eventHandlers = new Map();
  }

  /**
   * Initialize Redis connections
   */
  async connect() {
    try {
      // Main client for regular operations
      this.redisClient = new Redis(this.redisUrl);
      
      // Separate clients for pub/sub
      this.redisPub = new Redis(this.redisUrl);
      this.redisSub = new Redis(this.redisUrl);
      
      // Subscribe to discovery and command channels
      await this.redisSub.subscribe(
        'agent:discovery',
        `agent:${this.agentId}:commands`,
        'agent:broadcast'
      );
      
      // Set up message handler
      this.redisSub.on('message', this.handleMessage.bind(this));
      
      console.log(`[${this.agentId}] Connected to Redis`);
      return true;
    } catch (error) {
      console.error(`[${this.agentId}] Failed to connect to Redis:`, error);
      throw error;
    }
  }

  /**
   * Register agent with the service registry
   */
  async register() {
    try {
      const registrationData = {
        agentId: this.agentId,
        agentName: this.agentName,
        agentType: this.agentType,
        capabilities: this.capabilities,
        version: this.version,
        status: this.healthState,
        endpoint: `test://localhost/${this.agentId}`,
        registeredAt: new Date().toISOString(),
        lastHealthCheck: new Date().toISOString(),
        metadata: {
          isTestAgent: true,
          tasksCompleted: this.tasksCompleted,
          uptime: 0
        }
      };
      
      // Register in Redis using hash
      await this.redisClient.hset(
        `agent:${this.agentId}`,
        'data',
        JSON.stringify(registrationData)
      );
      
      // Add to agent list
      await this.redisClient.sadd('agents:active', this.agentId);
      
      // Publish registration event
      await this.redisPub.publish('agent:events', JSON.stringify({
        eventType: 'agent_registered',
        agentId: this.agentId,
        timestamp: new Date().toISOString(),
        data: registrationData
      }));
      
      this.isRegistered = true;
      this.isRunning = true;
      console.log(`[${this.agentId}] Registered successfully`);
      
      // Start health check loop
      this.startHealthChecks();
      
      return registrationData;
    } catch (error) {
      console.error(`[${this.agentId}] Failed to register:`, error);
      throw error;
    }
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(channel, message) {
    try {
      console.log(`[${this.agentId}] Received message on ${channel}:`, message);
      
      // Simulate response delay if configured
      if (this.responseDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.responseDelay));
      }
      
      // Simulate random failures if configured
      if (Math.random() < this.failureRate) {
        console.log(`[${this.agentId}] Simulating failure`);
        return;
      }
      
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'agent:discovery':
          await this.handleDiscoveryQuery(data);
          break;
          
        case `agent:${this.agentId}:commands`:
          await this.handleCommand(data);
          break;
          
        case 'agent:broadcast':
          await this.handleBroadcast(data);
          break;
      }
    } catch (error) {
      console.error(`[${this.agentId}] Error handling message:`, error);
    }
  }

  /**
   * Handle discovery queries
   */
  async handleDiscoveryQuery(query) {
    if (!this.isRegistered || this.healthState === 'offline') {
      return;
    }
    
    // Check if this agent matches the query
    if (query.capabilities && query.capabilities.length > 0) {
      const hasCapabilities = query.capabilities.every(cap => 
        this.capabilities.includes(cap)
      );
      if (!hasCapabilities) {
        return;
      }
    }
    
    if (query.agentType && query.agentType !== this.agentType) {
      return;
    }
    
    // Respond to discovery query
    const response = {
      queryId: query.queryId,
      agentId: this.agentId,
      agentName: this.agentName,
      agentType: this.agentType,
      capabilities: this.capabilities,
      status: this.healthState,
      endpoint: `test://localhost/${this.agentId}`,
      lastHealthCheck: this.lastHealthCheck,
      metadata: {
        tasksCompleted: this.tasksCompleted,
        responseTime: Date.now() - new Date(query.timestamp).getTime()
      }
    };
    
    await this.redisPub.publish(`discovery:response:${query.queryId}`, JSON.stringify(response));
    console.log(`[${this.agentId}] Responded to discovery query ${query.queryId}`);
  }

  /**
   * Handle direct commands
   */
  async handleCommand(command) {
    this.tasksReceived++;
    
    switch (command.type) {
      case 'execute_task':
        await this.executeTask(command.task);
        break;
        
      case 'health_check':
        await this.reportHealth();
        break;
        
      case 'shutdown':
        await this.shutdown();
        break;
        
      case 'simulate_failure':
        await this.simulateFailure(command.failureType);
        break;
        
      case 'set_health_state':
        this.healthState = command.state;
        await this.updateHealthState();
        break;
        
      default:
        console.log(`[${this.agentId}] Unknown command type: ${command.type}`);
    }
  }

  /**
   * Execute a simulated task
   */
  async executeTask(task) {
    console.log(`[${this.agentId}] Executing task:`, task.taskId);
    
    // Simulate task execution
    const executionTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    // Simulate occasional task failures
    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
      this.tasksCompleted++;
      
      await this.redisPub.publish('task:events', JSON.stringify({
        eventType: 'task_completed',
        agentId: this.agentId,
        taskId: task.taskId,
        executionTime,
        result: {
          status: 'success',
          output: `Task ${task.taskId} completed by ${this.agentId}`
        },
        timestamp: new Date().toISOString()
      }));
    } else {
      await this.redisPub.publish('task:events', JSON.stringify({
        eventType: 'task_failed',
        agentId: this.agentId,
        taskId: task.taskId,
        executionTime,
        error: 'Simulated task failure',
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      if (this.isRunning && this.healthState !== 'offline') {
        await this.reportHealth();
      }
    }, 5000); // Report health every 5 seconds
  }

  /**
   * Report health status
   */
  async reportHealth() {
    this.lastHealthCheck = new Date().toISOString();
    
    const healthReport = {
      agentId: this.agentId,
      status: this.healthState,
      timestamp: this.lastHealthCheck,
      metrics: {
        tasksReceived: this.tasksReceived,
        tasksCompleted: this.tasksCompleted,
        successRate: this.tasksReceived > 0 ? this.tasksCompleted / this.tasksReceived : 1,
        uptime: Date.now() - new Date(this.registeredAt).getTime(),
        memoryUsage: process.memoryUsage().heapUsed
      }
    };
    
    await this.redisClient.hset(
      `agent:${this.agentId}`,
      'health',
      JSON.stringify(healthReport)
    );
    
    await this.redisPub.publish('health:reports', JSON.stringify(healthReport));
  }

  /**
   * Update health state
   */
  async updateHealthState() {
    await this.redisClient.hset(
      `agent:${this.agentId}`,
      'status',
      this.healthState
    );
    
    await this.redisPub.publish('agent:events', JSON.stringify({
      eventType: 'health_state_changed',
      agentId: this.agentId,
      previousState: this.previousHealthState,
      newState: this.healthState,
      timestamp: new Date().toISOString()
    }));
    
    console.log(`[${this.agentId}] Health state changed to: ${this.healthState}`);
  }

  /**
   * Simulate various failure scenarios
   */
  async simulateFailure(failureType) {
    console.log(`[${this.agentId}] Simulating failure: ${failureType}`);
    
    switch (failureType) {
      case 'crash':
        // Simulate sudden crash - stop responding without cleanup
        this.isRunning = false;
        clearInterval(this.healthCheckInterval);
        await this.redisClient.srem('agents:active', this.agentId);
        break;
        
      case 'slow_response':
        // Increase response delay
        this.responseDelay = 5000;
        break;
        
      case 'degraded':
        // Change health state to degraded
        this.healthState = 'degraded';
        await this.updateHealthState();
        break;
        
      case 'network_partition':
        // Simulate network issues by disconnecting
        await this.disconnect();
        break;
        
      case 'memory_leak':
        // Simulate memory leak by allocating large arrays
        this.memoryLeak = [];
        setInterval(() => {
          this.memoryLeak.push(new Array(1000000).fill('leak'));
        }, 1000);
        break;
        
      default:
        console.log(`[${this.agentId}] Unknown failure type: ${failureType}`);
    }
  }

  /**
   * Handle broadcast messages
   */
  async handleBroadcast(message) {
    console.log(`[${this.agentId}] Received broadcast:`, message);
    
    // Handle system-wide commands
    if (message.type === 'system_shutdown') {
      await this.shutdown();
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log(`[${this.agentId}] Shutting down...`);
    
    this.isRunning = false;
    
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Update status
    this.healthState = 'offline';
    await this.updateHealthState();
    
    // Remove from active agents
    await this.redisClient.srem('agents:active', this.agentId);
    
    // Publish shutdown event
    await this.redisPub.publish('agent:events', JSON.stringify({
      eventType: 'agent_shutdown',
      agentId: this.agentId,
      timestamp: new Date().toISOString()
    }));
    
    // Close connections
    await this.disconnect();
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.redisSub) {
      await this.redisSub.unsubscribe();
      this.redisSub.disconnect();
    }
    
    if (this.redisPub) {
      this.redisPub.disconnect();
    }
    
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
    
    console.log(`[${this.agentId}] Disconnected`);
  }

  /**
   * Set custom event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Emit custom event
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => handler(data));
    }
  }
}

// Export for use in tests
module.exports = TestAgentSimulator;

// CLI usage for manual testing
if (require.main === module) {
  const simulator = new TestAgentSimulator({
    agentName: 'CLI Test Agent',
    capabilities: ['test', 'cli', 'simulation'],
    agentType: 'test-cli'
  });
  
  simulator.connect()
    .then(() => simulator.register())
    .then(() => {
      console.log('Test agent simulator running. Press Ctrl+C to stop.');
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        await simulator.shutdown();
        process.exit(0);
      });
    })
    .catch(error => {
      console.error('Failed to start test agent simulator:', error);
      process.exit(1);
    });
}