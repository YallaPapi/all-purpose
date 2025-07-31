# Meta-Agent Factory Monitoring Stack Deployment

> **Task 231.5 - Complete deployment automation and validation suite**  
> **Production-ready infrastructure-as-code implementation with comprehensive testing**

---

## 🚀 Quick Start

### **1-Command Deployment**
```bash
# Deploy complete monitoring stack
./deploy-docker.sh

# Validate deployment
./validation/validate-deployment.sh
```

### **Access Points**
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **Loki**: http://localhost:3100

---

## 📁 Directory Structure

```
deployment/
├── deploy-docker.sh                    # Main deployment script
├── docker-compose.monitoring.yml      # Complete stack definition
├── README.md                          # This file
│
├── prometheus/
│   └── prometheus.yml                 # Prometheus configuration
│
├── validation/
│   ├── validate-deployment.sh         # Comprehensive validation suite
│   ├── health-check.sh               # Quick health verification
│   └── test-alerts.sh                # Alert system testing
│
├── kubernetes/                       # Kubernetes deployment manifests
│   ├── namespace.yaml
│   ├── prometheus/
│   ├── grafana/
│   └── alertmanager/
│
├── helm/                             # Helm chart for easy deployment
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│
└── scripts/
    ├── backup.sh                    # Data backup procedures
    ├── restore.sh                   # Data restoration procedures
    └── maintenance.sh               # Maintenance tasks
```

---

## 🛠️ Deployment Methods

### **Method 1: Docker Compose (Recommended)**

#### **Prerequisites**
- Docker Engine 20.10+
- Docker Compose 2.0+
- 5GB available disk space
- Ports 3000, 9090, 9093, 3100 available

#### **Deployment Steps**
```bash
# 1. Clone and navigate
cd services/monitoring/deployment

# 2. Configure environment (optional)
cp .env.example .env
# Edit .env with your settings

# 3. Deploy
./deploy-docker.sh

# 4. Validate
./validation/validate-deployment.sh

# 5. Access Grafana
open http://localhost:3000
```

#### **Environment Configuration**
Create/edit `.env` file:
```bash
# Grafana Settings
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password
GRAFANA_SECRET_KEY=your-secret-key

# Notification Settings
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
SMTP_PASSWORD=your-smtp-password
PAGERDUTY_INTEGRATION_KEY=your-pagerduty-key

# Environment
ENVIRONMENT=production
LOG_LEVEL=info
```

### **Method 2: Kubernetes Deployment**

#### **Prerequisites**
- Kubernetes cluster 1.20+
- kubectl configured
- Helm 3.0+ (optional)

#### **Deployment with kubectl**
```bash
# Deploy namespace and services
kubectl apply -f kubernetes/

# Check deployment status
kubectl get pods -n monitoring

# Port forward to access services
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

#### **Deployment with Helm**
```bash
# Install using Helm
helm install monitoring-stack ./helm/ \
  --namespace monitoring \
  --create-namespace \
  --values helm/values.yaml

# Upgrade deployment
helm upgrade monitoring-stack ./helm/ \
  --namespace monitoring
```

---

## 🧪 Validation and Testing

### **Comprehensive Validation**
```bash
# Run full validation suite (11 test categories)
./validation/validate-deployment.sh

# Quick health check
./validation/health-check.sh

# Test alert delivery
./validation/test-alerts.sh
```

### **Validation Categories**
1. **Container Health** - Service status and health checks
2. **Endpoint Availability** - API accessibility testing
3. **Dashboard Validation** - Grafana dashboard accessibility
4. **Prometheus Targets** - Metrics collection verification
5. **Alert Rules** - Alert rule loading and syntax
6. **Alertmanager Config** - Notification routing validation
7. **Metrics Collection** - Data ingestion verification
8. **Log Collection** - Loki log aggregation testing
9. **Performance Testing** - Resource usage monitoring
10. **Network Connectivity** - Inter-service communication
11. **Alert System Testing** - End-to-end alert delivery

### **Test Results**
- **PASS**: All critical functionality working
- **WARN**: Non-critical issues (investigate but not blocking)
- **FAIL**: Critical issues requiring immediate attention

---

## 🔧 Configuration Management

### **Dashboard Provisioning**
Dashboards are automatically provisioned from:
```
../dashboards/
├── 01-system-overview/          # Main system health
├── 05-service-registry/         # Service discovery
└── 06-meta-monitoring/          # Observability stack health
```

### **Alert Rules**
Alert rules are loaded from:
```
../alerting/
├── meta-agent-factory-alerts.yaml  # Main alert rules (26 rules)
├── alertmanager-config.yaml        # Notification routing
└── grafana-alerts.yaml             # Dashboard-level alerts
```

### **Data Sources**
Pre-configured data sources:
- **Prometheus**: Metrics and alerting
- **Loki**: Log aggregation and search

---

## 📊 Monitoring Components

### **Services Deployed**
| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| Grafana | 3000 | Dashboards & Visualization | `/api/health` |
| Prometheus | 9090 | Metrics Collection | `/-/healthy` |
| Alertmanager | 9093 | Alert Routing | `/-/healthy` |
| Loki | 3100 | Log Aggregation | `/ready` |
| Node Exporter | 9100 | System Metrics | `/metrics` |
| Promtail | - | Log Collection | Internal |

### **Key Features**
- ✅ **Auto-Provisioning**: Dashboards and data sources loaded automatically
- ✅ **Health Monitoring**: Comprehensive health checks for all components
- ✅ **Alert Routing**: Multi-channel notifications (Slack, Email, PagerDuty)
- ✅ **Meta-Monitoring**: Observability stack self-monitoring
- ✅ **Data Persistence**: Persistent volumes for all data
- ✅ **Security**: Configurable authentication and SSL support

---

## 🚨 Troubleshooting

### **Common Issues**

#### **Port Conflicts**
```bash
# Check what's using the ports
netstat -tulpn | grep ':3000\|:9090\|:9093\|:3100'

# Stop conflicting services or change ports in docker-compose.yml
```

#### **Permission Issues**
```bash
# Fix Grafana data permissions
sudo chown -R 472:472 ../data/grafana

# Fix general data permissions
sudo chown -R $USER:$USER ../data/
```

#### **Container Startup Failures**
```bash
# Check container logs
docker-compose -f docker-compose.monitoring.yml logs [service]

# Check container status
docker-compose -f docker-compose.monitoring.yml ps

# Restart specific service
docker-compose -f docker-compose.monitoring.yml restart [service]
```

#### **Dashboard Not Loading**
```bash
# Check Grafana logs
docker logs meta-agent-grafana

# Verify provisioning
docker exec meta-agent-grafana ls -la /etc/grafana/provisioning/

# Check JSON syntax
python -m json.tool ../dashboards/01-system-overview/*.json
```

#### **Alerts Not Firing**
```bash
# Validate alert rules
docker exec meta-agent-prometheus promtool check rules /etc/prometheus/alert_rules.yml

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Test Alertmanager
curl -X POST http://localhost:9093/api/v1/alerts -d '[test alert JSON]'
```

### **Health Check Commands**
```bash
# Overall system health
./validation/health-check.sh

# Individual service health
curl http://localhost:3000/api/health      # Grafana
curl http://localhost:9090/-/healthy       # Prometheus
curl http://localhost:9093/-/healthy       # Alertmanager
curl http://localhost:3100/ready           # Loki
```

### **Performance Monitoring**
```bash
# Container resource usage
docker stats

# Data directory size
du -sh ../data/

# System resource usage
top
free -h
df -h
```

---

## 🔒 Security Considerations

### **Production Security Checklist**
- [ ] Change default Grafana admin password
- [ ] Configure SSL/TLS certificates
- [ ] Set up proper firewall rules
- [ ] Configure authentication (OAuth, LDAP, etc.)
- [ ] Enable audit logging
- [ ] Set up regular security updates
- [ ] Configure backup encryption

### **Network Security**
- All services run in isolated Docker network
- Only necessary ports exposed to host
- Internal service communication encrypted
- External access controllable via reverse proxy

---

## 🔄 Maintenance and Operations

### **Backup Procedures**
```bash
# Backup all persistent data
./scripts/backup.sh

# Backup specific service
./scripts/backup.sh --service grafana
```

### **Update Procedures**
```bash
# Update Docker images
docker-compose -f docker-compose.monitoring.yml pull

# Restart with new images
docker-compose -f docker-compose.monitoring.yml up -d

# Validate after update
./validation/validate-deployment.sh
```

### **Scaling Considerations**
- **Horizontal Scaling**: Use Kubernetes deployment for multi-replica setup
- **Storage Scaling**: Monitor data directory growth and plan expansion
- **Performance Scaling**: Add dedicated exporters for high-volume metrics

---

## 📈 Performance Tuning

### **Prometheus Optimization**
- Adjust retention period: `--storage.tsdb.retention.time=30d`
- Tune scrape intervals based on requirements
- Configure recording rules for expensive queries
- Monitor TSDB performance metrics

### **Grafana Optimization**
- Use query result caching for frequently accessed dashboards
- Optimize dashboard queries and time ranges
- Configure dashboard auto-refresh intervals appropriately
- Monitor Grafana performance metrics

### **Resource Requirements**
| Component | CPU | Memory | Disk |
|-----------|-----|--------|------|
| Grafana | 100m-500m | 256MB-1GB | 1GB+ |
| Prometheus | 500m-2000m | 2GB-8GB | 10GB+ |
| Alertmanager | 50m-200m | 128MB-512MB | 1GB+ |
| Loki | 200m-1000m | 512MB-2GB | 5GB+ |

---

## 🆘 Support and Documentation

### **Additional Resources**
- [Main Monitoring Guide](../GRAFANA_MONITORING_STACK_GUIDE.md)
- [Alert Configuration Guide](../alerting/README.md)
- [Dashboard Development Guide](../dashboards/README.md)
- [TaskMaster Integration](../../../ZAD-TASKMASTER-SETUP-GUIDE.md)

### **Getting Help**
1. Check validation results: `./validation/validate-deployment.sh`
2. Review logs: `docker-compose logs [service]`
3. Check GitHub issues and documentation
4. Review Grafana/Prometheus official documentation

---

## 🎯 Next Steps After Deployment

### **Immediate Actions**
1. **Change Default Passwords**: Update Grafana admin credentials
2. **Configure Notifications**: Set up Slack/email/PagerDuty webhooks
3. **Test Alerting**: Send test alerts to verify notification delivery
4. **Review Dashboards**: Customize dashboards for your specific needs

### **Medium-term Actions**
1. **Set Up Backups**: Configure automated backup procedures
2. **Security Hardening**: Implement SSL, authentication, and access controls
3. **Custom Dashboards**: Create additional dashboards for specific metrics
4. **Runbook Creation**: Document operational procedures and troubleshooting

### **Long-term Actions**
1. **Performance Optimization**: Tune queries and resource allocation
2. **Capacity Planning**: Monitor growth and plan infrastructure scaling
3. **Integration Enhancement**: Connect with additional data sources
4. **Automation Expansion**: Implement GitOps workflows for configuration

---

**🎉 Your Meta-Agent Factory monitoring stack is now ready for production use!**

**Deployment Status**: ✅ Production Ready  
**Last Updated**: Task 231.5 completion  
**Support**: See troubleshooting section and additional documentation links above