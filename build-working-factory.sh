#!/bin/bash

echo "Building WORKING Factory Core with fixed agent loading..."

# Create a temporary build directory
BUILD_DIR="/tmp/factory-build-working-$$"
mkdir -p "$BUILD_DIR"

# Copy factory-core container files
cp -r containers/factory-core/* "$BUILD_DIR/"

# Copy all meta-agent implementations
echo "Copying meta-agent implementations..."
mkdir -p "$BUILD_DIR/src/meta-agents"
cp -r src/meta-agents/* "$BUILD_DIR/src/meta-agents/"

# Create a startup script that handles imports correctly
cat > "$BUILD_DIR/start.sh" << 'EOF'
#!/bin/sh
echo "Starting Real Factory Core..."

# Set Node options for ES modules
export NODE_OPTIONS="--experimental-modules --experimental-specifier-resolution=node"

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "Running in Docker container"
    export AGENT_BASE_PATH="/app/src/meta-agents"
else
    echo "Running locally"
    export AGENT_BASE_PATH="../../src/meta-agents"
fi

# Start the server
exec npx tsx src/factory-core.ts
EOF

chmod +x "$BUILD_DIR/start.sh"

# Create Dockerfile
cat > "$BUILD_DIR/Dockerfile" << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Install meta-agent dependencies
RUN for agent in src/meta-agents/*/; do \
    if [ -f "$agent/package.json" ]; then \
        echo "Installing dependencies for $agent"; \
        cd "$agent" && npm install && cd /app; \
    fi; \
done

# Create directories
RUN mkdir -p /app/generated /app/logs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV REDIS_URL=redis://redis:6379
ENV NATS_URL=nats://nats-broker:4222

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# Use our startup script
CMD ["./start.sh"]
EOF

# Build the Docker image
echo "Building Docker image..."
docker build -t working-factory-core:latest "$BUILD_DIR"

# Clean up
rm -rf "$BUILD_DIR"

echo "Build complete!"
echo ""
echo "To run locally:"
echo "  cd containers/factory-core && npm run dev"
echo ""
echo "To run in Docker:"
echo "  docker run -d --name working-factory \\"
echo "    -p 3003:3000 \\"
echo "    --network all-purpose_meta-agent-factory \\"
echo "    -e REDIS_URL=redis://redis:6380 \\"
echo "    working-factory-core:latest"