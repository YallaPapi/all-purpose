FROM nats:2.10-alpine
LABEL maintainer="meta-agent-factory"
LABEL description="NATS JetStream Broker for MVS Architecture"

COPY nats-server.conf /etc/nats/nats-server.conf

EXPOSE 4222 8222 6222

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD nats-server --check || exit 1

CMD ["nats-server", "-c", "/etc/nats/nats-server.conf"]