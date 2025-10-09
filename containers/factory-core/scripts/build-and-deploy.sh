#!/bin/bash

# Build and Deploy Factory Core Container
# This script handles the complete build and deployment process

set -e  # Exit on any error

echo "🏗️ Building Factory Core Container..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from factory-core directory"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
docker rmi meta-agent-factory-core:latest 2>/dev/null || true

# Build TypeScript
echo "📦 Building TypeScript..."
npm run build

# Verify essential files exist
echo "✅ Verifying build output..."
if [ ! -f "dist/factory-core.js" ]; then
    echo "❌ Error: factory-core.js not found in dist/"
    exit 1
fi

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t meta-agent-factory-core:latest .

# Test the image
echo "🧪 Testing Docker image..."
docker run --rm --name factory-core-test \
    -e NODE_ENV=test \
    -e DOCKER_CONTAINER=true \
    meta-agent-factory-core:latest \
    node -e "console.log('✅ Container startup test passed')" || {
    echo "❌ Container test failed"
    exit 1
}

echo "✅ Factory Core container built successfully!"
echo ""
echo "To run the container:"
echo "  docker run -p 3000:3000 meta-agent-factory-core:latest"
echo ""  
echo "To run with docker-compose:"
echo "  docker-compose up factory-core"