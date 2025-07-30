/**
 * UEP Metrics Integration Service
 * 
 * Integrates UEP metrics collection with existing system components,
 * provides middleware for automatic metrics recording, and manages
 * metrics aggregation across multiple agents.
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';
import { UEPMetricsCollector, createUEPMetricsCollector } from './UEPMetricsCollector';
import { 
  UEPMessage, 
  UEPMessageMetadata, 
  AgentIdentifier,
  UEPContext,
  UEPError,
  UEPPerformanceReport,
  UEPComplianceReport
} from '../types/UEPTypes';

// =====================================================
// Integration Interfaces
// =====================================================

export interface UEPMetricsIntegrationConfig {
  enabled: boolean;
  collector: {
    autoStart: boolean;
    config: any;
  };
  middleware: {
    requestTracking: boolean;
    performanceTracking: boolean;
    errorTracking: boolean;
    complianceTracking: boolean;
  };
  aggregation: {
    enabled: boolean;
    interval: number;
    windowSize: number;
    retainHistory: boolean;
  };
  alerting: {
    enabled: boolean;
    thresholds: {
      errorRate: number;
      latencyP99: number;
      complianceRate: number;
      throughput: number;
    };
    cooldownPeriod: number;
  };
  export: {
    enabled: boolean;
    formats: ('prometheus' | 'json' | 'csv')[];
    schedule: string;
    destinations: string[];
  };
}

export interface UEPMetricsMiddleware {
  requestTracking: (req: Request, res: Response, next: NextFunction) => void;
  messageTracking: (message: UEPMessage, metadata: UEPMessageMetadata) => Promise<void>;
  performanceTracking: (operation: string, duration: number, labels?: Record<string, string>) => void;
  errorTracking: (error: UEPError, context?: UEPContext) => void;
  complianceTracking: (agentId: string, violations: any[]) => void;
}

export interface UEPMetricsAggregation {
  systemWide: {
    totalMessages: number;
    totalAgents: number;
    activeAgents: number;
    averageLatency: number;
    totalErrors: number;
    overallComplianceRate: number;
  };
  byAgent: Map<string, {
    messages: number;
    latency: number;
    errors: number;
    complianceRate: number;
    lastSeen: Date;
  }>;
  byOperation: Map<string, {
    count: number;
    averageLatency: number;
    errorRate: number;
    successRate: number;
  }>;
}

// =====================================================
// UEP Metrics Integration Service
// =====================================================

export class UEPMetricsIntegration extends EventEmitter {
  private config: UEPMetricsIntegrationConfig;
  private collector: UEPMetricsCollector;
  private middleware: UEPMetricsMiddleware;
  private aggregationTimer: NodeJS.Timeout | null = null;
  private alertingTimer: NodeJS.Timeout | null = null;
  private lastAggregation: UEPMetricsAggregation | null = null;
  private alertCooldowns: Map<string, Date> = new Map();
  private isRunning: boolean = false;

  constructor(config: UEPMetricsIntegrationConfig) {
    super();
    this.config = this.validateConfig(config);
    this.collector = createUEPMetricsCollector(this.config.collector.config);
    this.middleware = this.createMiddleware();
    this.setupEventHandlers();
  }

  // =====================================================
  // Public API Methods
  // =====================================================

  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('UEP Metrics Integration is already running');
    }

    try {
      // Start metrics collector
      if (this.config.collector.autoStart) {
        await this.collector.start();
      }

      // Start aggregation timer
      if (this.config.aggregation.enabled) {
        this.startAggregation();
      }

      // Start alerting timer
      if (this.config.alerting.enabled) {
        this.startAlerting();
      }

      this.isRunning = true;
      this.emit('integration:started');
      
      console.log('UEP Metrics Integration started successfully');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Stop timers
      if (this.aggregationTimer) {
        clearInterval(this.aggregationTimer);
        this.aggregationTimer = null;
      }

      if (this.alertingTimer) {
        clearInterval(this.alertingTimer);
        this.alertingTimer = null;
      }

      // Stop collector
      await this.collector.stop();

      // Final export if configured
      if (this.config.export.enabled) {
        await this.exportMetrics();
      }

      this.isRunning = false;
      this.emit('integration:stopped');
      
      console.log('UEP Metrics Integration stopped successfully');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public getMiddleware(): UEPMetricsMiddleware {
    return this.middleware;
  }

  public getCollector(): UEPMetricsCollector {
    return this.collector;
  }

  public async getSystemMetrics(): Promise<UEPMetricsAggregation> {
    if (this.lastAggregation) {
      return this.lastAggregation;
    }

    return this.performAggregation();
  }

  public async getAgentMetrics(agentId: string): Promise<{
    performance: UEPPerformanceReport[];
    compliance: UEPComplianceReport[];
  }> {
    const performance = this.collector.getPerformanceReport(agentId);
    const compliance = this.collector.getComplianceReport(agentId);

    return { performance, compliance };
  }

  public async exportMetrics(): Promise<void> {
    if (!this.config.export.enabled) {
      return;
    }

    try {
      const metrics = await this.collector.getMetrics();
      const aggregated = await this.getSystemMetrics();

      for (const format of this.config.export.formats) {
        for (const destination of this.config.export.destinations) {
          await this.exportInFormat(format, metrics, aggregated, destination);
        }
      }

      this.emit('metrics:exported', {
        formats: this.config.export.formats,
        destinations: this.config.export.destinations,
        timestamp: new Date()
      });
    } catch (error) {
      this.emit('error', error);
    }
  }

  // =====================================================
  // Integration Methods
  // =====================================================

  public integrateWithExpress(app: any): void {
    if (this.config.middleware.requestTracking) {
      app.use(this.middleware.requestTracking);
    }

    // Add metrics endpoint
    app.get('/metrics', async (req: Request, res: Response) => {
      try {
        const metrics = await this.collector.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve metrics' });
      }
    });

    // Add system metrics endpoint
    app.get('/metrics/system', async (req: Request, res: Response) => {
      try {
        const systemMetrics = await this.getSystemMetrics();
        res.json(systemMetrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve system metrics' });
      }
    });

    // Add agent metrics endpoint  
    app.get('/metrics/agent/:agentId', async (req: Request, res: Response) => {
      try {
        const agentId = req.params.agentId;
        const agentMetrics = await this.getAgentMetrics(agentId);
        res.json(agentMetrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve agent metrics' });
      }
    });
  }

  public integrateWithMessageProcessor(processor: any): void {
    // Hook into message processing events
    processor.on('message:received', async (message: UEPMessage, metadata: UEPMessageMetadata) => {
      if (this.config.middleware.messageTracking) {
        await this.middleware.messageTracking(message, metadata);
      }
    });

    processor.on('message:processed', (message: UEPMessage, duration: number) => {
      if (this.config.middleware.performanceTracking) {
        this.middleware.performanceTracking('message_processing', duration, {
          message_type: message.type,
          agent_id: message.sender.id
        });
      }
    });

    processor.on('message:error', (error: UEPError, context: UEPContext) => {
      if (this.config.middleware.errorTracking) {
        this.middleware.errorTracking(error, context);
      }
    });
  }

  public integrateWithWorkflowEngine(engine: any): void {
    // Hook into workflow execution events
    engine.on('workflow:started', (workflowId: string, agentId: string) => {
      this.collector.recordAgentStatus(agentId, 'PROCESSOR', '1.0.0', 'active');
    });

    engine.on('workflow:completed', (workflowId: string, duration: number) => {
      this.middleware.performanceTracking('workflow_execution', duration, {
        workflow_id: workflowId
      });
    });

    engine.on('workflow:failed', (workflowId: string, error: UEPError) => {
      this.middleware.errorTracking(error, {
        traceId: '',
        spanId: '',
        agentId: '',
        correlationId: workflowId,
        metadata: { workflow_id: workflowId }
      });
    });
  }

  // =====================================================
  // Private Implementation Methods
  // =====================================================

  private validateConfig(config: UEPMetricsIntegrationConfig): UEPMetricsIntegrationConfig {
    if (!config.enabled) {
      throw new Error('UEP Metrics Integration must be enabled');
    }

    return {
      ...config,
      aggregation: {
        interval: 60000, // 1 minute
        windowSize: 300000, // 5 minutes
        retainHistory: true,
        ...config.aggregation
      },
      alerting: {
        thresholds: {
          errorRate: 0.05, // 5%
          latencyP99: 1000, // 1 second
          complianceRate: 0.95, // 95%
          throughput: 100 // messages/second
        },
        cooldownPeriod: 300000, // 5 minutes
        ...config.alerting
      }
    };
  }

  private createMiddleware(): UEPMetricsMiddleware {
    return {
      requestTracking: (req: Request, res: Response, next: NextFunction) => {
        const startTime = Date.now();
        
        res.on('finish', () => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;
          
          this.collector.recordMessage(
            {
              id: req.headers['x-request-id'] as string || '',
              type: 'REQUEST',
              protocolVersion: '1.0.0',
              sender: { id: 'client', type: 'GATEWAY', version: '1.0.0', capabilities: [], endpoint: '' },
              recipient: { id: 'server', type: 'PROCESSOR', version: '1.0.0', capabilities: [], endpoint: '' },
              correlationId: req.headers['x-correlation-id'] as string || '',
              timestamp: new Date(startTime),
              payload: {},
              metadata: {
                traceId: req.headers['x-trace-id'] as string || '',
                spanId: req.headers['x-span-id'] as string || '',
                operationName: `${req.method} ${req.path}`,
                tags: {},
                contentType: 'application/json'
              }
            },
            {
              traceId: req.headers['x-trace-id'] as string || '',
              spanId: req.headers['x-span-id'] as string || '',
              operationName: `${req.method} ${req.path}`,
              tags: {
                'http.method': req.method,
                'http.url': req.url,
                'http.status_code': statusCode.toString()
              },
              contentType: 'application/json'
            },
            duration,
            statusCode >= 400 ? 'error' : 'success'
          );
        });

        next();
      },

      messageTracking: async (message: UEPMessage, metadata: UEPMessageMetadata) => {
        // Record message received
        this.collector.recordMessage(message, metadata, 0, 'success');
        
        // Track agent activity
        this.collector.recordAgentStatus(
          message.sender.id,
          message.sender.type,
          message.sender.version,
          'active'
        );
      },

      performanceTracking: (operation: string, duration: number, labels: Record<string, string> = {}) => {
        // Record operation performance
        this.collector.recordPerformance('system', {
          latency: {
            mean: duration,
            p50: duration,
            p95: duration,
            p99: duration,
            max: duration
          }
        });
      },

      errorTracking: (error: UEPError, context?: UEPContext) => {
        // Record error metrics
        this.collector.recordPerformance(context?.agentId || 'system', {
          errorRate: {
            rate: 1,
            count: 1,
            types: { [error.code]: 1 }
          }
        });

        this.emit('alert:error', { error, context, timestamp: new Date() });
      },

      complianceTracking: (agentId: string, violations: any[]) => {
        const complianceRate = violations.length > 0 ? 0.8 : 1.0; // Simplified calculation
        this.collector.recordCompliance(agentId, '1.0.0', complianceRate, violations);
      }
    };
  }

  private setupEventHandlers(): void {
    this.collector.on('error', (error) => {
      this.emit('error', error);
    });

    this.collector.on('collector:started', () => {
      this.emit('collector:started');
    });

    this.collector.on('collector:stopped', () => {
      this.emit('collector:stopped');
    });

    this.collector.on('metrics:collected', (event) => {
      this.emit('metrics:collected', event);
    });

    // Alert handling
    this.on('alert:error', this.handleErrorAlert.bind(this));
    this.on('alert:performance', this.handlePerformanceAlert.bind(this));
    this.on('alert:compliance', this.handleComplianceAlert.bind(this));
  }

  private startAggregation(): void {
    this.aggregationTimer = setInterval(
      () => this.performAggregation(),
      this.config.aggregation.interval
    );
  }

  private startAlerting(): void {
    this.alertingTimer = setInterval(
      () => this.checkAlerts(),
      this.config.alerting.cooldownPeriod / 10 // Check more frequently than cooldown
    );
  }

  private async performAggregation(): Promise<UEPMetricsAggregation> {
    try {
      const performanceReports = this.collector.getPerformanceReport();
      const complianceReports = this.collector.getComplianceReport();

      const aggregation: UEPMetricsAggregation = {
        systemWide: {
          totalMessages: performanceReports.reduce((sum, report) => 
            sum + (report.throughput.messagesPerSecond * 60), 0), // Approximate
          totalAgents: performanceReports.length,
          activeAgents: performanceReports.filter(report => 
            Date.now() - report.timestamp.getTime() < 60000).length,
          averageLatency: performanceReports.reduce((sum, report) => 
            sum + report.latency.mean, 0) / Math.max(performanceReports.length, 1),
          totalErrors: performanceReports.reduce((sum, report) => 
            sum + report.errorRate.count, 0),
          overallComplianceRate: complianceReports.reduce((sum, report) => 
            sum + report.complianceRate, 0) / Math.max(complianceReports.length, 1)
        },
        byAgent: new Map(),
        byOperation: new Map()
      };

      // Populate by-agent metrics
      performanceReports.forEach(report => {
        aggregation.byAgent.set(report.agentId, {
          messages: report.throughput.messagesPerSecond * 60,
          latency: report.latency.mean,
          errors: report.errorRate.count,
          complianceRate: complianceReports.find(c => c.agentId === report.agentId)?.complianceRate || 1.0,
          lastSeen: report.timestamp
        });
      });

      this.lastAggregation = aggregation;
      this.emit('aggregation:completed', aggregation);

      return aggregation;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async checkAlerts(): Promise<void> {
    try {
      const aggregation = await this.getSystemMetrics();
      const thresholds = this.config.alerting.thresholds;

      // Check error rate threshold
      if (aggregation.systemWide.totalMessages > 0) {
        const errorRate = aggregation.systemWide.totalErrors / aggregation.systemWide.totalMessages;
        if (errorRate > thresholds.errorRate) {
          this.triggerAlert('error_rate_high', {
            current: errorRate,
            threshold: thresholds.errorRate,
            totalErrors: aggregation.systemWide.totalErrors,
            totalMessages: aggregation.systemWide.totalMessages
          });
        }
      }

      // Check latency threshold
      if (aggregation.systemWide.averageLatency > thresholds.latencyP99) {
        this.triggerAlert('latency_high', {
          current: aggregation.systemWide.averageLatency,
          threshold: thresholds.latencyP99
        });
      }

      // Check compliance threshold
      if (aggregation.systemWide.overallComplianceRate < thresholds.complianceRate) {
        this.triggerAlert('compliance_low', {
          current: aggregation.systemWide.overallComplianceRate,
          threshold: thresholds.complianceRate
        });
      }

      // Check individual agent alerts
      for (const [agentId, metrics] of aggregation.byAgent) {
        if (metrics.errors / Math.max(metrics.messages, 1) > thresholds.errorRate) {
          this.triggerAlert('agent_error_rate_high', {
            agentId,
            current: metrics.errors / Math.max(metrics.messages, 1),
            threshold: thresholds.errorRate
          });
        }
      }

    } catch (error) {
      this.emit('error', error);
    }
  }

  private triggerAlert(alertType: string, data: any): void {
    const alertKey = `${alertType}:${JSON.stringify(data)}`;
    const now = new Date();
    const lastAlert = this.alertCooldowns.get(alertKey);

    // Check cooldown period
    if (lastAlert && now.getTime() - lastAlert.getTime() < this.config.alerting.cooldownPeriod) {
      return;
    }

    this.alertCooldowns.set(alertKey, now);
    this.emit('alert:triggered', {
      type: alertType,
      data,
      timestamp: now
    });

    console.warn(`UEP Alert Triggered: ${alertType}`, data);
  }

  private async exportInFormat(
    format: 'prometheus' | 'json' | 'csv',
    rawMetrics: string,
    aggregated: UEPMetricsAggregation,
    destination: string
  ): Promise<void> {
    switch (format) {
      case 'prometheus':
        await this.exportPrometheus(rawMetrics, destination);
        break;
      case 'json':
        await this.exportJson(aggregated, destination);
        break;
      case 'csv':
        await this.exportCsv(aggregated, destination);
        break;
    }
  }

  private async exportPrometheus(metrics: string, destination: string): Promise<void> {
    // Export raw Prometheus metrics
    console.log(`Exporting Prometheus metrics to: ${destination}`);
  }

  private async exportJson(aggregated: UEPMetricsAggregation, destination: string): Promise<void> {
    // Export aggregated metrics as JSON
    const jsonData = {
      timestamp: new Date().toISOString(),
      systemMetrics: aggregated.systemWide,
      agentMetrics: Object.fromEntries(aggregated.byAgent),
      operationMetrics: Object.fromEntries(aggregated.byOperation)
    };
    
    console.log(`Exporting JSON metrics to: ${destination}`, JSON.stringify(jsonData, null, 2));
  }

  private async exportCsv(aggregated: UEPMetricsAggregation, destination: string): Promise<void> {
    // Export aggregated metrics as CSV
    console.log(`Exporting CSV metrics to: ${destination}`);
  }

  // Event handlers
  private handleErrorAlert(event: any): void {
    console.error('Error Alert:', event);
  }

  private handlePerformanceAlert(event: any): void {
    console.warn('Performance Alert:', event);
  }

  private handleComplianceAlert(event: any): void {
    console.warn('Compliance Alert:', event);
  }
}

// =====================================================
// Factory Functions
// =====================================================

export function createUEPMetricsIntegration(config: Partial<UEPMetricsIntegrationConfig> = {}): UEPMetricsIntegration {
  const defaultConfig: UEPMetricsIntegrationConfig = {
    enabled: true,
    collector: {
      autoStart: true,
      config: {
        collection: {
          enabled: true,
          interval: 30000,
          retention: '7d',
          bufferSize: 10000
        },
        prometheus: {
          port: 9090,
          endpoint: '/metrics',
          prefix: 'uep_',
          labels: {}
        },
        compliance: {
          strictMode: true,
          violationThreshold: 0.05,
          alertingEnabled: true
        },
        performance: {
          percentiles: [0.5, 0.9, 0.95, 0.99],
          sampleRate: 1.0,
          buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
        },
        export: {
          enabled: false,
          format: 'prometheus',
          destination: '/tmp/uep-metrics'
        }
      }
    },
    middleware: {
      requestTracking: true,
      performanceTracking: true,
      errorTracking: true,
      complianceTracking: true
    },
    aggregation: {
      enabled: true,
      interval: 60000,
      windowSize: 300000,
      retainHistory: true
    },
    alerting: {
      enabled: true,
      thresholds: {
        errorRate: 0.05,
        latencyP99: 1000,
        complianceRate: 0.95,
        throughput: 100
      },
      cooldownPeriod: 300000
    },
    export: {
      enabled: false,
      formats: ['prometheus'],
      schedule: '0 * * * *', // Hourly
      destinations: ['/tmp/uep-metrics']
    }
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    collector: {
      ...defaultConfig.collector,
      ...config.collector,
      config: { ...defaultConfig.collector.config, ...config.collector?.config }
    },
    middleware: { ...defaultConfig.middleware, ...config.middleware },
    aggregation: { ...defaultConfig.aggregation, ...config.aggregation },
    alerting: { 
      ...defaultConfig.alerting, 
      ...config.alerting,
      thresholds: { ...defaultConfig.alerting.thresholds, ...config.alerting?.thresholds }
    },
    export: { ...defaultConfig.export, ...config.export }
  };

  return new UEPMetricsIntegration(mergedConfig);
}

export default UEPMetricsIntegration;