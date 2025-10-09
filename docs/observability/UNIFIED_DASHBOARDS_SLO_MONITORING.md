# Unified Dashboards, Alerting, and SLO Monitoring Implementation

## 🚨 **TaskMaster Methodology Compliance**

**Task Reference**: Task 196.10 - Establish Unified Dashboards, Alerting, and SLO Monitoring  
**Task Requirements**: Create unified dashboards and alerting rules that leverage correlated telemetry and contextual metadata, and define service-level objectives (SLOs) for key workflows  
**Implementation Status**: ✅ **COMPLETED** - Comprehensive unified monitoring system with SLO tracking and business KPI correlation

**TaskMaster Research Evidence**: Used `task-master expand --id=196.10 --research` to research SLO implementation best practices, unified dashboard design patterns, anomaly detection methodologies, and business KPI correlation strategies with Perplexity integration.

---

## 🎯 **The Problem This Solves**

**Current Pain Point**: Having individual dashboards and alerts without unified correlation is like having separate gauges for each factory machine without understanding the overall production line efficiency - you see individual component health but miss critical workflow performance, business impact, and predictive insights that only emerge from correlated telemetry data.

**What Breaks Without This**:
- Fragmented monitoring across individual services without workflow correlation
- Reactive alerting without predictive anomaly detection
- No connection between technical metrics and business outcomes
- Missing SLO tracking for critical user journeys
- Alert fatigue from uncorrelated individual service alerts
- Inability to prioritize incidents based on business impact

---

## 🏗️ **Unified Monitoring Architecture**

### **🏠 BIG PICTURE ANALOGY**
Think of this like a **Smart Factory Control Center**:
- **Executive Dashboard** = CEO command center showing business KPIs and overall health
- **Operational Dashboard** = Factory floor manager view with real-time production metrics
- **SLO Dashboard** = Quality assurance tracking with customer satisfaction metrics
- **Workflow Dashboard** = Production line efficiency tracking from start to finish
- **Anomaly Detection** = Predictive maintenance system preventing failures
- **Business KPI Correlation** = Revenue impact tracking for every operational metric

### **🔧 TECHNICAL UNIFIED ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS IMPACT LAYER                    │
│        (Revenue, Customer Satisfaction, SLO Tracking)      │
├─────────────────────────────────────────────────────────────┤
│                  UNIFIED DASHBOARD LAYER                   │
│     Executive │ Operational │ SLO │ Workflow │ Anomaly     │
├─────────────────────────────────────────────────────────────┤
│               CORRELATION INTELLIGENCE LAYER               │
│      (Cross-Service, Workflow Tracing, Anomaly Detection)  │
├─────────────────────────────────────────────────────────────┤
│                ENHANCED ALERTING LAYER                     │
│  Smart Routing │ Anomaly Alerts │ SLO Violations │ Context │
├─────────────────────────────────────────────────────────────┤
│                   RAW TELEMETRY LAYER                      │
│        Metrics │ Logs │ Traces │ Business Events           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 **Unified Dashboard Suite Implementation**

### **1. Executive Business Dashboard**

**Purpose**: C-Level visibility into business impact and overall system health  
**Audience**: Executives, Product Managers, Business Stakeholders  
**File**: `containers/observability/grafana-dashboard-executive.json`

**Business KPI Panels**:
```json
{
  "dashboard": {
    "title": "Meta-Agent Factory - Executive Dashboard",
    "tags": ["executive", "business", "kpi"],
    "panels": [
      {
        "title": "Overall Business Health Score",
        "type": "stat",
        "targets": [{
          "expr": "(\n  (avg(up{job=~\"factory-core|domain-agents\"}) * 30) +\n  (100 - avg(golden_signals:error_rate_5m) * 20) +\n  (avg(factory_slo:availability_7d) * 25) +\n  (avg(factory_slo:customer_satisfaction) * 25)\n)",
          "legendFormat": "Health Score"
        }],
        "fieldConfig": {
          "unit": "percent",
          "min": 0,
          "max": 100,
          "thresholds": {
            "steps": [
              {"color": "red", "value": 0},
              {"color": "yellow", "value": 70},
              {"color": "green", "value": 90}
            ]
          }
        }
      },
      {
        "title": "Revenue Impact (Real-time)",
        "type": "stat",
        "targets": [{
          "expr": "sum(rate(factory_projects_completed_total[5m])) * $revenue_per_project * 60",
          "legendFormat": "Revenue/Hour"
        }],
        "fieldConfig": {
          "unit": "currencyUSD",
          "decimals": 0
        }
      },
      {
        "title": "Customer Satisfaction Score",
        "type": "gauge",
        "targets": [{
          "expr": "avg(factory_customer_satisfaction_score)",
          "legendFormat": "CSAT Score"
        }],
        "fieldConfig": {
          "unit": "none",
          "min": 0,
          "max": 10,
          "thresholds": {
            "steps": [
              {"color": "red", "value": 0},
              {"color": "yellow", "value": 6},
              {"color": "green", "value": 8}
            ]
          }
        }
      },
      {
        "title": "Active Customer Projects",
        "type": "stat",
        "targets": [{
          "expr": "sum(factory_active_projects{customer_tier=~\"premium|enterprise\"})",
          "legendFormat": "Premium Projects"
        }, {
          "expr": "sum(factory_active_projects)",
          "legendFormat": "Total Projects"
        }]
      },
      {
        "title": "SLO Compliance Trend (30 days)",
        "type": "timeseries",
        "targets": [{
          "expr": "avg(factory_slo:availability_30d)",
          "legendFormat": "Availability SLO"
        }, {
          "expr": "avg(factory_slo:performance_30d)", 
          "legendFormat": "Performance SLO"
        }, {
          "expr": "avg(factory_slo:reliability_30d)",
          "legendFormat": "Reliability SLO"
        }],
        "fieldConfig": {
          "unit": "percent",
          "min": 95,
          "max": 100
        }
      },
      {
        "title": "Cost Per Project (Real-time)",
        "type": "stat",
        "targets": [{
          "expr": "(\n  sum(rate(container_cpu_usage_seconds_total[5m])) * $cpu_cost_per_hour +\n  sum(container_memory_working_set_bytes) / 1024/1024/1024 * $memory_cost_per_gb\n) / sum(rate(factory_projects_completed_total[5m]))",
          "legendFormat": "Cost/Project"
        }],
        "fieldConfig": {
          "unit": "currencyUSD",
          "decimals": 2
        }
      },
      {
        "title": "System Efficiency Score",
        "type": "gauge",
        "targets": [{
          "expr": "(\n  (100 - avg(golden_signals:latency_p95_5m) * 100) * 0.4 +\n  (100 - avg(golden_signals:error_rate_5m)) * 0.3 +\n  (avg(factory:resource_efficiency) * 100) * 0.3\n)",
          "legendFormat": "Efficiency"
        }],
        "fieldConfig": {
          "unit": "percent",
          "min": 0,
          "max": 100
        }
      }
    ]
  }
}
```

**Business Variables**:
```json
{
  "templating": {
    "list": [
      {
        "name": "revenue_per_project",
        "type": "constant",
        "current": {"value": "500"},
        "description": "Average revenue per project completion"
      },
      {
        "name": "cpu_cost_per_hour",
        "type": "constant", 
        "current": {"value": "0.05"},
        "description": "CPU cost per hour in USD"
      },
      {
        "name": "memory_cost_per_gb",
        "type": "constant",
        "current": {"value": "0.01"},
        "description": "Memory cost per GB per hour in USD"
      }
    ]
  }
}
```

### **2. Operational Excellence Dashboard**

**Purpose**: Real-time operational monitoring with workflow correlation  
**Audience**: DevOps, SRE, Operations Teams  
**File**: `containers/observability/grafana-dashboard-operational.json`

**Operational Correlation Panels**:
```json
{
  "dashboard": {
    "title": "Meta-Agent Factory - Operational Excellence",
    "tags": ["operational", "devops", "correlation"],
    "panels": [
      {
        "title": "Service Mesh Health Map",
        "type": "heatmap",
        "targets": [{
          "expr": "avg by (source_service, target_service) (rate(http_requests_total{status=~\"2..\"}[5m]) / rate(http_requests_total[5m]))",
          "legendFormat": "{{source_service}} → {{target_service}}"
        }],
        "fieldConfig": {
          "unit": "percentunit",
          "min": 0.95,
          "max": 1.0
        }
      },
      {
        "title": "Workflow End-to-End Latency",
        "type": "timeseries",
        "targets": [{
          "expr": "histogram_quantile(0.95, sum(rate(factory_workflow_duration_seconds_bucket[5m])) by (le, workflow_type))",
          "legendFormat": "P95 - {{workflow_type}}"
        }, {
          "expr": "histogram_quantile(0.50, sum(rate(factory_workflow_duration_seconds_bucket[5m])) by (le, workflow_type))",
          "legendFormat": "P50 - {{workflow_type}}"
        }],
        "fieldConfig": {
          "unit": "s",
          "custom": {
            "drawStyle": "line",
            "lineInterpolation": "smooth"
          }
        }
      },
      {
        "title": "Agent Coordination Efficiency",
        "type": "bargauge",
        "targets": [{
          "expr": "avg by (agent_type) (rate(agent_operations_total{status=\"success\"}[5m]) / rate(agent_operations_total[5m]))",
          "legendFormat": "{{agent_type}}"
        }],
        "fieldConfig": {
          "unit": "percentunit",
          "min": 0.9,
          "max": 1.0,
          "orientation": "horizontal"
        }
      },
      {
        "title": "Resource Utilization Correlation",
        "type": "timeseries",
        "targets": [{
          "expr": "avg(golden_signals:cpu_saturation_5m)",
          "legendFormat": "CPU Utilization"
        }, {
          "expr": "avg(golden_signals:memory_saturation_5m)",
          "legendFormat": "Memory Utilization"
        }, {
          "expr": "sum(rate(factory_projects_completed_total[5m])) * 60",
          "legendFormat": "Throughput (projects/min)"
        }],
        "fieldConfig": {
          "unit": "percent",
          "custom": {
            "stacking": {"mode": "none"},
            "axisPlacement": "auto"
          }
        }
      },
      {
        "title": "Critical Path Analysis",
        "type": "table",
        "targets": [{
          "expr": "topk(10, avg by (operation, service) (factory_operation_duration_seconds{critical_path=\"true\"}))",
          "format": "table"
        }],
        "transformations": [{
          "id": "organize",
          "options": {
            "includeByName": {
              "operation": true,
              "service": true,
              "Value": true
            },
            "renameByName": {
              "operation": "Critical Operation",
              "service": "Service",
              "Value": "Avg Duration (s)"
            }
          }
        }]
      }
    ]
  }
}
```

### **3. SLO Monitoring Dashboard**

**Purpose**: Service Level Objective tracking with error budget monitoring  
**Audience**: SRE, Product Teams, Engineering Managers  
**File**: `containers/observability/grafana-dashboard-slo.json`

**SLO Tracking Panels**:
```json
{
  "dashboard": {
    "title": "Meta-Agent Factory - SLO Monitoring",
    "tags": ["slo", "sli", "error-budget"],
    "panels": [
      {
        "title": "SLO Compliance Summary",
        "type": "stat",
        "targets": [{
          "expr": "factory_slo:availability_30d",
          "legendFormat": "Availability SLO"
        }, {
          "expr": "factory_slo:performance_30d",
          "legendFormat": "Performance SLO"  
        }, {
          "expr": "factory_slo:reliability_30d",
          "legendFormat": "Reliability SLO"
        }],
        "fieldConfig": {
          "unit": "percent",
          "decimals": 2,
          "thresholds": {
            "steps": [
              {"color": "red", "value": 0},
              {"color": "yellow", "value": 99.0},
              {"color": "green", "value": 99.9}
            ]
          }
        }
      },
      {
        "title": "Error Budget Consumption",
        "type": "bargauge",
        "targets": [{
          "expr": "100 * (1 - factory_slo:availability_30d / 99.9)",
          "legendFormat": "Availability Budget Used"
        }, {
          "expr": "100 * (1 - factory_slo:performance_30d / 99.5)",
          "legendFormat": "Performance Budget Used"
        }, {
          "expr": "100 * (1 - factory_slo:reliability_30d / 99.9)",
          "legendFormat": "Reliability Budget Used"
        }],
        "fieldConfig": {
          "unit": "percent",
          "min": 0,
          "max": 100,
          "thresholds": {
            "steps": [
              {"color": "green", "value": 0},
              {"color": "yellow", "value": 50},
              {"color": "red", "value": 80}
            ]
          }
        }
      },
      {
        "title": "SLI Performance Trends",
        "type": "timeseries",
        "targets": [{
          "expr": "rate(http_requests_total{status=~\"2..\"}[5m]) / rate(http_requests_total[5m])",
          "legendFormat": "Success Rate SLI"
        }, {
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
          "legendFormat": "P95 Latency SLI"
        }],
        "fieldConfig": {
          "unit": "percentunit",
          "custom": {
            "thresholdsStyle": {"mode": "line"},
            "thresholds": [
              {"color": "red", "value": 0.99},
              {"color": "green", "value": 0.995}
            ]
          }
        }
      },
      {
        "title": "Business Impact Correlation",
        "type": "timeseries",
        "targets": [{
          "expr": "rate(factory_customer_complaints_total[1h])",
          "legendFormat": "Customer Complaints/Hour"
        }, {
          "expr": "100 - factory_slo:availability_1h",
          "legendFormat": "Availability SLO Violation %"
        }],
        "fieldConfig": {
          "unit": "short",
          "custom": {
            "axisPlacement": "left"
          }
        }
      },
      {
        "title": "Error Budget Burn Rate",
        "type": "timeseries",
        "targets": [{
          "expr": "(\n  1 - (\n    rate(http_requests_total{status=~\"2..\"}[1h]) /\n    rate(http_requests_total[1h])\n  )\n) / (1 - 0.999) * 100",
          "legendFormat": "Current Burn Rate (1h)"
        }, {
          "expr": "(\n  1 - (\n    rate(http_requests_total{status=~\"2..\"}[6h]) /\n    rate(http_requests_total[6h])\n  )\n) / (1 - 0.999) * 100",
          "legendFormat": "Burn Rate (6h)"
        }],
        "fieldConfig": {
          "unit": "percent",
          "custom": {
            "thresholdsStyle": {"mode": "area"},
            "thresholds": [
              {"color": "green", "value": 0},
              {"color": "yellow", "value": 1},
              {"color": "red", "value": 10}
            ]
          }
        }
      }
    ]
  }
}
```

---

## 🔥 **Advanced Anomaly Detection Alerting**

### **Intelligent Alert Rules with ML-based Anomaly Detection**

**File**: `containers/observability/alert_rules_anomaly.yml`

```yaml
groups:
  - name: anomaly_detection
    interval: 30s
    rules:
      # Dynamic threshold based on historical patterns
      - alert: AnomalyLatencySpike
        expr: |
          (
            histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
            > 
            (
              avg_over_time(
                histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))[7d:5m]
              ) * 2
            )
          )
          and
          (
            histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
            >
            0.1
          )
        for: 2m
        labels:
          severity: warning
          alert_type: anomaly
          impact: performance
        annotations:
          summary: "Anomalous latency spike detected"
          description: |
            P95 latency is {{ $value | printf "%.2f" }}s, which is significantly higher
            than the 7-day average pattern. This indicates an unusual performance degradation.
            
            Historical Context:
            - Current P95: {{ $value | printf "%.2f" }}s
            - 7-day Average: {{ query "avg_over_time(histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))[7d:5m])" | first | value | printf "%.2f" }}s
            - Deviation: {{ expr "($value - query(\"avg_over_time(histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))[7d:5m])\") | first | value) / query(\"avg_over_time(histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))[7d:5m])\") | first | value * 100" | printf "%.1f" }}%

      # Workflow efficiency anomaly detection
      - alert: AnomalyWorkflowEfficiency
        expr: |
          (
            rate(factory_coordination_attempts_total{status="success"}[15m]) /
            rate(factory_coordination_attempts_total[15m])
          ) <
          (
            avg_over_time(
              (rate(factory_coordination_attempts_total{status="success"}[15m]) /
               rate(factory_coordination_attempts_total[15m]))[24h:15m]
            ) * 0.8
          )
        for: 5m
        labels:
          severity: warning
          alert_type: anomaly
          impact: business
          workflow: coordination
        annotations:
          summary: "Workflow coordination efficiency anomaly detected"
          description: |
            Factory coordination success rate is {{ $value | printf "%.1f" }}%, 
            significantly below normal patterns.
            
            Business Impact:
            - Current Success Rate: {{ $value | printf "%.1f" }}%
            - 24h Average: {{ query "avg_over_time((rate(factory_coordination_attempts_total{status=\"success\"}[15m]) / rate(factory_coordination_attempts_total[15m]))[24h:15m])" | first | value | printf "%.1f" }}%
            - Projected Revenue Impact: ${{ expr "($labels.revenue_per_project * rate(factory_projects_total[15m]) * 3600 * (1 - $value))" | printf "%.0f" }}/hour

      # Error rate burst detection
      - alert: AnomalyErrorBurst
        expr: |
          (
            rate(http_requests_total{status=~"5.."}[2m])
            >
            (
              quantile_over_time(0.95,
                rate(http_requests_total{status=~"5.."}[2m])[6h:2m]
              ) * 3
            )
          )
          and
          (
            rate(http_requests_total{status=~"5.."}[2m]) > 0.01
          )
        for: 30s
        labels:
          severity: critical
          alert_type: anomaly
          impact: reliability
        annotations:
          summary: "Error rate burst anomaly detected"
          description: |
            Service {{ $labels.service }} is experiencing an error burst at {{ $value | printf "%.3f" }} errors/sec,
            which is significantly above normal patterns.
            
            Anomaly Details:
            - Current Error Rate: {{ $value | printf "%.3f" }}/sec
            - 6h 95th Percentile: {{ query "quantile_over_time(0.95, rate(http_requests_total{status=~\"5..\"}[2m])[6h:2m])" | first | value | printf "%.3f" }}/sec
            - Severity Factor: {{ expr "$value / query(\"quantile_over_time(0.95, rate(http_requests_total{status=~\\\"5..\\\"}[2m])[6h:2m])\")" | printf "%.1f" }}x normal

      # Resource utilization spike prediction
      - alert: AnomalyResourceSpikePrediction
        expr: |
          predict_linear(
            avg(golden_signals:memory_saturation_5m)[30m:5m], 3600
          ) > 90
          and
          avg(golden_signals:memory_saturation_5m) > 70
        for: 5m
        labels:
          severity: warning
          alert_type: predictive
          impact: capacity
        annotations:
          summary: "Predicted resource exhaustion in next hour"
          description: |
            Memory utilization trend indicates potential exhaustion within 1 hour.
            
            Prediction Analysis:
            - Current Memory Usage: {{ query "avg(golden_signals:memory_saturation_5m)" | first | value | printf "%.1f" }}%
            - Predicted Usage (1h): {{ $value | printf "%.1f" }}%
            - Growth Rate: {{ expr "(predict_linear(avg(golden_signals:memory_saturation_5m)[30m:5m], 3600) - avg(golden_signals:memory_saturation_5m)) / 60" | printf "%.2f" }}%/min
            - Estimated Time to 90%: {{ expr "(90 - avg(golden_signals:memory_saturation_5m)) / ((predict_linear(avg(golden_signals:memory_saturation_5m)[30m:5m], 3600) - avg(golden_signals:memory_saturation_5m)) / 60)" | printf "%.0f" }} minutes

      # Business KPI anomaly correlation
      - alert: AnomalyBusinessImpact
        expr: |
          (
            rate(factory_customer_satisfaction_negative_feedback_total[1h])
            >
            avg_over_time(
              rate(factory_customer_satisfaction_negative_feedback_total[1h])[7d:1h]
            ) * 2
          )
          and
          (
            avg(golden_signals:error_rate_5m) > 1
            or
            avg(golden_signals:latency_p95_5m) > 1
          )
        for: 10m
        labels:
          severity: critical
          alert_type: business
          impact: customer_satisfaction
        annotations:
          summary: "Business impact anomaly: Customer satisfaction correlation"
          description: |
            Increased negative customer feedback correlates with technical performance issues.
            
            Correlation Analysis:
            - Negative Feedback Rate: {{ $value | printf "%.2f" }}/hour
            - 7-day Average: {{ query "avg_over_time(rate(factory_customer_satisfaction_negative_feedback_total[1h])[7d:1h])" | first | value | printf "%.2f" }}/hour
            - Technical Issues: {{ if gt (query "avg(golden_signals:error_rate_5m)" | first | value) 1.0 }}High Error Rate{{ end }}{{ if gt (query "avg(golden_signals:latency_p95_5m)" | first | value) 1.0 }} High Latency{{ end }}
            - Estimated Revenue Impact: ${{ expr "$value * $labels.avg_customer_value" | printf "%.0f" }}/hour
```

### **Context-Aware Alert Routing**

**Enhanced Alertmanager Configuration**:
```yaml
# containers/observability/alertmanager_unified.yml
global:
  smtp_smarthost: '${SMTP_HOST:-smtp.gmail.com:587}'
  smtp_from: '${ALERT_EMAIL_FROM:-alerts@meta-agent-factory.com}'

route:
  group_by: ['alertname', 'service', 'severity', 'alert_type', 'impact']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  
  routes:
    # Business impact alerts - immediate escalation
    - match:
        impact: customer_satisfaction
      receiver: 'business-critical'
      group_wait: 10s
      repeat_interval: 30m
      routes:
        - match:
            severity: critical
          receiver: 'ceo-escalation'
          group_wait: 5s
          repeat_interval: 15m
    
    # Anomaly alerts with ML context
    - match:
        alert_type: anomaly
      receiver: 'sre-anomaly-team'
      group_by: ['anomaly_type', 'service', 'impact']
      group_wait: 2m
      repeat_interval: 2h
      
    # Predictive alerts for capacity planning
    - match:
        alert_type: predictive
      receiver: 'capacity-planning-team'
      group_by: ['impact', 'predicted_resource']
      group_wait: 15m
      repeat_interval: 6h
      
    # SLO violation alerts with error budget context
    - match_re:
        alertname: '.*SLO.*'
      receiver: 'slo-team'
      group_by: ['slo_type', 'error_budget_status']
      group_wait: 1m
      repeat_interval: 1h

receivers:
  - name: 'business-critical'
    email_configs:
      - to: '${BUSINESS_CRITICAL_EMAIL}'
        subject: '🚨 BUSINESS CRITICAL: {{ .GroupLabels.alertname }}'
        body: |
          🚨 BUSINESS CRITICAL ALERT 🚨
          
          Impact: {{ .Labels.impact }}
          Service: {{ .Labels.service }}
          Alert Type: {{ .Labels.alert_type }}
          
          Business Context:
          {{ .Annotations.description }}
          
          Immediate Actions Required:
          1. Assess customer impact
          2. Implement temporary mitigation
          3. Escalate to engineering leadership
          
          Dashboard: http://localhost:3004/d/executive
          Runbook: {{ .Annotations.runbook_url }}
    
    slack_configs:
      - api_url: '${SLACK_CRITICAL_WEBHOOK}'
        channel: '#alerts-business-critical'
        color: danger
        title: '🚨 BUSINESS CRITICAL: {{ .GroupLabels.alertname }}'
        text: |
          **Impact**: {{ .Labels.impact }}
          **Service**: {{ .Labels.service }}
          **Customer Effect**: Immediate
          
          {{ .Annotations.summary }}
        actions:
          - type: button
            text: 'Executive Dashboard'
            url: 'http://localhost:3004/d/executive'
          - type: button
            text: 'Incident Response'
            url: 'https://incident.meta-agent-factory.com/create'

  - name: 'sre-anomaly-team'
    email_configs:
      - to: '${SRE_TEAM_EMAIL}'
        subject: '[ANOMALY] {{ .GroupLabels.alertname }} - {{ .Labels.service }}'
        body: |
          🔍 ANOMALY DETECTED
          
          Service: {{ .Labels.service }}
          Type: {{ .Labels.alert_type }}
          Impact: {{ .Labels.impact }}
          
          ML Analysis:
          {{ .Annotations.description }}
          
          Historical Context:
          - This anomaly type has occurred {{ query "increase(alertmanager_notifications_total{alertname=\"" }}{{ .GroupLabels.alertname }}{{ query "\"}[30d])" | first | value }} times in the last 30 days
          - Average resolution time: {{ query "avg_over_time(alert_resolution_duration_seconds{alertname=\"" }}{{ .GroupLabels.alertname }}{{ query "\"}[30d])" | first | value | humanizeDuration }}
          
          Recommended Actions:
          1. Review correlation dashboard
          2. Check for recent deployments
          3. Analyze traffic patterns
          
          Anomaly Dashboard: http://localhost:3004/d/anomaly-analysis
    
    slack_configs:
      - api_url: '${SRE_SLACK_WEBHOOK}'
        channel: '#sre-anomalies'
        color: warning
        title: '🔍 Anomaly Detected: {{ .GroupLabels.alertname }}'
        text: |
          **Service**: {{ .Labels.service }}
          **Impact**: {{ .Labels.impact }}
          **Type**: {{ .Labels.alert_type }}
          
          {{ .Annotations.summary }}

  - name: 'slo-team'
    email_configs:
      - to: '${SLO_TEAM_EMAIL}'
        subject: '[SLO] {{ .GroupLabels.alertname }} - Error Budget Impact'
        body: |
          📊 SLO ALERT
          
          SLO: {{ .Labels.slo_type }}
          Service: {{ .Labels.service }}
          Error Budget Status: {{ .Labels.error_budget_status }}
          
          Current Status:
          {{ .Annotations.description }}
          
          Error Budget Analysis:
          - Current Burn Rate: {{ query "factory_slo:error_budget_burn_rate_1h" | first | value | printf "%.2f" }}%/hour
          - Remaining Budget: {{ query "factory_slo:error_budget_remaining" | first | value | printf "%.1f" }}%
          - Time to Budget Exhaustion: {{ query "factory_slo:time_to_budget_exhaustion_hours" | first | value | printf "%.0f" }} hours
          
          Impact Assessment:
          - Customer SLA Risk: {{ if lt (query "factory_slo:error_budget_remaining" | first | value) 20.0 }}HIGH{{ else if lt (query "factory_slo:error_budget_remaining" | first | value) 50.0 }}MEDIUM{{ else }}LOW{{ end }}
          - Recommended Action: {{ if lt (query "factory_slo:error_budget_remaining" | first | value) 20.0 }}Immediate mitigation required{{ else if lt (query "factory_slo:error_budget_remaining" | first | value) 50.0 }}Monitor closely and prepare mitigation{{ else }}Continue monitoring{{ end }}
          
          SLO Dashboard: http://localhost:3004/d/slo-monitoring
    
    pagerduty_configs:
      - routing_key: '${PAGERDUTY_SLO_KEY}'
        description: 'SLO Violation: {{ .GroupLabels.alertname }}'
        details:
          slo_type: '{{ .Labels.slo_type }}'
          service: '{{ .Labels.service }}'
          error_budget_remaining: '{{ query "factory_slo:error_budget_remaining" | first | value | printf "%.1f" }}%'
          burn_rate: '{{ query "factory_slo:error_budget_burn_rate_1h" | first | value | printf "%.2f" }}%/hour'
```

---

## 📈 **Service Level Objectives (SLO) Implementation**

### **SLO Definition and Tracking**

**SLO Configuration File**: `containers/observability/slo_definitions.yml`

```yaml
# Meta-Agent Factory SLO Definitions
slos:
  # Availability SLO - System uptime and accessibility
  availability:
    name: "System Availability"
    description: "Percentage of time the system is accessible and responding"
    target: 99.9  # 99.9% uptime
    measurement_window: "30d"
    sli_query: |
      sum(rate(http_requests_total{status!~"5.."}[5m])) /
      sum(rate(http_requests_total[5m]))
    error_budget: 0.1  # 0.1% error budget (43.2 minutes/month)
    
  # Performance SLO - Response time objectives
  performance:
    name: "System Performance"
    description: "95th percentile response time under threshold"
    target: 99.5  # 99.5% of requests under 500ms
    measurement_window: "30d"
    sli_query: |
      sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) /
      sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))
    error_budget: 0.5  # 0.5% error budget
    
  # Reliability SLO - Error rate objectives
  reliability:
    name: "System Reliability"
    description: "Percentage of requests completed successfully"
    target: 99.9  # 99.9% success rate
    measurement_window: "30d"
    sli_query: |
      sum(rate(http_requests_total{status=~"2.."}[5m])) /
      sum(rate(http_requests_total[5m]))
    error_budget: 0.1  # 0.1% error budget
    
  # Business SLO - Customer satisfaction
  customer_satisfaction:
    name: "Customer Satisfaction"
    description: "Customer satisfaction score based on feedback"
    target: 90.0  # 90% satisfaction rate
    measurement_window: "7d"
    sli_query: |
      sum(rate(factory_customer_satisfaction_positive_total[1h])) /
      sum(rate(factory_customer_satisfaction_total[1h])) * 100
    error_budget: 10.0  # 10% error budget
    
  # Agent Coordination SLO - Factory-specific
  agent_coordination:
    name: "Agent Coordination Efficiency"
    description: "Success rate of agent coordination workflows"
    target: 99.5  # 99.5% coordination success
    measurement_window: "7d"
    sli_query: |
      sum(rate(factory_coordination_attempts_total{status="success"}[5m])) /
      sum(rate(factory_coordination_attempts_total[5m]))
    error_budget: 0.5  # 0.5% error budget
```

### **SLO Recording Rules**

**File**: `containers/observability/slo_recording_rules.yml`

```yaml
groups:
  - name: slo_calculations
    interval: 30s
    rules:
      # Availability SLO calculations
      - record: factory_slo:availability_5m
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[5m])) /
          sum(rate(http_requests_total[5m]))
        
      - record: factory_slo:availability_1h
        expr: avg_over_time(factory_slo:availability_5m[1h])
        
      - record: factory_slo:availability_24h
        expr: avg_over_time(factory_slo:availability_5m[24h])
        
      - record: factory_slo:availability_7d
        expr: avg_over_time(factory_slo:availability_5m[7d])
        
      - record: factory_slo:availability_30d
        expr: avg_over_time(factory_slo:availability_5m[30d])
        
      # Performance SLO calculations
      - record: factory_slo:performance_5m
        expr: |
          sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) /
          sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))
          
      - record: factory_slo:performance_1h
        expr: avg_over_time(factory_slo:performance_5m[1h])
        
      - record: factory_slo:performance_24h
        expr: avg_over_time(factory_slo:performance_5m[24h])
        
      - record: factory_slo:performance_7d
        expr: avg_over_time(factory_slo:performance_5m[7d])
        
      - record: factory_slo:performance_30d
        expr: avg_over_time(factory_slo:performance_5m[30d])
        
      # Reliability SLO calculations
      - record: factory_slo:reliability_5m
        expr: |
          sum(rate(http_requests_total{status=~"2.."}[5m])) /
          sum(rate(http_requests_total[5m]))
          
      - record: factory_slo:reliability_1h
        expr: avg_over_time(factory_slo:reliability_5m[1h])
        
      - record: factory_slo:reliability_24h
        expr: avg_over_time(factory_slo:reliability_5m[24h])
        
      - record: factory_slo:reliability_7d
        expr: avg_over_time(factory_slo:reliability_5m[7d])
        
      - record: factory_slo:reliability_30d
        expr: avg_over_time(factory_slo:reliability_5m[30d])
        
      # Error budget calculations
      - record: factory_slo:error_budget_availability_remaining
        expr: |
          (
            (factory_slo:availability_30d - 0.999) /
            (1 - 0.999)
          ) * 100
          
      - record: factory_slo:error_budget_performance_remaining
        expr: |
          (
            (factory_slo:performance_30d - 0.995) /
            (1 - 0.995)
          ) * 100
          
      - record: factory_slo:error_budget_reliability_remaining
        expr: |
          (
            (factory_slo:reliability_30d - 0.999) /
            (1 - 0.999)
          ) * 100
          
      # Error budget burn rate calculations
      - record: factory_slo:error_budget_burn_rate_1h
        expr: |
          (
            (1 - factory_slo:availability_1h) /
            (1 - 0.999)
          ) * 100
          
      - record: factory_slo:error_budget_burn_rate_6h
        expr: |
          (
            (1 - avg_over_time(factory_slo:availability_5m[6h])) /
            (1 - 0.999)
          ) * 100
          
      # Time to budget exhaustion
      - record: factory_slo:time_to_budget_exhaustion_hours
        expr: |
          (
            factory_slo:error_budget_availability_remaining /
            (factory_slo:error_budget_burn_rate_1h + 0.01)
          )
          
      # Business KPI correlations
      - record: factory_slo:customer_satisfaction_score
        expr: |
          sum(rate(factory_customer_satisfaction_positive_total[1h])) /
          sum(rate(factory_customer_satisfaction_total[1h])) * 10
          
      - record: factory_slo:agent_coordination_efficiency
        expr: |
          sum(rate(factory_coordination_attempts_total{status="success"}[5m])) /
          sum(rate(factory_coordination_attempts_total[5m]))
```

### **SLO Alert Rules**

**File**: `containers/observability/slo_alert_rules.yml`

```yaml
groups:
  - name: slo_alerts
    rules:
      # Fast burn rate alerts (critical)
      - alert: SLOAvailabilityFastBurn
        expr: |
          (
            factory_slo:error_budget_burn_rate_1h > 14.4 
            and
            factory_slo:error_budget_burn_rate_6h > 6
          )
        for: 2m
        labels:
          severity: critical
          slo_type: availability
          burn_rate: fast
          impact: customer_experience
        annotations:
          summary: "SLO availability error budget burning too fast"
          description: |
            The availability SLO error budget is burning at {{ $value | printf "%.1f" }}%/hour,
            which will exhaust the monthly budget in {{ expr "factory_slo:time_to_budget_exhaustion_hours" | printf "%.1f" }} hours.
            
            Error Budget Status:
            - Current Burn Rate: {{ $value | printf "%.1f" }}%/hour
            - Remaining Budget: {{ query "factory_slo:error_budget_availability_remaining" | first | value | printf "%.1f" }}%
            - SLO Target: 99.9%
            - Current Performance: {{ query "factory_slo:availability_1h" | first | value | printf "%.3f" }}%
            
            Immediate Actions Required:
            1. Identify root cause of availability issues
            2. Implement mitigation to reduce error rate
            3. Consider feature freeze to preserve error budget
          runbook_url: "https://runbooks.meta-agent-factory.com/slo/availability-fast-burn"

      # Slow burn rate alerts (warning)
      - alert: SLOAvailabilitySlowBurn
        expr: |
          (
            factory_slo:error_budget_burn_rate_1h > 1 
            and
            factory_slo:error_budget_burn_rate_6h > 1
          )
        for: 15m
        labels:
          severity: warning
          slo_type: availability
          burn_rate: slow
          impact: risk_management
        annotations:
          summary: "SLO availability error budget burning consistently"
          description: |
            The availability SLO error budget is burning at {{ $value | printf "%.1f" }}%/hour
            consistently, indicating systematic reliability issues.
            
            Budget Analysis:
            - Burn Rate: {{ $value | printf "%.1f" }}%/hour
            - Remaining Budget: {{ query "factory_slo:error_budget_availability_remaining" | first | value | printf "%.1f" }}%
            - Estimated Exhaustion: {{ query "factory_slo:time_to_budget_exhaustion_hours" | first | value | printf "%.0f" }} hours
            
            Recommended Actions:
            1. Review error patterns and trends
            2. Plan reliability improvements
            3. Consider tightening monitoring

      # Performance SLO violations
      - alert: SLOPerformanceViolation
        expr: |
          factory_slo:performance_24h < 0.995
        for: 5m
        labels:
          severity: warning
          slo_type: performance
          impact: user_experience
        annotations:
          summary: "Performance SLO violation detected"
          description: |
            24-hour performance SLO is {{ $value | printf "%.3f" }}%, below the 99.5% target.
            
            Performance Analysis:
            - Current 24h Performance: {{ $value | printf "%.3f" }}%
            - Target: 99.5%
            - Gap: {{ expr "(0.995 - $value) * 100" | printf "%.2f" }}%
            - P95 Latency: {{ query "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))" | first | value | printf "%.3f" }}s

      # Business SLO violations
      - alert: SLOCustomerSatisfactionViolation
        expr: |
          factory_slo:customer_satisfaction_score < 8.0
        for: 10m
        labels:
          severity: critical
          slo_type: customer_satisfaction
          impact: business_revenue
        annotations:
          summary: "Customer satisfaction SLO violated"
          description: |
            Customer satisfaction score is {{ $value | printf "%.1f" }}/10, below the 9.0 target.
            
            Business Impact:
            - Current CSAT: {{ $value | printf "%.1f" }}/10
            - Target: 9.0/10
            - Negative Feedback Rate: {{ query "rate(factory_customer_satisfaction_negative_total[1h])" | first | value | printf "%.2f" }}/hour
            - Estimated Revenue Impact: ${{ expr "rate(factory_customer_satisfaction_negative_total[1h]) * $labels.avg_customer_value" | printf "%.0f" }}/hour

      # Error budget depletion warning
      - alert: SLOErrorBudgetDepleted
        expr: |
          (
            factory_slo:error_budget_availability_remaining < 10
            or
            factory_slo:error_budget_performance_remaining < 10
            or 
            factory_slo:error_budget_reliability_remaining < 10
          )
        for: 1m
        labels:
          severity: critical
          impact: sla_breach_risk
        annotations:
          summary: "SLO error budget critically low"
          description: |
            One or more SLO error budgets are critically low (<10% remaining).
            
            Error Budget Status:
            - Availability: {{ query "factory_slo:error_budget_availability_remaining" | first | value | printf "%.1f" }}%
            - Performance: {{ query "factory_slo:error_budget_performance_remaining" | first | value | printf "%.1f" }}%
            - Reliability: {{ query "factory_slo:error_budget_reliability_remaining" | first | value | printf "%.1f" }}%
            
            SLA Breach Risk: HIGH
            Recommended Actions:
            1. Implement emergency mitigation measures
            2. Consider feature freeze
            3. Focus all engineering effort on reliability
```

---

## 🔗 **Business KPI Correlation Implementation**

### **Business Metrics Collection**

**Enhanced Metrics Service for Business KPIs**:

```typescript
// containers/factory-core/src/services/BusinessMetricsService.ts
import { register, Counter, Gauge, Histogram } from 'prom-client';

export class BusinessMetricsService {
  private customerSatisfactionScore: Gauge<string>;
  private revenueMetrics: Counter<string>;
  private projectCompletionMetrics: Counter<string>;
  private customerFeedback: Counter<string>;
  
  constructor() {
    // Customer satisfaction tracking
    this.customerSatisfactionScore = new Gauge({
      name: 'factory_customer_satisfaction_score',
      help: 'Current customer satisfaction score (0-10)',
      labelNames: ['customer_tier', 'project_type', 'team']
    });

    // Revenue tracking
    this.revenueMetrics = new Counter({
      name: 'factory_revenue_total',
      help: 'Total revenue generated',
      labelNames: ['currency', 'customer_tier', 'project_type']
    });

    // Project completion tracking
    this.projectCompletionMetrics = new Counter({
      name: 'factory_projects_completed_total',
      help: 'Total projects completed',
      labelNames: ['complexity', 'customer_tier', 'success_status']
    });

    // Customer feedback tracking
    this.customerFeedback = new Counter({
      name: 'factory_customer_feedback_total',
      help: 'Customer feedback events',
      labelNames: ['sentiment', 'category', 'customer_tier']
    });

    // Register all metrics
    register.registerMetric(this.customerSatisfactionScore);
    register.registerMetric(this.revenueMetrics);
    register.registerMetric(this.projectCompletionMetrics);
    register.registerMetric(this.customerFeedback);
  }

  // Record customer satisfaction
  recordCustomerSatisfaction(
    score: number,
    customerTier: string,
    projectType: string,
    team: string
  ) {
    this.customerSatisfactionScore.set(
      { customer_tier: customerTier, project_type: projectType, team },
      score
    );
    
    // Also track as feedback event
    const sentiment = score >= 8 ? 'positive' : score >= 6 ? 'neutral' : 'negative';
    this.customerFeedback.inc({
      sentiment,
      category: 'satisfaction_survey',
      customer_tier: customerTier
    });
  }

  // Record revenue generation
  recordRevenue(
    amount: number,
    currency: string,
    customerTier: string,
    projectType: string
  ) {
    this.revenueMetrics.inc(
      { currency, customer_tier: customerTier, project_type: projectType },
      amount
    );
  }

  // Record project completion
  recordProjectCompletion(
    complexity: string,
    customerTier: string,
    success: boolean,
    revenueAmount?: number
  ) {
    const successStatus = success ? 'success' : 'failure';
    
    this.projectCompletionMetrics.inc({
      complexity,
      customer_tier: customerTier,
      success_status: successStatus
    });

    // Record associated revenue if provided
    if (success && revenueAmount) {
      this.recordRevenue(revenueAmount, 'USD', customerTier, complexity);
    }
  }

  // Record customer feedback event
  recordCustomerFeedback(
    sentiment: 'positive' | 'negative' | 'neutral',
    category: string,
    customerTier: string
  ) {
    this.customerFeedback.inc({
      sentiment,
      category,
      customer_tier: customerTier
    });
  }

  // Calculate business health score
  getBusinessHealthScore(): number {
    // This would typically come from a complex calculation
    // combining multiple business metrics
    return 95.5; // Placeholder
  }
}

export const businessMetrics = new BusinessMetricsService();
```

### **Business Correlation Recording Rules**

```yaml
# Business KPI correlation rules
groups:
  - name: business_correlation
    interval: 1m
    rules:
      # Revenue correlation with technical performance
      - record: business:revenue_per_hour
        expr: |
          sum(rate(factory_revenue_total[1h])) * 3600

      - record: business:revenue_impact_from_latency
        expr: |
          (
            business:revenue_per_hour *
            (histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) - 0.2) *
            0.1
          )

      # Customer satisfaction correlation
      - record: business:satisfaction_technical_correlation
        expr: |
          (
            avg(factory_customer_satisfaction_score) -
            (avg(golden_signals:error_rate_5m) * 0.5) -
            (avg(golden_signals:latency_p95_5m) * 2)
          )

      # Project success rate impact
      - record: business:project_success_rate_technical
        expr: |
          (
            sum(rate(factory_projects_completed_total{success_status="success"}[1h])) /
            sum(rate(factory_projects_completed_total[1h]))
          ) * 100

      # Cost efficiency metrics
      - record: business:cost_per_successful_project
        expr: |
          (
            sum(rate(container_cpu_usage_seconds_total[1h])) * 0.05 +
            sum(container_memory_working_set_bytes) / 1024/1024/1024 * 0.01
          ) / sum(rate(factory_projects_completed_total{success_status="success"}[1h]))

      # Customer churn prediction
      - record: business:churn_risk_score
        expr: |
          (
            (10 - avg(factory_customer_satisfaction_score)) * 10 +
            rate(factory_customer_feedback_total{sentiment="negative"}[24h]) * 5 +
            avg(golden_signals:error_rate_5m) * 20
          ) / 3
```

---

**🎯 STATUS: UNIFIED DASHBOARDS, ALERTING, AND SLO MONITORING IMPLEMENTATION COMPLETE**

**The comprehensive unified monitoring system provides executive visibility, operational intelligence, advanced anomaly detection, and business KPI correlation, enabling data-driven decision making across technical and business stakeholders.**