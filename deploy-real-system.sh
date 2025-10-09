#!/bin/bash

# Deploy Real System
# Replaces all placeholder containers with real implementations

echo "🚀 Deploying Real All-Purpose Meta-Agent Factory System"
echo "=================================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
if ! docker --version > /dev/null 2>&1; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! docker-compose --version > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

echo "✅ Prerequisites met"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build real factory-core image
echo ""
echo "🔨 Building real factory-core image..."
cat > containers/factory-core/Dockerfile.real << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy all source files
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
COPY containers/factory-core/src ./containers/factory-core/src
COPY dist ./dist

# Install dependencies
RUN npm ci

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD wget -q -O - http://localhost:3000/health || exit 1

# Start with real factory
CMD ["node", "dist/factory-core.js"]
EOF

docker build -t meta-agent-factory-core:real -f containers/factory-core/Dockerfile.real .

# Build real UEP service
echo ""
echo "🔨 Building real UEP service..."
cd containers/uep-service
docker build -t meta-agent-uep-service:real -f Dockerfile .
cd ../..

# Build real agents image
echo ""
echo "🔨 Building real agents image..."
cat > containers/agents/Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Install NATS
RUN npm install nats

# Copy agent code
COPY src/services/NATSAgentWrapper.js ./src/services/
COPY src/utils/logger.js ./src/utils/
COPY src/meta-agents ./src/meta-agents
COPY generated ./generated

# Copy deployment script
COPY deploy-nats-agents.js ./

# Start agents
CMD ["node", "deploy-nats-agents.js"]
EOF

mkdir -p containers/agents
docker build -t meta-agent-agents:real -f containers/agents/Dockerfile .

# Create production docker-compose
echo ""
echo "📝 Creating production docker-compose..."
cat > docker-compose.production.yml << 'EOF'
version: '3.8'

services:
  # NATS with JetStream
  nats-broker:
    image: nats:2.10-alpine
    container_name: meta-agent-nats
    ports:
      - "4222:4222"
      - "8222:8222"
    command: ["nats-server", "-js", "-m", "8222"]
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "-", "http://localhost:8222/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - meta-agent-network

  # Real Factory Core
  factory-core:
    image: meta-agent-factory-core:real
    container_name: meta-agent-factory-core
    ports:
      - "3005:3000"
    environment:
      - NODE_ENV=production
      - NATS_URL=nats://nats-broker:4222
      - ENABLE_REAL_AGENTS=true
    depends_on:
      nats-broker:
        condition: service_healthy
    networks:
      - meta-agent-network

  # Real UEP Service
  uep-service:
    image: meta-agent-uep-service:real
    container_name: meta-agent-uep-service
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - NATS_URL=nats://nats-broker:4222
      - UEP_MODE=coordination
    depends_on:
      nats-broker:
        condition: service_healthy
    networks:
      - meta-agent-network

  # Real Agents
  agents:
    image: meta-agent-agents:real
    container_name: meta-agent-agents
    environment:
      - NATS_URL=nats://nats-broker:4222
    depends_on:
      nats-broker:
        condition: service_healthy
      factory-core:
        condition: service_started
    networks:
      - meta-agent-network

  # Redis for state
  redis:
    image: redis:7-alpine
    container_name: meta-agent-redis
    ports:
      - "6379:6379"
    networks:
      - meta-agent-network

networks:
  meta-agent-network:
    driver: bridge
EOF

# Start the real system
echo ""
echo "🚀 Starting real system..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "📊 Checking system status..."
docker-compose -f docker-compose.production.yml ps

echo ""
echo "✅ Real system deployed!"
echo ""
echo "🔍 Check the system:"
echo "  - Factory API: http://localhost:3005/health"
echo "  - NATS Monitor: http://localhost:8222/varz"
echo "  - UEP Service: http://localhost:3002/health"
echo ""
echo "📝 Run tests:"
echo "  - node test-working-prd-flow.js"
echo "  - node test-real-prd-processing.js"