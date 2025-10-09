export class MetricsService {
  private metrics: Map<string, number>;
  private counters: Map<string, number>;

  constructor() {
    this.metrics = new Map();
    this.counters = new Map();
  }

  incrementCounter(name: string, value: number = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  setGauge(name: string, value: number) {
    this.metrics.set(name, value);
  }

  getPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Add counters
    for (const [name, value] of this.counters.entries()) {
      lines.push(`# HELP ${name} Total number of ${name}`);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    }
    
    // Add gauges
    for (const [name, value] of this.metrics.entries()) {
      lines.push(`# HELP ${name} Current value of ${name}`);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    }
    
    // Add domain-agent specific metrics
    lines.push('# HELP domain_agents_active Number of active domain agents');
    lines.push('# TYPE domain_agents_active gauge');
    lines.push(`domain_agents_active ${this.getActiveDomainCount()}`);
    
    lines.push('# HELP domain_agents_requests_total Total domain agent requests');
    lines.push('# TYPE domain_agents_requests_total counter');
    lines.push(`domain_agents_requests_total ${this.counters.get('domain_requests_total') || 0}`);
    
    return lines.join('\n') + '\n';
  }

  private getActiveDomainCount(): number {
    // Would return actual count of active domain agents
    return 5; // Placeholder
  }

  recordRequest(domain: string, success: boolean) {
    this.incrementCounter('domain_requests_total');
    this.incrementCounter(`domain_requests_${domain}_total`);
    
    if (success) {
      this.incrementCounter('domain_requests_success_total');
      this.incrementCounter(`domain_requests_${domain}_success_total`);
    } else {
      this.incrementCounter('domain_requests_error_total');
      this.incrementCounter(`domain_requests_${domain}_error_total`);
    }
  }
}