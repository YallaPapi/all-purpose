FROM node:20-alpine AS setup
WORKDIR /setup
COPY package*.json ./
RUN npm install nats@2.18.0

FROM nats:2.10-alpine
LABEL maintainer="meta-agent-factory"
LABEL description="NATS JetStream Broker for MVS Architecture"

RUN apk add --no-cache nodejs npm

COPY nats-server.conf /etc/nats/nats-server.conf
COPY jetstream-config.json /etc/nats/jetstream-config.json
COPY setup-streams.js /etc/nats/setup-streams.js
COPY --from=setup /setup/node_modules /etc/nats/node_modules

# Create initialization script
RUN echo '#!/bin/sh' > /etc/nats/init.sh && \
    echo 'nats-server -c /etc/nats/nats-server.conf &' >> /etc/nats/init.sh && \
    echo 'sleep 10' >> /etc/nats/init.sh && \
    echo 'cd /etc/nats && node setup-streams.js' >> /etc/nats/init.sh && \
    echo 'wait' >> /etc/nats/init.sh && \
    chmod +x /etc/nats/init.sh

EXPOSE 4222 8222 6222

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD nats-server --check || exit 1

CMD ["/etc/nats/init.sh"]