# Meta-Agent Factory Centralized Logging

## Overview

This directory contains the centralized logging infrastructure for the Meta-Agent Factory using Grafana Loki and Promtail for log aggregation and collection.

## Architecture

- **Loki**: Log aggregation backend that stores and indexes logs
- **Promtail**: Log collection agent that scrapes logs from containers
- **Grafana**: Visualization dashboard with Loki as data source

## Configuration Files

### Core Configuration
- `loki.yml` - Loki server configuration with storage and retention settings
- `promtail.yml` - Promtail agent configuration with log collection rules
- `log-retention-policy.yml` - Log retention and rotation policies

### Docker Configuration
- `Dockerfile.loki` - Loki container build configuration
- `Dockerfile.promtail` - Promtail container build configuration
- `grafana-datasources.yml` - Grafana data source configuration
- `grafana-dashboard-logs.json` - Pre-configured log dashboard

### Orchestration
- `docker-compose.logging.yml` - Logging-specific Docker Compose override

## Deployment

### Standard Deployment
```bash
# Deploy with logging enabled
docker-compose -f docker-compose.yml -f docker-compose.logging.yml up -d

# Check logging services
docker-compose ps loki promtail observability
```

### Development Deployment
```bash
# Deploy core services only
docker-compose up -d loki promtail

# Check logs
docker-compose logs -f loki promtail
```

## Access Points

- **Grafana**: http://localhost:3004 (admin/admin)
- **Loki**: http://localhost:3100
- **Promtail**: http://localhost:9080
- **Prometheus**: http://localhost:9090

## Log Structure

### JSON Log Format
All services use structured JSON logging:

```json
{
  "timestamp": "2025-07-28T10:30:00.000Z",
  "level": "INFO",
  "service": "factory-core",
  "component": "MetaAgentFactory",
  "message": "Agent registration successful",
  "requestId": "req-123-456",
  "metadata": {
    "agentType": "meta-agent",
    "operation": "registration"
  }
}
```

### Log Levels
- **ERROR**: System errors, failures, exceptions
- **WARN**: Warnings, deprecated usage, non-critical issues
- **INFO**: General operational information
- **DEBUG**: Detailed debugging information (development only)

## Querying Logs

### Grafana Dashboard
1. Open Grafana: http://localhost:3004
2. Login with admin/admin
3. Navigate to "Meta-Agent Factory Logs" dashboard
4. Use filters to query specific services or log levels

### Loki Query Examples
```logql
# All factory-core logs
{job="factory-core"}

# Error logs from all services
{service="meta-agent-factory"} |= "ERROR"

# Logs from specific component
{component="MetaAgentFactory"}

# Logs with specific metadata
{job="factory-core"} | json | metadata_operation="registration"

# Rate of log entries per minute
rate({service="meta-agent-factory"}[1m])
```

### Promtail Status
Check Promtail targets and status:
```bash
curl http://localhost:9080/targets
curl http://localhost:9080/ready
```

## Log Retention

### Retention Policies
- **Factory Core**: 30 days
- **Domain Agents**: 21 days  
- **API Gateway**: 14 days
- **Error Logs**: 90 days
- **Security Logs**: 365 days

### Storage Management
```bash
# Check Loki storage usage
docker exec meta-agent-loki du -sh /loki

# Clean up old logs (manual)
docker exec meta-agent-loki find /loki/chunks -name "*.gz" -mtime +30 -delete
```

## Troubleshooting

### Common Issues

#### Loki Not Starting
```bash
# Check Loki configuration
docker-compose exec loki loki -config.file=/etc/loki/loki.yml -verify-config

# Check storage permissions
docker-compose exec loki ls -la /loki/
```

#### Promtail Not Collecting Logs
```bash
# Check Promtail configuration
docker-compose exec promtail promtail -config.file=/etc/promtail/promtail.yml -dry-run

# Check Docker socket access
docker-compose exec promtail ls -la /var/run/docker.sock
```

#### Missing Logs in Grafana
1. Verify Loki data source configuration
2. Check Promtail targets: http://localhost:9080/targets
3. Verify log format matches Promtail pipeline stages
4. Check service labels for Promtail discovery

### Log Volume Issues
```bash
# Check log ingestion rate
curl http://localhost:3100/metrics | grep loki_ingester_chunks_created_total

# Monitor storage usage
df -h /var/lib/docker/volumes/allpurp_loki_data
```

### Performance Tuning
- Adjust `max_size_mb` in loki.yml for cache tuning
- Modify retention periods in log-retention-policy.yml
- Configure log sampling for high-volume services

## Monitoring

### Health Checks
All logging services include health checks:
- Loki: http://localhost:3100/ready
- Promtail: http://localhost:9080/ready
- Grafana: http://localhost:3004/api/health

### Metrics
Logging infrastructure metrics are exposed to Prometheus:
- Loki metrics: http://localhost:3100/metrics
- Promtail metrics: http://localhost:9080/metrics

### Alerting
Configure alerts in Grafana for:
- High error rates
- Log ingestion failures
- Storage usage thresholds
- Service health issues

## Development

### Adding New Services
1. Add service configuration to `promtail.yml`
2. Update `docker-compose.logging.yml` with service labels
3. Configure structured logging in service code
4. Add dashboard panels for new service

### Custom Log Processors
Create custom pipeline stages in `promtail.yml`:
```yaml
pipeline_stages:
  - json:
      expressions:
        custom_field: custom_field
  - labels:
      custom_field:
  - output:
      source: message
```

### Testing
```bash
# Test log injection
echo '{"timestamp":"2025-07-28T10:30:00.000Z","level":"INFO","service":"test","message":"test log"}' | \
  curl -X POST http://localhost:3100/loki/api/v1/push \
    -H "Content-Type: application/json" \
    -d @-
```

## Security

### Access Control
- Loki and Promtail run as non-root users
- No authentication enabled (internal network only)
- Consider enabling auth for production deployments

### Log Security
- Sensitive data filtering in pipeline stages
- Log encryption in transit (configure TLS)
- Access audit logging for compliance

### Network Security
- Services communicate within Docker network
- No external access to Loki/Promtail ports
- Grafana accessible via Traefik proxy

## Compliance

### Data Retention
Log retention policies ensure compliance with data protection regulations:
- Configurable retention periods per service
- Automatic cleanup of expired logs
- Audit trail for log access and modifications

### Export and Backup
```bash
# Export logs for compliance
curl -G "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={service="meta-agent-factory"}' \
  --data-urlencode 'start=2025-07-01T00:00:00Z' \
  --data-urlencode 'end=2025-07-28T23:59:59Z' > logs_export.json

# Backup Loki data
docker run --rm -v allpurp_loki_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/loki_backup_$(date +%Y%m%d).tar.gz /data
```