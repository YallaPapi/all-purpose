/**
 * UEP Health Monitoring Service
 * 
 * A comprehensive Node.js/TypeScript service that integrates with Consul for TTL-based 
 * health checking, provides real-time WebSocket updates via Socket.IO v4.7+, and 
 * collects performance metrics for UEP agent coordination.
 * 
 * Research-based implementation following 2024 best practices:
 * - Consul TTL health checks with node-consul client
 * - Socket.IO for real-time health status broadcasting
 * - Historical data persistence for trend analysis
 * - Prometheus metrics integration
 * - UEP protocol compliance monitoring
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation
 */

import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import Consul from 'consul';
import express from 'express';
import { EventEmitter } from 'events';
import winston from 'winston';

// Interfaces based on research insights
interface AgentHealthStatus {
  agentId: string;
  serviceName: string;
  status: 'passing' | 'warning' | 'critical';
  lastUpdated: Date;
  ttlExpiry: Date;
  metadata: {
    version: string;
    capabilities: string[];
    endpoints: {
      health: string;
      api: string;
      metrics?: string;
    };
    tags?: string[];
  };
  metrics: {
    responseTime: number;
    successRate: number;
    resourceUtilization: {
      cpu: number;
      memory: number;
    };
    customMetrics?: Record<string, number>;
  };
}

interface HealthCheckConfiguration {
  ttlSeconds: number;
  updateIntervalSeconds: number;
  consulConfig: {
    host: string;
    port: number;
    secure: boolean;
  };
  socketIOConfig: {
    port: number;
    cors: {
      origin: string[];
      credentials: boolean;
    };
  };
}

interface HealthHistoryRecord {
  timestamp: Date;
  agentId: string;
  status: 'passing' | 'warning' | 'critical';
  metrics: AgentHealthStatus['metrics'];
  transitionFrom?: 'passing' | 'warning' | 'critical';
}

/**
 * Main UEP Health Monitoring Service Class
 * 
 * Implements the core health monitoring functionality based on research insights:
 * - TTL-based health checks with Consul integration
 * - Real-time WebSocket broadcasting
 * - Historical data collection and analysis
 * - Performance metrics aggregation
 */
export class UEPHealthMonitoringService extends EventEmitter {
  private consul: Consul;
  private io: SocketIOServer;
  private httpServer: any;
  private app: express.Application;
  private logger: winston.Logger;
  private config: HealthCheckConfiguration;
  
  // In-memory health status cache
  private healthStatusCache = new Map<string, AgentHealthStatus>();
  private healthHistory: HealthHistoryRecord[] = [];
  private activeChecks = new Map<string, NodeJS.Timeout>();
  
  // Metrics for Prometheus integration
  private metricsCollector = {
    totalHealthChecks: 0,
    healthCheckFailures: 0,
    averageResponseTime: 0,
    activeAgents: 0,
    healthTransitions: 0
  };

  constructor(config: HealthCheckConfiguration) {
    super();
    this.config = config;
    
    // Initialize Consul client with research-based configuration
    this.consul = new Consul({
      host: config.consulConfig.host,
      port: config.consulConfig.port,
      secure: config.consulConfig.secure,
      promisify: true
    });

    // Initialize Express app for health endpoints
    this.app = express();
    this.app.use(express.json());
    
    // Initialize HTTP server and Socket.IO
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: config.socketIOConfig.cors
    });

    // Initialize Winston logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/health-monitoring.log' }),
        new winston.transports.Console()
      ]
    });

    this.setupRoutes();
    this.setupSocketIOHandlers();
    this.setupEventHandlers();
  }

  /**
   * Initialize the health monitoring service
   * Sets up Consul health checks, starts polling, and begins WebSocket broadcasting
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing UEP Health Monitoring Service...');
      
      // Test Consul connectivity
      await this.testConsulConnection();
      
      // Start health status polling
      this.startHealthPolling();
      
      // Start Socket.IO server
      await this.startSocketIOServer();
      
      // Begin metrics collection
      this.startMetricsCollection();
      
      this.logger.info('UEP Health Monitoring Service initialized successfully');
      this.emit('initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize health monitoring service:', error);
      throw error;
    }
  }

  /**
   * Test Consul connection and verify API access
   */
  private async testConsulConnection(): Promise<void> {
    try {
      const leader = await this.consul.status.leader();
      this.logger.info(`Connected to Consul cluster, leader: ${leader}`);
    } catch (error) {
      this.logger.error('Failed to connect to Consul:', error);
      throw new Error('Consul connection failed');
    }
  }

  /**
   * Start polling Consul for health status updates
   * Implements TTL-based health checking as per research insights
   */
  private startHealthPolling(): void {
    const pollInterval = Math.floor(this.config.ttlSeconds * 1000 / 3); // Poll at 1/3 of TTL
    
    const pollHealthStatus = async () => {
      try {
        await this.pollAllServiceHealth();
        setTimeout(pollHealthStatus, pollInterval);
      } catch (error) {
        this.logger.error('Health polling error:', error);
        setTimeout(pollHealthStatus, pollInterval * 2); // Backoff on error
      }
    };

    // Start initial poll
    setTimeout(pollHealthStatus, 1000);
    this.logger.info(`Started health polling with ${pollInterval}ms interval`);
  }

  /**
   * Poll all services and their health status from Consul
   */
  private async pollAllServiceHealth(): Promise<void> {
    try {
      // Get all services registered with Consul
      const services = await this.consul.catalog.service.list();
      
      for (const [serviceName] of Object.entries(services)) {
        if (serviceName.startsWith('uep-agent-') || serviceName.includes('meta-agent')) {
          await this.updateServiceHealth(serviceName);
        }
      }
      
      this.metricsCollector.totalHealthChecks++;
      this.metricsCollector.activeAgents = this.healthStatusCache.size;
      
    } catch (error) {
      this.logger.error('Failed to poll service health:', error);
      this.metricsCollector.healthCheckFailures++;
    }
  }

  /**
   * Update health status for a specific service
   */
  private async updateServiceHealth(serviceName: string): Promise<void> {
    try {
      // Query health status from Consul
      const healthData = await this.consul.health.service({
        service: serviceName,
        passing: false // Include all statuses
      });

      for (const service of healthData) {
        const agentId = service.Service.ID;
        const previousStatus = this.healthStatusCache.get(agentId);
        
        const currentStatus: AgentHealthStatus = {
          agentId,
          serviceName,
          status: this.determineHealthStatus(service.Checks),
          lastUpdated: new Date(),
          ttlExpiry: new Date(Date.now() + (this.config.ttlSeconds * 1000)),
          metadata: {
            version: service.Service.Tags?.find(tag => tag.startsWith('version='))?.split('=')[1] || '1.0.0',
            capabilities: service.Service.Tags?.filter(tag => tag.startsWith('capability='))?.map(tag => tag.split('=')[1]) || [],
            endpoints: {
              health: `http://${service.Service.Address}:${service.Service.Port}/health`,
              api: `http://${service.Service.Address}:${service.Service.Port}/api`,
              metrics: `http://${service.Service.Address}:${service.Service.Port}/metrics`
            },
            tags: service.Service.Tags
          },
          metrics: await this.collectAgentMetrics(service.Service.Address, service.Service.Port)
        };

        // Update cache and emit events
        this.healthStatusCache.set(agentId, currentStatus);
        
        // Track health transitions
        if (previousStatus && previousStatus.status !== currentStatus.status) {
          this.recordHealthTransition(previousStatus, currentStatus);
          this.metricsCollector.healthTransitions++;
        }

        // Emit real-time update via Socket.IO
        this.broadcastHealthUpdate(currentStatus);
      }
      
    } catch (error) {
      this.logger.error(`Failed to update health for service ${serviceName}:`, error);
    }
  }

  /**
   * Determine overall health status from Consul check results
   */
  private determineHealthStatus(checks: any[]): 'passing' | 'warning' | 'critical' {
    if (!checks || checks.length === 0) return 'critical';
    
    const statuses = checks.map(check => check.Status);
    
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    if (statuses.every(status => status === 'passing')) return 'passing';
    
    return 'warning'; // Default to warning for mixed states
  }

  /**
   * Collect performance metrics from agent endpoints
   */
  private async collectAgentMetrics(address: string, port: number): Promise<AgentHealthStatus['metrics']> {
    const defaultMetrics = {
      responseTime: 0,
      successRate: 100,
      resourceUtilization: { cpu: 0, memory: 0 }
    };

    try {
      const startTime = Date.now();
      
      // Attempt to fetch metrics from agent's metrics endpoint
      const response = await fetch(`http://${address}:${port}/metrics`, {
        method: 'GET',
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const metricsText = await response.text();
        return {
          responseTime,
          successRate: 100,
          resourceUtilization: this.parsePrometheusMetrics(metricsText),
          customMetrics: this.extractCustomMetrics(metricsText)
        };
      } else {
        return { ...defaultMetrics, responseTime, successRate: 0 };
      }
      
    } catch (error) {
      this.logger.debug(`Failed to collect metrics from ${address}:${port}:`, error);
      return defaultMetrics;
    }
  }

  /**
   * Parse Prometheus metrics text format for resource utilization
   */
  private parsePrometheusMetrics(metricsText: string): { cpu: number; memory: number } {
    const cpuMatch = metricsText.match(/process_cpu_usage_percent\s+([\d.]+)/);
    const memoryMatch = metricsText.match(/process_memory_usage_bytes\s+([\d.]+)/);
    
    return {
      cpu: cpuMatch ? parseFloat(cpuMatch[1]) : 0,
      memory: memoryMatch ? parseFloat(memoryMatch[1]) : 0
    };
  }

  /**
   * Extract custom UEP-specific metrics
   */
  private extractCustomMetrics(metricsText: string): Record<string, number> {
    const customMetrics: Record<string, number> = {};
    const uepMetrics = metricsText.match(/uep_[\w_]+\s+([\d.]+)/g);
    
    if (uepMetrics) {
      for (const metric of uepMetrics) {
        const [name, value] = metric.split(/\s+/);
        customMetrics[name] = parseFloat(value);
      }
    }
    
    return customMetrics;
  }

  /**
   * Record health status transition for historical analysis
   */
  private recordHealthTransition(previous: AgentHealthStatus, current: AgentHealthStatus): void {
    const historyRecord: HealthHistoryRecord = {
      timestamp: new Date(),
      agentId: current.agentId,
      status: current.status,
      metrics: current.metrics,
      transitionFrom: previous.status
    };
    
    this.healthHistory.push(historyRecord);
    
    // Keep only last 10000 records to prevent memory bloat
    if (this.healthHistory.length > 10000) {
      this.healthHistory = this.healthHistory.slice(-10000);
    }
    
    this.logger.info(`Health transition: Agent ${current.agentId} changed from ${previous.status} to ${current.status}`);
    this.emit('healthTransition', { previous, current });
  }

  /**
   * Broadcast health update via Socket.IO
   */
  private broadcastHealthUpdate(healthStatus: AgentHealthStatus): void {
    this.io.emit('health:update', {
      agentId: healthStatus.agentId,
      status: healthStatus.status,
      metrics: healthStatus.metrics,
      timestamp: healthStatus.lastUpdated.toISOString(),
      metadata: healthStatus.metadata
    });
  }

  /**
   * Setup Express routes for health monitoring API
   */
  private setupRoutes(): void {
    // Get current health status of all agents
    this.app.get('/api/health/status', (req, res) => {
      const healthStatuses = Array.from(this.healthStatusCache.values());
      res.json({
        timestamp: new Date().toISOString(),
        totalAgents: healthStatuses.length,
        healthy: healthStatuses.filter(s => s.status === 'passing').length,
        warning: healthStatuses.filter(s => s.status === 'warning').length,
        critical: healthStatuses.filter(s => s.status === 'critical').length,
        agents: healthStatuses
      });
    });

    // Get health history for trend analysis
    this.app.get('/api/health/history', (req, res) => {
      const since = req.query.since ? new Date(req.query.since as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const filteredHistory = this.healthHistory.filter(h => h.timestamp >= since);
      
      res.json({
        since: since.toISOString(),
        records: filteredHistory.length,
        history: filteredHistory
      });
    });

    // Get metrics for Prometheus scraping
    this.app.get('/metrics', (req, res) => {
      const prometheusMetrics = this.generatePrometheusMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(prometheusMetrics);
    });

    // Health endpoint for this service
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        activeConnections: this.io.engine.clientsCount,
        monitoredAgents: this.healthStatusCache.size
      });
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketIOHandlers(): void {
    this.io.on('connection', (socket) => {
      this.logger.info(`Client connected: ${socket.id}`);
      
      // Send current health status on connection
      const currentStatus = Array.from(this.healthStatusCache.values());
      socket.emit('health:initial', currentStatus);
      
      // Handle client subscription to specific agents
      socket.on('subscribe:agent', (agentId: string) => {
        socket.join(`agent:${agentId}`);
        const agentStatus = this.healthStatusCache.get(agentId);
        if (agentStatus) {
          socket.emit('health:agent', agentStatus);
        }
      });
      
      socket.on('unsubscribe:agent', (agentId: string) => {
        socket.leave(`agent:${agentId}`);
      });
      
      socket.on('disconnect', () => {
        this.logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Setup internal event handlers
   */
  private setupEventHandlers(): void {
    this.on('healthTransition', (data) => {
      // Broadcast critical health transitions to all clients
      if (data.current.status === 'critical') {
        this.io.emit('health:critical', {
          agentId: data.current.agentId,
          previousStatus: data.previous.status,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Start Socket.IO server
   */
  private async startSocketIOServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.config.socketIOConfig.port, () => {
        this.logger.info(`Health monitoring server listening on port ${this.config.socketIOConfig.port}`);
        resolve();
      }).on('error', reject);
    });
  }

  /**
   * Start metrics collection for Prometheus
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      // Update average response time
      const healthStatuses = Array.from(this.healthStatusCache.values());
      if (healthStatuses.length > 0) {
        const totalResponseTime = healthStatuses.reduce((sum, status) => sum + status.metrics.responseTime, 0);
        this.metricsCollector.averageResponseTime = totalResponseTime / healthStatuses.length;
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * Generate Prometheus metrics format
   */
  private generatePrometheusMetrics(): string {
    const metrics: string[] = [];
    
    // Service-level metrics
    metrics.push(`# HELP uep_health_monitoring_checks_total Total number of health checks performed`);
    metrics.push(`# TYPE uep_health_monitoring_checks_total counter`);
    metrics.push(`uep_health_monitoring_checks_total ${this.metricsCollector.totalHealthChecks}`);
    
    metrics.push(`# HELP uep_health_monitoring_failures_total Total number of health check failures`);
    metrics.push(`# TYPE uep_health_monitoring_failures_total counter`);
    metrics.push(`uep_health_monitoring_failures_total ${this.metricsCollector.healthCheckFailures}`);
    
    metrics.push(`# HELP uep_health_monitoring_active_agents Number of actively monitored agents`);
    metrics.push(`# TYPE uep_health_monitoring_active_agents gauge`);
    metrics.push(`uep_health_monitoring_active_agents ${this.metricsCollector.activeAgents}`);
    
    metrics.push(`# HELP uep_health_monitoring_transitions_total Total number of health status transitions`);
    metrics.push(`# TYPE uep_health_monitoring_transitions_total counter`);
    metrics.push(`uep_health_monitoring_transitions_total ${this.metricsCollector.healthTransitions}`);
    
    // Agent-specific metrics
    for (const [agentId, status] of this.healthStatusCache) {
      const statusValue = status.status === 'passing' ? 1 : status.status === 'warning' ? 0.5 : 0;
      
      metrics.push(`# HELP uep_agent_health_status Health status of UEP agent (1=passing, 0.5=warning, 0=critical)`);
      metrics.push(`# TYPE uep_agent_health_status gauge`);
      metrics.push(`uep_agent_health_status{agent_id="${agentId}",service="${status.serviceName}"} ${statusValue}`);
      
      metrics.push(`# HELP uep_agent_response_time_seconds Agent response time in seconds`);
      metrics.push(`# TYPE uep_agent_response_time_seconds gauge`);
      metrics.push(`uep_agent_response_time_seconds{agent_id="${agentId}"} ${status.metrics.responseTime / 1000}`);
      
      metrics.push(`# HELP uep_agent_cpu_usage_percent Agent CPU usage percentage`);
      metrics.push(`# TYPE uep_agent_cpu_usage_percent gauge`);
      metrics.push(`uep_agent_cpu_usage_percent{agent_id="${agentId}"} ${status.metrics.resourceUtilization.cpu}`);
    }
    
    return metrics.join('\n') + '\n';
  }

  /**
   * Register an agent with TTL health check in Consul
   */
  public async registerAgentWithHealthCheck(
    agentId: string,
    serviceName: string,
    address: string,
    port: number,
    capabilities: string[],
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const serviceDefinition = {
        id: agentId,
        name: serviceName,
        address,
        port,
        tags: [
          `version=${metadata.version || '1.0.0'}`,
          ...capabilities.map(cap => `capability=${cap}`),
          'uep-agent',
          'health-monitored'
        ],
        check: {
          id: `${agentId}-health`,
          name: `${serviceName} Health Check`,
          ttl: `${this.config.ttlSeconds}s`,
          notes: `TTL health check for UEP agent ${agentId}`
        },
        meta: metadata
      };

      await this.consul.agent.service.register(serviceDefinition);
      
      this.logger.info(`Registered agent ${agentId} with health check`);
      
      // Start TTL update cycle for this agent
      this.startTTLUpdateCycle(agentId);
      
    } catch (error) {
      this.logger.error(`Failed to register agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Start TTL update cycle for a registered agent
   */
  private startTTLUpdateCycle(agentId: string): void {
    const updateInterval = (this.config.updateIntervalSeconds * 1000);
    
    const updateTTL = async () => {
      try {
        await this.consul.agent.check.pass(`${agentId}-health`);
        this.logger.debug(`Updated TTL for agent ${agentId}`);
      } catch (error) {
        this.logger.error(`Failed to update TTL for agent ${agentId}:`, error);
      }
    };

    // Clear any existing interval
    if (this.activeChecks.has(agentId)) {
      clearInterval(this.activeChecks.get(agentId)!);
    }

    // Start new interval
    const intervalId = setInterval(updateTTL, updateInterval);
    this.activeChecks.set(agentId, intervalId);
    
    // Perform initial update
    updateTTL();
  }

  /**
   * Deregister an agent and stop health monitoring
   */
  public async deregisterAgent(agentId: string): Promise<void> {
    try {
      // Stop TTL updates
      if (this.activeChecks.has(agentId)) {
        clearInterval(this.activeChecks.get(agentId)!);
        this.activeChecks.delete(agentId);
      }

      // Deregister from Consul
      await this.consul.agent.service.deregister(agentId);
      
      // Remove from cache
      this.healthStatusCache.delete(agentId);
      
      this.logger.info(`Deregistered agent ${agentId}`);
      
      // Broadcast deregistration
      this.io.emit('health:deregistered', { agentId, timestamp: new Date().toISOString() });
      
    } catch (error) {
      this.logger.error(`Failed to deregister agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get current health statistics
   */
  public getHealthStatistics(): any {
    const statuses = Array.from(this.healthStatusCache.values());
    
    return {
      timestamp: new Date().toISOString(),
      totalAgents: statuses.length,
      healthyAgents: statuses.filter(s => s.status === 'passing').length,
      warningAgents: statuses.filter(s => s.status === 'warning').length,
      criticalAgents: statuses.filter(s => s.status === 'critical').length,
      averageResponseTime: this.metricsCollector.averageResponseTime,
      totalHealthChecks: this.metricsCollector.totalHealthChecks,
      healthCheckFailures: this.metricsCollector.healthCheckFailures,
      connectedClients: this.io.engine.clientsCount
    };
  }

  /**
   * Shutdown the health monitoring service gracefully
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down UEP Health Monitoring Service...');
    
    // Clear all TTL update intervals
    for (const intervalId of this.activeChecks.values()) {
      clearInterval(intervalId);
    }
    this.activeChecks.clear();

    // Close Socket.IO server
    this.io.close();
    
    // Close HTTP server
    await new Promise<void>((resolve) => {
      this.httpServer.close(() => resolve());
    });
    
    this.logger.info('UEP Health Monitoring Service shutdown complete');
  }
}

/**
 * Factory function to create and configure UEP Health Monitoring Service
 */
export function createUEPHealthMonitoringService(
  config: Partial<HealthCheckConfiguration> = {}
): UEPHealthMonitoringService {
  const defaultConfig: HealthCheckConfiguration = {
    ttlSeconds: 30,
    updateIntervalSeconds: 10,
    consulConfig: {
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT || '8500'),
      secure: process.env.NODE_ENV === 'production'
    },
    socketIOConfig: {
      port: parseInt(process.env.HEALTH_MONITORING_PORT || '3001'),
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:8080'],
        credentials: true
      }
    }
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new UEPHealthMonitoringService(finalConfig);
}

// Export types for use in other modules
export type {
  AgentHealthStatus,
  HealthCheckConfiguration,
  HealthHistoryRecord
};