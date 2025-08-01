# 🚀 **Quick Start Guide: All-Purpose Meta-Agent Factory**

## **Deploy Your 16-Agent System in 5 Minutes**

**Version**: 1.0.0  
**Last Updated**: August 1, 2025  
**Prerequisites Check Time**: ~30 seconds  
**First Deploy Time**: ~5 minutes

---

## 📋 **Table of Contents**

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Quick Deploy](#quick-deploy)
4. [Verify Deployment](#verify-deployment)
5. [First Request](#first-request)
6. [Common Issues](#common-issues)
7. [Next Steps](#next-steps)

---

## ✅ **Prerequisites**

### **Required Software**

```bash
# Check Docker version (24.0+ required)
docker --version

# Check Docker Compose version (2.20+ required)
docker compose version

# Check available resources
docker system info | grep -E "CPUs|Total Memory"
```

### **Required Files**

Ensure you have cloned the repository:
```bash
git clone https://github.com/your-org/all-purpose-meta-agent-factory.git
cd all-purpose-meta-agent-factory
```

### **Environment Setup**

Create your `.env` file from the template:
```bash
cp .env.example .env
```

**Critical Environment Variables**:
```bash
# Required API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password
REDIS_SENTINEL_PASSWORD=your_sentinel_password

# WebSocket Configuration  
WEBSOCKET_SECRET=your_websocket_secret_key
```

---

## 💻 **System Requirements**

### **Minimum Requirements** (Development)
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 10GB SSD
- **OS**: Linux, macOS, or Windows (WSL2)

### **Recommended Requirements** (Production)
- **CPU**: 8+ cores
- **RAM**: 16GB+
- **Storage**: 20GB+ SSD
- **Network**: Stable internet connection

### **Port Requirements**
Ensure these ports are available:
```bash
# Check port availability
for port in 3000 3001-3016 6379 26379-26381 8080 9090 3100; do
  lsof -i :$port >/dev/null 2>&1 && echo "Port $port is in use!" || echo "Port $port is available"
done
```

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | Web UI |
| Meta-Agents | 3001-3011 | 11 Meta-agents |
| Domain Agents | 3012-3016 | 5 Domain agents |
| Redis | 6379 | State storage |
| Redis Sentinel | 26379-26381 | HA monitoring |
| WebSocket Hub | 8080 | Real-time coordination |
| Prometheus | 9090 | Metrics |
| Grafana | 3100 | Dashboards |

---

## 🚀 **Quick Deploy**

### **Step 1: Start All Services**

```bash
# Start the entire system
docker compose up -d

# Watch the startup progress
docker compose logs -f
```

**Expected Output**:
```
[+] Running 21/21
 ✔ Network all-purpose_agent-network      Created
 ✔ Network all-purpose_monitoring         Created
 ✔ Volume "all-purpose_redis_data"        Created
 ✔ Container redis-master                 Started
 ✔ Container redis-sentinel-1             Started
 ✔ Container redis-sentinel-2             Started
 ✔ Container redis-sentinel-3             Started
 ✔ Container websocket-hub                Started
 ✔ Container infrastructure-orchestrator  Started
 ✔ Container parameter-flow-agent         Started
 ... (16 agents total)
 ✔ Container prometheus                   Started
 ✔ Container grafana                      Started
```

### **Step 2: Wait for System Ready**

The system performs automatic health checks. Wait for all services to be healthy:

```bash
# Check system health
docker compose ps

# All services should show "healthy" status
# This typically takes 30-60 seconds
```

### **Step 3: Verify Core Services**

```bash
# Check Redis connectivity
docker compose exec redis-master redis-cli ping
# Expected: PONG

# Check WebSocket hub
curl -s http://localhost:8080/health | jq .
# Expected: {"status":"healthy","connections":16}

# Check leader election
curl -s http://localhost:3001/api/leader | jq .
# Expected: {"isLeader":true,"leaderId":"infrastructure-orchestrator"}
```

---

## ✅ **Verify Deployment**

### **1. Check Agent Health Dashboard**

Open your browser and navigate to:
```
http://localhost:3000/admin/observability
```

You should see:
- **16 agents** with green status indicators
- **System Health**: Healthy
- **Active Connections**: 16
- **Redis Status**: Connected

### **2. Check Individual Agents**

```bash
# Test each agent's health endpoint
for port in {3001..3016}; do
  echo -n "Agent on port $port: "
  curl -s http://localhost:$port/api/health | jq -r .status
done
```

All agents should respond with `"healthy"`.

### **3. Check Monitoring Stack**

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3100 (default: admin/admin)

---

## 🎯 **First Request**

### **Submit a Test Project Request**

1. **Open the Meta-Agent Factory UI**:
   ```
   http://localhost:3000/meta-agent-factory
   ```

2. **Submit a Simple Request**:
   ```json
   {
     "type": "scaffold",
     "name": "hello-world-api",
     "description": "Create a simple REST API with health endpoint"
   }
   ```

3. **Watch Real-Time Progress**:
   - The UI will show ASCII art progress
   - Agents coordinate automatically
   - Typical completion: 2-3 minutes

4. **Check Generated Output**:
   ```bash
   ls -la generated/hello-world-api/
   ```

---

## 🚨 **Common Issues**

### **Issue 1: Port Conflicts**

**Symptom**: `bind: address already in use`

**Solution**:
```bash
# Find what's using the port (example: 3000)
lsof -i :3000

# Stop conflicting service or change port in docker-compose.yml
```

### **Issue 2: Insufficient Resources**

**Symptom**: Containers exit with code 137 (OOM)

**Solution**:
```bash
# Increase Docker resource limits
# Docker Desktop: Settings > Resources
# Linux: Check /etc/docker/daemon.json

# Or reduce agent resource limits in docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 256M  # Reduce from 512M
```

### **Issue 3: Redis Connection Failures**

**Symptom**: `Error: Redis connection refused`

**Solution**:
```bash
# Check Redis and Sentinels are running
docker compose ps | grep redis

# Restart Redis cluster
docker compose restart redis-master redis-sentinel-1 redis-sentinel-2 redis-sentinel-3
```

### **Issue 4: Agents Not Coordinating**

**Symptom**: Agents show as "disconnected" in dashboard

**Solution**:
```bash
# Check WebSocket hub
docker compose logs websocket-hub

# Restart coordination services
docker compose restart websocket-hub
docker compose restart infrastructure-orchestrator
```

### **Quick Diagnostic Script**

```bash
#!/bin/bash
# save as diagnose.sh and run: bash diagnose.sh

echo "🔍 Running system diagnostics..."

# Check Docker
docker --version || echo "❌ Docker not installed"
docker compose version || echo "❌ Docker Compose not installed"

# Check services
SERVICES=$(docker compose ps --format json | jq -r .[].State)
if [[ $SERVICES == *"exited"* ]]; then
  echo "❌ Some services have exited"
  docker compose ps --filter status=exited
else
  echo "✅ All services running"
fi

# Check Redis
docker compose exec -T redis-master redis-cli ping > /dev/null 2>&1 && echo "✅ Redis responding" || echo "❌ Redis not responding"

# Check agent connectivity
curl -s http://localhost:3001/api/health > /dev/null 2>&1 && echo "✅ Agents accessible" || echo "❌ Agents not accessible"

# Check disk space
df -h . | awk 'NR==2 {print "📊 Disk usage: "$5" ("$4" available)"}'

# Check memory
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}" | head -5
```

---

## 📖 **Next Steps**

### **1. Explore the System**

- **View logs**: `docker compose logs -f [service-name]`
- **Access agent APIs**: Each agent exposes REST endpoints
- **Monitor metrics**: Check Grafana dashboards
- **Read agent docs**: See `/docs/agents/` directory

### **2. Submit Real Projects**

```bash
# Use the TaskMaster CLI
task-master parse-prd --input="your-project-requirements.md"

# Or use the Web UI
http://localhost:3000/submit-project
```

### **3. Scale Your Deployment**

```bash
# Scale domain agents (if needed)
docker compose up -d --scale backend-domain-agent=3

# Add custom agents
# See: /docs/development/adding-agents.md
```

### **4. Enable Production Features**

- **TLS/SSL**: See `/docs/deployment/tls-setup.md`
- **Authentication**: See `/docs/deployment/auth-setup.md`
- **Backup**: See `/docs/operations/backup-restore.md`
- **Monitoring**: See `/docs/operations/monitoring.md`

---

## 🛟 **Getting Help**

### **Quick Commands**

```bash
# Stop all services
docker compose down

# Stop and remove all data
docker compose down -v

# View real-time logs
docker compose logs -f

# Restart a specific service
docker compose restart [service-name]

# Update and rebuild
git pull
docker compose build
docker compose up -d
```

### **Support Resources**

- **Documentation**: `/docs/` directory
- **Troubleshooting**: `/docs/troubleshooting/`
- **Issues**: https://github.com/your-org/all-purpose/issues
- **Community**: Discord/Slack (if applicable)

---

## 🎉 **Success Checklist**

Before considering your deployment successful, verify:

- [ ] All 16 agents show "healthy" status
- [ ] Redis master and sentinels are running
- [ ] WebSocket hub shows 16 connections
- [ ] Observability dashboard is accessible
- [ ] Leader election completed successfully
- [ ] First test request completed
- [ ] Monitoring stack is operational

**Congratulations!** You now have a fully operational 16-agent Meta-Agent Factory ready to build production-ready applications automatically.

---

**Pro Tip**: Save this one-liner to quickly check system health:
```bash
alias check-agents='docker compose ps | grep -E "(healthy|running)" | wc -l | xargs -I {} echo "Healthy services: {}/21"'
```