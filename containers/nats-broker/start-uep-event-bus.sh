#!/bin/sh
echo "Starting UEP Event Bus..."

# Start NATS server in background
nats-server -c /etc/nats/nats-server.conf &
NATS_PID=$!

# Wait for NATS to be ready
echo "Waiting for NATS server to start..."
sleep 10

# Setup UEP streams and consumers
echo "Setting up UEP streams and consumers..."
cd /app/uep && node setup-streams.js

# Log startup completion
echo "UEP Event Bus startup complete - NATS PID: $NATS_PID"
echo "JetStream domain: uep-meta-agent-factory"
echo "UEP Protocol version: 2.1"
echo "Monitoring: http://localhost:8222"

# Keep NATS running in foreground
wait $NATS_PID