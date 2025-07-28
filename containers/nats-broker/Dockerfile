# UEP Event Bus - Enhanced NATS JetStream Container
FROM node:20-alpine AS setup
WORKDIR /setup
COPY package*.json ./
RUN npm install nats@2.18.0

FROM nats:2.10-alpine

# Metadata for UEP Event Bus
LABEL maintainer="Meta-Agent Factory Team" \
      version="1.0.0" \
      description="UEP Protocol Event Bus with NATS JetStream" \
      component="event-bus" \
      protocol="UEP-2.1"

# Install additional tools for UEP protocol support
RUN apk add --no-cache \
    nodejs \
    npm \
    curl \
    jq \
    openssl \
    ca-certificates \
    dumb-init

# Create UEP-specific directories
RUN mkdir -p \
    /data/jetstream \
    /logs/uep \
    /app/uep \
    /certs \
    /config/streams \
    /scripts

# Copy UEP-enhanced configuration files
COPY nats-server.conf /etc/nats/nats-server.conf
COPY jetstream-config.json /etc/nats/jetstream-config.json

# Copy UEP setup and management scripts
COPY setup-streams.js /app/uep/setup-streams.js
COPY --from=setup /setup/node_modules /app/uep/node_modules

# Create healthcheck script for UEP Event Bus
RUN echo '#!/bin/sh\n\
# UEP Event Bus Health Check\n\
curl -f http://localhost:8222/healthz || exit 1\n\
curl -f http://localhost:8222/varz | jq -e ".jetstream.stats.memory > 0" || exit 1\n\
' > /scripts/healthcheck.sh && chmod +x /scripts/healthcheck.sh

# Create UEP stream monitoring script
RUN echo '#!/bin/sh\n\
# UEP Stream Status Monitor\n\
echo "=== UEP Event Bus Status ==="\n\
curl -s http://localhost:8222/jsz | jq ".streams[] | {name: .name, messages: .state.messages, bytes: .state.bytes}"\n\
echo "=== UEP Consumers Status ==="\n\
curl -s http://localhost:8222/jsz | jq ".streams[].consumer_detail[] | {name: .name, delivered: .delivered.consumer_seq, ack_pending: .num_ack_pending}"\n\
' > /scripts/uep-status.sh && chmod +x /scripts/uep-status.sh

# Create startup script that initializes UEP streams
RUN echo '#!/bin/sh\n\
echo "Starting UEP Event Bus..."\n\
\n\
# Start NATS server in background\n\
nats-server -c /etc/nats/nats-server.conf &\n\
NATS_PID=$!\n\
\n\
# Wait for NATS to be ready\n\
echo "Waiting for NATS server to start..."\n\
sleep 10\n\
\n\
# Setup UEP streams and consumers\n\
echo "Setting up UEP streams and consumers..."\n\
cd /app/uep && node setup-streams.js\n\
\n\
# Log startup completion\n\
echo "UEP Event Bus startup complete - NATS PID: $NATS_PID"\n\
echo "JetStream domain: uep-meta-agent-factory"\n\
echo "UEP Protocol version: 2.1"\n\
echo "Monitoring: http://localhost:8222"\n\
\n\
# Keep NATS running in foreground\n\
wait $NATS_PID\n\
' > /scripts/start-uep-event-bus.sh && chmod +x /scripts/start-uep-event-bus.sh

# Set proper permissions for UEP data persistence
RUN chown -R nats:nats /data /logs /app /scripts
USER nats

# Health check for UEP Event Bus
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /scripts/healthcheck.sh

# Expose UEP Event Bus ports
# 4222: NATS client connections
# 8222: HTTP monitoring 
# 6222: Cluster routes
# 8443: HTTPS monitoring (for production)
EXPOSE 4222 8222 6222 8443

# Set environment variables for UEP
ENV NATS_CONFIG=/etc/nats/nats-server.conf \
    JETSTREAM_DOMAIN=uep-meta-agent-factory \
    UEP_VERSION=2.1 \
    UEP_VALIDATION_ENABLED=true

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start UEP Event Bus with stream initialization
CMD ["/scripts/start-uep-event-bus.sh"]