# 🌐 **Network Delay and Packet Loss Simulation with Node.js Integration**

## **Comprehensive Methods for Meta-Agent Factory Testing**

**Task**: 249.4 - Detail Methods for Simulating Network Delay and Packet Loss with Node.js Integration  
**Generated**: July 31, 2025  
**Research Source**: TaskMaster research + Node.js network simulation analysis  
**Focus**: 16-agent meta-agent factory with Redis coordination and WebSocket communication

---

## 🎯 **Overview: Network Simulation for Distributed Agent Systems**

Network delay and packet loss simulation is critical for validating the resilience of distributed systems like the meta-agent factory. This guide provides comprehensive methods for simulating real-world network conditions using Node.js integration patterns, specifically tailored for testing 16-agent coordination through Redis and WebSocket connections.

### **Key Simulation Targets**
- **Redis Coordination**: Test agent coordination under high latency and packet loss
- **WebSocket Communication**: Validate real-time communication resilience
- **HTTP API Calls**: Ensure service discovery and task assignment reliability
- **Inter-Agent Messaging**: Test UEP message passing system under degraded networks

---

## 🔧 **1. Toxiproxy Node.js Integration**

### **Installation and Setup**
```bash
# Install Toxiproxy server
npm install -g toxiproxy-server

# Install Node.js client
npm install toxiproxy-node-client

# Alternative: Use Testcontainers for containerized testing
npm install testcontainers
```

### **Basic Toxiproxy Configuration for Meta-Agent Factory**
```javascript
const toxiproxy = require('toxiproxy-node-client');

class MetaAgentNetworkSimulator {
  constructor() {
    this.proxies = new Map();
    this.activeExperiments = new Set();
  }

  async setupAgentCoordinationProxy() {
    // Create proxy for Redis coordination
    const redisProxy = await toxiproxy.createProxy({
      name: 'redis-coordination',
      listen: '127.0.0.1:6380',
      upstream: '127.0.0.1:6379'
    });

    // Create proxy for WebSocket observability dashboard  
    const wsProxy = await toxiproxy.createProxy({
      name: 'websocket-dashboard',
      listen: '127.0.0.1:3001',
      upstream: '127.0.0.1:3000'
    });

    // Create proxy for agent-to-agent communication
    const agentProxy = await toxiproxy.createProxy({
      name: 'agent-communication',
      listen: '127.0.0.1:8081',
      upstream: '127.0.0.1:8080'
    });

    this.proxies.set('redis', redisProxy);
    this.proxies.set('websocket', wsProxy);
    this.proxies.set('agents', agentProxy);

    return { redisProxy, wsProxy, agentProxy };
  }

  async simulateHighLatency(proxyName, latency = 500, jitter = 100) {
    const proxy = this.proxies.get(proxyName);
    if (!proxy) {
      throw new Error(`Proxy ${proxyName} not found`);
    }

    const toxic = await proxy.addToxic({
      name: `latency-${proxyName}`,
      type: 'latency',
      attributes: {
        latency: latency,      // Base delay in milliseconds
        jitter: jitter         // Random variation
      },
      toxicity: 1.0,          // 100% of requests affected
      stream: 'downstream'    // Affect downstream traffic
    });

    this.activeExperiments.add(`latency-${proxyName}`);
    console.log(`🐌 Added ${latency}ms ±${jitter}ms latency to ${proxyName}`);
    
    return toxic;
  }

  async simulatePacketLoss(proxyName, lossPercentage = 5) {
    const proxy = this.proxies.get(proxyName);
    
    // Use bandwidth toxic to simulate packet loss
    const toxic = await proxy.addToxic({
      name: `packet-loss-${proxyName}`,
      type: 'limit_data',
      attributes: {
        bytes: Math.floor(1000000 * (1 - lossPercentage / 100)) // Reduce throughput to simulate loss
      },
      toxicity: lossPercentage / 100,
      stream: 'downstream'
    });

    this.activeExperiments.add(`packet-loss-${proxyName}`);
    console.log(`📦 Added ${lossPercentage}% packet simulation to ${proxyName}`);
    
    return toxic;
  }

  async simulateNetworkFlapping(proxyName, duration = 30000) {
    const proxy = this.proxies.get(proxyName);
    
    console.log(`📡 Starting network flapping simulation for ${duration}ms`);
    
    const flappingInterval = setInterval(async () => {
      // Randomly add/remove network issues
      const action = Math.random() > 0.5 ? 'add' : 'remove';
      
      if (action === 'add') {
        await this.simulateHighLatency(proxyName, 200 + Math.random() * 800, 50);
        console.log(`📈 Added random latency spike to ${proxyName}`);
      } else {
        // Remove all toxics to simulate recovery
        await this.clearNetworkConditions(proxyName);
        console.log(`📉 Cleared network conditions for ${proxyName}`);
      }
    }, 5000); // Change conditions every 5 seconds

    setTimeout(() => {
      clearInterval(flappingInterval);
      console.log(`✅ Network flapping simulation completed for ${proxyName}`);
    }, duration);
  }

  async clearNetworkConditions(proxyName) {
    const proxy = this.proxies.get(proxyName);
    const toxics = await proxy.getToxics();
    
    for (const toxic of toxics) {
      await proxy.removeToxic(toxic.name);
      this.activeExperiments.delete(toxic.name);
    }
    
    console.log(`🧹 Cleared all network conditions for ${proxyName}`);
  }

  async getNetworkMetrics(proxyName) {
    const proxy = this.proxies.get(proxyName);
    const info = await proxy.getProxyInfo();
    
    return {
      proxy: proxyName,
      upstream: info.upstream,
      listen: info.listen,
      enabled: info.enabled,
      activeToxics: this.activeExperiments.size,
      timestamp: new Date().toISOString()
    };
  }
}
```

### **Testcontainers Integration for CI/CD**
```javascript
import { ToxiproxyContainer } from "testcontainers";

class ContainerizedNetworkTesting {
  async setupToxiproxyContainer() {
    const toxiproxyContainer = await new ToxiproxyContainer("ghcr.io/shopify/toxiproxy:2.8.0")
      .withExposedPorts(8474, 8475)
      .start();

    // Create proxies for meta-agent services
    const redisProxy = await toxiproxyContainer.createProxy({
      name: "redis-test",
      upstream: "redis:6379",
      listen: "0.0.0.0:6380"
    });

    // Add network conditions
    await redisProxy.addToxic({
      name: "redis-latency",
      type: "latency",
      attributes: { 
        latency: 300,    // 300ms delay
        jitter: 50       // ±50ms variation
      },
      toxicity: 1.0
    });

    return { toxiproxyContainer, redisProxy };
  }

  async runIntegrationTest() {
    const { toxiproxyContainer, redisProxy } = await this.setupToxiproxyContainer();
    
    try {
      // Run meta-agent factory tests with network conditions
      const factory = new MetaAgentFactory({
        redisUrl: `redis://localhost:${redisProxy.listen.split(':')[1]}`
      });
      
      const results = await factory.testCoordinationResilience();
      
      expect(results.coordinationSuccessRate).toBeGreaterThan(0.85);
      expect(results.averageResponseTime).toBeLessThan(1000);
      
    } finally {
      await toxiproxyContainer.stop();
    }
  }
}
```

---

## 🐧 **2. Linux Network Emulation (tc/netem) Integration**

### **Container Setup for Network Emulation**
```dockerfile
# Dockerfile for network emulation testing
FROM node:18-alpine

# Install network tools
RUN apk add --no-cache iproute2 iptables

# Add network simulation scripts
COPY scripts/network-sim.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/network-sim.sh

# Your Node.js application
COPY . /app
WORKDIR /app
RUN npm install

# Require NET_ADMIN capability: docker run --cap-add NET_ADMIN
CMD ["npm", "start"]
```

### **Network Emulation Control Script**
```bash
#!/bin/bash
# network-sim.sh - Network condition simulation script

set -e

INTERFACE=${INTERFACE:-eth0}
ACTION=${1:-help}

case $ACTION in
  "add-delay")
    DELAY=${2:-100ms}
    JITTER=${3:-10ms}
    echo "Adding delay: ${DELAY} ±${JITTER}"
    tc qdisc add dev $INTERFACE root netem delay $DELAY $JITTER 25%
    ;;
  
  "add-loss")
    LOSS=${2:-1%}
    echo "Adding packet loss: ${LOSS}"
    tc qdisc add dev $INTERFACE root netem loss $LOSS
    ;;
  
  "add-combined")
    DELAY=${2:-100ms}
    LOSS=${3:-2%}
    RATE=${4:-1mbit}
    echo "Adding combined conditions: delay=${DELAY}, loss=${LOSS}, rate=${RATE}"
    tc qdisc add dev $INTERFACE root handle 1:0 netem delay $DELAY loss $LOSS
    tc qdisc add dev $INTERFACE parent 1:1 handle 10: tbf rate $RATE buffer 1600 limit 3000
    ;;
  
  "clear")
    echo "Clearing all network conditions"
    tc qdisc del dev $INTERFACE root 2>/dev/null || true
    ;;
  
  "status")
    echo "Current network conditions:"
    tc qdisc show dev $INTERFACE
    ;;
  
  *)
    echo "Usage: $0 {add-delay|add-loss|add-combined|clear|status}"
    echo "Examples:"
    echo "  $0 add-delay 200ms 50ms"
    echo "  $0 add-loss 5%"
    echo "  $0 add-combined 150ms 3% 512kbit"
    ;;
esac
```

### **Node.js Integration for Network Emulation**
```javascript
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class LinuxNetworkEmulator {
  constructor(interface = 'eth0') {
    this.interface = interface;
    this.conditions = new Set();
  }

  async checkCapabilities() {
    try {
      await execAsync('tc qdisc show');
      return true;
    } catch (error) {
      throw new Error('NET_ADMIN capability required for network emulation');
    }
  }

  async addDelay(delay = '100ms', jitter = '10ms') {
    await this.checkCapabilities();
    
    const command = `tc qdisc add dev ${this.interface} root netem delay ${delay} ${jitter} 25%`;
    
    try {
      await execAsync(command);
      this.conditions.add(`delay-${delay}-${jitter}`);
      console.log(`✅ Added network delay: ${delay} ±${jitter}`);
    } catch (error) {
      throw new Error(`Failed to add delay: ${error.message}`);
    }
  }

  async addPacketLoss(lossPercentage = '1%') {
    await this.checkCapabilities();
    
    const command = `tc qdisc add dev ${this.interface} root netem loss ${lossPercentage}`;
    
    try {
      await execAsync(command);
      this.conditions.add(`loss-${lossPercentage}`);
      console.log(`✅ Added packet loss: ${lossPercentage}`);
    } catch (error) {
      throw new Error(`Failed to add packet loss: ${error.message}`);
    }
  }

  async addBandwidthLimit(rate = '1mbit') {
    await this.checkCapabilities();
    
    const commands = [
      `tc qdisc add dev ${this.interface} root handle 1:0 netem`,
      `tc qdisc add dev ${this.interface} parent 1:1 handle 10: tbf rate ${rate} buffer 1600 limit 3000`
    ];
    
    try {
      for (const command of commands) {
        await execAsync(command);
      }
      this.conditions.add(`bandwidth-${rate}`);
      console.log(`✅ Added bandwidth limit: ${rate}`);
    } catch (error) {
      throw new Error(`Failed to add bandwidth limit: ${error.message}`);
    }
  }

  async clearConditions() {
    try {
      await execAsync(`tc qdisc del dev ${this.interface} root 2>/dev/null`);
      this.conditions.clear();
      console.log(`🧹 Cleared all network conditions on ${this.interface}`);
    } catch (error) {
      // Ignore errors when no qdisc exists
      console.log(`ℹ️ No network conditions to clear on ${this.interface}`);
    }
  }

  async getStatus() {
    try {
      const { stdout } = await execAsync(`tc qdisc show dev ${this.interface}`);
      return {
        interface: this.interface,
        conditions: Array.from(this.conditions),
        tcOutput: stdout.trim(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get network status: ${error.message}`);
    }
  }

  async runWithConditions(testFunction, conditions = {}) {
    const { delay, jitter, loss, bandwidth } = conditions;
    
    try {
      // Apply network conditions
      if (delay) await this.addDelay(delay, jitter);
      if (loss) await this.addPacketLoss(loss);
      if (bandwidth) await this.addBandwidthLimit(bandwidth);
      
      console.log(`🧪 Running test with network conditions:`, conditions);
      
      // Run the test function
      const result = await testFunction();
      
      return result;
    } finally {
      // Always clean up
      await this.clearConditions();
    }
  }
}
```

---

## 🌐 **3. HTTP Client Resilience Configuration**

### **Axios with Enhanced Retry Logic**
```javascript
const axios = require('axios');
const axiosRetry = require('axios-retry');

class ResilientHttpClient {
  constructor(options = {}) {
    this.client = axios.create({
      timeout: options.timeout || 10000,
      headers: {
        'User-Agent': 'MetaAgent-Factory/1.0'
      }
    });

    // Configure retry with exponential backoff
    axiosRetry(this.client, {
      retries: options.retries || 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on network errors and 5xx status codes
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response && error.response.status >= 500);
      },
      shouldResetTimeout: true,
      onRetry: (retryCount, error, requestConfig) => {
        console.log(`🔄 Retry attempt ${retryCount} for ${requestConfig.url}: ${error.message}`);
      }
    });

    // Add request/response interceptors for monitoring
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor for timing
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for metrics
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        console.log(`✅ HTTP ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`);
        
        // Store metrics for monitoring
        this.recordMetrics({
          url: response.config.url,
          method: response.config.method,
          status: response.status,
          duration,
          success: true
        });
        
        return response;
      },
      (error) => {
        const duration = error.config ? Date.now() - error.config.metadata.startTime : 0;
        const status = error.response ? error.response.status : 'NETWORK_ERROR';
        
        console.log(`❌ HTTP ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${status} (${duration}ms): ${error.message}`);
        
        this.recordMetrics({
          url: error.config?.url,
          method: error.config?.method,
          status,
          duration,
          success: false,
          error: error.message
        });
        
        return Promise.reject(error);
      }
    );
  }

  recordMetrics(metrics) {
    // Integrate with existing observability system
    if (global.metricsCollector) {
      global.metricsCollector.recordHttpRequest(metrics);
    }
  }

  // Meta-agent specific API calls
  async discoverAgents() {
    try {
      const response = await this.client.get('/api/agents/discover');
      return response.data;
    } catch (error) {
      console.error('Agent discovery failed:', error.message);
      throw new Error(`Agent discovery failed: ${error.message}`);
    }
  }

  async assignTask(agentId, task) {
    try {
      const response = await this.client.post(`/api/agents/${agentId}/tasks`, task, {
        timeout: 15000, // Longer timeout for task assignment
        'axios-retry': { retries: 5 } // More retries for critical operations
      });
      return response.data;
    } catch (error) {
      console.error(`Task assignment to agent ${agentId} failed:`, error.message);
      throw new Error(`Task assignment failed: ${error.message}`);
    }
  }

  async getAgentStatus(agentId) {
    try {
      const response = await this.client.get(`/api/agents/${agentId}/status`, {
        timeout: 5000 // Quick timeout for status checks
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to get status for agent ${agentId}:`, error.message);
      // Return degraded status instead of throwing
      return { status: 'unknown', error: error.message };
    }
  }
}
```

### **Circuit Breaker Pattern Implementation**
```javascript
const CircuitBreaker = require('opossum');

class MetaAgentCircuitBreaker {
  constructor() {
    this.breakers = new Map();
    this.createBreakers();
  }

  createBreakers() {
    // Circuit breaker for agent discovery
    const discoveryBreaker = new CircuitBreaker(this.discoverAgentsInternal.bind(this), {
      timeout: 10000,                    // 10 second timeout
      errorThresholdPercentage: 50,      // Open circuit at 50% error rate
      resetTimeout: 30000,               // Try to close circuit after 30 seconds
      volumeThreshold: 5,                // Minimum calls before calculating error rate
      allowWarmUp: true,                 // Allow some calls through when half-open
      name: 'agent-discovery'
    });

    // Circuit breaker for task assignment
    const taskBreaker = new CircuitBreaker(this.assignTaskInternal.bind(this), {
      timeout: 15000,
      errorThresholdPercentage: 30,      // More sensitive for critical operations
      resetTimeout: 60000,               // Longer reset time for task operations
      volumeThreshold: 3,
      name: 'task-assignment'
    });

    // Event handlers
    discoveryBreaker.on('open', () => console.log('🚨 Agent discovery circuit breaker OPEN'));
    discoveryBreaker.on('halfOpen', () => console.log('🔄 Agent discovery circuit breaker HALF-OPEN'));
    discoveryBreaker.on('close', () => console.log('✅ Agent discovery circuit breaker CLOSED'));

    taskBreaker.on('open', () => console.log('🚨 Task assignment circuit breaker OPEN'));
    taskBreaker.on('halfOpen', () => console.log('🔄 Task assignment circuit breaker HALF-OPEN'));
    taskBreaker.on('close', () => console.log('✅ Task assignment circuit breaker CLOSED'));

    this.breakers.set('discovery', discoveryBreaker);
    this.breakers.set('tasks', taskBreaker);
  }

  async discoverAgents() {
    const breaker = this.breakers.get('discovery');
    
    try {
      return await breaker.fire();
    } catch (error) {
      if (breaker.opened) {
        // Return cached agent list when circuit is open
        return this.getCachedAgentList();
      }
      throw error;
    }
  }

  async assignTask(agentId, task) {
    const breaker = this.breakers.get('tasks');
    
    try {
      return await breaker.fire(agentId, task);
    } catch (error) {
      if (breaker.opened) {
        // Queue task for later processing when circuit is open
        return this.queueTaskForLater(agentId, task);
      }
      throw error;
    }
  }

  // Internal implementations
  async discoverAgentsInternal() {
    // Actual agent discovery logic
    const client = new ResilientHttpClient();
    return await client.discoverAgents();
  }

  async assignTaskInternal(agentId, task) {
    // Actual task assignment logic
    const client = new ResilientHttpClient();
    return await client.assignTask(agentId, task);
  }

  getCachedAgentList() {
    // Return last known good agent list
    return this.lastKnownAgents || [];
  }

  queueTaskForLater(agentId, task) {
    // Add task to queue for processing when circuit closes
    if (!this.taskQueue) this.taskQueue = [];
    this.taskQueue.push({ agentId, task, timestamp: Date.now() });
    
    return {
      queued: true,
      message: 'Task queued due to circuit breaker activation'
    };
  }

  getCircuitStatus() {
    const status = {};
    for (const [name, breaker] of this.breakers.entries()) {
      status[name] = {
        state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
        failures: breaker.stats.failures,
        successes: breaker.stats.successes,
        requests: breaker.stats.requests,
        errorRate: breaker.stats.failures / breaker.stats.requests || 0
      };
    }
    return status;
  }
}
```

---

## 🔌 **4. WebSocket Resilience Under Network Degradation**

### **Enhanced WebSocket Client with Network Tolerance**
```javascript
const WebSocket = require('ws');
const EventEmitter = require('events');

class ResilientWebSocketClient extends EventEmitter {
  constructor(url, options = {}) {
    super();
    
    this.url = url;
    this.options = {
      reconnectInterval: options.reconnectInterval || 5000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      heartbeatInterval: options.heartbeatInterval || 30000,
      heartbeatTimeout: options.heartbeatTimeout || 5000,
      ...options
    };
    
    this.ws = null;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.isConnecting = false;
    this.heartbeatTimer = null;
    this.heartbeatTimeout = null;
    this.connectionMetrics = {
      connects: 0,
      disconnects: 0,
      reconnects: 0,
      messagesQueued: 0,
      messagesSent: 0,
      messagesReceived: 0
    };
    
    this.connect();
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log(`🔌 Connecting to WebSocket: ${this.url}`);
    
    try {
      this.ws = new WebSocket(this.url, this.options.protocols, {
        handshakeTimeout: 10000,
        perMessageDeflate: false // Disable compression for better performance under network stress
      });

      this.setupEventHandlers();
      
    } catch (error) {
      console.error(`❌ WebSocket connection failed: ${error.message}`);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  setupEventHandlers() {
    this.ws.on('open', () => {
      console.log('✅ WebSocket connected successfully');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.connectionMetrics.connects++;
      
      this.startHeartbeat();
      this.flushMessageQueue();
      this.emit('connected');
    });

    this.ws.on('message', (data) => {
      this.connectionMetrics.messagesReceived++;
      
      try {
        const message = JSON.parse(data);
        
        // Handle heartbeat responses
        if (message.type === 'pong' || message.type === 'heartbeat') {
          this.handleHeartbeatResponse();
          return;
        }
        
        this.emit('message', message);
        
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error);
        this.emit('error', new Error(`Message parsing failed: ${error.message}`));
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
      this.isConnecting = false;
      this.connectionMetrics.disconnects++;
      
      this.stopHeartbeat();
      this.emit('disconnected', { code, reason });
      
      // Reconnect unless deliberately closed
      if (code !== 1000) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (error) => {
      console.error(`❌ WebSocket error: ${error.message}`);
      this.isConnecting = false;
      this.emit('error', error);
    });

    this.ws.on('ping', () => {
      // Respond to server pings
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.pong();
      }
    });
  }

  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.sendHeartbeat();
      }
    }, this.options.heartbeatInterval);
  }

  sendHeartbeat() {
    const heartbeat = {
      type: 'ping',
      timestamp: Date.now(),
      clientId: this.options.clientId || 'unknown'
    };
    
    this.send(heartbeat);
    
    // Set timeout for heartbeat response
    this.heartbeatTimeout = setTimeout(() => {
      console.log('💔 Heartbeat timeout - connection may be lost');
      this.ws.terminate(); // Force reconnection
    }, this.options.heartbeatTimeout);
  }

  handleHeartbeatResponse() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  send(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(message);
        this.connectionMetrics.messagesSent++;
        return true;
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error);
        this.queueMessage(data);
        return false;
      }
    } else {
      this.queueMessage(data);
      return false;
    }
  }

  queueMessage(data) {
    this.messageQueue.push(data);
    this.connectionMetrics.messagesQueued++;
    
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 1000) {
      const dropped = this.messageQueue.shift();
      console.log('⚠️ Dropped queued message due to queue limit');
    }
    
    console.log(`📬 Message queued (${this.messageQueue.length} in queue)`);
  }

  flushMessageQueue() {
    console.log(`📤 Flushing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0 && this.ws.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    this.connectionMetrics.reconnects++;
    
    // Exponential backoff with jitter
    const baseDelay = this.options.reconnectInterval;
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const maxDelay = 30000; // Max 30 seconds
    const jitter = Math.random() * 1000; // Up to 1 second jitter
    
    const delay = Math.min(exponentialDelay, maxDelay) + jitter;
    
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${Math.round(delay)}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  close(code = 1000, reason = 'Client disconnect') {
    console.log(`🔌 Closing WebSocket connection: ${reason}`);
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(code, reason);
    }
  }

  getConnectionMetrics() {
    return {
      ...this.connectionMetrics,
      queuedMessages: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
      connectionState: this.ws ? this.ws.readyState : 'DISCONNECTED',
      timestamp: new Date().toISOString()
    };
  }
}
```

### **WebSocket Server with Network Degradation Awareness**
```javascript
const WebSocket = require('ws');
const http = require('http');

class NetworkAwareWebSocketServer {
  constructor(options = {}) {
    this.options = {
      port: options.port || 8080,
      heartbeatInterval: options.heartbeatInterval || 30000,
      clientTimeout: options.clientTimeout || 60000,
      ...options
    };
    
    this.server = http.createServer();
    this.wss = new WebSocket.Server({ server: this.server });
    this.clients = new Map();
    this.metrics = {
      connections: 0,
      disconnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      timeouts: 0
    };
    
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, request) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        ws: ws,
        lastSeen: Date.now(),
        messageCount: 0,
        remoteAddress: request.socket.remoteAddress
      };
      
      this.clients.set(clientId, clientInfo);
      this.metrics.connections++;
      
      console.log(`👥 Client connected: ${clientId} from ${clientInfo.remoteAddress}`);
      
      // Send welcome message with client ID
      this.sendToClient(clientId, {
        type: 'welcome',
        clientId: clientId,
        timestamp: Date.now()
      });
      
      ws.on('message', (data) => {
        this.handleClientMessage(clientId, data);
      });
      
      ws.on('close', (code, reason) => {
        console.log(`👋 Client disconnected: ${clientId} (${code}: ${reason})`);
        this.clients.delete(clientId);
        this.metrics.disconnections++;
      });
      
      ws.on('error', (error) => {
        console.error(`❌ Client error: ${clientId} - ${error.message}`);
      });
      
      ws.on('pong', () => {
        // Update last seen time on pong response
        if (this.clients.has(clientId)) {
          this.clients.get(clientId).lastSeen = Date.now();
        }
      });
    });
    
    // Start client monitoring
    this.startClientMonitoring();
  }

  handleClientMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.lastSeen = Date.now();
    client.messageCount++;
    this.metrics.messagesReceived++;
    
    try {
      const message = JSON.parse(data);
      
      // Handle different message types
      switch (message.type) {
        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            timestamp: Date.now()
          });
          break;
          
        case 'agent-status':
          this.handleAgentStatusUpdate(clientId, message);
          break;
          
        case 'task-update':
          this.handleTaskUpdate(clientId, message);
          break;
          
        default:
          // Broadcast to other clients for coordination
          this.broadcastMessage(message, clientId);
          break;
      }
      
    } catch (error) {
      console.error(`❌ Failed to process message from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      client.ws.send(JSON.stringify(message));
      this.metrics.messagesSent++;
      return true;
    } catch (error) {
      console.error(`❌ Failed to send message to ${clientId}:`, error);
      return false;
    }
  }

  broadcastMessage(message, excludeClientId = null) {
    let sentCount = 0;
    
    for (const [clientId, client] of this.clients.entries()) {
      if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        }
      }
    }
    
    return sentCount;
  }

  startClientMonitoring() {
    setInterval(() => {
      const now = Date.now();
      const timeoutThreshold = now - this.options.clientTimeout;
      
      // Check for timed out clients
      for (const [clientId, client] of this.clients.entries()) {
        if (client.lastSeen < timeoutThreshold) {
          console.log(`⏰ Client timeout: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          this.metrics.timeouts++;
        } else if (client.ws.readyState === WebSocket.OPEN) {
          // Send heartbeat ping
          client.ws.ping();
        }
      }
      
      // Log connection statistics
      if (this.clients.size > 0) {
        console.log(`📊 Active connections: ${this.clients.size}`);
      }
      
    }, this.options.heartbeatInterval);
  }

  // Meta-agent specific methods
  handleAgentStatusUpdate(clientId, message) {
    const statusUpdate = {
      type: 'agent-status-broadcast',
      agentId: message.agentId,
      status: message.status,
      capabilities: message.capabilities,
      timestamp: Date.now(),
      from: clientId
    };
    
    // Broadcast to all other agents
    this.broadcastMessage(statusUpdate, clientId);
  }

  handleTaskUpdate(clientId, message) {
    const taskUpdate = {
      type: 'task-update-broadcast',
      taskId: message.taskId,
      status: message.status,
      progress: message.progress,
      timestamp: Date.now(),
      from: clientId
    };
    
    // Broadcast to coordination agents
    this.broadcastMessage(taskUpdate, clientId);
  }

  getServerMetrics() {
    return {
      ...this.metrics,
      activeConnections: this.clients.size,
      timestamp: new Date().toISOString()
    };
  }

  generateClientId() {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  start() {
    return new Promise((resolve) => {
      this.server.listen(this.options.port, () => {
        console.log(`🚀 WebSocket server started on port ${this.options.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          console.log('🛑 WebSocket server stopped');
          resolve();
        });
      });
    });
  }
}
```

---

## 📦 **5. Redis Client Configuration for High-Latency and Packet Loss**

### **Enhanced Redis Configuration for Network Resilience**
```javascript
const Redis = require('ioredis');

class NetworkResilientRedisClient {
  constructor(options = {}) {
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 6379,
      // Connection settings optimized for network issues
      connectTimeout: options.connectTimeout || 10000,
      lazyConnect: options.lazyConnect !== false,
      enableOfflineQueue: options.enableOfflineQueue !== false,
      maxRetriesPerRequest: options.maxRetriesPerRequest || 3,
      retryDelayOnFailover: options.retryDelayOnFailover || 100,
      maxRetriesPerFailover: options.maxRetriesPerFailover || 3,
      
      // Network resilience settings
      keepAlive: options.keepAlive || 30000,
      family: options.family || 4,
      enableReadyCheck: options.enableReadyCheck !== false,
      reconnectOnError: options.reconnectOnError || this.defaultReconnectOnError.bind(this),
      
      // Connection pooling for high throughput
      enableAutoPipelining: options.enableAutoPipelining || true,
      
      ...options
    };
    
    this.client = null;
    this.metrics = {
      connections: 0,
      disconnections: 0,
      commandsExecuted: 0,
      commandsFailed: 0,
      reconnects: 0
    };
    
    this.initializeClient();
  }

  initializeClient() {
    this.client = new Redis(this.options);
    
    // Connection event handlers
    this.client.on('connect', () => {
      console.log('✅ Redis connected');
      this.metrics.connections++;
    });
    
    this.client.on('ready', () => {
      console.log('🚀 Redis client ready');
    });
    
    this.client.on('error', (error) => {
      console.error('❌ Redis error:', error.message);
      this.metrics.commandsFailed++;
    });
    
    this.client.on('close', () => {
      console.log('🔌 Redis connection closed');
      this.metrics.disconnections++;
    });
    
    this.client.on('reconnecting', (time) => {
      console.log(`🔄 Redis reconnecting in ${time}ms`);
      this.metrics.reconnects++;
    });
    
    this.client.on('end', () => {
      console.log('⏹️ Redis connection ended');
    });
  }

  defaultReconnectOnError(err) {
    // Reconnect on specific error types
    const targetErrors = ['READONLY', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'];
    return targetErrors.some(target => err.message.includes(target));
  }

  // Meta-agent coordination methods with network resilience
  async registerAgent(agentId, capabilities) {
    const agentData = {
      id: agentId,
      capabilities: capabilities,
      status: 'active',
      registeredAt: Date.now(),
      lastSeen: Date.now()
    };
    
    try {
      const pipeline = this.client.pipeline();
      
      // Use pipeline for atomic operations
      pipeline.hset(`agent:${agentId}`, agentData);
      pipeline.sadd('agents:active', agentId);
      pipeline.expire(`agent:${agentId}`, 300); // 5 minute TTL
      pipeline.publish('agent:registered', JSON.stringify(agentData));
      
      const results = await pipeline.exec();
      this.metrics.commandsExecuted += results.length;
      
      console.log(`👤 Agent registered: ${agentId}`);
      return { success: true, agentId };
      
    } catch (error) {
      console.error(`❌ Failed to register agent ${agentId}:`, error.message);
      this.metrics.commandsFailed++;
      throw new Error(`Agent registration failed: ${error.message}`);
    }
  }

  async updateAgentHeartbeat(agentId) {
    try {
      const multi = this.client.multi();
      
      multi.hset(`agent:${agentId}`, 'lastSeen', Date.now());
      multi.expire(`agent:${agentId}`, 300);
      multi.sadd('agents:active', agentId);
      
      await multi.exec();
      this.metrics.commandsExecuted += 3;
      
      return { success: true, timestamp: Date.now() };
      
    } catch (error) {
      console.error(`❌ Failed to update heartbeat for ${agentId}:`, error.message);
      this.metrics.commandsFailed++;
      
      // Return success to prevent heartbeat failures from cascading
      return { success: false, error: error.message };
    }
  }

  async getActiveAgents() {
    try {
      const agentIds = await this.client.smembers('agents:active');
      this.metrics.commandsExecuted++;
      
      if (agentIds.length === 0) {
        return [];
      }
      
      // Get detailed info for all agents
      const pipeline = this.client.pipeline();
      agentIds.forEach(agentId => {
        pipeline.hgetall(`agent:${agentId}`);
      });
      
      const results = await pipeline.exec();
      this.metrics.commandsExecuted += results.length;
      
      const agents = results
        .map((result, index) => {
          if (result[0]) {
            console.error(`❌ Failed to get agent data for ${agentIds[index]}:`, result[0]);
            return null;
          }
          return { ...result[1], id: agentIds[index] };
        })
        .filter(agent => agent !== null);
      
      return agents;
      
    } catch (error) {
      console.error('❌ Failed to get active agents:', error.message);
      this.metrics.commandsFailed++;
      
      // Return empty array to prevent failures from blocking operations
      return [];
    }
  }

  async coordinateTask(taskId, assignedAgentId, taskData) {
    try {
      const taskInfo = {
        id: taskId,
        assignedTo: assignedAgentId,
        status: 'assigned',
        data: JSON.stringify(taskData),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const pipeline = this.client.pipeline();
      
      // Store task info
      pipeline.hset(`task:${taskId}`, taskInfo);
      pipeline.expire(`task:${taskId}`, 3600); // 1 hour TTL
      
      // Add to agent's task list
      pipeline.sadd(`agent:${assignedAgentId}:tasks`, taskId);
      
      // Add to global task tracking
      pipeline.hset('tasks:status', taskId, 'assigned');
      
      // Publish task assignment
      pipeline.publish('task:assigned', JSON.stringify({
        taskId,
        assignedAgentId,
        timestamp: Date.now()
      }));
      
      const results = await pipeline.exec();
      this.metrics.commandsExecuted += results.length;
      
      console.log(`📋 Task coordinated: ${taskId} -> ${assignedAgentId}`);
      return { success: true, taskId, assignedTo: assignedAgentId };
      
    } catch (error) {
      console.error(`❌ Failed to coordinate task ${taskId}:`, error.message);
      this.metrics.commandsFailed++;
      throw new Error(`Task coordination failed: ${error.message}`);
    }
  }

  // Network resilience testing methods
  async testConnectionResilience() {
    const tests = [];
    
    // Test 1: Basic connectivity
    tests.push(this.testBasicConnectivity());
    
    // Test 2: High-throughput operations
    tests.push(this.testHighThroughput());
    
    // Test 3: Connection recovery
    tests.push(this.testConnectionRecovery());
    
    const results = await Promise.allSettled(tests);
    
    return {
      basicConnectivity: results[0].status === 'fulfilled' ? results[0].value : results[0].reason,
      highThroughput: results[1].status === 'fulfilled' ? results[1].value : results[1].reason,
      connectionRecovery: results[2].status === 'fulfilled' ? results[2].value : results[2].reason,
      metrics: this.getMetrics()
    };
  }

  async testBasicConnectivity() {
    const start = Date.now();
    
    try {
      await this.client.ping();
      await this.client.set('test:connectivity', Date.now());
      const value = await this.client.get('test:connectivity');
      await this.client.del('test:connectivity');
      
      return {
        success: true,
        duration: Date.now() - start,
        operations: 4
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start
      };
    }
  }

  async testHighThroughput() {
    const start = Date.now();
    const operationCount = 100;
    
    try {
      const pipeline = this.client.pipeline();
      
      for (let i = 0; i < operationCount; i++) {
        pipeline.set(`test:throughput:${i}`, `value-${i}`);
      }
      
      const setResults = await pipeline.exec();
      
      const getPipeline = this.client.pipeline();
      for (let i = 0; i < operationCount; i++) {
        getPipeline.get(`test:throughput:${i}`);
      }
      
      const getResults = await getPipeline.exec();
      
      // Cleanup
      const delPipeline = this.client.pipeline();
      for (let i = 0; i < operationCount; i++) {
        delPipeline.del(`test:throughput:${i}`);
      }
      await delPipeline.exec();
      
      return {
        success: true,
        duration: Date.now() - start,
        operations: operationCount * 3,
        throughput: (operationCount * 3) / ((Date.now() - start) / 1000)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start
      };
    }
  }

  async testConnectionRecovery() {
    const start = Date.now();
    
    try {
      // Simulate connection issues by disconnecting
      this.client.disconnect();
      
      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to reconnect and perform operations
      await this.client.ping();
      await this.client.set('test:recovery', 'recovered');
      const value = await this.client.get('test:recovery');
      await this.client.del('test:recovery');
      
      return {
        success: true,
        duration: Date.now() - start,
        recovered: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start
      };
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      connectionStatus: this.client.status,
      timestamp: new Date().toISOString()
    };
  }

  async close() {
    if (this.client) {
      await this.client.quit();
      console.log('👋 Redis client closed');
    }
  }
}
```

---

## 🏃‍♂️ **6. Application-Level Network Simulation**

### **Express Middleware for Network Condition Simulation**
```javascript
const express = require('express');

class NetworkSimulationMiddleware {
  constructor(options = {}) {
    this.conditions = {
      enabled: options.enabled || false,
      latency: {
        min: options.latency?.min || 0,
        max: options.latency?.max || 1000,
        distribution: options.latency?.distribution || 'uniform' // uniform, normal, exponential
      },
      packetLoss: options.packetLoss || 0, // 0-1 (0% to 100%)
      bandwidth: options.bandwidth || null, // bytes per second
      jitter: options.jitter || 0, // additional random delay
      connectionFailure: options.connectionFailure || 0 // probability of complete failure
    };
    
    this.metrics = {
      requestsProcessed: 0,
      requestsDelayed: 0,
      requestsDropped: 0,
      totalDelay: 0
    };
  }

  middleware() {
    return async (req, res, next) => {
      if (!this.conditions.enabled) {
        return next();
      }

      this.metrics.requestsProcessed++;

      // Simulate complete connection failure
      if (Math.random() < this.conditions.connectionFailure) {
        this.metrics.requestsDropped++;
        console.log(`💥 Simulated connection failure for ${req.path}`);
        return res.status(503).json({ 
          error: 'Service temporarily unavailable',
          code: 'NETWORK_FAILURE'
        });
      }

      // Simulate packet loss (random request dropping)
      if (Math.random() < this.conditions.packetLoss) {
        this.metrics.requestsDropped++;
        console.log(`📦 Simulated packet loss for ${req.path}`);
        return res.status(408).json({ 
          error: 'Request timeout',
          code: 'PACKET_LOSS'
        });
      }

      // Calculate network delay
      let delay = 0;
      
      if (this.conditions.latency.max > 0) {
        switch (this.conditions.latency.distribution) {
          case 'uniform':
            delay = this.conditions.latency.min + 
                   Math.random() * (this.conditions.latency.max - this.conditions.latency.min);
            break;
          case 'normal':
            delay = this.generateNormalDistribution(
              (this.conditions.latency.min + this.conditions.latency.max) / 2,
              (this.conditions.latency.max - this.conditions.latency.min) / 6
            );
            break;
          case 'exponential':
            delay = this.generateExponentialDistribution(this.conditions.latency.max / 2);
            break;
        }
      }

      // Add jitter
      if (this.conditions.jitter > 0) {
        delay += Math.random() * this.conditions.jitter;
      }

      if (delay > 0) {
        this.metrics.requestsDelayed++;
        this.metrics.totalDelay += delay;
        
        console.log(`⏱️ Adding ${Math.round(delay)}ms delay to ${req.path}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Simulate bandwidth limitations
      if (this.conditions.bandwidth) {
        this.setupBandwidthLimiting(req, res);
      }

      next();
    };
  }

  setupBandwidthLimiting(req, res) {
    const originalSend = res.send;
    const startTime = Date.now();
    
    res.send = function(data) {
      const dataSize = Buffer.byteLength(data);
      const transferTime = (dataSize / this.conditions.bandwidth) * 1000; // ms
      const actualTime = Date.now() - startTime;
      
      if (transferTime > actualTime) {
        const additionalDelay = transferTime - actualTime;
        setTimeout(() => {
          originalSend.call(this, data);
        }, additionalDelay);
      } else {
        originalSend.call(this, data);
      }
    }.bind(this);
  }

  generateNormalDistribution(mean, stdDev) {
    // Box-Muller transformation
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, mean + z0 * stdDev);
  }

  generateExponentialDistribution(lambda) {
    return -Math.log(Math.random()) / (1 / lambda);
  }

  updateConditions(newConditions) {
    this.conditions = { ...this.conditions, ...newConditions };
    console.log('🔧 Network conditions updated:', this.conditions);
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageDelay: this.metrics.requestsDelayed > 0 ? 
        this.metrics.totalDelay / this.metrics.requestsDelayed : 0,
      dropRate: this.metrics.requestsProcessed > 0 ?
        this.metrics.requestsDropped / this.metrics.requestsProcessed : 0,
      delayRate: this.metrics.requestsProcessed > 0 ?
        this.metrics.requestsDelayed / this.metrics.requestsProcessed : 0,
      timestamp: new Date().toISOString()
    };
  }

  reset() {
    this.metrics = {
      requestsProcessed: 0,
      requestsDelayed: 0,
      requestsDropped: 0,
      totalDelay: 0
    };
    console.log('🔄 Network simulation metrics reset');
  }
}

// Usage example for Meta-Agent Factory
function createMetaAgentApp() {
  const app = express();
  
  // Network simulation middleware
  const networkSim = new NetworkSimulationMiddleware({
    enabled: process.env.NETWORK_SIMULATION === 'true',
    latency: {
      min: parseInt(process.env.NETWORK_LATENCY_MIN) || 50,
      max: parseInt(process.env.NETWORK_LATENCY_MAX) || 500,
      distribution: process.env.NETWORK_LATENCY_DISTRIBUTION || 'uniform'
    },
    packetLoss: parseFloat(process.env.NETWORK_PACKET_LOSS) || 0.02,
    jitter: parseInt(process.env.NETWORK_JITTER) || 25,
    connectionFailure: parseFloat(process.env.NETWORK_CONNECTION_FAILURE) || 0.01
  });
  
  app.use(networkSim.middleware());
  
  // Meta-agent endpoints
  app.get('/api/agents', async (req, res) => {
    // Simulate agent discovery with network conditions
    const agents = await getActiveAgents();
    res.json({ agents, timestamp: Date.now() });
  });
  
  app.post('/api/agents/:id/tasks', async (req, res) => {
    // Simulate task assignment with network conditions
    const { id } = req.params;
    const task = req.body;
    
    try {
      const result = await assignTaskToAgent(id, task);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        networkConditions: networkSim.getMetrics()
      });
    }
  });
  
  // Network simulation control endpoints
  app.get('/api/network/conditions', (req, res) => {
    res.json({
      conditions: networkSim.conditions,
      metrics: networkSim.getMetrics()
    });
  });
  
  app.post('/api/network/conditions', (req, res) => {
    networkSim.updateConditions(req.body);
    res.json({ success: true, conditions: networkSim.conditions });
  });
  
  app.post('/api/network/reset', (req, res) => {
    networkSim.reset();
    res.json({ success: true, message: 'Network simulation metrics reset' });
  });
  
  return app;
}
```

---

## 📊 **7. Performance Monitoring and Metrics**

### **OpenTelemetry Integration for Network Metrics**
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { MeterProvider } = require('@opentelemetry/sdk-metrics');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');

class NetworkMetricsCollector {
  constructor(serviceName = 'meta-agent-factory') {
    this.serviceName = serviceName;
    this.setupOpenTelemetry();
    this.initializeMetrics();
  }

  setupOpenTelemetry() {
    // Prometheus exporter for metrics
    const prometheusExporter = new PrometheusExporter({
      port: 9464,
      endpoint: '/metrics'
    });

    // SDK configuration
    this.sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0'
      }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: prometheusExporter,
        exportIntervalMillis: 5000
      })
    });

    this.sdk.start();
    console.log('📊 OpenTelemetry initialized for network metrics');
  }

  initializeMetrics() {
    const { metrics } = require('@opentelemetry/api');
    this.meter = metrics.getMeter(this.serviceName);

    // Network performance counters
    this.httpRequestDuration = this.meter.createHistogram('http_request_duration_ms', {
      description: 'HTTP request duration in milliseconds',
      boundaries: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    });

    this.httpRequestsTotal = this.meter.createCounter('http_requests_total', {
      description: 'Total number of HTTP requests'
    });

    this.httpRequestsFailed = this.meter.createCounter('http_requests_failed_total', {
      description: 'Total number of failed HTTP requests'
    });

    this.websocketConnections = this.meter.createUpDownCounter('websocket_connections_active', {
      description: 'Number of active WebSocket connections'
    });

    this.websocketMessages = this.meter.createCounter('websocket_messages_total', {
      description: 'Total WebSocket messages sent/received'
    });

    this.redisOperations = this.meter.createCounter('redis_operations_total', {
      description: 'Total Redis operations'
    });

    this.redisOperationDuration = this.meter.createHistogram('redis_operation_duration_ms', {
      description: 'Redis operation duration in milliseconds',
      boundaries: [0.1, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000]
    });

    this.agentCoordinationSuccess = this.meter.createCounter('agent_coordination_success_total', {
      description: 'Successful agent coordination operations'
    });

    this.agentCoordinationFailure = this.meter.createCounter('agent_coordination_failure_total', {
      description: 'Failed agent coordination operations'
    });

    this.networkConditionGauge = this.meter.createObservableGauge('network_condition_latency_ms', {
      description: 'Current network latency condition'
    });

    console.log('📈 Network performance metrics initialized');
  }

  recordHttpRequest(duration, success, statusCode, method, endpoint) {
    const labels = {
      method: method.toUpperCase(),
      endpoint: endpoint,
      status_code: statusCode.toString(),
      success: success.toString()
    };

    this.httpRequestDuration.record(duration, labels);
    this.httpRequestsTotal.add(1, labels);
    
    if (!success) {
      this.httpRequestsFailed.add(1, labels);
    }
  }

  recordWebSocketConnection(delta) {
    this.websocketConnections.add(delta);
  }

  recordWebSocketMessage(direction, messageType) {
    this.websocketMessages.add(1, {
      direction: direction, // 'sent' or 'received'
      type: messageType
    });
  }

  recordRedisOperation(operation, duration, success) {
    const labels = {
      operation: operation,
      success: success.toString()
    };

    this.redisOperations.add(1, labels);
    this.redisOperationDuration.record(duration, labels);
  }

  recordAgentCoordination(operation, success, agentCount) {
    const labels = {
      operation: operation,
      agent_count: agentCount.toString()
    };

    if (success) {
      this.agentCoordinationSuccess.add(1, labels);
    } else {
      this.agentCoordinationFailure.add(1, labels);
    }
  }

  // Integration with network simulation
  recordNetworkCondition(latency, packetLoss, bandwidth) {
    // This would be called by network simulation middleware
    this.networkConditionGauge.addCallback((result) => {
      result.observe(latency, {
        condition_type: 'latency',
        packet_loss: packetLoss.toString(),
        bandwidth: bandwidth ? bandwidth.toString() : 'unlimited'
      });
    });
  }

  // Custom metrics for meta-agent coordination
  recordTaskAssignment(taskId, agentId, duration, success) {
    const taskAssignmentDuration = this.meter.createHistogram('task_assignment_duration_ms', {
      description: 'Task assignment duration in milliseconds'
    });

    const taskAssignmentTotal = this.meter.createCounter('task_assignments_total', {
      description: 'Total task assignments'
    });

    const labels = {
      agent_id: agentId,
      success: success.toString()
    };

    taskAssignmentDuration.record(duration, labels);
    taskAssignmentTotal.add(1, labels);
  }

  recordAgentHealthCheck(agentId, healthy, responseTime) {
    const agentHealthGauge = this.meter.createObservableGauge('agent_health_status', {
      description: 'Agent health status (1 = healthy, 0 = unhealthy)'
    });

    const agentResponseTime = this.meter.createHistogram('agent_health_check_duration_ms', {
      description: 'Agent health check response time'
    });

    agentHealthGauge.addCallback((result) => {
      result.observe(healthy ? 1 : 0, { agent_id: agentId });
    });

    agentResponseTime.record(responseTime, { agent_id: agentId });
  }

  // Generate network performance report
  async generateNetworkReport() {
    // This would typically be called from a monitoring endpoint
    const report = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      metrics: {
        http: await this.getHttpMetrics(),
        websocket: await this.getWebSocketMetrics(),
        redis: await this.getRedisMetrics(),
        agent_coordination: await this.getAgentCoordinationMetrics()
      },
      network_conditions: await this.getCurrentNetworkConditions()
    };

    return report;
  }

  async getHttpMetrics() {
    // In a real implementation, you'd query your metrics backend
    return {
      total_requests: 'counter_value',
      failed_requests: 'counter_value', 
      average_duration: 'histogram_average',
      p95_duration: 'histogram_p95'
    };
  }

  async getWebSocketMetrics() {
    return {
      active_connections: 'gauge_value',
      total_messages: 'counter_value',
      messages_per_second: 'rate_value'
    };
  }

  async getRedisMetrics() {
    return {
      total_operations: 'counter_value',
      average_duration: 'histogram_average',
      connection_pool_size: 'gauge_value'
    };
  }

  async getAgentCoordinationMetrics() {
    return {
      successful_coordinations: 'counter_value',
      failed_coordinations: 'counter_value',
      active_agents: 'gauge_value',
      average_coordination_time: 'histogram_average'
    };
  }

  async getCurrentNetworkConditions() {
    // This would interface with your network simulation system
    return {
      simulated_latency: 'gauge_value',
      simulated_packet_loss: 'gauge_value',
      simulated_bandwidth: 'gauge_value'
    };
  }

  shutdown() {
    this.sdk.shutdown();
    console.log('📊 OpenTelemetry metrics collection stopped');
  }
}
```

---

## 🧪 **8. Testing Frameworks for Network Condition Simulation**

### **Jest Integration Test Suite**
```javascript
const request = require('supertest');
const { MetaAgentFactory } = require('../src/meta-agent-factory');
const { NetworkSimulationMiddleware } = require('./utils/network-simulation');
const { NetworkMetricsCollector } = require('./utils/metrics-collector');

describe('Meta-Agent Factory Network Resilience Tests', () => {
  let app;
  let factory;
  let networkSim;
  let metricsCollector;

  beforeAll(async () => {
    // Initialize components
    metricsCollector = new NetworkMetricsCollector('test-meta-agent-factory');
    networkSim = new NetworkSimulationMiddleware({
      enabled: true,
      latency: { min: 100, max: 500 },
      packetLoss: 0.05,
      jitter: 50
    });

    factory = new MetaAgentFactory({
      redisUrl: process.env.REDIS_TEST_URL || 'redis://localhost:6379',
      networkSimulation: networkSim
    });

    app = await factory.createExpressApp();
    await factory.initialize();
  });

  afterAll(async () => {
    await factory.shutdown();
    metricsCollector.shutdown();
  });

  beforeEach(() => {
    networkSim.reset();
  });

  describe('Agent Discovery Under Network Stress', () => {
    test('should discover agents with 200ms average latency', async () => {
      // Configure network conditions
      networkSim.updateConditions({
        latency: { min: 150, max: 250, distribution: 'normal' },
        packetLoss: 0.02
      });

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/agents/discover')
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body).toHaveProperty('agents');
      expect(response.body.agents).toBeInstanceOf(Array);
      expect(duration).toBeGreaterThan(150); // Should include simulated latency
      expect(duration).toBeLessThan(2000);   // But still complete reasonably

      // Verify metrics were recorded
      const metrics = networkSim.getMetrics();
      expect(metrics.requestsDelayed).toBeGreaterThan(0);
    });

    test('should handle 10% packet loss gracefully', async () => {
      networkSim.updateConditions({
        packetLoss: 0.1, // 10% packet loss
        latency: { min: 50, max: 100 }
      });

      let successCount = 0;
      let timeoutCount = 0;
      const totalRequests = 20;

      for (let i = 0; i < totalRequests; i++) {
        try {
          const response = await request(app)
            .get('/api/agents/discover')
            .timeout(5000);

          if (response.status === 200) {
            successCount++;
          }
        } catch (error) {
          if (error.code === 'ECONNRESET' || error.status === 408) {
            timeoutCount++;
          }
        }
      }

      // Should have reasonable success rate despite packet loss
      const successRate = successCount / totalRequests;
      expect(successRate).toBeGreaterThan(0.8); // At least 80% success

      console.log(`📊 Packet loss test: ${successCount}/${totalRequests} successful (${Math.round(successRate * 100)}%)`);
    });
  });

  describe('Task Assignment Resilience', () => {
    test('should assign tasks with network jitter', async () => {
      networkSim.updateConditions({
        latency: { min: 100, max: 300 },
        jitter: 100,
        packetLoss: 0.01
      });

      const taskData = {
        type: 'data-processing',
        priority: 'high',
        payload: { data: 'test-data' }
      };

      const response = await request(app)
        .post('/api/agents/test-agent-1/tasks')
        .send(taskData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('taskId');

      // Verify task was properly queued despite network conditions
      const taskStatus = await request(app)
        .get(`/api/tasks/${response.body.taskId}/status`)
        .expect(200);

      expect(taskStatus.body.status).toMatch(/assigned|queued/);
    });

    test('should retry failed task assignments', async () => {
      // Simulate high failure rate temporarily
      networkSim.updateConditions({
        connectionFailure: 0.3, // 30% connection failures
        latency: { min: 200, max: 800 }
      });

      const taskData = {
        type: 'critical-task',
        priority: 'urgent',
        retryOnFailure: true,
        maxRetries: 3
      };

      let lastError;
      let success = false;

      for (let attempt = 0; attempt < 5 && !success; attempt++) {
        try {
          const response = await request(app)
            .post('/api/agents/test-agent-1/tasks')
            .send(taskData)
            .timeout(10000);

          if (response.status === 200) {
            success = true;
            expect(response.body.success).toBe(true);
          }
        } catch (error) {
          lastError = error;
          // Wait between retries with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }

      // Should eventually succeed with retries
      expect(success).toBe(true);
    });
  });

  describe('Real-time Communication Tests', () => {
    test('should maintain WebSocket connection under network stress', async () => {
      const WebSocket = require('ws');
      
      // Start WebSocket server
      const wsServer = factory.getWebSocketServer();
      await wsServer.start();

      networkSim.updateConditions({
        latency: { min: 300, max: 700 },
        packetLoss: 0.03,
        jitter: 200
      });

      return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8080');
        let messagesReceived = 0;
        let heartbeatCount = 0;
        const testDuration = 10000; // 10 seconds

        ws.on('open', () => {
          console.log('📡 WebSocket test connection established');
          
          // Send test messages periodically
          const messageInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'test-message',
                timestamp: Date.now(),
                sequenceNumber: messagesReceived
              }));
            }
          }, 1000);

          // End test after duration
          setTimeout(() => {
            clearInterval(messageInterval);
            ws.close();
            
            console.log(`📊 WebSocket test completed: ${messagesReceived} messages, ${heartbeatCount} heartbeats`);
            
            // Should have received some messages despite network conditions
            expect(messagesReceived).toBeGreaterThan(0);
            expect(heartbeatCount).toBeGreaterThan(0);
            
            resolve();
          }, testDuration);
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            messagesReceived++;
            
            if (message.type === 'heartbeat' || message.type === 'pong') {
              heartbeatCount++;
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        ws.on('error', (error) => {
          console.error('WebSocket test error:', error);
          reject(error);
        });

        ws.on('close', (code, reason) => {
          console.log(`WebSocket test connection closed: ${code} - ${reason}`);
        });
      });
    });
  });

  describe('Redis Coordination Tests', () => {
    test('should maintain agent coordination with Redis latency', async () => {
      networkSim.updateConditions({
        latency: { min: 200, max: 600 }, // High Redis latency
        packetLoss: 0.02
      });

      // Register multiple agents
      const agents = [];
      for (let i = 1; i <= 5; i++) {
        const agentData = {
          id: `test-agent-${i}`,
          capabilities: ['data-processing', 'api-calls'],
          zone: i <= 3 ? 'meta-agents' : 'domain-agents'
        };

        const response = await request(app)
          .post('/api/agents/register')
          .send(agentData)
          .expect(200);

        agents.push(response.body);
      }

      // Test coordination operations
      const coordinationResults = await Promise.allSettled([
        factory.testAgentDiscovery(),
        factory.testTaskAssignment(),
        factory.testHeartbeatSystem()
      ]);

      const successfulOperations = coordinationResults.filter(
        result => result.status === 'fulfilled'
      ).length;

      // Should maintain reasonable success rate under network stress
      expect(successfulOperations).toBeGreaterThanOrEqual(2);

      console.log(`📊 Redis coordination test: ${successfulOperations}/3 operations successful`);
    });
  });

  describe('Comprehensive Network Resilience', () => {
    test('should handle combined network conditions', async () => {
      // Simulate realistic network degradation
      networkSim.updateConditions({
        latency: { min: 150, max: 800, distribution: 'exponential' },
        packetLoss: 0.05,
        jitter: 150,
        connectionFailure: 0.02,
        bandwidth: 1024 * 1024 // 1MB/s limit
      });

      const testResults = {
        agentDiscovery: 0,
        taskAssignment: 0,
        websocketMessages: 0,
        redisOperations: 0
      };

      // Run comprehensive test suite
      const testOperations = [];

      // Test agent discovery
      for (let i = 0; i < 10; i++) {
        testOperations.push(
          request(app)
            .get('/api/agents/discover')
            .then(res => res.status === 200 && testResults.agentDiscovery++)
            .catch(() => {})
        );
      }

      // Test task assignments
      for (let i = 0; i < 5; i++) {
        testOperations.push(
          request(app)
            .post('/api/agents/test-agent-1/tasks')
            .send({ type: 'test-task', data: `test-${i}` })
            .then(res => res.status === 200 && testResults.taskAssignment++)
            .catch(() => {})
        );
      }

      await Promise.allSettled(testOperations);

      // Calculate success rates
      const discoveryRate = testResults.agentDiscovery / 10;
      const assignmentRate = testResults.taskAssignment / 5;

      console.log(`📊 Combined network conditions test results:`);
      console.log(`   Agent Discovery: ${testResults.agentDiscovery}/10 (${Math.round(discoveryRate * 100)}%)`);
      console.log(`   Task Assignment: ${testResults.taskAssignment}/5 (${Math.round(assignmentRate * 100)}%)`);

      // Should maintain acceptable performance under realistic conditions
      expect(discoveryRate).toBeGreaterThan(0.7);  // 70% success rate
      expect(assignmentRate).toBeGreaterThan(0.6); // 60% success rate

      // Get final metrics
      const finalMetrics = networkSim.getMetrics();
      expect(finalMetrics.requestsProcessed).toBeGreaterThan(0);
      
      console.log('📈 Final network simulation metrics:', finalMetrics);
    });
  });
});
```

### **Artillery.io Load Testing Configuration**
```yaml
# artillery-network-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120  
      arrivalRate: 25
      name: "Sustained load with network conditions"
    - duration: 60
      arrivalRate: 50
      name: "Peak load test"
  processor: "./network-test-processor.js"
  plugins:
    metrics-by-endpoint:
      useOnlyRequestNames: true

scenarios:
  - name: "Agent discovery under network stress"
    weight: 40
    flow:
      - function: "setNetworkConditions"
      - get:
          url: "/api/agents/discover"
          beforeRequest: "addLatency"
          afterResponse: "recordMetrics"
          expect:
            - statusCode: [200, 408, 503]
      - think: 2

  - name: "Task assignment with packet loss"
    weight: 30  
    flow:
      - function: "setHighPacketLoss"
      - post:
          url: "/api/agents/{{ $randomInt(1, 5) }}/tasks"
          beforeRequest: "simulatePacketLoss"
          json:
            type: "load-test-task"
            priority: "normal"
            data: "{{ $randomString(100) }}"
          expect:
            - statusCode: [200, 408, 503]
      - think: 1

  - name: "WebSocket coordination test"
    weight: 20
    engine: ws
    flow:
      - connect:
          url: "ws://localhost:8080"
      - send: '{"type": "register", "agentId": "load-test-{{ $uuid() }}"}'
      - think: 5
      - send: '{"type": "heartbeat", "timestamp": {{ $timestamp() }}}'
      - think: 10

  - name: "Redis operations under latency"
    weight: 10
    flow:
      - function: "setHighLatency"
      - get:
          url: "/api/agents/{{ $randomInt(1, 16) }}/status"
          beforeRequest: "addRedisLatency"
          expect:
            - statusCode: [200, 504]
      - think: 3
```

### **Network Test Processor for Artillery**
```javascript
// network-test-processor.js
const { NetworkSimulationMiddleware } = require('./network-simulation');

let networkSim;
let testMetrics = {
  totalRequests: 0,
  networkDelays: 0,
  packetLoss: 0,
  timeouts: 0
};

function initializeNetworkSimulation(userContext, events, done) {
  networkSim = new NetworkSimulationMiddleware({
    enabled: true,
    latency: { min: 100, max: 500 },
    packetLoss: 0.03,
    jitter: 50
  });
  
  console.log('🧪 Network simulation initialized for Artillery test');
  done();
}

function setNetworkConditions(userContext, events, done) {
  // Vary network conditions during test
  const conditions = {
    latency: {
      min: Math.random() * 100 + 50,   // 50-150ms base
      max: Math.random() * 400 + 200,  // 200-600ms max
      distribution: Math.random() > 0.5 ? 'uniform' : 'exponential'
    },
    packetLoss: Math.random() * 0.05,  // 0-5% packet loss
    jitter: Math.random() * 100        // 0-100ms jitter
  };
  
  networkSim.updateConditions(conditions);
  userContext.vars.networkConditions = conditions;
  done();
}

function setHighPacketLoss(userContext, events, done) {
  networkSim.updateConditions({
    packetLoss: 0.1 + Math.random() * 0.1, // 10-20% packet loss
    latency: { min: 200, max: 800 }
  });
  done();
}

function setHighLatency(userContext, events, done) {
  networkSim.updateConditions({
    latency: { min: 500, max: 2000, distribution: 'exponential' },
    packetLoss: 0.01
  });
  done();
}

function addLatency(requestParams, userContext, ee, next) {
  const startTime = Date.now();
  userContext.vars.requestStartTime = startTime;
  
  // Simulate variable network delay
  const delay = Math.random() * 200 + 50; // 50-250ms
  setTimeout(() => {
    testMetrics.networkDelays++;
    next();
  }, delay);
}

function simulatePacketLoss(requestParams, userContext, ee, next) {
  testMetrics.totalRequests++;
  
  // Simulate packet loss
  if (Math.random() < 0.08) { // 8% packet loss
    testMetrics.packetLoss++;
    // Simulate timeout
    setTimeout(() => {
      const error = new Error('Simulated packet loss');
      error.code = 'NETWORK_TIMEOUT';
      next(error);
    }, 5000);
  } else {
    next();
  }
}

function addRedisLatency(requestParams, userContext, ee, next) {
  // Simulate Redis operation latency
  const redisDelay = Math.random() * 300 + 100; // 100-400ms
  setTimeout(next, redisDelay);
}

function recordMetrics(requestParams, response, userContext, ee, next) {
  const duration = Date.now() - userContext.vars.requestStartTime;
  
  // Emit custom metrics
  ee.emit('counter', 'network_test.requests_total', 1);
  ee.emit('histogram', 'network_test.response_time', duration);
  
  if (response.statusCode >= 400) {
    ee.emit('counter', 'network_test.errors_total', 1);
    
    if (response.statusCode === 408 || response.statusCode === 504) {
      testMetrics.timeouts++;
      ee.emit('counter', 'network_test.timeouts_total', 1);
    }
  }
  
  // Log network conditions impact
  if (userContext.vars.networkConditions) {
    ee.emit('histogram', 'network_test.simulated_latency', 
      userContext.vars.networkConditions.latency.max
    );
  }
  
  next();
}

function logTestSummary(userContext, events, done) {
  console.log('📊 Network Test Summary:');
  console.log(`   Total Requests: ${testMetrics.totalRequests}`);
  console.log(`   Network Delays: ${testMetrics.networkDelays}`);
  console.log(`   Packet Loss: ${testMetrics.packetLoss}`);
  console.log(`   Timeouts: ${testMetrics.timeouts}`);
  done();
}

module.exports = {
  initializeNetworkSimulation,
  setNetworkConditions,
  setHighPacketLoss,
  setHighLatency,
  addLatency,
  simulatePacketLoss,
  addRedisLatency,
  recordMetrics,
  logTestSummary
};
```

---

## 📋 **Implementation Roadmap for Meta-Agent Factory**

### **Phase 1: Foundation Setup (Week 1)**
- [ ] Install and configure Toxiproxy for development testing
- [ ] Set up Linux network emulation (tc/netem) in containers
- [ ] Implement resilient HTTP client with retry logic
- [ ] Deploy enhanced WebSocket connection handling

### **Phase 2: Redis and Coordination (Week 2)**
- [ ] Configure Redis client for high-latency scenarios
- [ ] Implement network simulation middleware for Express
- [ ] Set up OpenTelemetry metrics collection
- [ ] Create comprehensive test suite with Jest

### **Phase 3: Advanced Testing (Week 3)**
- [ ] Deploy Artillery.io load testing with network conditions
- [ ] Implement chaos testing integration with existing framework
- [ ] Set up automated CI/CD testing with network simulation
- [ ] Create monitoring dashboards for network metrics

### **Phase 4: Production Integration (Week 4)**
- [ ] Integrate with existing observability system (Task 229.4)
- [ ] Connect to continuous validation suite (Task 229.5)
- [ ] Deploy production monitoring and alerting
- [ ] Document operational procedures and troubleshooting

---

## 🎯 **Success Metrics & Validation**

### **Network Resilience Targets**
- **Agent Discovery**: >85% success rate with 500ms latency + 5% packet loss
- **Task Assignment**: >90% eventual success with retry logic under network stress
- **WebSocket Coordination**: Maintain connections with <30s reconnection time
- **Redis Operations**: <2s timeout tolerance with graceful degradation

### **Performance Benchmarks**
- **HTTP Requests**: P95 response time <1s under 300ms network latency
- **WebSocket Messages**: >95% delivery rate within network zones
- **Redis Coordination**: Handle 16-agent coordination with 200ms Redis latency
- **System Recovery**: <60s recovery time after network partition healing

### **Testing Coverage**
- **Network Conditions**: Latency (50ms-2s), Packet Loss (1%-20%), Bandwidth limits
- **Failure Scenarios**: Connection drops, DNS failures, partial connectivity
- **Load Testing**: 50+ concurrent connections with network simulation
- **Integration Testing**: All 16 agents coordinating under network stress

---

## 📋 **Conclusion**

This comprehensive guide provides production-ready methods for simulating network delay and packet loss with Node.js integration, specifically tailored for the 16-agent meta-agent factory system. The implementation covers all major network resilience patterns, from infrastructure-level simulation with Toxiproxy and tc/netem to application-level middleware and comprehensive testing frameworks.

**Key Achievements**:
- **Multi-Layer Simulation**: Infrastructure, application, and testing level network conditions
- **Production-Ready Patterns**: Resilient HTTP clients, WebSocket handling, Redis configuration
- **Comprehensive Testing**: Jest integration, Artillery load testing, CI/CD automation
- **Real-Time Monitoring**: OpenTelemetry metrics, Prometheus integration, custom dashboards

**Integration Points**:
- Builds upon Task 249.1 chaos engineering tools survey
- Extends Task 249.2 Chaos Mesh network partition capabilities  
- Integrates with Task 229.5 continuous validation suite
- Connects to Task 229.4 test dashboard and reporting tools

---

**Task 249.4 Complete** ✅  
**Documentation**: Production-ready network delay and packet loss simulation methods with comprehensive Node.js integration for meta-agent factory testing