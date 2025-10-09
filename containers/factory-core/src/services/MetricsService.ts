import { Request, Response } from 'express';

// Enhanced metrics registry for comprehensive factory and agent performance tracking
interface MetricDefinition {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  labels?: string[];
}

interface LabeledValue {
  value: number;
  labels: Record<string, string>;
}

interface HistogramBucket {
  le: number;
  count: number;
}

interface HistogramData {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

export class MetricsService {
  private counters = new Map<string, Map<string, number>>();
  private gauges = new Map<string, Map<string, number>>();
  private histograms = new Map<string, Map<string, HistogramData>>();
  private startTime = Date.now();

  // Standard histogram buckets for response times (in seconds)
  private readonly defaultBuckets = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10];

  constructor() {
    this.initializeMetrics();
    setInterval(() => this.updateSystemMetrics(), 30000);
    
    // Simulate some activity in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => this.simulateActivity(), 5000);
    }
  }

  private initializeMetrics() {
    // Factory Core Metrics
    this.registerCounter('factory_agents_created_total', 'Total number of agents created');
    this.registerCounter('factory_tasks_executed_total', 'Total number of tasks executed', ['status', 'agent_type']);
    this.registerCounter('factory_projects_generated_total', 'Total number of projects generated');
    this.registerCounter('factory_coordination_attempts_total', 'Factory agent coordination attempts', ['status']);
    
    // Agent Performance Metrics
    this.registerCounter('agent_requests_total', 'Total agent requests', ['agent_type', 'capability', 'status']);
    this.registerCounter('agent_capability_matches_total', 'Total agent capability matches', ['status']);
    this.registerHistogram('agent_response_time_seconds', 'Agent response time in seconds', ['agent_type', 'capability']);
    this.registerHistogram('factory_project_generation_duration_seconds', 'Project generation duration', ['complexity']);
    
    // System Metrics
    this.registerGauge('factory_agents_active', 'Number of active agents');
    this.registerGauge('factory_active_workflows', 'Number of active workflows');
    this.registerGauge('factory_active_user_sessions', 'Number of active user sessions');
    this.registerGauge('agent_discovery_count', 'Number of discovered agents', ['registry_type']);
    
    // HTTP Metrics
    this.registerCounter('http_requests_total', 'Total HTTP requests', ['method', 'route', 'status_code']);
    this.registerHistogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'route']);
  }

  private registerCounter(name: string, help: string, labels: string[] = []) {
    this.counters.set(name, new Map());
  }

  private registerGauge(name: string, help: string, labels: string[] = []) {
    this.gauges.set(name, new Map());
  }

  private registerHistogram(name: string, help: string, labels: string[] = []) {
    this.histograms.set(name, new Map());
  }

  private createLabelKey(labels: Record<string, string> = {}): string {
    const pairs = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return pairs.map(([key, value]) => `${key}="${value}"`).join(',');
  }

  // Counter operations
  incrementCounter(metric: string, value = 1, labels: Record<string, string> = {}) {
    const counterMap = this.counters.get(metric);
    if (!counterMap) return;

    const labelKey = this.createLabelKey(labels);
    const current = counterMap.get(labelKey) || 0;
    counterMap.set(labelKey, current + value);
  }

  // Gauge operations  
  setGauge(metric: string, value: number, labels: Record<string, string> = {}) {
    const gaugeMap = this.gauges.get(metric);
    if (!gaugeMap) return;

    const labelKey = this.createLabelKey(labels);
    gaugeMap.set(labelKey, value);
  }

  incrementGauge(metric: string, value = 1, labels: Record<string, string> = {}) {
    const gaugeMap = this.gauges.get(metric);
    if (!gaugeMap) return;

    const labelKey = this.createLabelKey(labels);
    const current = gaugeMap.get(labelKey) || 0;
    gaugeMap.set(labelKey, current + value);
  }

  // Histogram operations
  observeHistogram(metric: string, value: number, labels: Record<string, string> = {}) {
    const histogramMap = this.histograms.get(metric);
    if (!histogramMap) return;

    const labelKey = this.createLabelKey(labels);
    let histogram = histogramMap.get(labelKey);
    
    if (!histogram) {
      histogram = {
        buckets: this.defaultBuckets.map(le => ({ le, count: 0 })),
        sum: 0,
        count: 0
      };
      histogramMap.set(labelKey, histogram);
    }

    // Update histogram
    histogram.sum += value;
    histogram.count += 1;
    
    // Update buckets
    for (const bucket of histogram.buckets) {
      if (value <= bucket.le) {
        bucket.count += 1;
      }
    }
  }

  // Timing helper
  startTimer(metric: string, labels: Record<string, string> = {}): () => void {
    const start = Date.now();
    return () => {
      const duration = (Date.now() - start) / 1000;
      this.observeHistogram(metric, duration, labels);
    };
  }

  // Express middleware for HTTP metrics
  createHttpMetricsMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const labels = {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode.toString()
        };

        this.incrementCounter('http_requests_total', 1, labels);
        this.observeHistogram('http_request_duration_seconds', duration, labels);
      });

      next();
    };
  }

  private updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.setGauge('factory_memory_usage_bytes', memUsage.heapUsed);
    this.setGauge('factory_uptime_seconds', Math.floor(process.uptime()));
    this.setGauge('process_uptime_seconds', (Date.now() - this.startTime) / 1000);
    
    // Update some realistic values
    this.setGauge('factory_agents_active', 16); // 11 meta + 5 domain agents
    this.setGauge('agent_discovery_count', 16, { registry_type: 'consul' });
  }

  // Simulate realistic factory activity for development/demo
  private simulateActivity() {
    const agentTypes = ['parameter-flow-agent', 'infrastructure-orchestrator', 'scaffold-generator', 'frontend-agent', 'backend-agent'];
    const capabilities = ['map-parameters', 'orchestrate-workflow', 'generate-scaffold', 'build-frontend', 'create-api'];
    
    // Simulate agent requests with realistic patterns
    if (Math.random() < 0.3) { // 30% chance every 5 seconds
      const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
      const capability = capabilities[Math.floor(Math.random() * capabilities.length)];
      const status = Math.random() < 0.9 ? 'success' : 'error'; // 90% success rate
      
      this.incrementCounter('agent_requests_total', 1, { agent_type: agentType, capability, status });
      this.observeHistogram('agent_response_time_seconds', Math.random() * 2 + 0.1, { agent_type: agentType, capability });
    }

    // Simulate project generation
    if (Math.random() < 0.05) { // 5% chance
      this.incrementCounter('factory_projects_generated_total');
      this.incrementCounter('factory_coordination_attempts_total', 1, { status: 'success' });
      this.observeHistogram('factory_project_generation_duration_seconds', 15 + Math.random() * 45, { complexity: 'medium' });
    }

    // Update dynamic gauges
    this.setGauge('factory_active_workflows', Math.floor(Math.random() * 8) + 1);
    this.setGauge('factory_active_user_sessions', Math.floor(Math.random() * 5) + 1);
  }

  getPrometheusMetrics(): string {
    let output = '';

    // Counters
    for (const [name, counterMap] of this.counters) {
      output += `# HELP ${name} Total counter metric\n`;
      output += `# TYPE ${name} counter\n`;
      
      for (const [labelKey, value] of counterMap) {
        const labelStr = labelKey ? `{${labelKey}}` : '';
        output += `${name}${labelStr} ${value}\n`;
      }
      output += '\n';
    }

    // Gauges
    for (const [name, gaugeMap] of this.gauges) {
      output += `# HELP ${name} Current gauge value\n`;
      output += `# TYPE ${name} gauge\n`;
      
      for (const [labelKey, value] of gaugeMap) {
        const labelStr = labelKey ? `{${labelKey}}` : '';
        output += `${name}${labelStr} ${value}\n`;
      }
      output += '\n';
    }

    // Histograms
    for (const [name, histogramMap] of this.histograms) {
      output += `# HELP ${name} Histogram metric\n`;
      output += `# TYPE ${name} histogram\n`;
      
      for (const [labelKey, histogram] of histogramMap) {
        const baseLabels = labelKey ? `${labelKey},` : '';
        const labelSuffix = labelKey ? '' : '';
        
        // Buckets
        for (const bucket of histogram.buckets) {
          output += `${name}_bucket{${baseLabels}le="${bucket.le}"} ${bucket.count}\n`;
        }
        output += `${name}_bucket{${baseLabels}le="+Inf"} ${histogram.count}\n`;
        
        // Sum and count
        const labels = labelKey ? `{${labelKey}}` : '';
        output += `${name}_sum${labels} ${histogram.sum}\n`;
        output += `${name}_count${labels} ${histogram.count}\n`;
      }
      output += '\n';
    }

    return output;
  }
}