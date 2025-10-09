# ⚙️ **Configuration Reference and Tuning Guide**

## **Complete Configuration Guide for All-Purpose Meta-Agent Factory**

**Version**: 1.0.0  
**Last Updated**: August 1, 2025  
**Configuration Approach**: 12-Factor App Principles  
**Target Environment**: Docker Compose / Kubernetes

---

## 📚 **Table of Contents**

1. [Environment Variables Reference](#environment-variables-reference)
2. [Docker Compose Configuration](#docker-compose-configuration)
3. [Service-Specific Configuration](#service-specific-configuration)
4. [Performance Tuning](#performance-tuning)
5. [Scaling Configuration](#scaling-configuration)
6. [Security Configuration](#security-configuration)
7. [Monitoring Configuration](#monitoring-configuration)
8. [Troubleshooting Config Issues](#troubleshooting-config-issues)

---

## 🔧 **Environment Variables Reference**

### **Global Environment Variables**

These variables apply to all services in the system:

```bash
# Core Configuration
NODE_ENV=production                    # Environment (development|staging|production)
LOG_LEVEL=info                        # Logging level (debug|info|warn|error)
SERVICE_DISCOVERY_METHOD=redis        # Service discovery method (redis|consul|static)
CLUSTER_NAME=meta-agent-factory       # Cluster identifier

# API Configuration
API_PORT=3000                         # API Gateway port
API_HOST=0.0.0.0                     # API bind address
API_CORS_ORIGIN=*                    # CORS allowed origins
API_RATE_LIMIT=100                   # Requests per minute per IP
API_REQUEST_TIMEOUT=30000            # Request timeout in ms

# Authentication
JWT_SECRET=your_jwt_secret_here      # JWT signing secret (min 32 chars)
JWT_EXPIRY=7d                        # JWT token expiry
API_KEY_HEADER=X-API-Key            # API key header name
ENABLE_AUTH=true                     # Enable authentication

# Database/Cache
REDIS_URL=redis://localhost:6379     # Redis connection URL
REDIS_PASSWORD=your_redis_password   # Redis password
REDIS_SENTINEL_URLS=sentinel1:26379,sentinel2:26379,sentinel3:26379
REDIS_MASTER_NAME=mymaster          # Redis Sentinel master name
REDIS_DB=0                          # Redis database number
REDIS_CONNECTION_TIMEOUT=5000       # Connection timeout in ms
REDIS_COMMAND_TIMEOUT=5000          # Command timeout in ms
REDIS_MAX_RETRIES=3                 # Maximum retry attempts

# WebSocket Configuration
WEBSOCKET_URL=ws://localhost:8080   # WebSocket hub URL
WEBSOCKET_SECRET=your_ws_secret     # WebSocket authentication secret
WEBSOCKET_HEARTBEAT_INTERVAL=5000   # Heartbeat interval in ms
WEBSOCKET_RECONNECT_DELAY=1000      # Reconnection delay in ms
WEBSOCKET_MAX_RECONNECT_ATTEMPTS=10 # Max reconnection attempts

# External Services
OPENAI_API_KEY=sk-...               # OpenAI API key
ANTHROPIC_API_KEY=sk-ant-...        # Anthropic API key
PERPLEXITY_API_KEY=pplx-...         # Perplexity API key
GITHUB_TOKEN=ghp_...                # GitHub access token
DOCKER_REGISTRY_URL=                # Docker registry URL
DOCKER_REGISTRY_USERNAME=           # Docker registry username
DOCKER_REGISTRY_PASSWORD=           # Docker registry password

# Monitoring
PROMETHEUS_ENABLED=true             # Enable Prometheus metrics
METRICS_PORT=9090                   # Metrics endpoint port
ENABLE_TRACING=true                 # Enable OpenTelemetry tracing
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=meta-agent-factory
OTEL_TRACES_SAMPLER_PROBABILITY=0.1 # Trace sampling rate

# Feature Flags
ENABLE_CHAOS_TESTING=false          # Enable chaos testing features
ENABLE_SPLIT_BRAIN_DETECTION=true   # Enable split-brain detection
ENABLE_AUTO_SCALING=true            # Enable auto-scaling
ENABLE_CIRCUIT_BREAKER=true         # Enable circuit breakers
CIRCUIT_BREAKER_THRESHOLD=5         # Failure threshold
CIRCUIT_BREAKER_TIMEOUT=60000       # Circuit breaker timeout in ms
```

### **Agent-Specific Environment Variables**

Each agent type has specific configuration options:

```bash
# Infrastructure Orchestrator
ORCHESTRATOR_LEADER_ELECTION_TIMEOUT=15000    # Leader election timeout
ORCHESTRATOR_LEADER_LEASE_DURATION=30000      # Leader lease duration
ORCHESTRATOR_TASK_QUEUE_SIZE=1000             # Maximum task queue size
ORCHESTRATOR_WORKER_POOL_SIZE=10              # Worker pool size

# Parameter Flow Agent
PARAM_FLOW_CACHE_TTL=3600                     # Parameter cache TTL in seconds
PARAM_FLOW_TRANSFORM_TIMEOUT=5000             # Transform timeout in ms
PARAM_FLOW_MAX_PAYLOAD_SIZE=1048576           # Max payload size (1MB)

# Scaffold Generator
SCAFFOLD_TEMPLATE_PATH=/templates             # Template directory path
SCAFFOLD_OUTPUT_PATH=/generated               # Output directory path
SCAFFOLD_MAX_PROJECT_SIZE=104857600           # Max project size (100MB)

# Domain Agents
DOMAIN_AGENT_TYPE=backend                     # Agent type (backend|frontend|devops|qa|docs)
DOMAIN_AGENT_CAPABILITIES=api,database        # Comma-separated capabilities
DOMAIN_AGENT_MAX_CONCURRENT_TASKS=5           # Max concurrent tasks

# Template Engine
TEMPLATE_CACHE_ENABLED=true                   # Enable template caching
TEMPLATE_CACHE_SIZE=100                       # Max cached templates
TEMPLATE_HOT_RELOAD=false                     # Enable hot reload in dev

# Performance Tuning
NODE_OPTIONS=--max-old-space-size=512         # Node.js heap size
UV_THREADPOOL_SIZE=4                          # libuv thread pool size
```

---

## 🐳 **Docker Compose Configuration**

### **Complete docker-compose.yml Example**

```yaml
version: '3.8'

# Networks
networks:
  agent-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
  monitoring:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/24

# Volumes
volumes:
  redis_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

# Shared configurations
x-common-variables: &common-variables
  NODE_ENV: ${NODE_ENV:-production}
  LOG_LEVEL: ${LOG_LEVEL:-info}
  REDIS_URL: redis://redis-master:6379
  WEBSOCKET_URL: ws://websocket-hub:8080

x-resource-limits: &resource-limits
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 256M

x-health-check: &health-check
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:${PORT:-3000}/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s

services:
  # Redis Master
  redis-master:
    image: redis:7-alpine
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 2gb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
      --appendonly yes
      --appendfsync everysec
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - agent-network
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    <<: *health-check
    healthcheck:
      test: ["CMD", "redis-cli", "--pass", "${REDIS_PASSWORD}", "ping"]

  # Redis Sentinels (3 instances for HA)
  redis-sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./config/sentinel-1.conf:/etc/redis/sentinel.conf
    networks:
      - agent-network
    depends_on:
      redis-master:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '0.2'
          memory: 256M

  redis-sentinel-2:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./config/sentinel-2.conf:/etc/redis/sentinel.conf
    networks:
      - agent-network
    depends_on:
      redis-master:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '0.2'
          memory: 256M

  redis-sentinel-3:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./config/sentinel-3.conf:/etc/redis/sentinel.conf
    networks:
      - agent-network
    depends_on:
      redis-master:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '0.2'
          memory: 256M

  # WebSocket Hub
  websocket-hub:
    build:
      context: ./websocket-hub
      args:
        NODE_VERSION: 20-alpine
    ports:
      - "8080:8080"
    environment:
      <<: *common-variables
      PORT: 8080
      WEBSOCKET_SECRET: ${WEBSOCKET_SECRET}
      MAX_CONNECTIONS: 1000
      PING_INTERVAL: 5000
      PING_TIMEOUT: 3000
    networks:
      - agent-network
    depends_on:
      redis-master:
        condition: service_healthy
    <<: *health-check
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

  # Infrastructure Orchestrator
  infrastructure-orchestrator:
    build:
      context: ./agents/infrastructure-orchestrator
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      <<: *common-variables
      PORT: 3001
      AGENT_ID: infrastructure-orchestrator
      AGENT_TYPE: orchestrator
      LEADER_ELECTION_ENABLED: true
      ORCHESTRATOR_LEADER_ELECTION_TIMEOUT: 15000
      ORCHESTRATOR_TASK_QUEUE_SIZE: 1000
    networks:
      - agent-network
    depends_on:
      redis-master:
        condition: service_healthy
      websocket-hub:
        condition: service_healthy
    <<: *health-check
    <<: *resource-limits
    restart: unless-stopped

  # Parameter Flow Agent
  parameter-flow-agent:
    build:
      context: ./agents/parameter-flow
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      <<: *common-variables
      PORT: 3002
      AGENT_ID: parameter-flow-agent
      AGENT_TYPE: parameter-flow
      PARAM_FLOW_CACHE_TTL: 3600
    networks:
      - agent-network
    depends_on:
      infrastructure-orchestrator:
        condition: service_healthy
    <<: *health-check
    <<: *resource-limits
    restart: unless-stopped

  # Additional agents follow similar pattern...

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - agent-network
      - monitoring
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G

  # Grafana
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3100:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=redis-datasource
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - monitoring
    depends_on:
      - prometheus
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### **Docker Compose Override Examples**

For development environments (`docker-compose.override.yml`):

```yaml
version: '3.8'

services:
  # Override for development
  infrastructure-orchestrator:
    build:
      target: development
    volumes:
      - ./agents/infrastructure-orchestrator:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
      NODE_OPTIONS: --inspect=0.0.0.0:9229
    ports:
      - "9229:9229"  # Node.js debugger
```

---

## 🔧 **Service-Specific Configuration**

### **Redis Configuration**

Redis master configuration (`redis.conf`):

```conf
# Network
bind 0.0.0.0
protected-mode yes
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# General
daemonize no
supervised no
pidfile /var/run/redis_6379.pid
loglevel notice
logfile ""
databases 16
always-show-logo no

# Snapshotting
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data

# Replication
replica-serve-stale-data yes
replica-read-only yes
repl-diskless-sync no
repl-diskless-sync-delay 5
repl-diskless-load disabled
repl-ping-replica-period 10
repl-timeout 60
repl-disable-tcp-nodelay no
repl-backlog-size 1mb
repl-backlog-ttl 3600

# Security
requirepass ${REDIS_PASSWORD}
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command CONFIG ""

# Memory Management
maxmemory 2gb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes

# Performance Tuning
latency-monitor-threshold 100
slowlog-log-slower-than 10000
slowlog-max-len 128
```

Redis Sentinel configuration (`sentinel.conf`):

```conf
# Sentinel Configuration
port 26379
dir /tmp
sentinel monitor mymaster redis-master 6379 2
sentinel auth-pass mymaster ${REDIS_PASSWORD}
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 10000
sentinel deny-scripts-reconfig yes

# Notification script
# sentinel notification-script mymaster /scripts/notify.sh

# Client reconfiguration script  
# sentinel client-reconfig-script mymaster /scripts/reconfig.sh
```

### **Node.js Agent Configuration**

Base Dockerfile for all Node.js agents:

```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript (if applicable)
RUN npm run build

# Production stage
FROM node:20-alpine

# Install production dependencies only
RUN apk add --no-cache tini curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Set Node.js production optimizations
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/index.js"]
```

### **Prometheus Configuration**

Prometheus scrape configuration (`prometheus.yml`):

```yaml
global:
  scrape_interval: 15s
  scrape_timeout: 10s
  evaluation_interval: 15s
  external_labels:
    cluster: 'meta-agent-factory'
    environment: 'production'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# Load rules
rule_files:
  - "alerts/*.yml"
  - "recording_rules/*.yml"

# Scrape configurations
scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node.js agents
  - job_name: 'agents'
    scrape_interval: 15s
    metrics_path: '/metrics'
    static_configs:
      - targets:
          - 'infrastructure-orchestrator:3001'
          - 'parameter-flow-agent:3002'
          - 'scaffold-generator:3003'
          - 'template-engine-factory:3004'
          - 'all-purpose-pattern-agent:3005'
          - 'prd-parser-agent:3006'
          - 'backend-domain-agent:3012'
          - 'frontend-domain-agent:3013'
          - 'devops-domain-agent:3014'
          - 'qa-domain-agent:3015'
          - 'documentation-agent:3016'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '([^:]+):.*'
        replacement: '${1}'

  # Redis exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # WebSocket hub
  - job_name: 'websocket'
    static_configs:
      - targets: ['websocket-hub:8080']
    metrics_path: '/metrics'

  # Docker daemon
  - job_name: 'docker'
    static_configs:
      - targets: ['docker-exporter:9323']
```

---

## ⚡ **Performance Tuning**

### **Node.js Performance Optimization**

```javascript
// Agent performance configuration
const performanceConfig = {
  // Memory settings
  memory: {
    maxOldSpaceSize: process.env.NODE_MAX_OLD_SPACE || 512,
    maxSemiSpaceSize: process.env.NODE_MAX_SEMI_SPACE || 16,
    exposeGC: process.env.NODE_EXPOSE_GC === 'true'
  },
  
  // Clustering
  clustering: {
    enabled: process.env.ENABLE_CLUSTERING === 'true',
    workers: process.env.CLUSTER_WORKERS || os.cpus().length,
    restartDelay: 1000,
    maxRestarts: 10
  },
  
  // Event loop monitoring
  eventLoop: {
    monitoringEnabled: true,
    warningThreshold: 100, // ms
    blockingThreshold: 500 // ms
  },
  
  // HTTP server
  http: {
    keepAliveTimeout: 65000,
    headersTimeout: 66000,
    maxHeadersCount: 100,
    timeout: 120000
  },
  
  // Database connections
  database: {
    connectionPoolSize: 10,
    connectionTimeout: 5000,
    commandTimeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000
  }
};

// Apply Node.js optimizations
if (process.env.NODE_ENV === 'production') {
  // Increase UV thread pool size for I/O operations
  process.env.UV_THREADPOOL_SIZE = '4';
  
  // Enable heap snapshots on OOM
  process.on('beforeExit', (code) => {
    if (code === 134) { // OOM exit code
      require('v8').writeHeapSnapshot();
    }
  });
  
  // Monitor event loop lag
  const lagMonitor = require('event-loop-lag')(1000);
  setInterval(() => {
    const lag = lagMonitor();
    if (lag > performanceConfig.eventLoop.warningThreshold) {
      console.warn(`Event loop lag detected: ${lag}ms`);
    }
  }, 5000);
}
```

### **Redis Performance Tuning**

```bash
# Redis performance recommendations
REDIS_PERFORMANCE_CONFIG=(
  # Disable transparent huge pages
  "echo never > /sys/kernel/mm/transparent_hugepage/enabled"
  
  # Set overcommit memory
  "sysctl vm.overcommit_memory=1"
  
  # Increase TCP backlog
  "sysctl net.core.somaxconn=65535"
  
  # Disable swap
  "swapoff -a"
  
  # Set max open files
  "ulimit -n 65535"
)

# Redis benchmark command
redis-benchmark -h localhost -p 6379 -a $REDIS_PASSWORD \
  -c 50 -n 10000 -d 256 \
  --csv > redis-benchmark-results.csv
```

### **Docker Resource Optimization**

```yaml
# Optimized resource allocation by service type
services:
  # High-priority services (always running)
  infrastructure-orchestrator:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: unless-stopped
        delay: 5s
        max_attempts: 3

  # Medium-priority services (task processing)
  domain-agents:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first

  # Low-priority services (support services)
  monitoring:
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
      placement:
        constraints:
          - node.role == worker
```

---

## 📈 **Scaling Configuration**

### **Horizontal Scaling Rules**

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  # Scale domain agents based on load
  backend-domain-agent:
    deploy:
      replicas: ${BACKEND_REPLICAS:-2}
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
        window: 120s

  frontend-domain-agent:
    deploy:
      replicas: ${FRONTEND_REPLICAS:-2}
      update_config:
        parallelism: 1
        delay: 10s

  # Auto-scaling configuration (Kubernetes example)
  autoscaling:
    minReplicas: 1
    maxReplicas: 5
    metrics:
      - type: Resource
        resource:
          name: cpu
          target:
            type: Utilization
            averageUtilization: 70
      - type: Resource
        resource:
          name: memory
          target:
            type: Utilization
            averageUtilization: 80
      - type: Pods
        pods:
          metric:
            name: pending_tasks
          target:
            type: AverageValue
            averageValue: "30"
```

### **Load Balancing Configuration**

```javascript
// Load balancer configuration
const loadBalancerConfig = {
  algorithms: {
    roundRobin: {
      enabled: true,
      weights: null
    },
    leastConnections: {
      enabled: true,
      connectionTracking: true
    },
    consistentHashing: {
      enabled: true,
      replicas: 150,
      hashFunction: 'murmur3'
    },
    randomSelection: {
      enabled: false
    }
  },
  
  healthChecks: {
    interval: 5000,
    timeout: 3000,
    unhealthyThreshold: 3,
    healthyThreshold: 2
  },
  
  circuitBreaker: {
    enabled: true,
    errorThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 30000
  }
};
```

---

## 🔐 **Security Configuration**

### **Security Environment Variables**

```bash
# Security Headers
SECURITY_HSTS_ENABLED=true
SECURITY_HSTS_MAX_AGE=31536000
SECURITY_CSP_ENABLED=true
SECURITY_CSP_DIRECTIVES="default-src 'self'; script-src 'self' 'unsafe-inline'"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100          # Per window
RATE_LIMIT_DELAY_AFTER=50            # Start delaying after
RATE_LIMIT_DELAY_MS=500              # Delay duration

# CORS Configuration
CORS_ORIGIN=https://app.example.com
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400

# TLS Configuration
TLS_ENABLED=true
TLS_CERT_PATH=/certs/server.crt
TLS_KEY_PATH=/certs/server.key
TLS_MIN_VERSION=TLSv1.2
TLS_CIPHERS=ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384

# API Security
API_KEY_ROTATION_DAYS=90
API_KEY_MIN_LENGTH=32
SESSION_SECRET=your_session_secret_here
SESSION_TIMEOUT=3600000              # 1 hour

# Input Validation
MAX_REQUEST_SIZE=10485760            # 10MB
MAX_URL_LENGTH=2048
SANITIZE_INPUT=true
```

### **Docker Security Configuration**

```yaml
# Security-focused Docker Compose overrides
services:
  all-agents:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    user: "1001:1001"
```

---

## 📊 **Monitoring Configuration**

### **Grafana Dashboard Configuration**

```json
{
  "dashboard": {
    "title": "Meta-Agent Factory Monitoring",
    "panels": [
      {
        "title": "Agent Health Status",
        "targets": [
          {
            "expr": "up{job='agents'}",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "title": "Task Processing Rate",
        "targets": [
          {
            "expr": "rate(tasks_processed_total[5m])",
            "legendFormat": "{{agent}}"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "process_resident_memory_bytes / 1024 / 1024",
            "legendFormat": "{{instance}} MB"
          }
        ]
      },
      {
        "title": "Redis Operations",
        "targets": [
          {
            "expr": "rate(redis_commands_total[5m])",
            "legendFormat": "{{cmd}}"
          }
        ]
      }
    ]
  }
}
```

### **Alert Rules Configuration**

```yaml
# alerts.yml
groups:
  - name: agent_alerts
    interval: 30s
    rules:
      - alert: AgentDown
        expr: up{job="agents"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Agent {{ $labels.instance }} is down"
          description: "Agent has been down for more than 2 minutes"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 500000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 500MB"

      - alert: TaskQueueBacklog
        expr: task_queue_size > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Task queue backlog on {{ $labels.instance }}"
          description: "More than 100 tasks pending"
```

---

## 🔍 **Troubleshooting Config Issues**

### **Common Configuration Problems**

| Problem | Symptom | Solution |
|---------|---------|----------|
| Redis connection refused | `ECONNREFUSED` errors | Check `REDIS_URL`, ensure Redis is running, verify password |
| Agent registration fails | Agents show as offline | Verify `WEBSOCKET_URL`, check network connectivity |
| Memory issues | OOM kills, high memory usage | Adjust `NODE_OPTIONS`, set Docker memory limits |
| Slow performance | High latency, timeouts | Tune `UV_THREADPOOL_SIZE`, check CPU limits |
| Port conflicts | `EADDRINUSE` errors | Change port mappings in docker-compose.yml |
| SSL/TLS errors | Certificate errors | Verify cert paths, check certificate validity |
| Rate limiting | 429 errors | Adjust `RATE_LIMIT_MAX_REQUESTS` |

### **Configuration Validation Script**

```bash
#!/bin/bash
# validate-config.sh

echo "🔍 Validating configuration..."

# Check required environment variables
REQUIRED_VARS=(
  "NODE_ENV"
  "REDIS_PASSWORD"
  "JWT_SECRET"
  "WEBSOCKET_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required variable: $var"
    exit 1
  fi
done

# Validate Redis connection
redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} \
  -a ${REDIS_PASSWORD} ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Redis connection OK"
else
  echo "❌ Redis connection failed"
fi

# Validate Node.js memory settings
if [[ $NODE_OPTIONS =~ --max-old-space-size=([0-9]+) ]]; then
  HEAP_SIZE=${BASH_REMATCH[1]}
  if [ $HEAP_SIZE -lt 256 ]; then
    echo "⚠️  Heap size ${HEAP_SIZE}MB may be too small"
  fi
fi

# Check Docker resources
DOCKER_MEM=$(docker info --format '{{.MemTotal}}')
DOCKER_MEM_GB=$((DOCKER_MEM / 1073741824))
if [ $DOCKER_MEM_GB -lt 8 ]; then
  echo "⚠️  Docker has only ${DOCKER_MEM_GB}GB memory allocated"
fi

echo "✅ Configuration validation complete"
```

### **Environment Template Generator**

```bash
#!/bin/bash
# generate-env.sh

cat > .env.example << EOF
# Generated on $(date)
# Copy to .env and fill in your values

# Core Configuration
NODE_ENV=production
LOG_LEVEL=info
SERVICE_DISCOVERY_METHOD=redis
CLUSTER_NAME=meta-agent-factory

# Security (generate secure values)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
WEBSOCKET_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# External Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
GITHUB_TOKEN=ghp_...

# Add remaining configuration...
EOF

echo "✅ Generated .env.example"
```

---

## 📚 **Configuration Best Practices**

1. **Use Environment Variables**: Follow 12-factor app principles
2. **Never Commit Secrets**: Use `.env` files and `.gitignore`
3. **Set Resource Limits**: Prevent resource exhaustion
4. **Enable Health Checks**: For all services
5. **Use Non-Root Users**: Security best practice
6. **Monitor Configuration Changes**: Audit all changes
7. **Document All Options**: Keep documentation updated
8. **Validate Before Deploy**: Run validation scripts
9. **Use Configuration Management**: For production environments
10. **Regular Security Audits**: Review and rotate secrets

---

**This configuration reference provides comprehensive guidance for deploying and tuning the All-Purpose Meta-Agent Factory for optimal performance, security, and reliability.**