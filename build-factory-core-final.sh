#!/bin/bash

# Build factory-core with all meta-agents included
echo "Building factory-core with all meta-agents..."

# Create temporary build directory
rm -rf .build-context
mkdir -p .build-context

# Copy container files
cp -r containers/factory-core/* .build-context/

# Copy meta-agents to correct location
echo "Copying meta-agents..."
mkdir -p .build-context/src/meta-agents
cp -r src/meta-agents/* .build-context/src/meta-agents/

# Build Docker image
cd .build-context
docker build -t meta-agent-factory-core:final .

# Cleanup
cd ..
rm -rf .build-context

echo "Build complete! Image: meta-agent-factory-core:final"