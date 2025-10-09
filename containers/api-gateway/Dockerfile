FROM traefik:v3.0
LABEL maintainer="meta-agent-factory"
LABEL description="API Gateway for Meta-Agent Factory MVS Architecture"

COPY traefik.yml /etc/traefik/traefik.yml
COPY dynamic/ /etc/traefik/dynamic/

EXPOSE 80 443 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD traefik healthcheck || exit 1