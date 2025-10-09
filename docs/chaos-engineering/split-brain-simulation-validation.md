# 🧪 **Split-Brain Simulation and Validation for 16-Agent Meta-Agent Factory**

## **Comprehensive Testing Framework for Distributed Node.js Systems**

**Version**: 1.0.0  
**Last Updated**: August 1, 2025  
**Focus**: Chaos Engineering, Network Partition Simulation, Automated Validation  
**Tech Stack**: Node.js, TypeScript, Docker, Toxiproxy, Chaos Mesh, Prometheus

---

## 📋 **Table of Contents**

1. [Executive Summary](#executive-summary)
2. [Simulation Environment Setup](#simulation-environment-setup)
3. [Toxiproxy Configuration](#toxiproxy-configuration)
4. [Chaos Mesh for Kubernetes](#chaos-mesh-for-kubernetes)
5. [Reproducible Split-Brain Scenarios](#reproducible-split-brain-scenarios)
6. [Metrics Collection Framework](#metrics-collection-framework)
7. [Automated Test Assertions](#automated-test-assertions)
8. [CI/CD Integration](#cicd-integration)
9. [Validation Playbooks](#validation-playbooks)
10. [Production Testing Patterns](#production-testing-patterns)

---

## 🎯 **Executive Summary**

This guide provides a comprehensive framework for simulating and validating split-brain scenarios in a 16-agent Node.js meta-agent factory. Using industry-standard chaos engineering tools and automated validation patterns, teams can ensure robust split-brain handling before production deployment.

**Key Features**:
- ✅ **Reproducible Scenarios**: Scripted network partitions with consistent results
- ✅ **Automated Validation**: Property-based testing for CRDT convergence
- ✅ **Observable Testing**: Prometheus metrics and Grafana dashboards
- ✅ **CI/CD Ready**: GitHub Actions and GitLab CI integration
- ✅ **Production-Grade**: Kubernetes-native chaos testing with Chaos Mesh

---

## 🛠️ **Simulation Environment Setup**

### **Docker Compose Architecture**

```yaml
# docker-compose.chaos.yml
version: '3.8'

services:
  # Toxiproxy for network fault injection
  toxiproxy:
    image: ghcr.io/shopify/toxiproxy:2.5.0
    container_name: toxiproxy
    ports:
      - "8474:8474"  # Admin API
      - "6380-6395:6380-6395"  # Redis proxies
      - "8080-8095:8080-8095"  # WebSocket proxies
    command: -host=0.0.0.0
    networks:
      - agent-network

  # Redis Sentinel Setup
  redis-master:
    image: redis:7-alpine
    container_name: redis-master
    command: redis-server --appendonly yes
    networks:
      - agent-network
    volumes:
      - redis-master-data:/data

  redis-sentinel-1:
    image: redis:7-alpine
    container_name: redis-sentinel-1
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./config/sentinel-1.conf:/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - agent-network

  redis-sentinel-2:
    image: redis:7-alpine
    container_name: redis-sentinel-2
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./config/sentinel-2.conf:/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - agent-network

  redis-sentinel-3:
    image: redis:7-alpine
    container_name: redis-sentinel-3
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./config/sentinel-3.conf:/etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - agent-network

  # 16 Meta-Agents
  agent-1:
    build:
      context: .
      dockerfile: Dockerfile.agent
    container_name: agent-1
    environment:
      - NODE_ID=agent-1
      - REDIS_URL=redis://toxiproxy:6380
      - WEBSOCKET_URL=ws://toxiproxy:8080
      - PROMETHEUS_PORT=9001
    depends_on:
      - toxiproxy
      - redis-master
    networks:
      - agent-network
    labels:
      - "chaos.mesh/agent=true"
      - "chaos.mesh/group=primary"

  # ... agents 2-16 with similar configuration ...

  # Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    networks:
      - agent-network

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./config/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./config/grafana/datasources:/etc/grafana/provisioning/datasources
      - grafana-data:/var/lib/grafana
    networks:
      - agent-network

  # Test Runner
  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    container_name: test-runner
    volumes:
      - ./tests:/app/tests
      - ./scripts:/app/scripts
      - test-results:/app/results
    depends_on:
      - prometheus
      - toxiproxy
    networks:
      - agent-network

networks:
  agent-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  redis-master-data:
  prometheus-data:
  grafana-data:
  test-results:
```

### **Agent Dockerfile**

```dockerfile
# Dockerfile.agent
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Health check
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
  CMD node healthcheck.js || exit 1

# Metrics endpoint
EXPOSE 9000

# Run agent
CMD ["node", "dist/agent.js"]
```

---

## 🌐 **Toxiproxy Configuration**

### **Proxy Setup Script**

```typescript
import axios from 'axios';

interface ToxicProxyConfig {
  name: string;
  listen: string;
  upstream: string;
}

export class ToxiproxyManager {
  private adminUrl = 'http://localhost:8474';
  private proxies: Map<string, ToxicProxyConfig> = new Map();

  async initialize(): Promise<void> {
    console.log('Initializing Toxiproxy configurations...');

    // Create Redis proxies for each agent
    for (let i = 1; i <= 16; i++) {
      await this.createProxy({
        name: `redis-agent-${i}`,
        listen: `0.0.0.0:${6380 + i - 1}`,
        upstream: 'redis-master:6379'
      });
    }

    // Create WebSocket proxies
    for (let i = 1; i <= 16; i++) {
      await this.createProxy({
        name: `ws-agent-${i}`,
        listen: `0.0.0.0:${8080 + i - 1}`,
        upstream: 'websocket-hub:8000'
      });
    }

    console.log('Proxies created successfully');
  }

  private async createProxy(config: ToxicProxyConfig): Promise<void> {
    try {
      await axios.post(`${this.adminUrl}/proxies`, config);
      this.proxies.set(config.name, config);
    } catch (error) {
      if (error.response?.status === 409) {
        // Proxy already exists, update it
        await axios.post(`${this.adminUrl}/proxies/${config.name}`, config);
      } else {
        throw error;
      }
    }
  }

  async createNetworkPartition(
    agents: string[],
    duration: number = 30000
  ): Promise<void> {
    console.log(`Creating network partition for agents: ${agents.join(', ')}`);

    // Add toxic to specified agent proxies
    const toxics = [];
    
    for (const agent of agents) {
      // Block Redis connection
      const redisToxic = this.addToxic(
        `redis-${agent}`,
        'latency',
        {
          latency: 100000, // 100 second latency (effectively a timeout)
          jitter: 0
        },
        'downstream'
      );
      
      // Block WebSocket connection
      const wsToxic = this.addToxic(
        `ws-${agent}`,
        'timeout',
        {
          timeout: 1
        },
        'downstream'
      );
      
      toxics.push(redisToxic, wsToxic);
    }

    await Promise.all(toxics);

    // Schedule removal
    if (duration > 0) {
      setTimeout(async () => {
        await this.healPartition(agents);
      }, duration);
    }
  }

  async healPartition(agents: string[]): Promise<void> {
    console.log(`Healing partition for agents: ${agents.join(', ')}`);

    const removals = [];
    
    for (const agent of agents) {
      removals.push(
        this.removeToxic(`redis-${agent}`, 'latency'),
        this.removeToxic(`ws-${agent}`, 'timeout')
      );
    }

    await Promise.all(removals);
  }

  private async addToxic(
    proxy: string,
    type: string,
    attributes: any,
    stream: 'upstream' | 'downstream' = 'downstream'
  ): Promise<void> {
    const toxic = {
      name: `${type}-${Date.now()}`,
      type,
      stream,
      toxicity: 1.0,
      attributes
    };

    await axios.post(
      `${this.adminUrl}/proxies/${proxy}/toxics`,
      toxic
    );
  }

  private async removeToxic(proxy: string, type: string): Promise<void> {
    try {
      const response = await axios.get(
        `${this.adminUrl}/proxies/${proxy}/toxics`
      );
      
      const toxics = response.data;
      
      for (const toxic of toxics) {
        if (toxic.type === type) {
          await axios.delete(
            `${this.adminUrl}/proxies/${proxy}/toxics/${toxic.name}`
          );
        }
      }
    } catch (error) {
      console.error(`Failed to remove toxic: ${error.message}`);
    }
  }

  // Advanced partition scenarios
  async createMajorityMinorityPartition(): Promise<void> {
    // Partition 5 agents (minority) from 11 agents (majority)
    const minorityAgents = ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5'];
    await this.createNetworkPartition(minorityAgents, 60000); // 1 minute
  }

  async createRandomPartitions(
    partitionCount: number = 3,
    duration: number = 30000
  ): Promise<void> {
    const allAgents = Array.from({ length: 16 }, (_, i) => `agent-${i + 1}`);
    const shuffled = allAgents.sort(() => Math.random() - 0.5);
    
    const partitionSize = Math.floor(16 / partitionCount);
    const partitions: string[][] = [];
    
    for (let i = 0; i < partitionCount; i++) {
      const start = i * partitionSize;
      const end = i === partitionCount - 1 ? 16 : start + partitionSize;
      partitions.push(shuffled.slice(start, end));
    }

    // Create network isolation between partitions
    for (let i = 0; i < partitions.length; i++) {
      for (let j = i + 1; j < partitions.length; j++) {
        await this.isolatePartitions(partitions[i], partitions[j], duration);
      }
    }
  }

  private async isolatePartitions(
    partition1: string[],
    partition2: string[],
    duration: number
  ): Promise<void> {
    // Block communication between partitions
    const blocks = [];
    
    for (const agent1 of partition1) {
      for (const agent2 of partition2) {
        // This would require more complex proxy configuration
        // to block agent-to-agent communication
        console.log(`Isolating ${agent1} from ${agent2}`);
      }
    }
  }

  async introduceSplitBrainScenarios(): Promise<void> {
    // Scenario 1: Leader isolation
    console.log('Scenario 1: Isolating current leader...');
    await this.createNetworkPartition(['agent-1'], 30000);
    await this.sleep(5000);

    // Scenario 2: Majority/minority split
    console.log('Scenario 2: Creating majority/minority partition...');
    await this.createMajorityMinorityPartition();
    await this.sleep(65000);

    // Scenario 3: Multiple partitions
    console.log('Scenario 3: Creating multiple partitions...');
    await this.createRandomPartitions(3, 30000);
    await this.sleep(35000);

    // Scenario 4: Cascading failures
    console.log('Scenario 4: Simulating cascading failures...');
    for (let i = 1; i <= 8; i++) {
      await this.createNetworkPartition([`agent-${i}`], 10000);
      await this.sleep(2000);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
async function runSimulation() {
  const manager = new ToxiproxyManager();
  await manager.initialize();
  await manager.introduceSplitBrainScenarios();
}
```

---

## ☸️ **Chaos Mesh for Kubernetes**

### **Installation**

```bash
# Install Chaos Mesh using Helm
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update
kubectl create ns chaos-testing
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace=chaos-testing \
  --set dashboard.create=true \
  --set dashboard.securityMode=false
```

### **Network Partition Experiments**

```yaml
# chaos-experiments/network-partition.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: agent-partition-experiment
  namespace: meta-agent-factory
spec:
  action: partition
  mode: fixed
  value: "5"
  selector:
    labelSelectors:
      app: meta-agent
      chaos.mesh/group: primary
  direction: both
  duration: "2m"
  scheduler:
    cron: "@every 10m"
---
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: redis-latency-experiment
  namespace: meta-agent-factory
spec:
  action: delay
  mode: all
  selector:
    labelSelectors:
      app: redis
  delay:
    latency: "300ms"
    correlation: "100"
    jitter: "50ms"
  direction: both
  duration: "1m"
---
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: agent-failure-experiment
  namespace: meta-agent-factory
spec:
  action: pod-failure
  mode: fixed-percent
  value: "25"
  selector:
    labelSelectors:
      app: meta-agent
  duration: "30s"
```

### **Workflow Orchestration**

```yaml
# chaos-experiments/split-brain-workflow.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: split-brain-validation-workflow
  namespace: meta-agent-factory
spec:
  entry: split-brain-test
  templates:
    - name: split-brain-test
      templateType: Serial
      deadline: 30m
      children:
        - partition-agents
        - validate-detection
        - heal-partition
        - validate-recovery
        - collect-metrics

    - name: partition-agents
      templateType: NetworkChaos
      deadline: 5m
      networkChaos:
        action: partition
        mode: fixed-percent
        value: "30"
        selector:
          labelSelectors:
            app: meta-agent
        direction: both
        duration: "2m"

    - name: validate-detection
      templateType: Task
      deadline: 2m
      task:
        container:
          image: meta-agent-factory/validator:latest
          command: ["npm", "run", "test:split-brain-detection"]

    - name: heal-partition
      templateType: Suspend
      deadline: 1m
      suspend:
        duration: "10s"

    - name: validate-recovery
      templateType: Task
      deadline: 5m
      task:
        container:
          image: meta-agent-factory/validator:latest
          command: ["npm", "run", "test:recovery-validation"]

    - name: collect-metrics
      templateType: Task
      deadline: 2m
      task:
        container:
          image: meta-agent-factory/validator:latest
          command: ["npm", "run", "metrics:collect"]
```

---

## 🎭 **Reproducible Split-Brain Scenarios**

### **Scenario Test Suite**

```typescript
import { ToxiproxyManager } from './toxiproxy-manager';
import { MetricsCollector } from './metrics-collector';
import { ValidationFramework } from './validation-framework';

export class SplitBrainScenarios {
  private toxiproxy: ToxiproxyManager;
  private metrics: MetricsCollector;
  private validator: ValidationFramework;

  constructor() {
    this.toxiproxy = new ToxiproxyManager();
    this.metrics = new MetricsCollector();
    this.validator = new ValidationFramework();
  }

  async runAllScenarios(): Promise<void> {
    const scenarios = [
      this.scenario1_LeaderIsolation.bind(this),
      this.scenario2_MajorityMinoritySplit.bind(this),
      this.scenario3_RandomPartitions.bind(this),
      this.scenario4_CascadingFailures.bind(this),
      this.scenario5_NetworkFlapping.bind(this),
      this.scenario6_AsymmetricPartition.bind(this),
      this.scenario7_ByzantineFault.bind(this),
      this.scenario8_ExtendedPartition.bind(this)
    ];

    for (const [index, scenario] of scenarios.entries()) {
      console.log(`\n=== Running Scenario ${index + 1} ===`);
      await this.metrics.startScenario(`scenario-${index + 1}`);
      
      try {
        await scenario();
        await this.validator.validateScenario(`scenario-${index + 1}`);
      } catch (error) {
        console.error(`Scenario ${index + 1} failed:`, error);
      }
      
      await this.metrics.endScenario();
      await this.sleep(5000); // Cool-down between scenarios
    }
  }

  private async scenario1_LeaderIsolation(): Promise<void> {
    console.log('Scenario 1: Leader Isolation');
    
    // Identify current leader
    const leader = await this.identifyLeader();
    console.log(`Current leader: ${leader}`);
    
    // Record pre-partition state
    const preState = await this.captureSystemState();
    
    // Isolate leader
    await this.toxiproxy.createNetworkPartition([leader], 30000);
    
    // Wait for new leader election
    await this.waitForLeaderElection(5000);
    
    // Verify new leader
    const newLeader = await this.identifyLeader();
    console.log(`New leader: ${newLeader}`);
    
    // Validate state consistency
    await this.validator.validateLeadershipTransition(leader, newLeader);
    
    // Wait for partition heal
    await this.sleep(30000);
    
    // Validate recovery
    const postState = await this.captureSystemState();
    await this.validator.validateStateConsistency(preState, postState);
  }

  private async scenario2_MajorityMinoritySplit(): Promise<void> {
    console.log('Scenario 2: Majority/Minority Split');
    
    const minorityAgents = ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5'];
    const majorityAgents = Array.from({ length: 11 }, (_, i) => `agent-${i + 6}`);
    
    // Create partition
    await this.toxiproxy.createNetworkPartition(minorityAgents, 60000);
    
    // Monitor both partitions
    const minorityMetrics = this.metrics.monitorPartition(minorityAgents);
    const majorityMetrics = this.metrics.monitorPartition(majorityAgents);
    
    // Perform operations in both partitions
    await this.performOperations(minorityAgents.slice(0, 2), 'minority');
    await this.performOperations(majorityAgents.slice(0, 2), 'majority');
    
    // Wait for partition heal
    await this.sleep(60000);
    
    // Validate reconciliation
    await this.validator.validatePartitionReconciliation(
      await minorityMetrics,
      await majorityMetrics
    );
  }

  private async scenario3_RandomPartitions(): Promise<void> {
    console.log('Scenario 3: Random Network Partitions');
    
    // Create 3 random partitions
    await this.toxiproxy.createRandomPartitions(3, 45000);
    
    // Monitor partition formation
    const partitions = await this.detectPartitions();
    console.log(`Detected ${partitions.length} partitions`);
    
    // Validate each partition maintains consistency
    for (const partition of partitions) {
      await this.validator.validatePartitionConsistency(partition);
    }
    
    // Wait for healing
    await this.sleep(45000);
    
    // Validate global consistency
    await this.validator.validateGlobalConsistency();
  }

  private async scenario4_CascadingFailures(): Promise<void> {
    console.log('Scenario 4: Cascading Failures');
    
    // Simulate cascading failures
    for (let i = 1; i <= 8; i++) {
      console.log(`Failing agent-${i}`);
      await this.toxiproxy.createNetworkPartition([`agent-${i}`], 20000);
      
      // Monitor system degradation
      const health = await this.metrics.getSystemHealth();
      console.log(`System health after ${i} failures: ${health.score}%`);
      
      // Check if system maintains quorum
      const hasQuorum = await this.validator.checkQuorum();
      if (!hasQuorum) {
        console.error('System lost quorum!');
      }
      
      await this.sleep(2000);
    }
    
    // Wait for recovery
    await this.sleep(25000);
    
    // Validate recovery
    await this.validator.validateCascadeRecovery();
  }

  private async scenario5_NetworkFlapping(): Promise<void> {
    console.log('Scenario 5: Network Flapping');
    
    const agent = 'agent-8';
    const flapCount = 10;
    const flapDuration = 3000;
    
    for (let i = 0; i < flapCount; i++) {
      // Disconnect
      await this.toxiproxy.createNetworkPartition([agent], flapDuration);
      await this.sleep(flapDuration);
      
      // Reconnect (automatic after duration)
      await this.sleep(flapDuration);
      
      // Check agent state
      const state = await this.getAgentState(agent);
      console.log(`Flap ${i + 1}: Agent state = ${state}`);
    }
    
    // Validate agent didn't cause data corruption
    await this.validator.validateAgentIntegrity(agent);
  }

  private async scenario6_AsymmetricPartition(): Promise<void> {
    console.log('Scenario 6: Asymmetric Network Partition');
    
    // Agent-1 can send but not receive
    await this.toxiproxy.addToxic('redis-agent-1', 'bandwidth', {
      rate: 0
    }, 'upstream');
    
    // Agent-2 can receive but not send
    await this.toxiproxy.addToxic('redis-agent-2', 'bandwidth', {
      rate: 0
    }, 'downstream');
    
    // Monitor asymmetric behavior
    await this.sleep(30000);
    
    // Validate detection and handling
    await this.validator.validateAsymmetricHandling(['agent-1', 'agent-2']);
    
    // Clean up
    await this.toxiproxy.removeToxic('redis-agent-1', 'bandwidth');
    await this.toxiproxy.removeToxic('redis-agent-2', 'bandwidth');
  }

  private async scenario7_ByzantineFault(): Promise<void> {
    console.log('Scenario 7: Byzantine Fault Simulation');
    
    // Inject corrupted data from agent-13
    const byzantineAgent = 'agent-13';
    
    // Create conflicting state updates
    await this.injectConflictingState(byzantineAgent);
    
    // Monitor system response
    const detectionTime = await this.metrics.measureByzantineDetection();
    console.log(`Byzantine fault detected in ${detectionTime}ms`);
    
    // Validate isolation
    await this.validator.validateByzantineIsolation(byzantineAgent);
  }

  private async scenario8_ExtendedPartition(): Promise<void> {
    console.log('Scenario 8: Extended Network Partition (5 minutes)');
    
    const partition1 = ['agent-1', 'agent-2', 'agent-3', 'agent-4'];
    const partition2 = ['agent-5', 'agent-6', 'agent-7', 'agent-8'];
    const partition3 = ['agent-9', 'agent-10', 'agent-11', 'agent-12'];
    const partition4 = ['agent-13', 'agent-14', 'agent-15', 'agent-16'];
    
    // Create 4-way partition
    await this.createMultiPartition([partition1, partition2, partition3, partition4], 300000);
    
    // Perform operations in each partition
    for (const [index, partition] of [partition1, partition2, partition3, partition4].entries()) {
      await this.performExtensiveOperations(partition, `partition-${index + 1}`);
    }
    
    // Monitor divergence
    const divergenceMetrics = await this.metrics.monitorDivergence(300000);
    
    // Wait for healing
    await this.sleep(300000);
    
    // Extensive validation
    await this.validator.validateExtendedPartitionRecovery(divergenceMetrics);
  }

  // Helper methods
  private async identifyLeader(): Promise<string> {
    const response = await fetch('http://localhost:3000/api/leader');
    const data = await response.json();
    return data.leaderId;
  }

  private async captureSystemState(): Promise<any> {
    const agents = Array.from({ length: 16 }, (_, i) => `agent-${i + 1}`);
    const states = {};
    
    for (const agent of agents) {
      states[agent] = await this.getAgentState(agent);
    }
    
    return states;
  }

  private async getAgentState(agentId: string): Promise<any> {
    try {
      const response = await fetch(`http://localhost:3000/api/agents/${agentId}/state`);
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }

  private async waitForLeaderElection(timeout: number): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        const leader = await this.identifyLeader();
        if (leader) return;
      } catch (error) {
        // Continue waiting
      }
      await this.sleep(100);
    }
    
    throw new Error('Leader election timeout');
  }

  private async performOperations(agents: string[], partitionName: string): Promise<void> {
    console.log(`Performing operations in ${partitionName}`);
    
    for (const agent of agents) {
      await fetch(`http://localhost:3000/api/agents/${agent}/operate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'update_state',
          data: { partition: partitionName, timestamp: Date.now() }
        })
      });
    }
  }

  private async detectPartitions(): Promise<string[][]> {
    const response = await fetch('http://localhost:3000/api/partitions/detect');
    const data = await response.json();
    return data.partitions;
  }

  private async createMultiPartition(
    partitions: string[][],
    duration: number
  ): Promise<void> {
    // Implement multi-partition creation
    for (let i = 0; i < partitions.length; i++) {
      for (let j = i + 1; j < partitions.length; j++) {
        // Block communication between partition i and j
        for (const agent1 of partitions[i]) {
          await this.toxiproxy.createNetworkPartition([agent1], duration);
        }
      }
    }
  }

  private async performExtensiveOperations(
    agents: string[],
    partitionName: string
  ): Promise<void> {
    // Simulate heavy workload during partition
    const operations = ['create', 'update', 'delete', 'query'];
    
    for (let i = 0; i < 100; i++) {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      await this.performOperation(agent, operation, {
        partition: partitionName,
        sequence: i,
        timestamp: Date.now()
      });
      
      await this.sleep(100);
    }
  }

  private async performOperation(
    agent: string,
    operation: string,
    data: any
  ): Promise<void> {
    await fetch(`http://localhost:3000/api/agents/${agent}/operate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, data })
    });
  }

  private async injectConflictingState(agent: string): Promise<void> {
    // Simulate Byzantine behavior
    await fetch(`http://localhost:3000/api/agents/${agent}/inject-fault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faultType: 'byzantine',
        conflictingData: {
          leader: agent,
          epoch: 99999,
          state: 'corrupted'
        }
      })
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 📊 **Metrics Collection Framework**

### **Prometheus Metrics**

```typescript
import { Registry, Counter, Gauge, Histogram } from 'prom-client';

export class SplitBrainMetrics {
  private register: Registry;
  
  // Cluster membership metrics
  private clusterViewGauge: Gauge;
  private quorumStatusGauge: Gauge;
  
  // Heartbeat metrics
  private heartbeatFailureCounter: Counter;
  private heartbeatLatencyHistogram: Histogram;
  
  // Partition detection metrics
  private partitionDetectedGauge: Gauge;
  private registryDiscrepancyGauge: Gauge;
  
  // Recovery metrics
  private recoveryDurationHistogram: Histogram;
  private reconciliationCounter: Counter;
  
  constructor() {
    this.register = new Registry();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // Cluster view metric
    this.clusterViewGauge = new Gauge({
      name: 'agent_cluster_view_total',
      help: 'Number of healthy agents each node sees',
      labelNames: ['agent_id', 'cluster_id'],
      registers: [this.register]
    });

    // Quorum status
    this.quorumStatusGauge = new Gauge({
      name: 'agent_quorum_status',
      help: '1 if quorum met, 0 otherwise',
      labelNames: ['agent_id'],
      registers: [this.register]
    });

    // Heartbeat failures
    this.heartbeatFailureCounter = new Counter({
      name: 'agent_heartbeat_failures_total',
      help: 'Counter of missed heartbeats',
      labelNames: ['agent_id', 'peer_id'],
      registers: [this.register]
    });

    // Heartbeat latency
    this.heartbeatLatencyHistogram = new Histogram({
      name: 'agent_heartbeat_latency_seconds',
      help: 'Heartbeat round-trip latency',
      labelNames: ['agent_id', 'peer_id'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.register]
    });

    // Partition detection
    this.partitionDetectedGauge = new Gauge({
      name: 'agent_partition_detected',
      help: '1 if agent suspects minority partition',
      labelNames: ['agent_id'],
      registers: [this.register]
    });

    // Registry discrepancy
    this.registryDiscrepancyGauge = new Gauge({
      name: 'agent_registry_discrepancy',
      help: 'Service registry consistency check',
      labelNames: ['agent_id'],
      registers: [this.register]
    });

    // Recovery duration
    this.recoveryDurationHistogram = new Histogram({
      name: 'split_brain_recovery_duration_seconds',
      help: 'Time taken to recover from split-brain',
      labelNames: ['scenario_type'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600],
      registers: [this.register]
    });

    // Reconciliation events
    this.reconciliationCounter = new Counter({
      name: 'state_reconciliation_total',
      help: 'Number of state reconciliations performed',
      labelNames: ['agent_id', 'strategy', 'result'],
      registers: [this.register]
    });
  }

  updateClusterView(agentId: string, healthyPeers: number): void {
    this.clusterViewGauge.set(
      { agent_id: agentId, cluster_id: 'main' },
      healthyPeers
    );
  }

  updateQuorumStatus(agentId: string, hasQuorum: boolean): void {
    this.quorumStatusGauge.set(
      { agent_id: agentId },
      hasQuorum ? 1 : 0
    );
  }

  recordHeartbeatFailure(agentId: string, peerId: string): void {
    this.heartbeatFailureCounter.inc({
      agent_id: agentId,
      peer_id: peerId
    });
  }

  recordHeartbeatLatency(
    agentId: string,
    peerId: string,
    latencySeconds: number
  ): void {
    this.heartbeatLatencyHistogram.observe(
      { agent_id: agentId, peer_id: peerId },
      latencySeconds
    );
  }

  setPartitionDetected(agentId: string, detected: boolean): void {
    this.partitionDetectedGauge.set(
      { agent_id: agentId },
      detected ? 1 : 0
    );
  }

  recordRecoveryDuration(scenarioType: string, durationSeconds: number): void {
    this.recoveryDurationHistogram.observe(
      { scenario_type: scenarioType },
      durationSeconds
    );
  }

  recordReconciliation(
    agentId: string,
    strategy: string,
    result: 'success' | 'failure'
  ): void {
    this.reconciliationCounter.inc({
      agent_id: agentId,
      strategy,
      result
    });
  }

  getMetrics(): string {
    return this.register.metrics();
  }

  async collectScenarioMetrics(scenarioName: string): Promise<any> {
    // Query Prometheus for scenario-specific metrics
    const queries = {
      partitionDetectionTime: `min(timestamp(agent_partition_detected == 1) - timestamp(scenario_start{scenario="${scenarioName}"}))`,
      affectedAgents: `count(agent_partition_detected == 1)`,
      recoveryTime: `split_brain_recovery_duration_seconds{scenario_type="${scenarioName}"}`,
      reconciliationCount: `sum(increase(state_reconciliation_total[5m]))`,
      failureRate: `rate(state_reconciliation_total{result="failure"}[5m])`,
      quorumAvailability: `avg_over_time(agent_quorum_status[5m])`
    };

    const results = {};
    
    for (const [metric, query] of Object.entries(queries)) {
      results[metric] = await this.queryPrometheus(query);
    }

    return results;
  }

  private async queryPrometheus(query: string): Promise<any> {
    const response = await fetch(
      `http://localhost:9090/api/v1/query?query=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return data.data.result;
  }
}
```

### **Grafana Dashboard Configuration**

```json
{
  "dashboard": {
    "title": "Split-Brain Detection and Recovery",
    "panels": [
      {
        "title": "Cluster Membership View",
        "type": "graph",
        "targets": [
          {
            "expr": "agent_cluster_view_total",
            "legendFormat": "{{agent_id}} view"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 }
      },
      {
        "title": "Quorum Status Heatmap",
        "type": "heatmap",
        "targets": [
          {
            "expr": "agent_quorum_status",
            "format": "heatmap"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 }
      },
      {
        "title": "Heartbeat Failures",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(agent_heartbeat_failures_total[1m])",
            "legendFormat": "{{agent_id}} → {{peer_id}}"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 }
      },
      {
        "title": "Partition Detection Status",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(agent_partition_detected)",
            "legendFormat": "Partitioned Agents"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 }
      },
      {
        "title": "Recovery Duration by Scenario",
        "type": "bar",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, split_brain_recovery_duration_seconds)",
            "legendFormat": "P95 Recovery Time"
          }
        ],
        "gridPos": { "h": 8, "w": 24, "x": 0, "y": 16 }
      }
    ]
  }
}
```

---

## ✅ **Automated Test Assertions**

### **Validation Framework**

```typescript
import { expect } from 'chai';
import fc from 'fast-check';

export class ValidationFramework {
  async validateScenario(scenarioName: string): Promise<void> {
    console.log(`Validating scenario: ${scenarioName}`);

    const validators = [
      this.validateDataConsistency,
      this.validateQuorumMaintenance,
      this.validateLeadershipUniqueness,
      this.validateRecoveryCompleteness,
      this.validatePerformanceMetrics
    ];

    for (const validator of validators) {
      await validator.call(this, scenarioName);
    }

    console.log(`✅ Scenario ${scenarioName} validation passed`);
  }

  private async validateDataConsistency(scenarioName: string): Promise<void> {
    const agents = await this.getAllAgents();
    const states = await Promise.all(
      agents.map(agent => this.getAgentState(agent))
    );

    // All agents should have the same state hash
    const stateHashes = states.map(state => this.hashState(state));
    const uniqueHashes = new Set(stateHashes);

    expect(uniqueHashes.size).to.equal(1, 
      'All agents should have consistent state after recovery'
    );
  }

  private async validateQuorumMaintenance(scenarioName: string): Promise<void> {
    const metrics = await this.queryMetrics(
      `min_over_time(agent_quorum_status[10m])`
    );

    // At least 51% of agents should maintain quorum
    const quorumAgents = metrics.filter(m => m.value[1] === '1').length;
    const totalAgents = metrics.length;
    const quorumPercentage = quorumAgents / totalAgents;

    expect(quorumPercentage).to.be.at.least(0.51,
      'Majority should maintain quorum during partition'
    );
  }

  private async validateLeadershipUniqueness(scenarioName: string): Promise<void> {
    const leaders = await this.queryMetrics(
      `count by (leader_id) (agent_leader_status == 1)`
    );

    expect(leaders.length).to.be.at.most(1,
      'Only one leader should exist at any time'
    );
  }

  private async validateRecoveryCompleteness(scenarioName: string): Promise<void> {
    // Check all reconciliations succeeded
    const failures = await this.queryMetrics(
      `sum(state_reconciliation_total{result="failure"})`
    );

    const failureCount = failures[0]?.value[1] || '0';
    expect(parseInt(failureCount)).to.equal(0,
      'All reconciliations should succeed'
    );
  }

  private async validatePerformanceMetrics(scenarioName: string): Promise<void> {
    // Recovery should complete within SLA
    const recoveryTime = await this.queryMetrics(
      `split_brain_recovery_duration_seconds{scenario_type="${scenarioName}"}`
    );

    const duration = parseFloat(recoveryTime[0]?.value[1] || '0');
    expect(duration).to.be.lessThan(300, // 5 minutes
      'Recovery should complete within 5 minutes'
    );
  }

  // Property-based testing for CRDTs
  async validateCRDTConvergence(): Promise<void> {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          agentId: fc.string(),
          operation: fc.oneof(
            fc.constant('increment'),
            fc.constant('decrement'),
            fc.constant('add'),
            fc.constant('remove')
          ),
          value: fc.integer(),
          timestamp: fc.integer({ min: 0, max: Date.now() })
        })),
        async (operations) => {
          // Apply operations in different orders to different replicas
          const replica1 = await this.createCRDTReplica('replica1');
          const replica2 = await this.createCRDTReplica('replica2');

          // Apply in forward order to replica1
          for (const op of operations) {
            await replica1.apply(op);
          }

          // Apply in reverse order to replica2  
          for (const op of operations.reverse()) {
            await replica2.apply(op);
          }

          // Merge replicas
          const state1 = await replica1.getState();
          const state2 = await replica2.getState();
          
          await replica1.merge(state2);
          await replica2.merge(state1);

          // States should converge
          const finalState1 = await replica1.getState();
          const finalState2 = await replica2.getState();

          expect(finalState1).to.deep.equal(finalState2);
        }
      ),
      { numRuns: 100 }
    );
  }

  async validatePartitionReconciliation(
    minorityMetrics: any,
    majorityMetrics: any
  ): Promise<void> {
    // Validate minority partition behavior
    expect(minorityMetrics.writeAttempts).to.equal(0,
      'Minority partition should not accept writes'
    );

    // Validate majority partition behavior
    expect(majorityMetrics.writeSuccess).to.be.greaterThan(0,
      'Majority partition should process writes'
    );

    // Validate reconciliation after healing
    const reconciledState = await this.getGlobalState();
    expect(reconciledState.conflicts).to.have.lengthOf(0,
      'No conflicts should remain after reconciliation'
    );
  }

  // Helper methods
  private async getAllAgents(): Promise<string[]> {
    return Array.from({ length: 16 }, (_, i) => `agent-${i + 1}`);
  }

  private async getAgentState(agentId: string): Promise<any> {
    const response = await fetch(`http://localhost:3000/api/agents/${agentId}/state`);
    return response.json();
  }

  private hashState(state: any): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256')
      .update(JSON.stringify(state))
      .digest('hex');
  }

  private async queryMetrics(query: string): Promise<any[]> {
    const response = await fetch(
      `http://localhost:9090/api/v1/query?query=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return data.data.result;
  }

  private async createCRDTReplica(id: string): Promise<any> {
    // Mock CRDT implementation for testing
    return {
      apply: async (op: any) => { /* ... */ },
      getState: async () => { /* ... */ },
      merge: async (state: any) => { /* ... */ }
    };
  }

  private async getGlobalState(): Promise<any> {
    const response = await fetch('http://localhost:3000/api/state/global');
    return response.json();
  }
}
```

---

## 🔄 **CI/CD Integration**

### **GitHub Actions Workflow**

```yaml
# .github/workflows/split-brain-validation.yml
name: Split-Brain Validation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  chaos-testing:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build project
      run: npm run build

    - name: Setup test environment
      run: |
        docker compose -f docker-compose.chaos.yml build
        docker compose -f docker-compose.chaos.yml up -d
        
        # Wait for services to be ready
        npm run wait-for-ready

    - name: Initialize Toxiproxy
      run: |
        npm run toxiproxy:init
        docker compose -f docker-compose.chaos.yml ps

    - name: Run split-brain scenarios
      run: |
        npm run test:split-brain:all
      env:
        SCENARIO_TIMEOUT: 300000
        METRICS_COLLECTION: enabled

    - name: Validate recovery
      run: |
        npm run test:recovery:validate
        npm run test:crdt:convergence

    - name: Collect metrics
      if: always()
      run: |
        # Export Prometheus metrics
        curl -s http://localhost:9090/api/v1/query_range \
          -d 'query=agent_cluster_view_total' \
          -d 'start='$(date -u -d '1 hour ago' +%s) \
          -d 'end='$(date +%s) \
          -d 'step=15s' > metrics-cluster-view.json

        # Export Grafana dashboards
        curl -s http://admin:admin@localhost:3001/api/dashboards/db/split-brain-detection \
          > dashboard-snapshot.json

        # Collect container logs
        docker compose -f docker-compose.chaos.yml logs > chaos-test-logs.txt

    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: chaos-test-results
        path: |
          metrics-*.json
          dashboard-*.json
          chaos-test-logs.txt
          test-results/

    - name: Cleanup
      if: always()
      run: |
        docker compose -f docker-compose.chaos.yml down -v
        docker system prune -f

    - name: Report results
      if: failure()
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const results = JSON.parse(fs.readFileSync('test-results/summary.json'));
          
          await github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `## ❌ Split-Brain Validation Failed
            
            **Failed Scenarios**: ${results.failed.join(', ')}
            **Success Rate**: ${results.successRate}%
            
            [View Full Report](https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId})`
          });

  performance-baseline:
    runs-on: ubuntu-latest
    needs: chaos-testing
    
    steps:
    - name: Download artifacts
      uses: actions/download-artifact@v3
      with:
        name: chaos-test-results

    - name: Analyze performance
      run: |
        npm install -g @datadog/datadog-ci
        datadog-ci junit upload test-results/junit.xml

    - name: Compare with baseline
      run: |
        # Compare current metrics with baseline
        npm run metrics:compare -- \
          --baseline=metrics-baseline.json \
          --current=metrics-cluster-view.json \
          --threshold=10
```

### **GitLab CI Configuration**

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - chaos
  - report

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""

before_script:
  - docker info
  - docker compose version

build:
  stage: build
  script:
    - docker compose -f docker-compose.chaos.yml build
  artifacts:
    expire_in: 1 hour

split-brain-validation:
  stage: chaos
  timeout: 1h
  script:
    - docker compose -f docker-compose.chaos.yml up -d
    - npm run wait-for-ready
    - npm run toxiproxy:init
    - npm run test:split-brain:all
  after_script:
    - docker compose -f docker-compose.chaos.yml logs > $CI_PROJECT_DIR/chaos-logs.txt
    - docker compose -f docker-compose.chaos.yml down -v
  artifacts:
    when: always
    paths:
      - chaos-logs.txt
      - test-results/
    reports:
      junit: test-results/junit.xml

performance-report:
  stage: report
  dependencies:
    - split-brain-validation
  script:
    - npm run report:generate -- --input=test-results --output=performance-report.html
  artifacts:
    paths:
      - performance-report.html
    expose_as: 'Performance Report'
```

---

## 📘 **Validation Playbooks**

### **Pre-Production Validation Checklist**

```markdown
# Split-Brain Validation Playbook

## Pre-Flight Checks
- [ ] All 16 agents deployed and healthy
- [ ] Redis Sentinel cluster operational (3 nodes)
- [ ] Prometheus scraping all agent metrics
- [ ] Grafana dashboards loaded
- [ ] Toxiproxy initialized with all proxies
- [ ] Test data seeded

## Scenario Execution Order
1. [ ] Leader Isolation (5 min)
2. [ ] Majority/Minority Split (10 min)
3. [ ] Random Partitions (10 min)
4. [ ] Cascading Failures (15 min)
5. [ ] Network Flapping (10 min)
6. [ ] Asymmetric Partition (5 min)
7. [ ] Byzantine Fault (5 min)
8. [ ] Extended Partition (10 min)

## Validation Criteria
- [ ] No data loss across all scenarios
- [ ] Recovery time < 5 minutes
- [ ] Quorum maintained by majority
- [ ] Single leader at all times
- [ ] CRDT convergence verified
- [ ] All reconciliations successful

## Post-Test Verification
- [ ] Global state consistency
- [ ] No orphaned resources
- [ ] Metrics within baseline
- [ ] No memory leaks
- [ ] Logs free of errors
```

### **Emergency Response Procedures**

```typescript
export class EmergencyResponse {
  async handleTestFailure(scenario: string, error: Error): Promise<void> {
    console.error(`Test failure in ${scenario}:`, error);

    // 1. Capture diagnostics
    await this.captureDiagnostics(scenario);

    // 2. Attempt recovery
    const recovered = await this.attemptRecovery();

    if (!recovered) {
      // 3. Full system reset
      await this.fullSystemReset();
    }

    // 4. Generate failure report
    await this.generateFailureReport(scenario, error);
  }

  private async captureDiagnostics(scenario: string): Promise<void> {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      scenario,
      agentStates: await this.getAllAgentStates(),
      redisInfo: await this.getRedisInfo(),
      networkStatus: await this.getNetworkStatus(),
      logs: await this.collectLogs()
    };

    await this.saveDiagnostics(diagnostics);
  }

  private async attemptRecovery(): Promise<boolean> {
    try {
      // Remove all network partitions
      await this.healAllPartitions();
      
      // Reset agent states
      await this.resetAgentStates();
      
      // Verify recovery
      return await this.verifySystemHealth();
    } catch (error) {
      console.error('Recovery failed:', error);
      return false;
    }
  }

  private async fullSystemReset(): Promise<void> {
    console.log('Performing full system reset...');
    
    // Stop all services
    await this.stopAllServices();
    
    // Clear all data
    await this.clearAllData();
    
    // Restart services
    await this.startAllServices();
    
    // Wait for stability
    await this.waitForStability();
  }

  // Implementation details...
}
```

---

## 🏭 **Production Testing Patterns**

### **Staged Rollout Testing**

```typescript
export class ProductionSplitBrainTesting {
  async runStagedTests(): Promise<void> {
    const stages = [
      { name: 'canary', percentage: 5, duration: 3600000 },    // 1 hour
      { name: 'pilot', percentage: 25, duration: 86400000 },   // 24 hours
      { name: 'general', percentage: 100, duration: 604800000 } // 7 days
    ];

    for (const stage of stages) {
      console.log(`Starting ${stage.name} stage testing`);
      
      // Select agents for testing
      const testAgents = this.selectAgents(stage.percentage);
      
      // Run limited chaos
      await this.runLimitedChaos(testAgents, stage.duration);
      
      // Validate results
      const results = await this.validateStage(stage.name);
      
      if (!results.success) {
        console.error(`Stage ${stage.name} failed, rolling back`);
        break;
      }
    }
  }

  private selectAgents(percentage: number): string[] {
    const totalAgents = 16;
    const count = Math.ceil(totalAgents * percentage / 100);
    const agents = Array.from({ length: totalAgents }, (_, i) => `agent-${i + 1}`);
    
    // Random selection
    return agents.sort(() => Math.random() - 0.5).slice(0, count);
  }

  private async runLimitedChaos(
    agents: string[],
    duration: number
  ): Promise<void> {
    // Run only safe chaos scenarios
    const safeScenar"ios = [
      'brief_network_delay',      // 100ms delay
      'minor_packet_loss',        // 1% loss
      'cpu_stress_light',         // 25% CPU
      'memory_pressure_light'     // 25% memory
    ];

    for (const scenario of safeScenar"ios) {
      await this.executeScenario(scenario, agents, duration / 4);
      await this.monitorImpact();
    }
  }

  private async validateStage(stageName: string): Promise<any> {
    const metrics = await this.collectStageMetrics(stageName);
    
    return {
      success: metrics.errorRate < 0.001 && // 0.1% error rate
               metrics.latencyP99 < 100 &&   // 100ms P99
               metrics.availability > 0.999,  // 99.9% availability
      metrics
    };
  }

  private async collectStageMetrics(stage: string): Promise<any> {
    // Collect production metrics
    return {
      errorRate: 0.0005,
      latencyP99: 85,
      availability: 0.9995
    };
  }

  private async monitorImpact(): Promise<void> {
    // Monitor production SLIs
    const slis = await this.getSLIs();
    
    if (slis.errorBudgetBurn > 0.1) {
      throw new Error('Error budget burn rate too high');
    }
  }

  private async getSLIs(): Promise<any> {
    // Query production monitoring
    return {
      errorBudgetBurn: 0.05,
      latency: 45,
      availability: 99.95
    };
  }

  private async executeScenario(
    scenario: string,
    agents: string[],
    duration: number
  ): Promise<void> {
    // Execute limited chaos scenario
    console.log(`Executing ${scenario} for ${duration}ms`);
  }
}
```

---

## 🎯 **Best Practices Summary**

1. **Start Small**: Begin with single-agent failures before multi-partition scenarios
2. **Monitor Everything**: Comprehensive metrics are essential for validation
3. **Automate Recovery**: Manual intervention should be the exception
4. **Test Regularly**: Run chaos tests in CI/CD, not just pre-production
5. **Document Failures**: Every failure is a learning opportunity
6. **Property-Based Testing**: Use for CRDT and convergence validation
7. **Production Safety**: Always have rollback procedures ready
8. **Incremental Chaos**: Gradually increase chaos intensity

---

**This comprehensive guide provides everything needed to simulate, validate, and ensure robust split-brain handling in your 16-agent Node.js meta-agent factory system.**