FROM grafana/grafana:10.0.0 AS grafana
FROM prom/prometheus:v2.45.0 AS prometheus

FROM alpine:3.18
LABEL maintainer="meta-agent-factory"
LABEL description="Observability Stack - Prometheus + Grafana for MVS Architecture"

RUN apk add --no-cache supervisor curl

# Copy Prometheus
COPY --from=prometheus /bin/prometheus /bin/prometheus
COPY --from=prometheus /bin/promtool /bin/promtool
COPY prometheus-enhanced.yml /etc/prometheus/prometheus.yml
COPY recording_rules.yml /etc/prometheus/recording_rules.yml
COPY alert_rules.yml /etc/prometheus/alert_rules.yml

# Copy Grafana
COPY --from=grafana /usr/share/grafana /usr/share/grafana
COPY --from=grafana /etc/grafana /etc/grafana
COPY grafana.ini /etc/grafana/grafana.ini
COPY dashboards/ /var/lib/grafana/dashboards/

# Supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 9090 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:9090/-/healthy && curl -f http://localhost:3000/api/health || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]