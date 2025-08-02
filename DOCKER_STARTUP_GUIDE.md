# 🚀 Meta-Agent Factory Docker Startup Guide

## System Overview

The Meta-Agent Factory runs as a **distributed system with 13+ containers** that work together:

### Core Containers (The Main 5):
1. **factory-core** - The 11 Meta-Agents (Port 3000)
2. **domain-agents** - The 5 Domain Specialist Agents (Port 3002)
3. **uep-service** - Universal Execution Protocol coordinator (Port 3003)
4. **api-gateway** - Traefik routing and load balancing (Ports 80/443)
5. **observability** - Prometheus + Grafana monitoring (Port 3004 for Grafana)

### Supporting Services:
- **nats-broker** - Message passing between agents
- **redis** - Coordination and caching
- **etcd** - Service registry
- **uep-registry** - Agent registration and discovery
- **loki** - Log aggregation
- **tempo** - Distributed tracing
- **alertmanager** - Alert management
- **otel-collector** - OpenTelemetry trace processing
- **promtail** - Log collection

## Prerequisites

1. **Docker & Docker Compose installed**
2. **Environment variables** in `.env` file:
```bash
# Required API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key

# Optional
JWT_SECRET=your-secret-key
GRAFANA_PASSWORD=admin
GRAFANA_USER=admin

# Email alerts (optional)
SMTP_HOST=smtp.gmail.com:587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ALERT_EMAIL_FROM=alerts@your-domain.com
DEFAULT_EMAIL=your-email@gmail.com
```

## Quick Start

### 1. Clone and Setup
```bash
# Navigate to project root
cd C:\Users\stuar\Desktop\Projects\all-purpose

# Create .env file with your API keys
notepad .env
```

### 2. Start Everything
```bash
# Start all services
docker-compose up -d

# Watch the logs
docker-compose logs -f
```

### 3. Access the System

Once running, you can access:

- **Main Application**: http://localhost:3000
- **Grafana Dashboard**: http://localhost:3004 (admin/admin)
- **Traefik Dashboard**: http://localhost:8080
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

## How The Containers Communicate

```
┌─────────────────────────────────────────────────┐
│                 API Gateway (Traefik)            │
│                    Port 80/443                   │
└────────────────────┬────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼─────┐  ┌─────▼──────┐  ┌────▼─────┐
│ Factory  │  │  Domain    │  │   UEP    │
│  Core    │◄─┤  Agents    │─►│ Service  │
│  (3000)  │  │  (3002)    │  │  (3003)  │
└────┬─────┘  └─────┬──────┘  └────┬─────┘
     │              │               │
     └──────────────┼───────────────┘
                    │
              ┌─────▼─────┐
              │   NATS    │ ← Message Bus
              │  Broker   │
              └─────┬─────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
    ┌────▼───┐ ┌───▼───┐ ┌───▼────┐
    │ Redis  │ │ etcd  │ │  UEP   │
    │ Cache  │ │Registry│ │Registry│
    └────────┘ └───────┘ └────────┘
```

## Common Commands

### Start/Stop Services
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart factory-core

# View logs for specific service
docker-compose logs -f factory-core
```

### Check Service Health
```bash
# View all running containers
docker ps

# Check service health
docker-compose ps

# Test factory-core health
curl http://localhost:3000/health

# Test domain-agents health
curl http://localhost:3002/health
```

### Build and Update
```bash
# Rebuild all containers
docker-compose build

# Rebuild specific service
docker-compose build factory-core

# Pull latest images and restart
docker-compose pull
docker-compose up -d
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs factory-core

# Check if ports are in use
netstat -an | findstr :3000
```

### Out of Memory
```bash
# Check resource usage
docker stats

# Increase Docker Desktop memory (Settings > Resources)
```

### Clean Start
```bash
# Remove everything and start fresh
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Architecture Details

### Factory Core (11 Meta-Agents)
- Infrastructure Orchestrator
- PRD Parser Agent
- Scaffold Generator Agent
- All-Purpose Pattern Agent
- Parameter Flow Agent
- Template Engine Factory
- Five Document Framework Agent
- Thirty Minute Rule Agent
- Vercel Native Architecture Agent
- Post-Creation Investigator Agent
- Account Creation System

### Domain Agents (5 Specialists)
- Backend Agent - Server logic, databases, APIs
- Frontend Agent - UI/UX, React/Vue/Angular
- DevOps Agent - CI/CD, containerization
- QA Agent - Testing frameworks
- Documentation Agent - Technical writing

### Communication Flow
1. All requests come through **Traefik API Gateway**
2. **Factory Core** coordinates the 11 meta-agents
3. **Domain Agents** handle specialized tasks
4. **UEP Service** enforces protocol compliance
5. **NATS Broker** handles all inter-agent messaging
6. **Redis** provides fast coordination and caching
7. **Observability** monitors everything

## Production Deployment

For production, use the production compose file:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Next Steps

1. **Monitor the System**: Open Grafana at http://localhost:3004
2. **Check Agent Health**: View the observability dashboard at http://localhost:3000/admin/observability
3. **Test the Factory**: Submit a PRD to generate a new project
4. **View Logs**: Use `docker-compose logs -f` to watch real-time activity

## Support

- Check logs: `docker-compose logs [service-name]`
- View metrics: http://localhost:3004 (Grafana)
- System health: http://localhost:3000/health
- Container status: `docker ps`

Remember: The system takes 1-2 minutes to fully start as services wait for dependencies!