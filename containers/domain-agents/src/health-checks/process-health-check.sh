#!/bin/sh

# Simple process health check for NATS workers
# Checks if the Node.js process is running and responsive

AGENT_TYPE=${AGENT_TYPE:-backend}
PROCESS_NAME="simple-domain-agent"

# Check if Node.js process is running
if pgrep -f "$PROCESS_NAME" > /dev/null; then
    echo "✅ $AGENT_TYPE agent process is running"
    
    # Additional check: verify the process is responsive by checking memory usage
    MEMORY_USAGE=$(ps -o pid,ppid,cmd,%mem,%cpu --sort=-%mem | grep "$PROCESS_NAME" | head -1 | awk '{print $4}')
    
    if [ ! -z "$MEMORY_USAGE" ] && [ "$MEMORY_USAGE" -lt "90" ]; then
        echo "✅ $AGENT_TYPE agent memory usage is healthy: ${MEMORY_USAGE}%"
        exit 0
    else
        echo "⚠️ $AGENT_TYPE agent memory usage is high: ${MEMORY_USAGE}%"
        exit 1
    fi
else
    echo "❌ $AGENT_TYPE agent process is not running"
    exit 1
fi