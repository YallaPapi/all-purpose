# NATS Monitoring Stack

Comprehensive monitoring solution for the NATS-based meta-agent communication system.

## Overview

This monitoring stack provides:
- **Real-time metrics** via Prometheus and NATS exporters
- **Visual dashboards** in Grafana for system and agent monitoring
- **Distributed tracing** with OpenTelemetry and Tempo
- **Alerting** for critical system events
- **Historical analysis** of agent communication patterns

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Meta-Agents   │────▶│   NATS Server    │◀────│ NATS Exporter   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                          │
         │                       ▼                          ▼
         │              ┌──────────────────┐      ┌─────────────────┐
         │              │ NATS Surveyor    │─────▶│   Prometheus    │
         │              └──────────────────┘      └─────────────────┘
         │                                                  │
         ▼                                                  ▼
┌──────────────────┐    ┌──────────────────┐     ┌─────────────────┐
│ OTel Collector   │───▶│      Tempo       │     │    Grafana      │
└──────────────────┘    └──────────────────┘     └─────────────────┘
```

## Quick Start

### 1. Start the Monitoring Stack

```bash
cd monitoring/nats
docker-compose -f docker-compose-monitoring.yml up -d
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **NATS Monitoring**: http://localhost:8222

### 3. Import Dashboards

Dashboards are automatically provisioned:
- NATS Server Monitoring
- Meta-Agent Monitoring

## Components

### NATS Exporters

#### NATS Prometheus Exporter
- Collects server metrics from NATS monitoring endpoints
- Exposes metrics on port 7777
- Monitors: connections, subscriptions, messages, bytes, errors

#### NATS Surveyor
- Advanced metrics collection for NATS clusters
- Subject-level metrics and latency measurements
- Exposes metrics on port 7778

### Prometheus

- Scrapes metrics every 15 seconds
- Configured with alert rules for critical events
- Stores metrics locally with configurable retention

### Grafana

- Pre-configured dashboards for NATS and agents
- Real-time visualization of system health
- Alert integration with various notification channels

### OpenTelemetry & Tempo

- Distributed tracing for agent communications
- Trace correlation across services
- Performance bottleneck identification

## Metrics Reference

### NATS Server Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| `nats_varz_connections` | Active client connections | count |
| `nats_varz_subscriptions` | Active subscriptions | count |
| `nats_varz_in_msgs` | Total messages received | count |
| `nats_varz_out_msgs` | Total messages sent | count |
| `nats_varz_in_bytes` | Total bytes received | bytes |
| `nats_varz_out_bytes` | Total bytes sent | bytes |
| `nats_varz_slow_consumers` | Slow consumer count | count |
| `nats_varz_cpu` | CPU usage percentage | percent |
| `nats_varz_mem` | Memory usage | bytes |

### Agent Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| `agent_task_started_total` | Tasks started | count |
| `agent_task_completed_total` | Tasks completed | count |
| `agent_task_failed_total` | Tasks failed | count |
| `agent_task_duration_seconds` | Task processing time | seconds |
| `agent_connection_status` | Connection health | bool |

### JetStream Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| `nats_jetstream_server_storage_used` | Storage used | bytes |
| `nats_jetstream_server_storage_reserved` | Storage reserved | bytes |
| `nats_jetstream_consumer_ack_pending` | Pending acknowledgments | count |
| `nats_jetstream_stream_messages` | Messages in stream | count |

## Alert Configuration

### Critical Alerts

1. **NATS Server Down**
   - Triggers when server is unreachable for >1 minute
   - Severity: Critical

2. **High Memory Usage**
   - Triggers when memory >1.5GB for >5 minutes
   - Severity: Warning

3. **Agent Disconnection**
   - Triggers when agent offline for >2 minutes
   - Severity: Critical

4. **High Task Failure Rate**
   - Triggers when failure rate >10% for >5 minutes
   - Severity: Warning

### Adding Custom Alerts

Edit `alert-rules.yml` and add new rules:

```yaml
- alert: YourAlertName
  expr: your_prometheus_query > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Alert summary"
    description: "Detailed description"
```

## Dashboard Customization

### Adding Panels

1. Access Grafana at http://localhost:3001
2. Navigate to your dashboard
3. Click "Add Panel"
4. Configure query and visualization

### Example Queries

**Agent Task Distribution**:
```promql
sum by (agent_name) (rate(agent_task_completed_total[5m]))
```

**Message Latency Percentiles**:
```promql
histogram_quantile(0.95, 
  sum(rate(nats_latency_histogram_bucket[5m])) by (le)
)
```

**Subject Activity Heatmap**:
```promql
sum by (subject) (rate(nats_subject_messages_total[5m]))
```

## Distributed Tracing

### Instrumenting Agents

Add OpenTelemetry to your agents:

```javascript
import { trace } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const provider = new NodeTracerProvider();
const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

const tracer = trace.getTracer('meta-agent');

// In your agent code
const span = tracer.startSpan('process-task');
span.setAttributes({
  'agent.id': agentId,
  'task.id': taskId,
  'task.type': taskType
});
// ... process task
span.end();
```

### Viewing Traces

1. Open Grafana
2. Navigate to Explore
3. Select Tempo datasource
4. Search by trace ID or agent attributes

## Production Considerations

### Resource Requirements

- **Prometheus**: 2GB RAM, 50GB storage
- **Grafana**: 1GB RAM
- **Tempo**: 2GB RAM, 100GB storage
- **NATS Exporters**: 512MB RAM each

### High Availability

For production:

1. **Deploy Prometheus in HA mode** with replication
2. **Use Grafana with database backend** (PostgreSQL)
3. **Configure Tempo with S3 storage** for scalability
4. **Run multiple NATS exporters** for redundancy

### Security

1. **Enable authentication** on all services
2. **Use TLS** for metric scraping
3. **Restrict network access** to monitoring endpoints
4. **Implement RBAC** in Grafana

### Backup Strategy

```bash
# Backup Prometheus data
docker exec prometheus tar czf /tmp/prometheus-backup.tar.gz /prometheus

# Backup Grafana dashboards
docker exec grafana grafana-cli admin export-dashboard

# Backup alert rules
cp alert-rules.yml alert-rules.yml.backup
```

## Troubleshooting

### No Metrics Appearing

1. Check NATS exporter logs:
   ```bash
   docker logs nats-exporter
   ```

2. Verify Prometheus targets:
   - Go to http://localhost:9090/targets
   - All targets should be "UP"

3. Test NATS monitoring endpoint:
   ```bash
   curl http://localhost:8222/varz
   ```

### High Memory Usage

1. Reduce Prometheus retention:
   ```yaml
   --storage.tsdb.retention.time=7d
   ```

2. Increase compaction frequency
3. Implement recording rules for expensive queries

### Missing Traces

1. Verify OTel Collector is running:
   ```bash
   docker logs otel-collector
   ```

2. Check agent instrumentation
3. Verify Tempo is receiving spans:
   ```bash
   curl http://localhost:3200/ready
   ```

## Maintenance

### Daily Tasks
- Check alert status
- Verify all agents are reporting metrics
- Monitor disk usage for Prometheus/Tempo

### Weekly Tasks
- Review dashboard performance
- Update alert thresholds based on trends
- Clean up old traces in Tempo

### Monthly Tasks
- Backup dashboard configurations
- Review and optimize Prometheus queries
- Update monitoring stack components

## Integration with Existing System

This monitoring stack integrates with the existing observability dashboard at `http://localhost:3000/admin/observability` by:

1. Providing detailed NATS metrics
2. Enabling drill-down into agent performance
3. Supporting correlation between high-level status and detailed metrics
4. Offering historical analysis capabilities

The two systems complement each other:
- Main dashboard: Real-time agent coordination view
- Monitoring stack: Detailed metrics and historical analysis