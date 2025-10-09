# 🔗 HOW THE CONTAINERS WORK TOGETHER

## 🎯 THE BIG PICTURE

The system uses **microservices architecture** where each major component runs in its own container. Here's how they communicate:

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER REQUESTS                             │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼ Port 8080
                    ┌────────────────┐
                    │  API Gateway   │ ← Single entry point
                    └───────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼ Port 3000         ▼ Port 3001        ▼ Port 3002
┌──────────────┐    ┌──────────────┐   ┌──────────────┐
│ Factory Core │    │Domain Agents │   │ UEP Service  │
│              │    │              │   │              │
│ • 11 Meta-   │    │ • Backend    │   │ • Protocol   │
│   Agents     │    │ • Frontend   │   │   Validation │
│ • Orchestra- │    │ • DevOps     │   │ • Workflow   │
│   tion       │    │ • QA         │   │   Rules      │
│              │    │ • Docs       │   │              │
└──────┬───────┘    └──────┬───────┘   └──────┬───────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼ Port 4222           ▼ Port 6380           ▼ Port 2379
┌─────────┐          ┌─────────┐           ┌─────────┐
│  NATS   │          │  Redis  │           │  etcd   │
│ Broker  │          │  Cache  │           │Registry │
└─────────┘          └─────────┘           └─────────┘
```

---

## 🔄 COMMUNICATION PATTERNS

### 1. **Synchronous HTTP (Request/Response)**
```
User → API Gateway → Factory Core → Meta-Agent → Response
```
Example: "Parse this PRD file"

### 2. **Asynchronous Messaging (NATS)**
```
Factory Core → NATS → All Agents (broadcast)
Agent A → NATS → Agent B (direct message)
```
Example: "New task available for processing"

### 3. **Shared State (Redis)**
```
Agent A → Redis (write) ← Agent B (read)
```
Example: Caching parsed PRD results

### 4. **Service Discovery (etcd)**
```
New Agent → etcd (register) ← Factory Core (discover)
```
Example: Finding available agents

---

## 🏃 REAL WORKFLOW EXAMPLE

Let's trace a PRD parsing request:

```
1. User sends PRD to API Gateway (port 8080)
   POST /api/parse-prd

2. API Gateway routes to Factory Core (port 3000)
   → Validates request
   → Checks authentication

3. Factory Core creates PRD Parser agent
   → Looks up available agents in etcd
   → Spawns new agent instance

4. PRD Parser processes document
   → Parses markdown (2-3ms)
   → Extracts requirements
   → Calls TaskMaster for research

5. TaskMaster integration
   → For each requirement, runs: task-master research
   → Uses Perplexity API for insights

6. Results flow back
   → Parser → Factory Core → API Gateway → User
   → Results cached in Redis

7. Async notifications via NATS
   → "PRD parsing complete"
   → Other agents can react
```

---

## 🐳 CONTAINER ISOLATION & BENEFITS

### Each Container is Independent:

**Factory Core Container**
- Language: Node.js/TypeScript
- Memory: 1GB limit
- CPU: 0.5 cores
- Can crash without affecting others

**Domain Agents Container**
- Language: Could be Python/Go/Rust
- Memory: 512MB limit
- CPU: 0.25 cores
- Scales independently

**Benefits:**
1. **Fault Isolation**: One agent crashes, others keep running
2. **Technology Freedom**: Each can use best language for task
3. **Resource Control**: Limit CPU/memory per service
4. **Independent Scaling**: Add more parser agents during heavy load
5. **Easy Updates**: Replace one container without downtime

---

## 🌐 NETWORK MAGIC

All containers are on the **same Docker network** (`meta-agent-factory`):

```yaml
networks:
  meta-agent-factory:
    driver: bridge
```

This means:
- Containers can reach each other by name (e.g., `http://factory-core:3000`)
- Isolated from external network
- No need to expose internal ports
- Secure communication

Example:
```javascript
// Inside any container, this just works:
const response = await fetch('http://factory-core:3000/api/agents');
```

---

## 🚀 STARTING THE FULL SYSTEM

### Option 1: Start Core Services
```bash
# Just the essentials
docker run -d --name factory-core \
  --network all-purpose_meta-agent-factory \
  -p 3005:3000 \
  -e REDIS_URL=redis://meta-agent-redis:6379 \
  real-factory-core:final
```

### Option 2: Start Everything
```bash
# Fix docker-compose dependencies first, then:
docker-compose up -d
```

### Option 3: Development Mode
Keep local services running, use Docker for infrastructure only.

---

## 📊 CURRENT STATUS

**Running**: Infrastructure (Redis, NATS, etcd)
**Not Running**: Application containers (factory-core, agents, gateway)
**Ready**: All code and configurations
**Blocking Issue**: docker-compose dependency conflicts

**Next Step**: Either fix compose file OR start containers individually!