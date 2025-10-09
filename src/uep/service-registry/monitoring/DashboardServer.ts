/**
 * Service Registry Dashboard Server
 * Task 220.5: Web-based monitoring and visualization dashboard
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConsulServiceRegistry } from '../ConsulServiceRegistry.js';
import { ServiceRegistryMonitor, RegistryMetrics, Alert } from './ServiceRegistryMonitor.js';
import { AgentRegistrationMetadata } from '../types/AgentRegistration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DashboardConfig {
  port: number;
  host?: string;
  corsOrigin?: string | string[];
  staticPath?: string;
}

export class DashboardServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private monitor: ServiceRegistryMonitor;
  private registry: ConsulServiceRegistry;
  private config: DashboardConfig;

  constructor(
    registry: ConsulServiceRegistry,
    monitor: ServiceRegistryMonitor,
    config: DashboardConfig
  ) {
    this.registry = registry;
    this.monitor = monitor;
    this.config = config;
    
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.corsOrigin || "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupExpress();
    this.setupSocketIO();
    this.setupAPIRoutes();
    this.setupMonitoringEvents();
  }

  /**
   * Start the dashboard server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(this.config.port, this.config.host || '0.0.0.0', () => {
          console.log(`🌐 Service Registry Dashboard started:`);
          console.log(`   URL: http://${this.config.host || 'localhost'}:${this.config.port}`);
          console.log(`   API: http://${this.config.host || 'localhost'}:${this.config.port}/api`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the dashboard server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close();
      this.server.close(() => {
        console.log('📡 Service Registry Dashboard stopped');
        resolve();
      });
    });
  }

  /**
   * Get the dashboard URL
   */
  getURL(): string {
    return `http://${this.config.host || 'localhost'}:${this.config.port}`;
  }

  private setupExpress(): void {
    // Middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS middleware
    this.app.use((req, res, next) => {
      const origin = this.config.corsOrigin;
      if (origin) {
        if (Array.isArray(origin)) {
          if (origin.includes(req.headers.origin || '')) {
            res.header('Access-Control-Allow-Origin', req.headers.origin);
          }
        } else {
          res.header('Access-Control-Allow-Origin', origin);
        }
      } else {
        res.header('Access-Control-Allow-Origin', '*');
      }
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });

    // Static files
    const staticPath = this.config.staticPath || path.join(__dirname, 'dashboard');
    this.app.use(express.static(staticPath));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
      });
    });

    // Serve dashboard HTML at root
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(staticPath, 'dashboard.html'));
    });
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      console.log(`📱 Dashboard client connected: ${socket.id}`);

      // Send initial data
      this.sendInitialData(socket);

      // Handle client requests
      socket.on('request-metrics', () => {
        this.sendMetrics(socket);
      });

      socket.on('request-agents', () => {
        this.sendAgents(socket);
      });

      socket.on('request-alerts', () => {
        this.sendAlerts(socket);
      });

      socket.on('resolve-alert', (alertId: string) => {
        this.monitor.resolveAlert(alertId);
      });

      socket.on('disconnect', () => {
        console.log(`📱 Dashboard client disconnected: ${socket.id}`);
      });
    });
  }

  private setupAPIRoutes(): void {
    const apiRouter = express.Router();

    // Metrics endpoint
    apiRouter.get('/metrics', (req, res) => {
      try {
        const metrics = this.monitor.getMetrics();
        res.json({
          success: true,
          data: metrics,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Agents endpoint
    apiRouter.get('/agents', async (req, res) => {
      try {
        const agents = await this.registry.getAllAgents();
        res.json({
          success: true,
          data: agents,
          count: agents.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Single agent endpoint
    apiRouter.get('/agents/:agentId', async (req, res) => {
      try {
        const agent = await this.registry.getAgent(req.params.agentId);
        if (!agent) {
          return res.status(404).json({
            success: false,
            error: 'Agent not found'
          });
        }
        res.json({
          success: true,
          data: agent,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Alerts endpoint
    apiRouter.get('/alerts', (req, res) => {
      try {
        const activeOnly = req.query.active === 'true';
        const alerts = activeOnly 
          ? this.monitor.getActiveAlerts()
          : this.monitor.getAllAlerts();
        
        res.json({
          success: true,
          data: alerts,
          count: alerts.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Alert rules endpoint
    apiRouter.get('/alert-rules', (req, res) => {
      try {
        const rules = this.monitor.getAlertRules();
        res.json({
          success: true,
          data: rules,
          count: rules.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Resolve alert endpoint
    apiRouter.post('/alerts/:alertId/resolve', (req, res) => {
      try {
        this.monitor.resolveAlert(req.params.alertId);
        res.json({
          success: true,
          message: 'Alert resolved',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Health status endpoint
    apiRouter.get('/health-status', (req, res) => {
      try {
        const healthStatus = this.monitor.getHealthStatus();
        res.json({
          success: true,
          data: healthStatus,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Event history endpoint
    apiRouter.get('/events', (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 100;
        const events = this.monitor.getEventHistory(limit);
        res.json({
          success: true,
          data: events,
          count: events.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Service discovery endpoint
    apiRouter.post('/discover', async (req, res) => {
      try {
        const query = req.body;
        const result = await this.registry.discoverAgents(query);
        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Agent health check endpoint
    apiRouter.post('/agents/:agentId/health-check', async (req, res) => {
      try {
        const isHealthy = await this.registry.performHealthCheck(req.params.agentId);
        res.json({
          success: true,
          data: {
            agentId: req.params.agentId,
            healthy: isHealthy
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Export metrics in Prometheus format
    apiRouter.get('/metrics/prometheus', (req, res) => {
      try {
        const metrics = this.monitor.getMetrics();
        const prometheusMetrics = this.convertToPrometheusFormat(metrics);
        res.setHeader('Content-Type', 'text/plain');
        res.send(prometheusMetrics);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    this.app.use('/api', apiRouter);
  }

  private setupMonitoringEvents(): void {
    // Forward monitoring events to connected clients via WebSocket
    this.monitor.on('metricsUpdated', (metrics) => {
      this.io.emit('metrics-updated', metrics);
    });

    this.monitor.on('alertTriggered', (alert) => {
      this.io.emit('alert-triggered', alert);
    });

    this.monitor.on('alertResolved', (alertId, timestamp) => {
      this.io.emit('alert-resolved', { alertId, timestamp });
    });

    this.registry.on('agentRegistered', (metadata) => {
      this.io.emit('agent-registered', metadata);
    });

    this.registry.on('agentDeregistered', (agentId) => {
      this.io.emit('agent-deregistered', { agentId });
    });

    this.registry.on('agentUpdated', (agentId, update) => {
      this.io.emit('agent-updated', { agentId, update });
    });
  }

  private async sendInitialData(socket: any): Promise<void> {
    try {
      const [metrics, agents, alerts, events] = await Promise.all([
        this.monitor.getMetrics(),
        this.registry.getAllAgents(),
        this.monitor.getActiveAlerts(),
        this.monitor.getEventHistory(50)
      ]);

      socket.emit('initial-data', {
        metrics,
        agents,
        alerts,
        events,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send initial data to client:', error);
    }
  }

  private sendMetrics(socket: any): void {
    const metrics = this.monitor.getMetrics();
    socket.emit('metrics', metrics);
  }

  private async sendAgents(socket: any): Promise<void> {
    try {
      const agents = await this.registry.getAllAgents();
      socket.emit('agents', agents);
    } catch (error) {
      console.error('Failed to send agents data:', error);
    }
  }

  private sendAlerts(socket: any): void {
    const alerts = this.monitor.getActiveAlerts();
    socket.emit('alerts', alerts);
  }

  private convertToPrometheusFormat(metrics: RegistryMetrics): string {
    const lines: string[] = [];
    const timestamp = Date.now();

    // Registry metrics
    lines.push(`# HELP uep_registry_total_agents Total number of registered agents`);
    lines.push(`# TYPE uep_registry_total_agents gauge`);
    lines.push(`uep_registry_total_agents ${metrics.totalAgents} ${timestamp}`);

    lines.push(`# HELP uep_registry_healthy_agents Number of healthy agents`);
    lines.push(`# TYPE uep_registry_healthy_agents gauge`);
    lines.push(`uep_registry_healthy_agents ${metrics.healthyAgents} ${timestamp}`);

    lines.push(`# HELP uep_registry_unhealthy_agents Number of unhealthy agents`);
    lines.push(`# TYPE uep_registry_unhealthy_agents gauge`);
    lines.push(`uep_registry_unhealthy_agents ${metrics.unhealthyAgents} ${timestamp}`);

    lines.push(`# HELP uep_registry_average_load Average load across all agents (percentage)`);
    lines.push(`# TYPE uep_registry_average_load gauge`);
    lines.push(`uep_registry_average_load ${metrics.averageLoad} ${timestamp}`);

    lines.push(`# HELP uep_registry_total_capacity Total capacity across all agents`);
    lines.push(`# TYPE uep_registry_total_capacity gauge`);
    lines.push(`uep_registry_total_capacity ${metrics.totalCapacity} ${timestamp}`);

    lines.push(`# HELP uep_registry_average_response_time Average response time across all agents (milliseconds)`);
    lines.push(`# TYPE uep_registry_average_response_time gauge`);
    lines.push(`uep_registry_average_response_time ${metrics.averageResponseTime} ${timestamp}`);

    lines.push(`# HELP uep_registry_total_error_rate Total error rate across all agents (ratio)`);
    lines.push(`# TYPE uep_registry_total_error_rate gauge`);
    lines.push(`uep_registry_total_error_rate ${metrics.totalErrorRate} ${timestamp}`);

    // Agents by type
    lines.push(`# HELP uep_registry_agents_by_type Number of agents by type`);
    lines.push(`# TYPE uep_registry_agents_by_type gauge`);
    for (const [type, count] of Object.entries(metrics.agentsByType)) {
      lines.push(`uep_registry_agents_by_type{type="${type}"} ${count} ${timestamp}`);
    }

    // Agents by status
    lines.push(`# HELP uep_registry_agents_by_status Number of agents by status`);
    lines.push(`# TYPE uep_registry_agents_by_status gauge`);
    for (const [status, count] of Object.entries(metrics.agentsByStatus)) {
      lines.push(`uep_registry_agents_by_status{status="${status}"} ${count} ${timestamp}`);
    }

    // Active alerts
    const activeAlerts = this.monitor.getActiveAlerts().length;
    lines.push(`# HELP uep_registry_active_alerts Number of active alerts`);
    lines.push(`# TYPE uep_registry_active_alerts gauge`);
    lines.push(`uep_registry_active_alerts ${activeAlerts} ${timestamp}`);

    return lines.join('\n') + '\n';
  }
}

// Export convenience function
export async function createDashboardServer(
  registry: ConsulServiceRegistry,
  monitor: ServiceRegistryMonitor,
  config: DashboardConfig
): Promise<DashboardServer> {
  const dashboard = new DashboardServer(registry, monitor, config);
  await dashboard.start();
  return dashboard;
}