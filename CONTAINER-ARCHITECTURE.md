# 🐳 CONTAINER ARCHITECTURE & STATUS

## Current Running Containers (Only 3 Meta-Agent Services!)

```
✅ meta-agent-redis      - Cache/Coordination (port 6380)
✅ meta-agent-etcd       - Service Registry (port 2379)
✅ meta-agent-nats-broker - Message Bus (port 4222)
❌ Everything else needs to be started!
```

## 📦 ALL SERVICES THAT SHOULD BE RUNNING

### 🎯 Core Meta-Agent Services (Priority 1)
| Service | Container Name | Port | Status | Purpose |
|---------|---------------|------|--------|---------|
| factory-core | meta-agent-factory-core | 3000 | ❌ NOT RUNNING | Orchestrates all 11 meta-agents |
| domain-agents | meta-agent-domain-agents | 3001 | ❌ NOT RUNNING | 5 specialized domain agents |
| uep-service | meta-agent-uep-service | 3002 | ❌ NOT RUNNING | Universal Execution Protocol |
| api-gateway | meta-agent-factory-gateway | 8080 | ❌ NOT RUNNING | Main API entry point |

### 🔄 Supporting Services (Already Running)
| Service | Container Name | Port | Status | Purpose |
|---------|---------------|------|--------|---------|
| redis | meta-agent-redis | 6380 | ✅ RUNNING | Caching & state |
| nats-broker | meta-agent-nats-broker | 4222 | ✅ RUNNING | Message passing |
| etcd | meta-agent-etcd | 2379 | ✅ RUNNING | Service discovery |

### 📊 Observability Stack (Priority 2)
| Service | Container Name | Port | Status | Purpose |
|---------|---------------|------|--------|---------|
| observability | meta-agent-observability | 9090/3004 | ❌ NOT RUNNING | Prometheus + Grafana |
| tempo | meta-agent-tempo | 3200 | ❌ NOT RUNNING | Distributed tracing |
| loki | meta-agent-loki | 3100 | ❌ NOT RUNNING | Log aggregation |
| alertmanager | meta-agent-alertmanager | 9093 | ❌ NOT RUNNING | Alert routing |
| otel-collector | meta-agent-otel-collector | 4317/4318 | ❌ NOT RUNNING | Telemetry collection |
| promtail | meta-agent-promtail | 9080 | ❌ NOT RUNNING | Log shipping |

### 🌐 Frontend & Additional
| Service | Container Name | Port | Status | Purpose |
|---------|---------------|------|--------|---------|
| frontend | meta-agent-frontend | 80 | ❌ NOT RUNNING | Web UI |
| uep-registry | meta-agent-uep-registry | 3001/50051 | ❌ NOT RUNNING | Service registry |

---

## 🏗️ HOW IT ALL WORKS TOGETHER

### 1. **Inter-Container Communication**
```
┌─────────────────┐
│   API Gateway   │ ← External requests (port 8080)
└────────┬────────┘
         │
    ┌────▼────┐
    │ Factory │ ← Orchestrates meta-agents
    │  Core   │
    └────┬────┘
         │
   ┌─────┴──────────────┬──────────────┬─────────────┐
   │                    │              │             │
┌──▼──┐  ┌─────────┐  ┌▼─────────┐  ┌▼────────┐  ┌─▼──────────┐
│ PRD │  │Scaffold │  │All-Purpose│  │Backend │  │Frontend    │
│Parser│  │Generator│  │Pattern    │  │Agent   │  │Agent       │
└─────┘  └─────────┘  └──────────┘  └────────┘  └────────────┘
   │          │             │            │             │
   └──────────┴─────────────┴────────────┴─────────────┘
                          │
                    ┌─────▼─────┐
                    │   NATS    │ ← Message bus for all agents
                    │  Broker   │
                    └───────────┘
```

### 2. **Communication Methods**

- **HTTP REST APIs**: Each service exposes endpoints
- **NATS Messaging**: Async communication between agents
- **Redis Pub/Sub**: Real-time updates and caching
- **etcd**: Service discovery and configuration

### 3. **Network Architecture**

All containers are on the same Docker network: `meta-agent-factory`

This allows:
- Container-to-container communication using service names
- No need for exposed ports between services
- Isolated from host network for security

---

## 🚀 TO ACTIVATE EVERYTHING

### Quick Start (Core Services Only):
```bash
# Start the essential meta-agent services
docker-compose up -d factory-core domain-agents uep-service api-gateway
```

### Full System (With Monitoring):
```bash
# Start everything including observability
docker-compose --profile monitoring up -d
```

### Check Status:
```bash
# See what's running
docker-compose ps

# Check logs
docker-compose logs -f factory-core
```

---

## 💡 WHY SEPARATE CONTAINERS?

1. **Scalability**: Each agent can scale independently
2. **Isolation**: Failures don't cascade
3. **Language Flexibility**: Agents can use different tech stacks
4. **Resource Management**: Allocate CPU/memory per service
5. **Development**: Work on one agent without affecting others
6. **Deployment**: Update individual services

---

## 🔍 CURRENT REALITY

**Only 3 of 13+ containers are running!**

To get the full system operational:
1. Start factory-core (orchestrator)
2. Start domain-agents 
3. Start api-gateway
4. Start observability stack

The infrastructure is ready, just needs to be activated!