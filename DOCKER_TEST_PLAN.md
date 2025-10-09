# 🧪 Docker Testing & Debugging Plan

## Phase 1: Test Individual Services First

### Step 1: Start Only Infrastructure
```bash
# Start just the basics first
docker-compose up -d redis nats-broker etcd

# Check they're running
docker ps
docker-compose logs redis
docker-compose logs nats-broker
```

### Step 2: Add Core Services One by One
```bash
# Add factory-core
docker-compose up -d factory-core

# Check logs for errors
docker-compose logs -f factory-core

# Test health endpoint
curl http://localhost:3000/health
```

### Step 3: Add Domain Agents
```bash
# Add domain agents
docker-compose up -d domain-agents

# Check logs
docker-compose logs -f domain-agents

# Test health
curl http://localhost:3002/health
```

## Phase 2: Common Issues & Fixes

### Issue: "Cannot connect to Docker daemon"
```bash
# Make sure Docker Desktop is running
# On Windows: Check system tray
```

### Issue: "Port already in use"
```bash
# Find what's using the port
netstat -ano | findstr :3000

# Kill the process or change port in docker-compose.yml
```

### Issue: "Container keeps restarting"
```bash
# Check logs for specific service
docker-compose logs factory-core | tail -50

# Common causes:
# - Missing environment variables
# - Can't connect to dependencies
# - Code errors
```

### Issue: "Out of memory"
```bash
# Check Docker Desktop settings
# Increase memory to 8GB+ in Settings > Resources

# Or run minimal setup
docker-compose up -d factory-core domain-agents redis nats-broker
```

## Phase 3: Debugging Commands

### Check Container Status
```bash
# See all containers and their status
docker-compose ps

# See resource usage
docker stats

# Enter a container to debug
docker exec -it meta-agent-factory-core /bin/sh
```

### Check Connectivity
```bash
# Test if services can reach each other
docker exec meta-agent-factory-core ping domain-agents
docker exec meta-agent-factory-core nc -zv nats-broker 4222
docker exec meta-agent-factory-core nc -zv redis 6379
```

### View Real-Time Logs
```bash
# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f factory-core domain-agents

# Last 100 lines
docker-compose logs --tail=100 factory-core
```

## Phase 4: Minimal Test Setup

If full system won't start, try this minimal `docker-compose.minimal.yml`:

```yaml
version: '3.8'

services:
  factory-core:
    build:
      context: .
      dockerfile: ./containers/factory-core/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

networks:
  default:
    name: meta-agent-minimal
```

Run with:
```bash
docker-compose -f docker-compose.minimal.yml up
```

## Phase 5: Build Issues

### If builds fail:
```bash
# Check Dockerfile exists
ls containers/factory-core/Dockerfile

# Build with verbose output
docker-compose build --no-cache factory-core

# If Dockerfile missing, create basic one:
```

Create `containers/factory-core/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Expected Issues

1. **Dockerfiles might be missing** - We'll need to create them
2. **Build paths might be wrong** - We'll fix the context paths
3. **Dependencies might fail** - We'll simplify the setup
4. **Ports might conflict** - We'll change them

## Let's Start Testing!

1. First run: `docker-compose up redis`
2. If that works: `docker-compose up redis nats-broker`
3. Then gradually add more services

This way we can debug each issue as it comes up!