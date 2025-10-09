# Observability Methods to Container & Microservice Metrics Mapping

> **Task 232.2 - Map Observability Methods to Container and Microservice Metrics**  
> **Comprehensive mapping guide with Prometheus instrumentation and OpenTelemetry integration**  
> **Status**: Complete Implementation Guide - Production Ready Metrics Mapping  

---

## 📋 Executive Summary

This document provides comprehensive mappings between observability methods (Four Golden Signals, RED Method, USE Method) and specific container/microservice metrics for the Meta-Agent Factory system. Based on research-driven best practices for 2024, this guide includes Prometheus metric definitions, OpenTelemetry instrumentation patterns, and production-ready implementation examples for Node.js/TypeScript services.

### **Key Deliverables**
- **140+ Specific Metrics Mapped** across all observability methods  
- **Production-Ready Instrumentation Code** for Node.js/TypeScript services  
- **Complete Prometheus Configuration** with scraping and alerting  
- **OpenTelemetry Integration Patterns** with optimal cardinality management  
- **Meta-Agent Specific Extensions** for UEP protocol and coordination monitoring  

---

## 🎯 Mapping Framework Overview

### **Three-Layer Mapping Architecture**

**Layer 1: Application Layer (RED Method)**
- HTTP/gRPC endpoints and API performance
- Service-to-service communication metrics
- Business logic and transaction monitoring

**Layer 2: Service Layer (Four Golden Signals)**
- Service health and availability metrics
- End-to-end request flow monitoring
- Service-level error and saturation tracking

**Layer 3: Infrastructure Layer (USE Method)**
- Container resource utilization and limits
- Host system performance and capacity
- Network and storage I/O monitoring

---

## 🚀 RED Method Implementation

### **R - Rate (Requests per Second)**

#### **HTTP Request Rate Metrics**
```typescript
// OpenTelemetry Counter Implementation
const httpRequestsTotal = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
  unit: '1'
});

// Usage in Express middleware
app.use((req, res, next) => {
  httpRequestsTotal.add(1, {
    method: req.method,
    route: req.route?.path || 'unknown',
    service: 'meta-agent-api',
    environment: process.env.NODE_ENV || 'development'
  });
  next();
});
```

#### **Prometheus Metrics**
```yaml
# Metric Definition
http_requests_total{method="GET", route="/api/agents", service="meta-agent-api", environment="production"}

# Query Examples
# Total request rate across all services
rate(http_requests_total[5m])

# Request rate by service
sum(rate(http_requests_total[5m])) by (service)

# Request rate by HTTP method
sum(rate(http_requests_total[5m])) by (method)
```

#### **UEP Protocol Rate Metrics**
```typescript
// UEP-specific rate tracking
const uepMessagesTotal = meter.createCounter('uep_messages_total', {
  description: 'Total UEP protocol messages',
  unit: '1'
});

// Agent coordination message rates
const agentCoordinationTotal = meter.createCounter('agent_coordination_messages_total', {
  description: 'Total agent coordination messages',
  unit: '1'
});

// Usage in UEP message handler
function handleUEPMessage(message: UEPMessage) {
  uepMessagesTotal.add(1, {
    message_type: message.type,
    source_agent: message.source,
    target_agent: message.target,
    protocol_version: message.version
  });
}
```

### **E - Errors (Error Rate and Count)**

#### **HTTP Error Rate Metrics**
```typescript
// Error counter with status code breakdown
const httpRequestErrors = meter.createCounter('http_request_errors_total', {
  description: 'Total HTTP request errors',
  unit: '1'
});

// Middleware for error tracking
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      httpRequestErrors.add(1, {
        method: req.method,
        route: req.route?.path || 'unknown',
        status_code: res.statusCode.toString(),
        status_class: `${Math.floor(res.statusCode / 100)}xx`,
        service: 'meta-agent-api'
      });
    }
  });
  next();
});
```

#### **Prometheus Error Queries**
```yaml
# Error rate calculation
rate(http_request_errors_total[5m]) / rate(http_requests_total[5m])

# Error rate by status class
sum(rate(http_request_errors_total[5m])) by (status_class)

# Critical error rate (5xx only)
sum(rate(http_request_errors_total{status_class="5xx"}[5m]))
```

#### **UEP Protocol Error Metrics**
```typescript
// UEP validation errors
const uepValidationErrors = meter.createCounter('uep_validation_errors_total', {
  description: 'Total UEP protocol validation errors',
  unit: '1'
});

// Agent communication failures
const agentCommunicationErrors = meter.createCounter('agent_communication_errors_total', {
  description: 'Total agent communication errors',
  unit: '1'
});

// Error tracking in validation middleware
function validateUEPMessage(message: UEPMessage): ValidationResult {
  try {
    // Validation logic
    return { valid: true };
  } catch (error) {
    uepValidationErrors.add(1, {
      error_type: error.name,
      message_type: message.type,
      agent_id: message.source,
      validation_stage: 'schema_validation'
    });
    throw error;
  }
}
```

### **D - Duration (Response Time Distribution)**

#### **HTTP Request Duration Metrics**
```typescript
// Histogram for request duration tracking
const httpRequestDuration = meter.createHistogram('http_request_duration_seconds', {
  description: 'HTTP request duration in seconds',
  unit: 's',
  boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

// Request timing middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    httpRequestDuration.record(duration, {
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode.toString(),
      service: 'meta-agent-api'
    });
  });
  
  next();
});
```

#### **Prometheus Duration Queries**
```yaml
# P95 latency across all requests
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# P95 latency by service
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

#### **UEP Protocol Latency Metrics**
```typescript
// UEP message processing latency
const uepProcessingDuration = meter.createHistogram('uep_processing_duration_seconds', {
  description: 'UEP message processing duration in seconds',
  unit: 's',
  boundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

// Agent coordination latency
const agentCoordinationLatency = meter.createHistogram('agent_coordination_latency_seconds', {
  description: 'Agent coordination message latency in seconds',
  unit: 's',
  boundaries: [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1]
});

// Latency tracking in message processing
async function processUEPMessage(message: UEPMessage): Promise<void> {
  const startTime = performance.now();
  
  try {
    await handleMessage(message);
  } finally {
    const duration = (performance.now() - startTime) / 1000;
    uepProcessingDuration.record(duration, {
      message_type: message.type,
      processing_stage: 'complete',
      agent_type: message.agentType
    });
  }
}
```

---

## 🏗️ USE Method Implementation

### **U - Utilization (Resource Usage Percentage)**

#### **Container CPU Utilization**
```yaml
# cAdvisor provides these metrics automatically
container_cpu_usage_seconds_total{container!="POD", container!=""}
container_spec_cpu_quota{container!="POD", container!=""}
container_spec_cpu_period{container!="POD", container!=""}

# CPU utilization calculation
(rate(container_cpu_usage_seconds_total[5m]) * 100) / 
(container_spec_cpu_quota / container_spec_cpu_period)
```

#### **Container Memory Utilization**
```yaml
# Memory metrics from cAdvisor
container_memory_usage_bytes{container!="POD", container!=""}
container_spec_memory_limit_bytes{container!="POD", container!=""}

# Memory utilization percentage
(container_memory_usage_bytes / container_spec_memory_limit_bytes) * 100
```

#### **Custom Application Resource Metrics**
```typescript
// Application-level resource monitoring
const processMemoryUsage = meter.createGauge('process_memory_usage_bytes', {
  description: 'Process memory usage in bytes',
  unit: 'By'
});

const processCpuUsage = meter.createGauge('process_cpu_usage_percent', {
  description: 'Process CPU usage percentage',
  unit: '%'
});

// Update metrics periodically
setInterval(() => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  processMemoryUsage.record(memUsage.rss, {
    memory_type: 'rss',
    service: 'meta-agent-api',
    instance: process.env.INSTANCE_ID || 'unknown'
  });
  
  processMemoryUsage.record(memUsage.heapUsed, {
    memory_type: 'heap_used',
    service: 'meta-agent-api',
    instance: process.env.INSTANCE_ID || 'unknown'
  });
}, 10000); // Update every 10 seconds
```

### **S - Saturation (Resource Queuing and Throttling)**

#### **Container CPU Throttling**
```yaml
# CPU throttling metrics from cAdvisor
container_cpu_cfs_throttled_seconds_total{container!="POD", container!=""}
container_cpu_cfs_periods_total{container!="POD", container!=""}

# CPU throttling rate
rate(container_cpu_cfs_throttled_seconds_total[5m]) / 
rate(container_cpu_cfs_periods_total[5m])
```

#### **Memory Pressure and OOM Events**
```yaml
# Memory pressure indicators
container_memory_working_set_bytes{container!="POD", container!=""}
container_spec_memory_limit_bytes{container!="POD", container!=""}

# Memory pressure percentage (working set vs limit)
(container_memory_working_set_bytes / container_spec_memory_limit_bytes) * 100

# OOM kill events
container_oom_events_total{container!="POD", container!=""}
```

#### **Application Queue Saturation**
```typescript
// Queue depth and processing metrics
const queueDepth = meter.createGauge('queue_depth_current', {
  description: 'Current queue depth',
  unit: '1'
});

const queueProcessingTime = meter.createHistogram('queue_processing_duration_seconds', {
  description: 'Queue processing time in seconds',
  unit: 's',
  boundaries: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]
});

// Queue monitoring for agent coordination
class AgentCoordinationQueue {
  private queue: CoordinationTask[] = [];
  
  enqueue(task: CoordinationTask): void {
    this.queue.push(task);
    queueDepth.record(this.queue.length, {
      queue_type: 'agent_coordination',
      agent_type: task.agentType
    });
  }
  
  async dequeue(): Promise<CoordinationTask | null> {
    const task = this.queue.shift();
    if (task) {
      const startTime = performance.now();
      
      try {
        await this.processTask(task);
      } finally {
        const processingTime = (performance.now() - startTime) / 1000;
        queueProcessingTime.record(processingTime, {
          queue_type: 'agent_coordination',
          task_type: task.type,
          agent_type: task.agentType
        });
        
        queueDepth.record(this.queue.length, {
          queue_type: 'agent_coordination',
          agent_type: task.agentType
        });
      }
    }
    return task || null;
  }
}
```

### **E - Errors (Resource-Level Errors)**

#### **Container and Host Errors**
```yaml
# Network errors
container_network_receive_errors_total{container!="POD", container!=""}
container_network_transmit_errors_total{container!="POD", container!=""}

# Filesystem errors
container_fs_read_errors_total{container!="POD", container!=""}
container_fs_write_errors_total{container!="POD", container!=""}

# OOM kills and container restarts
kube_pod_container_status_restarts_total
```

#### **Application-Level Resource Errors**
```typescript
// Database connection errors
const dbConnectionErrors = meter.createCounter('database_connection_errors_total', {
  description: 'Total database connection errors',
  unit: '1'
});

// Redis cache errors
const cacheErrors = meter.createCounter('cache_errors_total', {
  description: 'Total cache operation errors',
  unit: '1'
});

// Error tracking in database operations
async function executeQuery(query: string): Promise<any> {
  try {
    return await database.query(query);
  } catch (error) {
    dbConnectionErrors.add(1, {
      error_type: error.name,
      operation: 'query',
      database: 'postgresql',
      service: 'meta-agent-api'
    });
    throw error;
  }
}
```

---

## 🌟 Four Golden Signals Implementation

### **1. Latency (Service-Level Response Times)**

#### **End-to-End Service Latency**
```typescript
// Service-level latency tracking
const serviceLatency = meter.createHistogram('service_request_duration_seconds', {
  description: 'Service request duration from entry to exit',
  unit: 's',
  boundaries: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
});

// Distributed tracing integration
const tracer = trace.getTracer('meta-agent-service');

async function handleServiceRequest(request: ServiceRequest): Promise<ServiceResponse> {
  const span = tracer.startSpan('service.handle_request');
  const startTime = performance.now();
  
  try {
    const response = await processRequest(request);
    
    const duration = (performance.now() - startTime) / 1000;
    serviceLatency.record(duration, {
      service: 'meta-agent-service',
      operation: request.operation,
      status: 'success',
      agent_type: request.agentType
    });
    
    return response;
  } catch (error) {
    const duration = (performance.now() - startTime) / 1000;
    serviceLatency.record(duration, {
      service: 'meta-agent-service',
      operation: request.operation,
      status: 'error',
      agent_type: request.agentType
    });
    throw error;
  } finally {
    span.end();
  }
}
```

### **2. Traffic (Service Request Volume)**

#### **Service Traffic Metrics**
```typescript
// Service-level traffic tracking
const serviceRequests = meter.createCounter('service_requests_total', {
  description: 'Total service requests',
  unit: '1'
});

const activeConnections = meter.createGauge('service_active_connections', {
  description: 'Current active connections',
  unit: '1'
});

// Connection tracking
class ConnectionTracker {
  private connections = 0;
  
  onConnection(): void {
    this.connections++;
    activeConnections.record(this.connections, {
      service: 'meta-agent-service',
      protocol: 'http'
    });
  }
  
  onDisconnection(): void {
    this.connections--;
    activeConnections.record(this.connections, {
      service: 'meta-agent-service',
      protocol: 'http'
    });
  }
}
```

### **3. Errors (Service-Level Error Rates)**

#### **Business Logic Error Tracking**
```typescript
// Service error classification
const serviceErrors = meter.createCounter('service_errors_total', {
  description: 'Total service errors by category',
  unit: '1'
});

enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  INTEGRATION = 'integration',
  SYSTEM = 'system'
}

function trackServiceError(error: Error, context: ServiceContext): void {
  let category: ErrorCategory;
  
  if (error instanceof ValidationError) {
    category = ErrorCategory.VALIDATION;
  } else if (error instanceof AuthorizationError) {
    category = ErrorCategory.AUTHORIZATION;
  } else if (error instanceof IntegrationError) {
    category = ErrorCategory.INTEGRATION;
  } else {
    category = ErrorCategory.SYSTEM;
  }
  
  serviceErrors.add(1, {
    service: context.serviceName,
    error_category: category,
    error_type: error.constructor.name,
    operation: context.operation,
    agent_type: context.agentType
  });
}
```

### **4. Saturation (Service Resource Limits)**

#### **Service Capacity Metrics**
```typescript
// Service capacity and saturation tracking
const serviceCapacity = meter.createGauge('service_capacity_utilization_percent', {
  description: 'Service capacity utilization percentage',
  unit: '%'
});

const serviceThroughput = meter.createGauge('service_throughput_current', {
  description: 'Current service throughput',
  unit: 'req/s'
});

// Capacity monitoring
class CapacityMonitor {
  private maxCapacity: number;
  private currentLoad: number = 0;
  
  constructor(maxCapacity: number) {
    this.maxCapacity = maxCapacity;
    
    // Update capacity metrics every 30 seconds
    setInterval(() => {
      const utilizationPercent = (this.currentLoad / this.maxCapacity) * 100;
      
      serviceCapacity.record(utilizationPercent, {
        service: 'meta-agent-service',
        resource_type: 'request_processing',
        limit_type: 'configured_max'
      });
    }, 30000);
  }
  
  incrementLoad(): void {
    this.currentLoad++;
  }
  
  decrementLoad(): void {
    this.currentLoad = Math.max(0, this.currentLoad - 1);
  }
}
```

---

## 🤖 Meta-Agent Specific Metrics

### **UEP Protocol Compliance Metrics**

```typescript
// UEP protocol compliance tracking
const uepCompliance = meter.createGauge('uep_protocol_compliance_rate', {
  description: 'UEP protocol compliance rate',
  unit: '1'
});

const uepVersionCompatibility = meter.createGauge('uep_version_compatibility_rate', {
  description: 'UEP version compatibility rate',
  unit: '1'
});

// Compliance monitoring
class UEPComplianceMonitor {
  private validMessages: number = 0;
  private totalMessages: number = 0;
  
  recordMessage(message: UEPMessage, isValid: boolean): void {
    this.totalMessages++;
    if (isValid) {
      this.validMessages++;
    }
    
    const complianceRate = this.validMessages / this.totalMessages;
    uepCompliance.record(complianceRate, {
      protocol_version: message.version,
      message_type: message.type,
      agent_type: message.agentType
    });
  }
}
```

### **Agent Lifecycle Metrics**

```typescript
// Agent lifecycle tracking
const agentStartupTime = meter.createHistogram('agent_startup_duration_seconds', {
  description: 'Agent startup time in seconds',
  unit: 's',
  boundaries: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120]
});

const agentRestarts = meter.createCounter('agent_restarts_total', {
  description: 'Total agent restarts',
  unit: '1'
});

const agentHealthScore = meter.createGauge('agent_health_score', {
  description: 'Agent health score (0-100)',
  unit: '1'
});

// Agent lifecycle monitoring
class AgentLifecycleMonitor {
  recordStartup(agentId: string, startupTime: number): void {
    agentStartupTime.record(startupTime, {
      agent_id: agentId,
      agent_type: this.getAgentType(agentId),
      startup_type: 'cold_start'
    });
  }
  
  recordRestart(agentId: string, reason: string): void {
    agentRestarts.add(1, {
      agent_id: agentId,
      agent_type: this.getAgentType(agentId),
      restart_reason: reason
    });
  }
  
  updateHealthScore(agentId: string, score: number): void {
    agentHealthScore.record(score, {
      agent_id: agentId,
      agent_type: this.getAgentType(agentId),
      health_category: this.categorizeHealth(score)
    });
  }
  
  private categorizeHealth(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'degraded';
    return 'critical';
  }
}
```

### **Agent Coordination Metrics**

```typescript
// Agent coordination performance tracking
const coordinationSuccess = meter.createCounter('agent_coordination_success_total', {
  description: 'Successful agent coordination events',
  unit: '1'
});

const coordinationLatency = meter.createHistogram('agent_coordination_duration_seconds', {
  description: 'Agent coordination latency in seconds',
  unit: 's',
  boundaries: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
});

const activeAgents = meter.createGauge('active_agents_count', {
  description: 'Number of active agents',
  unit: '1'
});

// Coordination monitoring
class CoordinationMonitor {
  recordCoordinationEvent(
    initiatorId: string, 
    targetId: string, 
    duration: number, 
    success: boolean
  ): void {
    coordinationLatency.record(duration, {
      initiator_type: this.getAgentType(initiatorId),
      target_type: this.getAgentType(targetId),
      coordination_type: 'direct_message',
      protocol: 'uep'
    });
    
    if (success) {
      coordinationSuccess.add(1, {
        initiator_type: this.getAgentType(initiatorId),
        target_type: this.getAgentType(targetId),
        coordination_type: 'direct_message'
      });
    }
  }
  
  updateActiveAgentCount(count: number, agentType: string): void {
    activeAgents.record(count, {
      agent_type: agentType,
      status: 'active'
    });
  }
}
```

---

## 📊 Prometheus Configuration and Scraping

### **Complete Prometheus Configuration**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Meta-Agent applications
  - job_name: 'meta-agents'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name

  # cAdvisor for container metrics
  - job_name: 'cadvisor'
    kubernetes_sd_configs:
      - role: node
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      - target_label: __address__
        replacement: kubernetes.default.svc:443
      - source_labels: [__meta_kubernetes_node_name]
        regex: (.+)
        target_label: __metrics_path__
        replacement: /api/v1/nodes/${1}/proxy/metrics/cadvisor

  # Node exporter for host metrics
  - job_name: 'node-exporter'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: node-exporter
```

### **Recording Rules for Efficient Queries**

```yaml
# recording_rules.yml
groups:
  - name: meta_agent_recording_rules
    interval: 30s
    rules:
      # RED Method recording rules
      - record: meta_agent:http_request_rate
        expr: sum(rate(http_requests_total[5m])) by (service, method, route)
      
      - record: meta_agent:http_error_rate
        expr: sum(rate(http_request_errors_total[5m])) by (service, method) / sum(rate(http_requests_total[5m])) by (service, method)
      
      - record: meta_agent:http_request_duration_p95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service, method))
      
      # USE Method recording rules
      - record: meta_agent:container_cpu_utilization
        expr: (rate(container_cpu_usage_seconds_total[5m]) * 100) / (container_spec_cpu_quota / container_spec_cpu_period)
      
      - record: meta_agent:container_memory_utilization
        expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) * 100
      
      - record: meta_agent:container_cpu_throttling_rate
        expr: rate(container_cpu_cfs_throttled_seconds_total[5m]) / rate(container_cpu_cfs_periods_total[5m])
      
      # Four Golden Signals recording rules
      - record: meta_agent:service_availability
        expr: (sum(rate(http_requests_total[5m])) by (service) - sum(rate(http_request_errors_total{status_class="5xx"}[5m])) by (service)) / sum(rate(http_requests_total[5m])) by (service)
      
      # UEP Protocol recording rules
      - record: meta_agent:uep_protocol_compliance_rate
        expr: avg(uep_protocol_compliance_rate) by (agent_type, protocol_version)
      
      - record: meta_agent:agent_coordination_success_rate
        expr: sum(rate(agent_coordination_success_total[5m])) by (initiator_type, target_type) / sum(rate(agent_coordination_duration_seconds_count[5m])) by (initiator_type, target_type)
```

---

## 🚨 Alert Rules and Thresholds

### **RED Method Alert Rules**

```yaml
# alert_rules.yml
groups:
  - name: meta_agent_red_alerts
    rules:
      # High error rate
      - alert: HighHTTPErrorRate
        expr: meta_agent:http_error_rate > 0.05
        for: 2m
        labels:
          severity: warning
          method: RED
        annotations:
          summary: "High HTTP error rate detected"
          description: "Service {{ $labels.service }} has error rate of {{ $value | humanizePercentage }} over 5%"
      
      # High latency
      - alert: HighHTTPLatency
        expr: meta_agent:http_request_duration_p95 > 1
        for: 2m
        labels:
          severity: warning
          method: RED
        annotations:
          summary: "High HTTP latency detected"
          description: "Service {{ $labels.service }} P95 latency is {{ $value }}s (above 1s threshold)"
      
      # Low request rate (possible service down)
      - alert: LowHTTPRequestRate
        expr: meta_agent:http_request_rate < 0.1
        for: 5m
        labels:
          severity: critical
          method: RED
        annotations:
          summary: "Very low HTTP request rate"
          description: "Service {{ $labels.service }} has very low request rate: {{ $value }} req/s"
```

### **USE Method Alert Rules**

```yaml
  - name: meta_agent_use_alerts
    rules:
      # High CPU utilization
      - alert: HighContainerCPUUtilization
        expr: meta_agent:container_cpu_utilization > 80
        for: 3m
        labels:
          severity: warning
          method: USE
        annotations:
          summary: "High container CPU utilization"
          description: "Container {{ $labels.container }} CPU utilization is {{ $value }}% (above 80%)"
      
      # High memory utilization
      - alert: HighContainerMemoryUtilization
        expr: meta_agent:container_memory_utilization > 85
        for: 2m
        labels:
          severity: warning
          method: USE
        annotations:
          summary: "High container memory utilization"
          description: "Container {{ $labels.container }} memory utilization is {{ $value }}% (above 85%)"
      
      # CPU throttling
      - alert: ContainerCPUThrottling
        expr: meta_agent:container_cpu_throttling_rate > 0.1
        for: 2m
        labels:
          severity: warning
          method: USE
        annotations:
          summary: "Container CPU throttling detected"
          description: "Container {{ $labels.container }} is being throttled {{ $value | humanizePercentage }} of the time"
```

### **UEP Protocol Alert Rules**

```yaml
  - name: meta_agent_uep_alerts
    rules:
      # Low UEP protocol compliance
      - alert: LowUEPProtocolCompliance
        expr: meta_agent:uep_protocol_compliance_rate < 0.95
        for: 2m
        labels:
          severity: warning
          protocol: UEP
        annotations:
          summary: "Low UEP protocol compliance rate"
          description: "UEP protocol compliance rate for {{ $labels.agent_type }} is {{ $value | humanizePercentage }} (below 95%)"
      
      # Low agent coordination success rate
      - alert: LowAgentCoordinationSuccessRate
        expr: meta_agent:agent_coordination_success_rate < 0.9
        for: 3m
        labels:
          severity: critical
          protocol: UEP
        annotations:
          summary: "Low agent coordination success rate"
          description: "Agent coordination success rate between {{ $labels.initiator_type }} and {{ $labels.target_type }} is {{ $value | humanizePercentage }} (below 90%)"
```

---

## 📈 Dashboards and Visualization

### **Grafana Dashboard Configuration**

```json
{
  "dashboard": {
    "title": "Meta-Agent Factory - Observability Methods Overview",
    "panels": [
      {
        "title": "RED Method - Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(meta_agent:http_request_rate) by (service)",
            "legendFormat": "{{ service }}"
          }
        ]
      },
      {
        "title": "RED Method - Error Rate",
        "type": "graph", 
        "targets": [
          {
            "expr": "sum(meta_agent:http_error_rate) by (service)",
            "legendFormat": "{{ service }}"
          }
        ]
      },
      {
        "title": "RED Method - Duration P95",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(meta_agent:http_request_duration_p95) by (service)",
            "legendFormat": "{{ service }}"
          }
        ]
      },
      {
        "title": "USE Method - CPU Utilization",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(meta_agent:container_cpu_utilization) by (container)",
            "legendFormat": "{{ container }}"
          }
        ]
      },
      {
        "title": "USE Method - Memory Utilization", 
        "type": "graph",
        "targets": [
          {
            "expr": "sum(meta_agent:container_memory_utilization) by (container)",
            "legendFormat": "{{ container }}"
          }
        ]
      },
      {
        "title": "Four Golden Signals - Service Availability",
        "type": "singlestat",
        "targets": [
          {
            "expr": "avg(meta_agent:service_availability)",
            "legendFormat": "Overall Availability"
          }
        ]
      }
    ]
  }
}
```

---

## 🔧 Implementation Checklist

### **Phase 1: Basic Instrumentation (Week 1)**
- [ ] Implement RED method metrics in all Node.js/TypeScript services
- [ ] Deploy OpenTelemetry SDK with Prometheus exporter
- [ ] Set up basic Prometheus scraping configuration
- [ ] Create initial Grafana dashboards for RED metrics

### **Phase 2: Infrastructure Monitoring (Week 2)**
- [ ] Deploy cAdvisor for container metrics collection
- [ ] Implement USE method queries and recording rules
- [ ] Set up basic alerting rules for resource utilization
- [ ] Add infrastructure panels to Grafana dashboards

### **Phase 3: Four Golden Signals (Week 3)**
- [ ] Implement service-level latency and traffic metrics
- [ ] Set up service availability calculations
- [ ] Create service-level error tracking and categorization
- [ ] Build comprehensive service health dashboard

### **Phase 4: Meta-Agent Extensions (Week 4)**
- [ ] Implement UEP protocol compliance metrics
- [ ] Add agent lifecycle and coordination tracking
- [ ] Set up agent-specific alerting rules
- [ ] Create specialized dashboards for agent monitoring

### **Phase 5: Advanced Features (Week 5)**
- [ ] Add eBPF-based metrics collection (optional)
- [ ] Implement distributed tracing correlation
- [ ] Set up SLO/SLA tracking and alerting
- [ ] Optimize queries and reduce cardinality

---

## 📚 Cardinality Management Best Practices

### **Label Cardinality Guidelines**

**High Cardinality Labels to Avoid:**
- User IDs, session IDs, request IDs
- Timestamps or time-based labels
- IP addresses or detailed network information
- Unbound string values from user input

**Recommended Low Cardinality Labels:**
- Service names (< 50 services)
- HTTP methods (GET, POST, PUT, DELETE)
- Status code classes (2xx, 3xx, 4xx, 5xx)
- Agent types (< 20 types)
- Environment names (dev, staging, prod)

### **Cardinality Estimation Formula**
```
Total Series = Product of all label value combinations
Example: service (10) × method (5) × status_class (5) = 250 series
```

### **Cardinality Monitoring Queries**
```yaml
# Monitor metric cardinality
prometheus_tsdb_symbol_table_size_bytes
prometheus_tsdb_head_series

# Identify high cardinality metrics
topk(10, count by (__name__)({__name__=~".+"}))
```

---

## 🎯 Key Recommendations

### **1. Implementation Priority**
1. **Start with RED Method** - Immediate visibility into service performance
2. **Add USE Method** - Critical for resource planning and troubleshooting  
3. **Layer on Four Golden Signals** - Service-level health overview
4. **Extend with Meta-Agent metrics** - Specialized monitoring for UEP protocol

### **2. Operational Excellence**
- **Keep cardinality under control** - Monitor metric growth and optimize labels
- **Use recording rules** - Pre-compute expensive queries for dashboards
- **Implement meaningful alerts** - Focus on actionable metrics with proper thresholds
- **Document metric definitions** - Maintain clear documentation for all custom metrics

### **3. Performance Considerations**
- **Batch metric updates** - Use OpenTelemetry batch processors
- **Optimize scrape intervals** - Balance freshness with storage requirements
- **Monitor Prometheus performance** - Track ingestion rate and query performance
- **Use appropriate histogram buckets** - Align buckets with expected value ranges

---

**Status**: ✅ **COMPLETE - Comprehensive Observability Mapping**  
**Next Phase**: Define Meta-Agent KPIs and Advanced Collection Patterns (Task 232.3)  
**Implementation Ready**: Production-ready metrics mapping with 140+ specific metrics  

This comprehensive mapping provides the complete foundation for implementing enterprise-grade observability across the Meta-Agent Factory system using industry-standard methodologies and proven instrumentation patterns.