# Consul Server Container for UEP Service Discovery
# Multi-stage build for development and production configurations

FROM consul:1.18.0 AS consul-base

# Set up non-root user for security
RUN addgroup -g 8500 consul-user && \
    adduser -D -u 8500 -G consul-user -s /bin/sh consul-user

# Create necessary directories
RUN mkdir -p /consul/config /consul/data /consul/logs && \
    chown -R consul-user:consul-user /consul

# Development stage
FROM consul-base AS development

# Copy development configuration
COPY config/consul-dev.hcl /consul/config/consul.hcl

# Development environment variables
ENV CONSUL_BIND_INTERFACE=eth0
ENV CONSUL_CLIENT_INTERFACE=eth0
ENV CONSUL_LOG_LEVEL=INFO
ENV CONSUL_DATACENTER=uep-dev
ENV CONSUL_DOMAIN=consul

# Expose ports
EXPOSE 8300 8301 8301/udp 8302 8302/udp 8500 8600 8600/udp

USER consul-user

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD consul members || exit 1

CMD ["consul", "agent", "-config-dir=/consul/config", "-data-dir=/consul/data"]

# Production stage
FROM consul-base AS production

# Copy production configuration
COPY config/consul-prod.hcl /consul/config/consul.hcl
COPY config/acl-policy.hcl /consul/config/acl-policy.hcl
COPY scripts/consul-entrypoint.sh /usr/local/bin/consul-entrypoint.sh

# Production environment variables
ENV CONSUL_BIND_INTERFACE=eth0
ENV CONSUL_CLIENT_INTERFACE=eth0
ENV CONSUL_LOG_LEVEL=WARN
ENV CONSUL_DATACENTER=uep-prod
ENV CONSUL_DOMAIN=consul
ENV CONSUL_ENCRYPT_VERIFY_INCOMING=true
ENV CONSUL_ENCRYPT_VERIFY_OUTGOING=true

# Install additional tools for production
RUN apk add --no-cache \
    curl \
    jq \
    openssl

# Set up TLS certificates directory
RUN mkdir -p /consul/tls && \
    chown consul-user:consul-user /consul/tls

# Make entrypoint script executable
RUN chmod +x /usr/local/bin/consul-entrypoint.sh

# Expose ports
EXPOSE 8300 8301 8301/udp 8302 8302/udp 8500 8600 8600/udp

USER consul-user

# Health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD consul members -ca-file=/consul/tls/ca.pem \
      -client-cert=/consul/tls/consul.pem \
      -client-key=/consul/tls/consul-key.pem || exit 1

ENTRYPOINT ["/usr/local/bin/consul-entrypoint.sh"]
CMD ["consul", "agent", "-config-dir=/consul/config", "-data-dir=/consul/data"]

# Default to development if no target specified
FROM development AS default