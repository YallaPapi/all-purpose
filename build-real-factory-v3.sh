#!/bin/bash

echo "Building Real Factory Core v3 with actual meta-agents (ES modules)..."

# Create a temporary build directory
BUILD_DIR="/tmp/factory-build-v3-$$"
mkdir -p "$BUILD_DIR"

# Copy factory-core container files
cp -r containers/factory-core/* "$BUILD_DIR/"

# Copy all meta-agent implementations
echo "Copying meta-agent implementations..."
mkdir -p "$BUILD_DIR/src/meta-agents"
cp -r src/meta-agents/* "$BUILD_DIR/src/meta-agents/"

# Create a proper Dockerfile for the real factory
cat > "$BUILD_DIR/Dockerfile" << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code including meta-agents
COPY . .

# Install meta-agent dependencies
RUN for agent in src/meta-agents/*/; do \
    if [ -f "$agent/package.json" ]; then \
        echo "Installing dependencies for $agent"; \
        cd "$agent" && npm install && cd /app; \
    fi; \
done

# Create directories for generated content
RUN mkdir -p /app/generated /app/logs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV REDIS_URL=redis://redis:6379
ENV NATS_URL=nats://nats-broker:4222

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# Start the factory-core server with ES modules support
CMD ["node", "--loader", "tsx", "src/factory-core.ts"]
EOF

# Build the Docker image
echo "Building Docker image..."
docker build -t real-factory-core:v3 "$BUILD_DIR"

# Clean up
rm -rf "$BUILD_DIR"

echo "Build complete! Run with: docker run -p 3002:3000 --network all-purpose_meta-agent-factory real-factory-core:v3"