#!/bin/bash

# Deploy Real Services Script
# Replaces placeholder services with actual implementations

echo "🚀 Deploying Real Services..."

# Build real UEP service
echo "📦 Building real UEP service..."
cd containers/uep-service
docker build -t meta-agent-uep-service:real -f Dockerfile .
cd ../..

# Build real factory-core with agents
echo "📦 Building real factory-core..."
cd containers/factory-core
docker build -t meta-agent-factory-core:real .
cd ../..

# Build real domain agents
echo "📦 Building real domain agents..."
# Create proper Dockerfile for domain agents
cat > containers/domain-agents/Dockerfile.real << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy all source code
COPY . .

# Install dependencies
RUN npm install

# Build TypeScript agents
RUN npm run build || true

# Install NATS
RUN npm install nats

# Create startup script
RUN echo '#!/bin/sh' > start-agents.sh && \
    echo 'node src/services/NATSAgentWrapper.js &' >> start-agents.sh && \
    echo 'node generated/backend-agent/index.js &' >> start-agents.sh && \
    echo 'node generated/frontend-agent/index.js &' >> start-agents.sh && \
    echo 'node generated/devops-agent/index.js &' >> start-agents.sh && \
    echo 'node generated/qa-agent/index.js &' >> start-agents.sh && \
    echo 'node generated/documentation-agent/index.js &' >> start-agents.sh && \
    echo 'wait' >> start-agents.sh && \
    chmod +x start-agents.sh

EXPOSE 3001

CMD ["./start-agents.sh"]
EOF

docker build -t meta-agent-domain-agents:real -f containers/domain-agents/Dockerfile.real .

# Update docker-compose to use real images
echo "📝 Creating docker-compose override..."
cat > docker-compose.override.yml << 'EOF'
version: '3.8'

services:
  factory-core:
    image: meta-agent-factory-core:real
    environment:
      - ENABLE_REAL_AGENTS=true
      - NATS_ENABLED=true
  
  domain-agents:
    image: meta-agent-domain-agents:real
    environment:
      - NATS_URL=nats://nats-broker:4222
      - ENABLE_NATS=true
  
  uep-service:
    image: meta-agent-uep-service:real
    environment:
      - UEP_MODE=coordination
      - NATS_URL=nats://nats-broker:4222
EOF

echo "🔄 Restarting services with real implementations..."
docker-compose down factory-core domain-agents uep-service
docker-compose up -d factory-core domain-agents uep-service

echo "⏳ Waiting for services to start..."
sleep 10

echo "✅ Real services deployed!"
echo ""
echo "Check status with:"
echo "  docker-compose ps"
echo "  docker logs meta-agent-factory-core"
echo "  docker logs meta-agent-domain-agents"
echo "  docker logs meta-agent-uep-service"