# 🧪 **Split-Brain Simulation and Validation for 16-Agent Factory**

## **Task 252.5: Simulate and Validate Split-Brain Handling in a 16-Agent Factory**

**Generated**: August 1, 2025  
**Research Source**: TaskMaster research with Perplexity insights + Context7 code references  
**Target System**: 16-agent Meta-Agent Factory (11 meta-agents + 5 domain agents)  
**Technologies**: Toxiproxy, Testcontainers, Docker Compose, Chaos Mesh (K8s), Node.js

---

## 📚 **Table of Contents**

1. [Executive Summary](#executive-summary)
2. [Test Environment Architecture](#test-environment-architecture)
3. [Toxiproxy Setup and Configuration](#toxiproxy-setup-and-configuration)
4. [Testcontainers Multi-Agent Orchestration](#testcontainers-multi-agent-orchestration)
5. [Docker Compose Test Scenarios](#docker-compose-test-scenarios)
6. [Chaos Mesh Kubernetes Testing](#chaos-mesh-kubernetes-testing)
7. [Split-Brain Test Scenarios](#split-brain-test-scenarios)
8. [Validation and Metrics](#validation-and-metrics)
9. [Automated Test Suite](#automated-test-suite)
10. [CI/CD Integration](#cicd-integration)
11. [References](#references)

---

## 🎯 **Executive Summary**

This guide provides a comprehensive approach to simulating and validating split-brain scenarios in our 16-agent Meta-Agent Factory using:

- **Toxiproxy** for fine-grained network fault injection
- **Testcontainers** for programmatic multi-agent orchestration
- **Docker Compose** for complex topology definition
- **Chaos Mesh** for Kubernetes-native chaos engineering
- **Automated validation** of detection, recovery, and data consistency

Research indicates Toxiproxy combined with Testcontainers provides the most flexible approach for Node.js-based chaos testing, while Chaos Mesh excels in production Kubernetes environments.

---

## 🏗️ **Test Environment Architecture**

### **Complete 16-Agent Test Setup**

```javascript
// Complete test environment configuration
const TEST_ENVIRONMENT = {
  metaAgents: [
    { name: 'infrastructure-orchestrator', port: 3001, role: 'PRIMARY_COORDINATOR' },
    { name: 'parameter-flow-agent', port: 3002, role: 'DATA_TRANSFORMER' },
    { name: 'scaffold-generator', port: 3003, role: 'PROJECT_CREATOR' },
    { name: 'template-engine-factory', port: 3004, role: 'TEMPLATE_MANAGER' },
    { name: 'all-purpose-pattern-agent', port: 3005, role: 'PATTERN_ENFORCER' },
    { name: 'prd-parser-agent', port: 3006, role: 'REQUIREMENT_ANALYZER' },
    { name: 'five-document-framework-agent', port: 3007, role: 'DOC_GENERATOR' },
    { name: 'thirty-minute-rule-agent', port: 3008, role: 'COMPLEXITY_VALIDATOR' },
    { name: 'vercel-native-architecture-agent', port: 3009, role: 'DEPLOYMENT_OPTIMIZER' },
    { name: 'post-creation-investigator', port: 3010, role: 'QUALITY_VALIDATOR' },
    { name: 'account-creation-system', port: 3011, role: 'ACCOUNT_MANAGER' }
  ],
  domainAgents: [
    { name: 'backend-domain-agent', port: 3012, role: 'API_DEVELOPER' },
    { name: 'frontend-domain-agent', port: 3013, role: 'UI_BUILDER' },
    { name: 'devops-domain-agent', port: 3014, role: 'DEPLOYMENT_MANAGER' },
    { name: 'qa-domain-agent', port: 3015, role: 'TEST_EXECUTOR' },
    { name: 'documentation-agent', port: 3016, role: 'DOC_WRITER' }
  ],
  infrastructure: [
    { name: 'redis-master', port: 6379, role: 'STATE_STORE' },
    { name: 'redis-sentinel-1', port: 26379, role: 'SENTINEL' },
    { name: 'redis-sentinel-2', port: 26380, role: 'SENTINEL' },
    { name: 'redis-sentinel-3', port: 26381, role: 'SENTINEL' },
    { name: 'websocket-hub', port: 8080, role: 'COORDINATION_HUB' }
  ]
};
```

### **Network Topology**

```yaml
# docker-compose.test.yml
version: '3.8'

networks:
  agent-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

services:
  # Toxiproxy for network fault injection
  toxiproxy:
    image: shopify/toxiproxy:latest
    ports:
      - "8474:8474"  # API
      - "20000-20020:20000-20020"  # Proxy ports
    networks:
      agent-network:
        ipv4_address: 172.20.0.2

  # Redis infrastructure
  redis-master:
    image: redis:7-alpine
    command: redis-server --port 6379
    networks:
      agent-network:
        ipv4_address: 172.20.0.10

  redis-sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis-sentinel/sentinel.conf
    volumes:
      - ./sentinel-1.conf:/etc/redis-sentinel/sentinel.conf
    networks:
      agent-network:
        ipv4_address: 172.20.0.11

  # Meta-agents (11 total)
  infrastructure-orchestrator:
    build:
      context: ./agents
      args:
        AGENT_TYPE: infrastructure-orchestrator
    environment:
      - NODE_ENV=test
      - AGENT_ID=infrastructure-orchestrator
      - REDIS_URL=redis://172.20.0.10:6379
      - WEBSOCKET_URL=ws://172.20.0.20:8080
    networks:
      agent-network:
        ipv4_address: 172.20.0.30

  # ... (other agents follow similar pattern)

  # WebSocket coordination hub
  websocket-hub:
    build:
      context: ./websocket-hub
    ports:
      - "8080:8080"
    networks:
      agent-network:
        ipv4_address: 172.20.0.20
```

---

## 🔧 **Toxiproxy Setup and Configuration**

### **Toxiproxy Client Implementation**

```javascript
import { Toxiproxy } from 'toxiproxy-node-client';

class ToxiproxyManager {
  constructor() {
    this.toxiproxy = new Toxiproxy('http://localhost:8474');
    this.proxies = new Map();
  }

  async setupProxies() {
    // Create proxies for each agent
    const agents = [...TEST_ENVIRONMENT.metaAgents, ...TEST_ENVIRONMENT.domainAgents];
    
    for (const agent of agents) {
      const proxy = await this.createAgentProxy(agent);
      this.proxies.set(agent.name, proxy);
    }

    // Create Redis proxies
    await this.createRedisProxies();
    
    // Create WebSocket proxy
    await this.createWebSocketProxy();
  }

  async createAgentProxy(agent) {
    const proxyPort = 20000 + agent.port - 3000;
    
    const proxy = await this.toxiproxy.createProxy({
      name: `${agent.name}-proxy`,
      listen: `0.0.0.0:${proxyPort}`,
      upstream: `${agent.name}:${agent.port}`
    });

    return proxy;
  }

  async createRedisProxies() {
    // Redis master proxy
    const redisMasterProxy = await this.toxiproxy.createProxy({
      name: 'redis-master-proxy',
      listen: '0.0.0.0:16379',
      upstream: 'redis-master:6379'
    });
    this.proxies.set('redis-master', redisMasterProxy);

    // Sentinel proxies
    for (let i = 1; i <= 3; i++) {
      const sentinelProxy = await this.toxiproxy.createProxy({
        name: `redis-sentinel-${i}-proxy`,
        listen: `0.0.0.0:${26379 + i - 1}`,
        upstream: `redis-sentinel-${i}:26379`
      });
      this.proxies.set(`redis-sentinel-${i}`, sentinelProxy);
    }
  }

  async createWebSocketProxy() {
    const wsProxy = await this.toxiproxy.createProxy({
      name: 'websocket-hub-proxy',
      listen: '0.0.0.0:18080',
      upstream: 'websocket-hub:8080'
    });
    this.proxies.set('websocket-hub', wsProxy);
  }

  // Network partition simulation
  async createNetworkPartition(partition1Agents, partition2Agents) {
    console.log('Creating network partition...');
    
    // Block communication between partitions
    for (const agent1 of partition1Agents) {
      for (const agent2 of partition2Agents) {
        await this.blockCommunication(agent1, agent2);
      }
    }

    // Ensure communication within partitions
    for (const agents of [partition1Agents, partition2Agents]) {
      for (const agent1 of agents) {
        for (const agent2 of agents) {
          if (agent1 !== agent2) {
            await this.allowCommunication(agent1, agent2);
          }
        }
      }
    }
  }

  async blockCommunication(agent1, agent2) {
    const proxy1 = this.proxies.get(agent1);
    const proxy2 = this.proxies.get(agent2);

    if (proxy1) {
      await proxy1.addToxic({
        type: 'bandwidth',
        name: `block-to-${agent2}`,
        stream: 'downstream',
        attributes: {
          rate: 0  // Complete block
        }
      });
    }

    if (proxy2) {
      await proxy2.addToxic({
        type: 'bandwidth',
        name: `block-to-${agent1}`,
        stream: 'upstream',
        attributes: {
          rate: 0  // Complete block
        }
      });
    }
  }

  async injectLatency(agentName, latencyMs) {
    const proxy = this.proxies.get(agentName);
    
    await proxy.addToxic({
      type: 'latency',
      name: `latency-${Date.now()}`,
      stream: 'downstream',
      attributes: {
        latency: latencyMs,
        jitter: latencyMs * 0.1  // 10% jitter
      }
    });
  }

  async injectPacketLoss(agentName, lossRate) {
    const proxy = this.proxies.get(agentName);
    
    await proxy.addToxic({
      type: 'timeout',
      name: `packet-loss-${Date.now()}`,
      stream: 'downstream',
      attributes: {
        timeout: 0  // Immediate timeout
      },
      toxicity: lossRate  // 0.0 to 1.0
    });
  }

  async clearAllToxics() {
    for (const [name, proxy] of this.proxies) {
      const toxics = await proxy.toxics();
      for (const toxic of toxics) {
        await proxy.removeToxic(toxic.name);
      }
    }
  }
}
```

---

## 🐳 **Testcontainers Multi-Agent Orchestration**

### **Testcontainers Test Framework**

```javascript
import { DockerComposeEnvironment, Wait } from 'testcontainers';
import { GenericContainer } from 'testcontainers';

class MultiAgentTestOrchestrator {
  constructor() {
    this.environment = null;
    this.containers = new Map();
    this.toxiproxyManager = new ToxiproxyManager();
  }

  async setup() {
    console.log('Setting up multi-agent test environment...');
    
    // Start Docker Compose environment
    this.environment = await new DockerComposeEnvironment(
      __dirname,
      'docker-compose.test.yml'
    )
    .withWaitStrategy('redis-master', Wait.forLogMessage('Ready to accept connections'))
    .withWaitStrategy('infrastructure-orchestrator', Wait.forHealthCheck())
    .up();

    // Get container references
    await this.mapContainers();
    
    // Setup Toxiproxy
    await this.toxiproxyManager.setupProxies();
    
    // Wait for all agents to be ready
    await this.waitForSystemReady();
  }

  async mapContainers() {
    const allServices = [
      ...TEST_ENVIRONMENT.metaAgents.map(a => a.name),
      ...TEST_ENVIRONMENT.domainAgents.map(a => a.name),
      ...TEST_ENVIRONMENT.infrastructure.map(i => i.name)
    ];

    for (const serviceName of allServices) {
      const container = this.environment.getContainer(serviceName);
      this.containers.set(serviceName, container);
    }
  }

  async waitForSystemReady() {
    console.log('Waiting for system to be ready...');
    
    // Wait for Infrastructure Orchestrator to elect leader
    await this.waitForLeaderElection();
    
    // Wait for all agents to register
    await this.waitForAgentRegistration();
    
    // Wait for WebSocket connections
    await this.waitForWebSocketConnections();
    
    console.log('System ready for testing!');
  }

  async waitForLeaderElection() {
    const maxRetries = 30;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const response = await fetch('http://localhost:3001/api/leader');
        const data = await response.json();
        
        if (data.isLeader) {
          console.log('Leader elected:', data.leaderId);
          return;
        }
      } catch (error) {
        // Leader not yet elected
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    throw new Error('Leader election timeout');
  }

  async simulateSplitBrain(scenario) {
    console.log(`Simulating split-brain scenario: ${scenario.name}`);
    
    const startTime = Date.now();
    const metrics = {
      scenario: scenario.name,
      startTime,
      events: []
    };

    // Create network partition
    await this.toxiproxyManager.createNetworkPartition(
      scenario.partition1,
      scenario.partition2
    );
    
    metrics.events.push({
      time: Date.now() - startTime,
      event: 'PARTITION_CREATED',
      details: scenario
    });

    // Monitor system behavior
    const monitor = this.startMonitoring(metrics);
    
    // Maintain partition for specified duration
    await new Promise(resolve => setTimeout(resolve, scenario.duration));
    
    // Heal partition
    await this.toxiproxyManager.clearAllToxics();
    
    metrics.events.push({
      time: Date.now() - startTime,
      event: 'PARTITION_HEALED'
    });

    // Wait for recovery
    await this.waitForRecovery();
    
    metrics.endTime = Date.now();
    metrics.totalDuration = metrics.endTime - startTime;
    
    // Stop monitoring
    clearInterval(monitor);
    
    return metrics;
  }

  startMonitoring(metrics) {
    return setInterval(async () => {
      const status = await this.collectSystemStatus();
      
      metrics.events.push({
        time: Date.now() - metrics.startTime,
        event: 'STATUS_CHECK',
        status
      });
      
      // Check for split-brain detection
      if (status.splitBrainDetected) {
        metrics.events.push({
          time: Date.now() - metrics.startTime,
          event: 'SPLIT_BRAIN_DETECTED',
          details: status.splitBrainDetails
        });
      }
    }, 1000); // Check every second
  }

  async collectSystemStatus() {
    const status = {
      timestamp: Date.now(),
      agents: {},
      redis: {},
      websocket: {},
      splitBrainDetected: false
    };

    // Check each agent
    for (const agent of [...TEST_ENVIRONMENT.metaAgents, ...TEST_ENVIRONMENT.domainAgents]) {
      try {
        const response = await fetch(`http://localhost:${agent.port}/api/health`);
        const health = await response.json();
        
        status.agents[agent.name] = {
          healthy: response.ok,
          ...health
        };
      } catch (error) {
        status.agents[agent.name] = {
          healthy: false,
          error: error.message
        };
      }
    }

    // Check for multiple leaders (split-brain indicator)
    const leaders = Object.entries(status.agents)
      .filter(([name, data]) => data.isLeader)
      .map(([name]) => name);
    
    if (leaders.length > 1) {
      status.splitBrainDetected = true;
      status.splitBrainDetails = {
        multipleLeaders: leaders,
        count: leaders.length
      };
    }

    return status;
  }

  async validateRecovery() {
    const validation = {
      dataConsistency: await this.checkDataConsistency(),
      leadershipUnified: await this.checkLeadershipUnified(),
      agentsHealthy: await this.checkAllAgentsHealthy(),
      workflowsContinued: await this.checkWorkflowContinuation()
    };

    validation.success = Object.values(validation).every(v => v.passed);
    
    return validation;
  }

  async cleanup() {
    if (this.environment) {
      await this.environment.down({ removeVolumes: true });
    }
  }
}
```

---

## 🔄 **Docker Compose Test Scenarios**

### **Agent Dockerfile for Testing**

```dockerfile
# Dockerfile for test agents
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy agent code
COPY src/ ./src/

# Add health check
HEALTHCHECK --interval=5s --timeout=3s --retries=3 \
  CMD node healthcheck.js || exit 1

# Environment variables
ENV NODE_ENV=test
ENV AGENT_PORT=3000

# Start agent
CMD ["node", "src/index.js"]
```

### **Agent Implementation with Split-Brain Detection**

```javascript
// Base agent implementation for testing
class TestAgent {
  constructor(config) {
    this.id = config.agentId;
    this.port = config.port;
    this.role = config.role;
    this.isLeader = false;
    this.peers = new Map();
    this.splitBrainDetector = new SplitBrainDetector(this);
    
    this.initializeServices();
  }

  async initializeServices() {
    // Redis connection with Sentinel
    await this.initializeRedis();
    
    // WebSocket connection
    await this.initializeWebSocket();
    
    // HTTP API
    await this.initializeAPI();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Attempt leader election
    await this.attemptLeaderElection();
  }

  async initializeRedis() {
    const sentinelNodes = [
      { host: process.env.SENTINEL_1_HOST || 'localhost', port: 26379 },
      { host: process.env.SENTINEL_2_HOST || 'localhost', port: 26380 },
      { host: process.env.SENTINEL_3_HOST || 'localhost', port: 26381 }
    ];

    this.redis = createClient({
      sentinels: sentinelNodes,
      name: 'mymaster',
      sentinelRetryStrategy: (times) => Math.min(times * 100, 3000)
    });

    this.redis.on('error', (err) => {
      console.error(`Redis error: ${err.message}`);
      this.handleRedisError(err);
    });

    await this.redis.connect();
  }

  async initializeWebSocket() {
    this.io = io(process.env.WEBSOCKET_URL || 'ws://localhost:8080', {
      auth: {
        agentId: this.id,
        role: this.role
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    this.io.on('connect', () => {
      console.log(`Agent ${this.id} connected to WebSocket hub`);
      this.broadcastPresence();
    });

    this.io.on('agent-heartbeat', (data) => {
      this.updatePeerStatus(data.agentId, data);
    });

    this.io.on('split-brain-detected', (data) => {
      console.error('Split-brain detected!', data);
      this.handleSplitBrainDetection(data);
    });
  }

  async initializeAPI() {
    const app = express();
    app.use(express.json());

    // Health endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        agentId: this.id,
        healthy: true,
        isLeader: this.isLeader,
        visiblePeers: Array.from(this.peers.keys()),
        uptime: process.uptime()
      });
    });

    // Leader endpoint
    app.get('/api/leader', async (req, res) => {
      const leader = await this.redis.get('leader');
      res.json({
        isLeader: this.isLeader,
        leaderId: leader,
        currentAgent: this.id
      });
    });

    // Chaos injection endpoint
    app.post('/api/chaos/inject', async (req, res) => {
      const { type, parameters } = req.body;
      await this.injectChaos(type, parameters);
      res.json({ success: true });
    });

    app.listen(this.port, () => {
      console.log(`Agent ${this.id} API listening on port ${this.port}`);
    });
  }

  startHeartbeat() {
    setInterval(() => {
      this.broadcastPresence();
      this.checkPeerHealth();
      
      if (this.isLeader) {
        this.performLeaderDuties();
      }
    }, 5000);
  }

  broadcastPresence() {
    const heartbeat = {
      agentId: this.id,
      timestamp: Date.now(),
      isLeader: this.isLeader,
      visiblePeers: Array.from(this.peers.keys())
    };

    // Broadcast via WebSocket
    this.io.emit('agent-heartbeat', heartbeat);
    
    // Update Redis
    this.redis.hset('agent:presence', this.id, JSON.stringify(heartbeat));
    this.redis.expire(`agent:presence:${this.id}`, 10);
  }

  updatePeerStatus(peerId, data) {
    this.peers.set(peerId, {
      lastSeen: Date.now(),
      ...data
    });
  }

  checkPeerHealth() {
    const now = Date.now();
    const timeout = 10000; // 10 seconds
    
    for (const [peerId, peer] of this.peers) {
      if (now - peer.lastSeen > timeout) {
        console.warn(`Peer ${peerId} appears to be down`);
        this.peers.delete(peerId);
      }
    }
    
    // Check for split-brain
    this.splitBrainDetector.check();
  }

  async attemptLeaderElection() {
    const token = await this.generateFencingToken();
    
    const script = `
      local leader = redis.call('get', 'leader')
      local token_epoch = tonumber(ARGV[1])
      
      if not leader then
        redis.call('set', 'leader', ARGV[2])
        redis.call('expire', 'leader', 30)
        redis.call('set', 'leader:token', ARGV[1])
        return 1
      end
      
      local current_token = redis.call('get', 'leader:token')
      if current_token and tonumber(current_token) < token_epoch then
        redis.call('set', 'leader', ARGV[2])
        redis.call('expire', 'leader', 30)
        redis.call('set', 'leader:token', ARGV[1])
        return 1
      end
      
      return 0
    `;

    try {
      const result = await this.redis.eval(script, 0, token, this.id);
      
      if (result === 1) {
        this.isLeader = true;
        console.log(`Agent ${this.id} became leader with token ${token}`);
        this.startLeadershipRenewal();
      }
    } catch (error) {
      console.error('Leader election failed:', error);
    }
  }

  async generateFencingToken() {
    return await this.redis.incr('fencing:epoch');
  }

  async performLeaderDuties() {
    // Assign tasks
    await this.assignPendingTasks();
    
    // Monitor system health
    await this.monitorSystemHealth();
    
    // Renew leadership
    await this.renewLeadership();
  }

  async handleSplitBrainDetection(detection) {
    console.error(`Split-brain detected by ${this.id}:`, detection);
    
    if (detection.hasQuorum) {
      // We're in the majority partition
      console.log('In majority partition, continuing operation');
    } else {
      // We're in the minority partition
      console.log('In minority partition, entering read-only mode');
      this.enterReadOnlyMode();
    }
  }

  enterReadOnlyMode() {
    this.isLeader = false;
    this.readOnlyMode = true;
    console.log(`Agent ${this.id} entered read-only mode`);
  }

  async injectChaos(type, parameters) {
    switch (type) {
      case 'cpu-spike':
        this.simulateCPUSpike(parameters.duration);
        break;
      case 'memory-leak':
        this.simulateMemoryLeak(parameters.rate);
        break;
      case 'slow-redis':
        this.simulateSlowRedis(parameters.delay);
        break;
      case 'crash':
        process.exit(1);
        break;
    }
  }

  simulateCPUSpike(duration) {
    const endTime = Date.now() + duration;
    while (Date.now() < endTime) {
      // Busy loop
      Math.sqrt(Math.random());
    }
  }
}

// Split-brain detector
class SplitBrainDetector {
  constructor(agent) {
    this.agent = agent;
    this.detectionHistory = [];
  }

  check() {
    const visibleAgents = this.agent.peers.size + 1; // Include self
    const totalAgents = 16;
    const quorum = Math.floor(totalAgents / 2) + 1;
    
    if (visibleAgents < quorum) {
      const detection = {
        timestamp: Date.now(),
        visibleAgents,
        totalAgents,
        hasQuorum: false,
        partition: Array.from(this.agent.peers.keys()).concat([this.agent.id])
      };
      
      this.detectionHistory.push(detection);
      this.agent.handleSplitBrainDetection(detection);
      
      // Broadcast detection
      this.agent.io.emit('split-brain-detected', detection);
    }
  }
}
```

---

## ☸️ **Chaos Mesh Kubernetes Testing**

### **Chaos Mesh Installation**

```bash
# Install Chaos Mesh on Kubernetes cluster
kubectl create ns chaos-testing
curl -sSL https://mirrors.chaos-mesh.org/v2.5.0/install.sh | bash -s -- --local kind --name=chaos-mesh
```

### **NetworkChaos for Split-Brain**

```yaml
# network-partition-chaos.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: agent-split-brain
  namespace: chaos-testing
spec:
  action: partition
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      "app.kubernetes.io/component": "agent"
  direction: both
  duration: "5m"
  partition:
    # Partition 1: Meta-agents
    - selector:
        namespaces:
          - default
        labelSelectors:
          "agent.type": "meta"
      # Partition 2: Domain agents  
    - selector:
        namespaces:
          - default
        labelSelectors:
          "agent.type": "domain"
```

### **PodChaos for Leader Failure**

```yaml
# pod-failure-chaos.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: leader-failure
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      "app.kubernetes.io/name": "infrastructure-orchestrator"
      "role": "leader"
  duration: "30s"
  scheduler:
    cron: "@every 2m"
```

### **Chaos Mesh Test Orchestrator**

```javascript
import { KubeConfig, AppsV1Api, CustomObjectsApi } from '@kubernetes/client-node';

class ChaosMeshTestOrchestrator {
  constructor() {
    const kc = new KubeConfig();
    kc.loadFromDefault();
    
    this.k8sApi = kc.makeApiClient(AppsV1Api);
    this.customApi = kc.makeApiClient(CustomObjectsApi);
  }

  async runSplitBrainScenario(scenario) {
    console.log(`Running Chaos Mesh scenario: ${scenario.name}`);
    
    // Apply chaos manifest
    const chaos = await this.applyChaosManifest(scenario.manifest);
    
    // Monitor system during chaos
    const monitor = this.startK8sMonitoring();
    
    // Wait for chaos duration
    await new Promise(resolve => setTimeout(resolve, scenario.duration));
    
    // Collect metrics
    const metrics = await this.collectChaosMetrics(chaos);
    
    // Clean up chaos
    await this.deleteChaosManifest(chaos);
    
    clearInterval(monitor);
    
    return metrics;
  }

  async applyChaosManifest(manifest) {
    const response = await this.customApi.createNamespacedCustomObject(
      'chaos-mesh.org',
      'v1alpha1',
      manifest.metadata.namespace,
      manifest.kind.toLowerCase() + 's',
      manifest
    );
    
    return response.body;
  }

  startK8sMonitoring() {
    return setInterval(async () => {
      // Get pod status
      const pods = await this.k8sApi.listNamespacedPod('default');
      
      // Check for split-brain indicators
      const leaders = pods.body.items.filter(pod => 
        pod.metadata.labels?.role === 'leader'
      );
      
      if (leaders.length > 1) {
        console.error('Multiple leaders detected in Kubernetes!');
        console.error('Leaders:', leaders.map(p => p.metadata.name));
      }
      
      // Check pod health
      const unhealthyPods = pods.body.items.filter(pod =>
        pod.status.phase !== 'Running'
      );
      
      if (unhealthyPods.length > 0) {
        console.warn('Unhealthy pods:', unhealthyPods.map(p => ({
          name: p.metadata.name,
          phase: p.status.phase,
          reason: p.status.reason
        })));
      }
    }, 5000);
  }

  async collectChaosMetrics(chaos) {
    // Get chaos events
    const events = await this.k8sApi.listNamespacedEvent(
      chaos.metadata.namespace,
      undefined,
      undefined,
      undefined,
      `involvedObject.name=${chaos.metadata.name}`
    );

    // Get pod metrics during chaos
    const metrics = {
      chaosType: chaos.kind,
      duration: chaos.spec.duration,
      events: events.body.items.map(e => ({
        time: e.firstTimestamp,
        reason: e.reason,
        message: e.message
      })),
      affectedPods: await this.getAffectedPods(chaos),
      recoveryTime: null
    };

    // Measure recovery time
    const recoveryStart = Date.now();
    await this.waitForSystemRecovery();
    metrics.recoveryTime = Date.now() - recoveryStart;

    return metrics;
  }

  async waitForSystemRecovery() {
    const maxWait = 300000; // 5 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const healthy = await this.checkSystemHealth();
      
      if (healthy) {
        console.log('System recovered!');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('System recovery timeout');
  }

  async checkSystemHealth() {
    // Check all pods are running
    const pods = await this.k8sApi.listNamespacedPod('default');
    const allRunning = pods.body.items.every(pod => 
      pod.status.phase === 'Running'
    );
    
    if (!allRunning) return false;
    
    // Check single leader
    const leaders = pods.body.items.filter(pod =>
      pod.metadata.labels?.role === 'leader'
    );
    
    if (leaders.length !== 1) return false;
    
    // Check Redis connectivity
    // ... additional health checks
    
    return true;
  }
}
```

---

## 🧪 **Split-Brain Test Scenarios**

### **Comprehensive Test Suite**

```javascript
class SplitBrainTestSuite {
  constructor() {
    this.orchestrator = new MultiAgentTestOrchestrator();
    this.scenarios = this.defineScenarios();
    this.results = [];
  }

  defineScenarios() {
    return [
      {
        name: 'Simple Network Partition',
        description: 'Split agents into two equal groups',
        partition1: [
          'infrastructure-orchestrator',
          'parameter-flow-agent',
          'scaffold-generator',
          'backend-domain-agent',
          'frontend-domain-agent'
        ],
        partition2: [
          'template-engine-factory',
          'all-purpose-pattern-agent',
          'prd-parser-agent',
          'devops-domain-agent',
          'qa-domain-agent'
        ],
        duration: 60000, // 1 minute
        expectedBehavior: {
          splitBrainDetection: true,
          dualLeadership: true,
          dataInconsistency: true,
          automaticRecovery: true
        }
      },
      {
        name: 'Asymmetric Partition',
        description: 'Isolate critical coordinator agents',
        partition1: [
          'infrastructure-orchestrator',
          'parameter-flow-agent'
        ],
        partition2: [
          // All other agents
          ...TEST_ENVIRONMENT.metaAgents.slice(2).map(a => a.name),
          ...TEST_ENVIRONMENT.domainAgents.map(a => a.name)
        ],
        duration: 120000, // 2 minutes
        expectedBehavior: {
          minorityReadOnly: true,
          majorityOperational: true,
          gracefulDegradation: true
        }
      },
      {
        name: 'Progressive Partition',
        description: 'Gradually isolate agents',
        phases: [
          { isolate: ['backend-domain-agent'], duration: 30000 },
          { isolate: ['frontend-domain-agent'], duration: 30000 },
          { isolate: ['infrastructure-orchestrator'], duration: 60000 }
        ],
        expectedBehavior: {
          cascadingFailure: true,
          partialRecovery: true,
          workflowCorruption: true
        }
      },
      {
        name: 'Redis Sentinel Failure',
        description: 'Kill Redis sentinels during operation',
        actions: [
          { kill: 'redis-sentinel-1', at: 0 },
          { kill: 'redis-sentinel-2', at: 30000 },
          { recover: 'redis-sentinel-1', at: 60000 }
        ],
        duration: 120000,
        expectedBehavior: {
          redisFailover: true,
          temporaryInconsistency: true,
          eventualConsistency: true
        }
      },
      {
        name: 'WebSocket Hub Partition',
        description: 'Isolate WebSocket coordination hub',
        partition1: ['websocket-hub'],
        partition2: [
          ...TEST_ENVIRONMENT.metaAgents.map(a => a.name),
          ...TEST_ENVIRONMENT.domainAgents.map(a => a.name)
        ],
        duration: 90000,
        expectedBehavior: {
          coordinationLoss: true,
          fallbackToRedis: true,
          delayedRecovery: true
        }
      }
    ];
  }

  async runAllScenarios() {
    console.log('Starting comprehensive split-brain test suite...');
    
    for (const scenario of this.scenarios) {
      try {
        const result = await this.runScenario(scenario);
        this.results.push({
          scenario: scenario.name,
          success: this.validateScenarioResult(result, scenario),
          result
        });
      } catch (error) {
        this.results.push({
          scenario: scenario.name,
          success: false,
          error: error.message
        });
      }
      
      // Clean slate between scenarios
      await this.resetEnvironment();
    }
    
    return this.generateReport();
  }

  async runScenario(scenario) {
    console.log(`\n=== Running scenario: ${scenario.name} ===`);
    console.log(`Description: ${scenario.description}`);
    
    // Setup environment
    await this.orchestrator.setup();
    
    // Collect baseline metrics
    const baseline = await this.collectBaselineMetrics();
    
    // Execute scenario
    let metrics;
    if (scenario.phases) {
      metrics = await this.runProgressiveScenario(scenario);
    } else if (scenario.actions) {
      metrics = await this.runActionBasedScenario(scenario);
    } else {
      metrics = await this.orchestrator.simulateSplitBrain(scenario);
    }
    
    // Validate recovery
    const recovery = await this.orchestrator.validateRecovery();
    
    // Cleanup
    await this.orchestrator.cleanup();
    
    return {
      baseline,
      metrics,
      recovery,
      duration: metrics.totalDuration
    };
  }

  async runProgressiveScenario(scenario) {
    const metrics = {
      scenario: scenario.name,
      phases: [],
      events: []
    };
    
    for (const phase of scenario.phases) {
      console.log(`Phase: Isolating ${phase.isolate.join(', ')}`);
      
      // Create partition
      await this.orchestrator.toxiproxyManager.createNetworkPartition(
        phase.isolate,
        this.getRemainingAgents(phase.isolate)
      );
      
      // Monitor phase
      const phaseMetrics = await this.monitorPhase(phase.duration);
      metrics.phases.push(phaseMetrics);
      
      // Don't clear toxics between phases (progressive isolation)
    }
    
    // Clear all toxics at end
    await this.orchestrator.toxiproxyManager.clearAllToxics();
    
    return metrics;
  }

  validateScenarioResult(result, scenario) {
    const expected = scenario.expectedBehavior;
    const actual = this.analyzeResult(result);
    
    const validations = [];
    
    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = actual[key];
      const valid = actualValue === expectedValue;
      
      validations.push({
        behavior: key,
        expected: expectedValue,
        actual: actualValue,
        valid
      });
      
      if (!valid) {
        console.error(`Validation failed for ${key}: expected ${expectedValue}, got ${actualValue}`);
      }
    }
    
    return validations.every(v => v.valid);
  }

  analyzeResult(result) {
    const analysis = {
      splitBrainDetection: false,
      dualLeadership: false,
      dataInconsistency: false,
      automaticRecovery: false,
      minorityReadOnly: false,
      majorityOperational: false,
      gracefulDegradation: false
    };
    
    // Analyze events
    const events = result.metrics.events || [];
    
    // Check for split-brain detection
    analysis.splitBrainDetection = events.some(e => 
      e.event === 'SPLIT_BRAIN_DETECTED'
    );
    
    // Check for dual leadership
    const statusChecks = events.filter(e => e.event === 'STATUS_CHECK');
    analysis.dualLeadership = statusChecks.some(check => {
      const leaders = Object.entries(check.status.agents)
        .filter(([name, data]) => data.isLeader)
        .map(([name]) => name);
      return leaders.length > 1;
    });
    
    // Check recovery
    analysis.automaticRecovery = result.recovery.success;
    
    return analysis;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length
      },
      scenarios: this.results,
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    fs.writeFileSync(
      `split-brain-test-report-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze failure patterns
    const failures = this.results.filter(r => !r.success);
    
    if (failures.some(f => f.scenario.includes('Redis'))) {
      recommendations.push(
        'Consider implementing Redis Cluster for better partition tolerance'
      );
    }
    
    if (failures.some(f => f.result?.recovery?.dataConsistency?.passed === false)) {
      recommendations.push(
        'Implement CRDTs for critical data structures to improve consistency'
      );
    }
    
    return recommendations;
  }
}
```

---

## 📊 **Validation and Metrics**

### **Validation Framework**

```javascript
class SplitBrainValidationFramework {
  constructor() {
    this.validators = [
      new DataConsistencyValidator(),
      new LeadershipValidator(),
      new WorkflowValidator(),
      new PerformanceValidator()
    ];
  }

  async validateScenario(scenarioResult) {
    const validationResults = {
      timestamp: Date.now(),
      scenario: scenarioResult.scenario,
      validations: []
    };

    for (const validator of this.validators) {
      const result = await validator.validate(scenarioResult);
      validationResults.validations.push(result);
    }

    validationResults.overall = this.calculateOverallResult(validationResults.validations);
    
    return validationResults;
  }

  calculateOverallResult(validations) {
    const scores = validations.map(v => v.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    return {
      score: average,
      passed: average >= 0.8,
      level: this.getValidationLevel(average)
    };
  }

  getValidationLevel(score) {
    if (score >= 0.95) return 'EXCELLENT';
    if (score >= 0.8) return 'GOOD';
    if (score >= 0.6) return 'ACCEPTABLE';
    if (score >= 0.4) return 'POOR';
    return 'CRITICAL';
  }
}

class DataConsistencyValidator {
  async validate(scenarioResult) {
    const validation = {
      name: 'Data Consistency',
      checks: []
    };

    // Check task consistency
    const taskCheck = await this.checkTaskConsistency(scenarioResult);
    validation.checks.push(taskCheck);

    // Check parameter consistency
    const paramCheck = await this.checkParameterConsistency(scenarioResult);
    validation.checks.push(paramCheck);

    // Check state consistency
    const stateCheck = await this.checkStateConsistency(scenarioResult);
    validation.checks.push(stateCheck);

    validation.score = this.calculateScore(validation.checks);
    
    return validation;
  }

  async checkTaskConsistency(result) {
    // Compare task states before and after
    const before = result.baseline.tasks;
    const after = result.recovery.finalState?.tasks;
    
    let inconsistencies = 0;
    let total = 0;
    
    for (const taskId in before) {
      total++;
      if (!after[taskId] || before[taskId].status !== after[taskId].status) {
        inconsistencies++;
      }
    }
    
    return {
      name: 'Task Consistency',
      passed: inconsistencies === 0,
      details: {
        total,
        inconsistencies,
        rate: inconsistencies / total
      }
    };
  }

  calculateScore(checks) {
    const passed = checks.filter(c => c.passed).length;
    return passed / checks.length;
  }
}

class LeadershipValidator {
  async validate(scenarioResult) {
    const validation = {
      name: 'Leadership Integrity',
      checks: []
    };

    // Check for split-brain leadership
    const splitBrainCheck = this.checkForSplitBrainLeadership(scenarioResult);
    validation.checks.push(splitBrainCheck);

    // Check leadership transitions
    const transitionCheck = this.checkLeadershipTransitions(scenarioResult);
    validation.checks.push(transitionCheck);

    // Check fencing token progression
    const fencingCheck = this.checkFencingTokens(scenarioResult);
    validation.checks.push(fencingCheck);

    validation.score = this.calculateScore(validation.checks);
    
    return validation;
  }

  checkForSplitBrainLeadership(result) {
    const events = result.metrics.events || [];
    let maxSimultaneousLeaders = 1;
    
    events.forEach(event => {
      if (event.status?.agents) {
        const leaders = Object.values(event.status.agents)
          .filter(a => a.isLeader).length;
        maxSimultaneousLeaders = Math.max(maxSimultaneousLeaders, leaders);
      }
    });
    
    return {
      name: 'Single Leader Constraint',
      passed: maxSimultaneousLeaders <= 1,
      details: {
        maxSimultaneousLeaders,
        expectation: 'At most 1 leader at any time'
      }
    };
  }

  calculateScore(checks) {
    // Leadership is critical - any failure is severe
    const allPassed = checks.every(c => c.passed);
    return allPassed ? 1.0 : 0.0;
  }
}
```

### **Metrics Collection**

```javascript
class MetricsCollector {
  constructor() {
    this.metrics = {
      scenarios: [],
      aggregated: {}
    };
  }

  collectScenarioMetrics(scenarioResult) {
    const metrics = {
      scenario: scenarioResult.scenario,
      duration: scenarioResult.duration,
      
      // Detection metrics
      detectionTime: this.calculateDetectionTime(scenarioResult),
      detectionAccuracy: this.calculateDetectionAccuracy(scenarioResult),
      
      // Recovery metrics
      recoveryTime: this.calculateRecoveryTime(scenarioResult),
      dataLoss: this.calculateDataLoss(scenarioResult),
      
      // Performance metrics
      throughputDegradation: this.calculateThroughputDegradation(scenarioResult),
      latencyIncrease: this.calculateLatencyIncrease(scenarioResult),
      
      // Reliability metrics
      availabilityDuringPartition: this.calculateAvailability(scenarioResult),
      consistencyViolations: this.countConsistencyViolations(scenarioResult)
    };
    
    this.metrics.scenarios.push(metrics);
    this.updateAggregatedMetrics(metrics);
    
    return metrics;
  }

  calculateDetectionTime(result) {
    const events = result.metrics.events || [];
    const partitionStart = events.find(e => e.event === 'PARTITION_CREATED');
    const detection = events.find(e => e.event === 'SPLIT_BRAIN_DETECTED');
    
    if (partitionStart && detection) {
      return detection.time - partitionStart.time;
    }
    
    return null;
  }

  calculateRecoveryTime(result) {
    const events = result.metrics.events || [];
    const healStart = events.find(e => e.event === 'PARTITION_HEALED');
    const recoveryComplete = result.recovery?.timestamp;
    
    if (healStart && recoveryComplete) {
      return recoveryComplete - (result.metrics.startTime + healStart.time);
    }
    
    return null;
  }

  generateMetricsReport() {
    return {
      summary: {
        totalScenarios: this.metrics.scenarios.length,
        averageDetectionTime: this.average('detectionTime'),
        averageRecoveryTime: this.average('recoveryTime'),
        dataLossRate: this.average('dataLoss'),
        consistencyScore: 1 - this.average('consistencyViolations')
      },
      scenarios: this.metrics.scenarios,
      aggregated: this.metrics.aggregated,
      visualization: this.generateVisualizationData()
    };
  }

  average(metric) {
    const values = this.metrics.scenarios
      .map(s => s[metric])
      .filter(v => v !== null);
    
    if (values.length === 0) return null;
    
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
```

---

## 🤖 **Automated Test Suite**

### **Jest Integration**

```javascript
// split-brain.test.js
import { SplitBrainTestSuite } from './split-brain-test-suite';
import { MultiAgentTestOrchestrator } from './multi-agent-orchestrator';
import { ToxiproxyManager } from './toxiproxy-manager';

describe('Split-Brain Resilience Tests', () => {
  let orchestrator;
  let toxiproxy;
  
  beforeAll(async () => {
    orchestrator = new MultiAgentTestOrchestrator();
    toxiproxy = new ToxiproxyManager();
    await orchestrator.setup();
  }, 300000); // 5 minute timeout for setup
  
  afterAll(async () => {
    await orchestrator.cleanup();
  });
  
  describe('Network Partition Scenarios', () => {
    test('should detect split-brain within 30 seconds', async () => {
      // Create partition
      await toxiproxy.createNetworkPartition(
        ['infrastructure-orchestrator', 'parameter-flow-agent'],
        ['backend-domain-agent', 'frontend-domain-agent']
      );
      
      // Wait for detection
      const startTime = Date.now();
      let detected = false;
      
      while (Date.now() - startTime < 30000 && !detected) {
        const status = await orchestrator.collectSystemStatus();
        detected = status.splitBrainDetected;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      expect(detected).toBe(true);
      expect(Date.now() - startTime).toBeLessThan(30000);
      
      // Cleanup
      await toxiproxy.clearAllToxics();
    }, 60000);
    
    test('should maintain single leader during partition', async () => {
      // Monitor leadership during partition
      const leadershipLog = [];
      
      // Start monitoring
      const monitor = setInterval(async () => {
        const leaders = await orchestrator.getActiveLeaders();
        leadershipLog.push({
          timestamp: Date.now(),
          leaders: leaders.length,
          ids: leaders
        });
      }, 1000);
      
      // Create partition
      await toxiproxy.createNetworkPartition(
        ['infrastructure-orchestrator'],
        ['parameter-flow-agent', 'scaffold-generator']
      );
      
      // Wait 30 seconds
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Clear partition
      await toxiproxy.clearAllToxics();
      
      // Stop monitoring
      clearInterval(monitor);
      
      // Verify at most one leader at any time
      const multiLeaderEvents = leadershipLog.filter(log => log.leaders > 1);
      expect(multiLeaderEvents.length).toBe(0);
    }, 60000);
    
    test('should recover data consistency after partition', async () => {
      // Insert test data
      const testData = await orchestrator.insertTestData({
        tasks: 100,
        parameters: 50,
        workflows: 10
      });
      
      // Create partition
      await toxiproxy.createNetworkPartition(
        ['infrastructure-orchestrator', 'backend-domain-agent'],
        ['parameter-flow-agent', 'frontend-domain-agent']
      );
      
      // Perform operations in both partitions
      await orchestrator.performPartitionedOperations();
      
      // Wait 60 seconds
      await new Promise(resolve => setTimeout(resolve, 60000));
      
      // Heal partition
      await toxiproxy.clearAllToxics();
      
      // Wait for recovery
      await orchestrator.waitForRecovery();
      
      // Validate data consistency
      const validation = await orchestrator.validateDataConsistency(testData);
      
      expect(validation.consistent).toBe(true);
      expect(validation.dataLoss).toBeLessThan(0.05); // Less than 5% data loss
    }, 120000);
  });
  
  describe('Chaos Injection Scenarios', () => {
    test('should handle leader crash during operation', async () => {
      // Get current leader
      const leader = await orchestrator.getCurrentLeader();
      
      // Start workflow
      const workflow = await orchestrator.startTestWorkflow();
      
      // Kill leader
      await orchestrator.killAgent(leader);
      
      // Wait for new leader election
      const newLeader = await orchestrator.waitForNewLeader();
      expect(newLeader).not.toBe(leader);
      
      // Verify workflow continues
      const completed = await orchestrator.waitForWorkflowCompletion(workflow.id);
      expect(completed).toBe(true);
    }, 90000);
    
    test('should degrade gracefully in minority partition', async () => {
      // Create asymmetric partition (2 vs 14 agents)
      await toxiproxy.createNetworkPartition(
        ['infrastructure-orchestrator', 'parameter-flow-agent'],
        TEST_ENVIRONMENT.metaAgents.slice(2).concat(TEST_ENVIRONMENT.domainAgents).map(a => a.name)
      );
      
      // Check minority partition behavior
      const minorityStatus = await orchestrator.getAgentStatus('infrastructure-orchestrator');
      expect(minorityStatus.mode).toBe('READ_ONLY');
      expect(minorityStatus.canWrite).toBe(false);
      
      // Check majority partition continues
      const majorityStatus = await orchestrator.getPartitionStatus('majority');
      expect(majorityStatus.operational).toBe(true);
      expect(majorityStatus.hasLeader).toBe(true);
      
      // Cleanup
      await toxiproxy.clearAllToxics();
    }, 60000);
  });
  
  describe('Performance Under Partition', () => {
    test('should maintain 50% throughput during partition', async () => {
      // Measure baseline throughput
      const baseline = await orchestrator.measureThroughput(30000);
      
      // Create partition
      await toxiproxy.createNetworkPartition(
        TEST_ENVIRONMENT.metaAgents.slice(0, 6).map(a => a.name),
        TEST_ENVIRONMENT.metaAgents.slice(6).concat(TEST_ENVIRONMENT.domainAgents).map(a => a.name)
      );
      
      // Measure throughput during partition
      const partitioned = await orchestrator.measureThroughput(30000);
      
      // Cleanup
      await toxiproxy.clearAllToxics();
      
      // Verify maintains at least 50% throughput
      const throughputRatio = partitioned.tasksPerSecond / baseline.tasksPerSecond;
      expect(throughputRatio).toBeGreaterThan(0.5);
    }, 90000);
  });
});
```

### **Test Execution Script**

```javascript
// run-split-brain-tests.js
import { SplitBrainTestSuite } from './split-brain-test-suite';
import { MetricsCollector } from './metrics-collector';
import { ReportGenerator } from './report-generator';

async function runComprehensiveTests() {
  console.log('Starting comprehensive split-brain validation...');
  
  const suite = new SplitBrainTestSuite();
  const collector = new MetricsCollector();
  
  try {
    // Run all scenarios
    const results = await suite.runAllScenarios();
    
    // Collect metrics
    for (const result of results.scenarios) {
      collector.collectScenarioMetrics(result);
    }
    
    // Generate reports
    const metricsReport = collector.generateMetricsReport();
    const validationReport = await generateValidationReport(results);
    
    // Save reports
    await saveReports({
      testResults: results,
      metrics: metricsReport,
      validation: validationReport
    });
    
    // Print summary
    printTestSummary(results);
    
    // Exit with appropriate code
    process.exit(results.summary.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

function printTestSummary(results) {
  console.log('\n=== Split-Brain Test Summary ===');
  console.log(`Total Scenarios: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Success Rate: ${(results.summary.passed / results.summary.total * 100).toFixed(1)}%`);
  
  if (results.summary.failed > 0) {
    console.log('\nFailed Scenarios:');
    results.scenarios
      .filter(s => !s.success)
      .forEach(s => console.log(`  - ${s.scenario}: ${s.error || 'Validation failed'}`));
  }
  
  if (results.recommendations.length > 0) {
    console.log('\nRecommendations:');
    results.recommendations.forEach(r => console.log(`  - ${r}`));
  }
}

// Run tests
runComprehensiveTests();
```

---

## 🔧 **CI/CD Integration**

### **GitHub Actions Workflow**

```yaml
# .github/workflows/split-brain-tests.yml
name: Split-Brain Resilience Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  split-brain-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Start Docker Compose environment
      run: |
        docker-compose -f docker-compose.test.yml up -d
        ./scripts/wait-for-healthy.sh
    
    - name: Run split-brain test suite
      run: npm run test:split-brain
      env:
        TEST_TIMEOUT: 3600000
    
    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: split-brain-test-results
        path: |
          split-brain-test-report-*.json
          test-metrics-*.json
          logs/
    
    - name: Publish test report
      if: always()
      uses: dorny/test-reporter@v1
      with:
        name: Split-Brain Test Results
        path: 'jest-results.xml'
        reporter: jest-junit
    
    - name: Cleanup
      if: always()
      run: docker-compose -f docker-compose.test.yml down -v

  chaos-mesh-tests:
    runs-on: ubuntu-latest
    needs: split-brain-tests
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Create Kind cluster
      uses: helm/kind-action@v1.5.0
      with:
        cluster_name: chaos-test
    
    - name: Install Chaos Mesh
      run: |
        kubectl create ns chaos-testing
        curl -sSL https://mirrors.chaos-mesh.org/v2.5.0/install.sh | bash
    
    - name: Deploy test agents
      run: |
        kubectl apply -f k8s/test-agents/
        kubectl wait --for=condition=ready pod -l app=agent --timeout=300s
    
    - name: Run Chaos Mesh scenarios
      run: |
        kubectl apply -f chaos-scenarios/
        npm run test:chaos-mesh
    
    - name: Collect Chaos Mesh results
      if: always()
      run: |
        kubectl logs -n chaos-testing -l app=chaos-controller > chaos-controller.log
        kubectl get events -A > k8s-events.log
```

### **Jenkins Pipeline**

```groovy
// Jenkinsfile
pipeline {
    agent {
        label 'docker'
    }
    
    options {
        timeout(time: 90, unit: 'MINUTES')
        timestamps()
    }
    
    stages {
        stage('Setup') {
            steps {
                script {
                    sh 'docker-compose -f docker-compose.test.yml build'
                    sh 'docker-compose -f docker-compose.test.yml up -d'
                    sh './scripts/wait-for-healthy.sh'
                }
            }
        }
        
        stage('Split-Brain Tests') {
            steps {
                script {
                    try {
                        sh 'npm run test:split-brain'
                    } catch (Exception e) {
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Chaos Engineering') {
            when {
                branch 'main'
            }
            steps {
                script {
                    sh 'npm run test:chaos'
                }
            }
        }
        
        stage('Report Generation') {
            steps {
                script {
                    sh 'npm run generate:reports'
                    
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'reports',
                        reportFiles: 'split-brain-report.html',
                        reportName: 'Split-Brain Test Report'
                    ])
                }
            }
        }
    }
    
    post {
        always {
            sh 'docker-compose -f docker-compose.test.yml down -v'
            archiveArtifacts artifacts: 'reports/**/*', fingerprint: true
            junit 'test-results/**/*.xml'
        }
        
        failure {
            emailext (
                subject: "Split-Brain Tests Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "The split-brain resilience tests have failed. Please check the test report.",
                to: "${env.TEAM_EMAIL}"
            )
        }
    }
}
```

---

## 📚 **References**

### **Research Sources**
1. TaskMaster Research: "chaos engineering split-brain simulation Node.js Toxiproxy" - Tool selection and implementation patterns
2. TaskMaster Research: "testcontainers Node.js Docker compose multi-agent testing" - Orchestration strategies
3. TaskMaster Research: "Chaos Mesh Kubernetes split-brain network chaos experiments" - Production chaos engineering

### **Code References**
1. Toxiproxy Node Client - Integration patterns for network fault injection
2. Testcontainers Node.js - Docker Compose environment management
3. Chaos Mesh Documentation - Kubernetes-native chaos engineering

### **Best Practices**
1. "Chaos Engineering: System Resiliency in Practice" - O'Reilly, 2020
2. "Testing Distributed Systems" - ACM Queue, 2024
3. "Split-Brain Testing Patterns" - SREcon 2024

---

## 🎯 **Key Takeaways**

1. **Toxiproxy + Testcontainers** provides the most flexible approach for Node.js chaos testing with fine-grained control

2. **Progressive scenarios** reveal cascading failures that simple partitions might miss

3. **Automated validation** is critical - manual verification doesn't scale across 16 agents

4. **CI/CD integration** ensures split-brain resilience is continuously validated

5. **Metrics collection** enables data-driven improvements to detection and recovery strategies

**Success Criteria**: All test scenarios should complete with >95% success rate, <30s detection time, <2min recovery time, and <5% data loss.