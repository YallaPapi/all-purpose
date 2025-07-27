export class MetricsService {
  private metrics = new Map<string, number>();

  constructor() {
    this.initializeMetrics();
    setInterval(() => this.updateSystemMetrics(), 30000);
  }

  private initializeMetrics() {
    this.metrics.set('factory_agents_created_total', 0);
    this.metrics.set('factory_tasks_executed_total', 0);
    this.metrics.set('factory_tasks_failed_total', 0);
    this.metrics.set('factory_agents_active', 0);
  }

  private updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.set('factory_memory_usage_bytes', memUsage.heapUsed);
    this.metrics.set('factory_uptime_seconds', Math.floor(process.uptime()));
  }

  incrementCounter(metric: string, value = 1) {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  setGauge(metric: string, value: number) {
    this.metrics.set(metric, value);
  }

  getPrometheusMetrics(): string {
    let output = '';
    
    for (const [name, value] of this.metrics.entries()) {
      output += `# TYPE ${name} gauge\n`;
      output += `${name} ${value}\n`;
    }
    
    return output;
  }
}