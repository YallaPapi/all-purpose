# 🌐 **Network Partition Injection Using Chaos Mesh for Node.js Microservices**

## **Comprehensive Implementation Guide**

**Task**: 249.2 - Document Network Partition Injection Using Chaos Mesh for Node.js Microservices  
**Generated**: July 31, 2025  
**Research Source**: TaskMaster research + Context7 Chaos Mesh integration  
**Focus**: Production-ready network partition testing for meta-agent factory

---

## 🚀 **Chaos Mesh Installation & Setup**

### **Prerequisites**
- Kubernetes cluster (v1.18+ recommended)
- Helm 3.x
- kubectl configured
- Node.js microservices deployed in Kubernetes

### **Installation Commands**
```bash
# Install Chaos Mesh using Helm
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

# Install with debug features enabled
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace=chaos-mesh \
  --create-namespace \
  --set images.tag=latest \
  --set controllerManager.chaosdSecurityMode=false \
  --set chaosDlv.enable=true

# Verify installation
kubectl get pods -n chaos-mesh
```

### **Dashboard Access**
```bash
# Forward dashboard port
kubectl port-forward -n chaos-mesh svc/chaos-dashboard 2333:2333

# Access dashboard at http://localhost:2333
```

---

## 🔧 **NetworkChaos Configuration Examples**

### **1. Basic Network Partition - Complete Isolation**

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: isolate-meta-agent-orchestrator
  namespace: meta-agents
spec:
  action: partition
  mode: all
  selector:
    namespaces:
      - meta-agents
    labelSelectors:
      app: infra-orchestrator
      component: meta-agent
  direction: both
  duration: "300s"  # 5 minute partition
  target:
    selector:
      namespaces:
        - meta-agents
      labelSelectors:
        app: domain-agent
```

**Use Case**: Test Infrastructure Orchestrator resilience when isolated from all domain agents.

### **2. Network Delay Injection - Latency Testing**

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: delay-redis-coordination
  namespace: meta-agents
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - meta-agents
    labelSelectors:
      app: meta-agent
  direction: to
  target:
    selector:
      namespaces:
        - redis
      labelSelectors:
        app: redis
  delay:
    latency: "500ms"
    correlation: "100"
    jitter: "100ms"
  duration: "600s"  # 10 minute delay
```

**Use Case**: Simulate high-latency network conditions affecting Redis coordination.

### **3. Packet Loss Simulation - Network Degradation**

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: packet-loss-websocket
  namespace: meta-agents
spec:
  action: loss
  mode: fixed-percent
  value: "30"  # 30% packet loss
  selector:
    namespaces:
      - meta-agents
    labelSelectors:
      service: observability-dashboard
  direction: both
  loss:
    loss: "30"
    correlation: "25"
  duration: "180s"  # 3 minute packet loss
```

**Use Case**: Test WebSocket reconnection logic in observability dashboard.

### **4. Network Bandwidth Limitation**

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: bandwidth-limit-agents
  namespace: meta-agents
spec:
  action: bandwidth
  mode: all
  selector:
    namespaces:
      - meta-agents
    labelSelectors:
      tier: agent
  direction: both
  bandwidth:
    rate: "1mbps"
    limit: 20971520  # 20MB buffer
    buffer: 10000
  duration: "300s"
```

**Use Case**: Test system behavior under network bandwidth constraints.

---

## 🎯 **Node.js Microservices Specific Configurations**

### **1. Split-Brain Test for Coordination Services**

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: split-brain-coordination
  namespace: meta-agents
spec:
  action: partition
  mode: fixed
  value: "1"
  selector:
    namespaces:
      - meta-agents
    labelSelectors:
      app: infra-orchestrator
  direction: to
  target:
    selector:
      namespaces:
        - meta-agents
      labelSelectors:
        component: coordination-service
  duration: "480s"  # 8 minute split-brain
```

### **2. Express.js API Gateway Isolation**

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: isolate-api-gateway
  namespace: nodejs-services
spec:
  action: partition
  mode: all
  selector:
    namespaces:
      - nodejs-services
    labelSelectors:
      app: api-gateway
      framework: express
  direction: both
  duration: "240s"
```

### **3. Database Connection Partition**

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: partition-database-connections
  namespace: nodejs-services
spec:
  action: partition
  mode: fixed-percent
  value: "50"  # Partition 50% of services from database
  selector:
    namespaces:
      - nodejs-services
    labelSelectors:
      database-client: "true"
  direction: to
  target:
    selector:
      namespaces:
        - databases
      labelSelectors:
        app: postgresql
  duration: "360s"
```

---

## 📊 **Advanced Workflow Orchestration**

### **Progressive Network Partition Testing**

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: progressive-network-chaos
  namespace: meta-agents
spec:
  entry: network-chaos-sequence
  templates:
    - name: network-chaos-sequence
      templateType: Serial
      deadline: 2400s  # 40 minute total workflow
      children:
        - baseline-monitoring
        - light-delay-injection
        - moderate-packet-loss
        - severe-partition
        - recovery-validation

    - name: baseline-monitoring
      templateType: Task
      deadline: 300s
      task:
        container:
          name: baseline-check
          image: curlimages/curl:latest
          command: ["sh", "-c"]
          args:
            - |
              echo "Starting baseline monitoring..."
              for i in {1..30}; do
                curl -f http://meta-agent-coordinator:3001/health || echo "Health check failed at $(date)"
                sleep 10
              done

    - name: light-delay-injection
      templateType: NetworkChaos
      deadline: 600s
      networkChaos:
        action: delay
        mode: all
        selector:
          namespaces: ["meta-agents"]
          labelSelectors:
            tier: communication
        delay:
          latency: "100ms"
          jitter: "20ms"
        duration: "300s"

    - name: moderate-packet-loss
      templateType: NetworkChaos
      deadline: 600s
      networkChaos:
        action: loss
        mode: fixed-percent
        value: "10"
        selector:
          namespaces: ["meta-agents"]
        loss:
          loss: "10"
        duration: "300s"

    - name: severe-partition
      templateType: NetworkChaos
      deadline: 600s
      networkChaos:
        action: partition
        mode: fixed
        value: "1"
        selector:
          namespaces: ["meta-agents"]
          labelSelectors:
            app: infra-orchestrator
        duration: "300s"

    - name: recovery-validation
      templateType: Task
      deadline: 600s
      task:
        container:
          name: recovery-check
          image: curlimages/curl:latest
          command: ["sh", "-c"]
          args:
            - |
              echo "Validating system recovery..."
              for i in {1..60}; do
                if curl -f http://meta-agent-coordinator:3001/health; then
                  echo "System recovered successfully at $(date)"
                  exit 0
                fi
                sleep 10
              done
              echo "System failed to recover within timeout"
              exit 1
```

### **Scheduled Chaos Experiments**

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Schedule
metadata:
  name: weekly-network-resilience-test
  namespace: meta-agents
spec:
  schedule: "0 2 * * 1"  # Every Monday at 2 AM
  type: NetworkChaos
  concurrencyPolicy: Allow
  startingDeadlineSeconds: 3600
  networkChaos:
    action: partition
    mode: fixed-percent
    value: "20"  # Partition 20% of agents
    selector:
      namespaces: ["meta-agents"]
      labelSelectors:
        environment: production
        chaos-eligible: "true"
    duration: "300s"
```

---

## 🔍 **Monitoring & Observability Integration**

### **Prometheus Metrics for Chaos Experiments**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chaos-monitoring-config
  namespace: meta-agents
data:
  prometheus-rules.yaml: |
    groups:
    - name: chaos-experiment-rules
      rules:
      - alert: NetworkChaosActive
        expr: up{job="chaos-mesh-controller-manager"} == 1
        for: 1m
        labels:
          severity: info
        annotations:
          summary: "Network chaos experiment is active"
          description: "A network chaos experiment is currently affecting {{ $labels.instance }}"

      - alert: HighErrorRateDuringChaos
        expr: (
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) /
          sum(rate(http_requests_total[5m])) by (service)
        ) * 100 > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected during chaos experiment"
          description: "Service {{ $labels.service }} has {{ $value }}% error rate"

      - alert: NetworkPartitionRecoveryFailed
        expr: up{job="meta-agent-coordination"} == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "System failed to recover from network partition"
          description: "Meta-agent coordination has been down for more than 10 minutes"
```

### **Grafana Dashboard Configuration**

```json
{
  "dashboard": {
    "title": "Network Chaos Experiments - Meta-Agent Factory",
    "panels": [
      {
        "title": "Active Chaos Experiments",
        "type": "stat",
        "targets": [
          {
            "expr": "chaos_mesh_experiments_total{type=\"NetworkChaos\",phase=\"running\"}",
            "legendFormat": "Active Network Chaos"
          }
        ]
      },
      {
        "title": "Request Success Rate During Chaos",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status!~\"5..\"}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service) * 100",
            "legendFormat": "{{ service }} Success Rate"
          }
        ]
      },
      {
        "title": "Network Latency Impact",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))",
            "legendFormat": "{{ service }} P95 Latency"
          }
        ]
      }
    ]
  }
}
```

---

## 🛡️ **Safety Mechanisms & Best Practices**

### **1. Blast Radius Control**

```yaml
# Use precise selectors to limit impact
selector:
  namespaces:
    - meta-agents-staging  # Never target production directly
  labelSelectors:
    chaos-eligible: "true"
    environment: "staging"
    version: "stable"
```

### **2. Emergency Recovery Procedures**

```bash
#!/bin/bash
# chaos-emergency-stop.sh

echo "🚨 Emergency chaos experiment cleanup initiated"

# Stop all active network chaos experiments
kubectl get networkchaos -A -o name | xargs -I {} kubectl delete {}

# Verify all experiments are stopped
kubectl get networkchaos -A

# Check system recovery
echo "⏱️ Waiting for system recovery..."
sleep 30

# Validate services are healthy
kubectl get pods -n meta-agents -l chaos-eligible=true --field-selector=status.phase!=Running

echo "✅ Emergency cleanup completed"
```

### **3. Pre-experiment Health Checks**

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pre-chaos-health-check
  namespace: meta-agents
spec:
  template:
    spec:
      containers:
      - name: health-checker
        image: curlimages/curl:latest
        command: ["sh", "-c"]
        args:
          - |
            echo "🔍 Running pre-chaos health checks..."
            
            # Check meta-agent coordinator
            if ! curl -f http://meta-agent-coordinator:3001/health; then
              echo "❌ Meta-agent coordinator unhealthy - aborting chaos experiment"
              exit 1
            fi
            
            # Check Redis connectivity
            if ! nc -z redis-service 6379; then
              echo "❌ Redis unreachable - aborting chaos experiment"
              exit 1
            fi
            
            # Check observability dashboard
            if ! curl -f http://observability-dashboard:3000/health; then
              echo "❌ Observability dashboard unhealthy - aborting chaos experiment"
              exit 1
            fi
            
            echo "✅ All systems healthy - proceeding with chaos experiment"
      restartPolicy: Never
  backoffLimit: 3
```

---

## 🔧 **Debugging & Troubleshooting**

### **chaosctl Debugging Commands**

```bash
# Build chaosctl tool
make chaosctl

# Debug all NetworkChaos resources
./bin/chaosctl debug networkchaos

# Debug specific NetworkChaos in namespace
./bin/chaosctl debug networkchaos isolate-meta-agent-orchestrator -n meta-agents

# View component logs
./bin/chaosctl logs -t 100 -n NODENAME

# View all component logs
./bin/chaosctl logs
```

### **Common Issues & Solutions**

#### **Issue 1: NetworkChaos Not Taking Effect**
```bash
# Check if NET_SCH_NETEM kernel module is loaded
lsmod | grep sch_netem

# Load module if missing
modprobe sch_netem

# Verify Chaos Daemon is running
kubectl get pods -n chaos-mesh -l app.kubernetes.io/component=chaos-daemon
```

#### **Issue 2: Connection Between Controller and Daemon Lost**
```bash
# Check if controller can reach chaos-daemon
kubectl logs -n chaos-mesh -l app.kubernetes.io/component=controller-manager

# Verify chaos-daemon network connectivity
kubectl exec -n chaos-mesh chaos-daemon-xxxxx -- ping chaos-mesh-controller-manager
```

#### **Issue 3: Experiments Stuck in Running State**
```bash
# Force cleanup of stuck experiments
kubectl patch networkchaos isolate-meta-agent-orchestrator -n meta-agents --type='merge' -p='{"metadata":{"finalizers":[]}}'

# Delete the resource
kubectl delete networkchaos isolate-meta-agent-orchestrator -n meta-agents
```

---

## 📈 **Node.js Application Resilience Patterns**

### **1. Connection Pooling with Chaos Tolerance**

```javascript
// Enhanced connection pool for Redis coordination
const Redis = require('ioredis');

class ChaosResilientRedisClient {
  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'redis-service',
      port: process.env.REDIS_PORT || 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      // Cluster support for split-brain scenarios
      enableReadyCheck: true,
      // Graceful connection handling during chaos
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      }
    });

    // Chaos-aware event handling
    this.client.on('error', (err) => {
      console.error('Redis connection error during potential chaos:', err);
      this.fallbackToMemoryStore();
    });

    this.client.on('reconnecting', () => {
      console.log('Redis reconnecting - likely recovering from network chaos');
    });
  }

  async fallbackToMemoryStore() {
    // Implement memory-based coordination fallback
    console.log('Switching to memory-based coordination during network partition');
  }
}
```

### **2. Express.js Middleware with Circuit Breaker**

```javascript
const CircuitBreaker = require('opossum');

// Circuit breaker for inter-service communication
const serviceCallBreaker = new CircuitBreaker(callExternalService, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  // Chaos-specific configuration
  volumeThreshold: 5,
  allowWarmUp: true
});

// Middleware for network partition tolerance
function chaosResilientMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Track request during potential chaos
  req.chaosContext = {
    startTime,
    requestId: generateRequestId(),
    experimentActive: process.env.CHAOS_EXPERIMENT_ACTIVE === 'true'
  };
  
  // Enhanced timeout handling during chaos
  req.setTimeout(req.chaosContext.experimentActive ? 30000 : 10000);
  
  // Add chaos-aware headers
  res.setHeader('X-Chaos-Experiment', req.chaosContext.experimentActive);
  res.setHeader('X-Request-ID', req.chaosContext.requestId);
  
  next();
}

async function callExternalService(url, data) {
  const options = {
    timeout: process.env.CHAOS_EXPERIMENT_ACTIVE === 'true' ? 15000 : 5000,
    retry: process.env.CHAOS_EXPERIMENT_ACTIVE === 'true' ? 5 : 3
  };
  
  return axios.post(url, data, options);
}
```

### **3. WebSocket Reconnection with Exponential Backoff**

```javascript
class ChaosResilientWebSocket {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.messageQueue = [];
    
    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected - clearing reconnect attempts');
        this.reconnectAttempts = 0;
        this.flushMessageQueue();
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        
        // Chaos-aware reconnection logic
        if (this.shouldReconnect(event.code)) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error during potential network chaos:', error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  shouldReconnect(closeCode) {
    // Don't reconnect on deliberate close
    if (closeCode === 1000) return false;
    
    // Reconnect on network issues (likely chaos experiment)
    if (closeCode >= 1006 && closeCode <= 1015) return true;
    
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached - entering degraded mode');
      this.enterDegradedMode();
      return;
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue messages during network partition
      this.messageQueue.push(data);
      console.log('Message queued - WebSocket unavailable during potential chaos');
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  enterDegradedMode() {
    // Implement local-only operation during extended network partition
    console.log('Entering degraded mode - local operations only');
    this.emit('degradedMode', { reason: 'network_partition', timestamp: Date.now() });
  }
}
```

---

## 🎯 **Production Implementation Checklist**

### **Pre-Deployment**
- [ ] Install Chaos Mesh in staging environment
- [ ] Configure RBAC permissions for chaos experiments
- [ ] Set up monitoring and alerting for experiments
- [ ] Create emergency recovery runbooks
- [ ] Train team on chaos experiment procedures

### **Environment Setup**
- [ ] Label pods with `chaos-eligible: "true"` for experiment targeting
- [ ] Configure separate namespaces for staging/production
- [ ] Set up Prometheus metrics collection
- [ ] Configure Grafana dashboards for real-time monitoring
- [ ] Implement health check endpoints in all services

### **Safety Measures**
- [ ] Implement blast radius controls using precise selectors
- [ ] Configure automatic experiment termination (duration limits)
- [ ] Set up emergency stop procedures
- [ ] Create pre-experiment health validation jobs
- [ ] Configure incident response procedures

### **Validation & Testing**
- [ ] Run baseline performance tests before chaos
- [ ] Execute chaos experiments during low-traffic periods
- [ ] Validate system recovery after each experiment
- [ ] Document lessons learned and system improvements
- [ ] Update resilience patterns based on experiment results

---

## 📋 **Conclusion**

This comprehensive guide provides production-ready network partition injection capabilities using Chaos Mesh for Node.js microservices. The configurations and patterns outlined here enable systematic resilience testing while maintaining safety and observability.

**Key Benefits**:
- **Comprehensive Coverage**: Complete YAML configurations for all network chaos scenarios
- **Node.js Specific**: Tailored patterns for Express.js, WebSocket, and Redis coordination
- **Production Ready**: Safety mechanisms, monitoring, and emergency procedures
- **Meta-Agent Factory Integration**: Specific examples for 16-agent coordination testing

**Next Steps**: Implement Toxiproxy-based development testing (Task 249.3) and integrate with continuous validation suite (Task 229.5).

---

**Task 249.2 Complete** ✅  
**Documentation**: Production-ready Chaos Mesh network partition injection guide with comprehensive Node.js microservices integration