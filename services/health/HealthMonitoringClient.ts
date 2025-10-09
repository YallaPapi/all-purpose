/**
 * UEP Health Monitoring Client
 * 
 * Client-side TypeScript implementation for real-time health monitoring
 * dashboard integration. Provides WebSocket connectivity, event handling,
 * and data visualization support for UEP agent health status.
 * 
 * Research-based implementation following 2024 best practices:
 * - Socket.IO client for real-time updates
 * - Automatic reconnection with exponential backoff
 * - Type-safe event handling
 * - Health status aggregation and filtering
 * - Dashboard-ready data formatting
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation
 */

import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

// Import types from the service
import type { AgentHealthStatus } from './UEPHealthMonitoringService';

interface HealthMonitoringClientConfig {
  serverUrl: string;
  autoConnect: boolean;
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  timeout: number;
}

interface HealthDashboardData {
  timestamp: string;
  totalAgents: number;
  healthyAgents: number;
  warningAgents: number;
  criticalAgents: number;
  agents: AgentHealthStatus[];
  averageResponseTime: number;
  overallHealthScore: number;
}

interface HealthTrend {
  timestamp: string;
  agentId: string;
  status: 'passing' | 'warning' | 'critical';
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
}

/**
 * UEP Health Monitoring Client
 * 
 * Provides real-time connectivity to the UEP Health Monitoring Service
 * with dashboard-ready data aggregation and event handling.
 */
export class UEPHealthMonitoringClient extends EventEmitter {
  private socket: Socket | null = null;
  private config: HealthMonitoringClientConfig;
  private agentStatuses = new Map<string, AgentHealthStatus>();
  private healthTrends: HealthTrend[] = [];
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private subscriptions = new Set<string>();

  constructor(config: Partial<HealthMonitoringClientConfig> = {}) {
    super();
    
    this.config = {
      serverUrl: 'http://localhost:3001',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      ...config
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to the health monitoring service
   */
  public connect(): void {
    if (this.socket && this.socket.connected) {
      return;
    }

    this.connectionState = 'connecting';
    this.emit('connectionStateChanged', this.connectionState);

    this.socket = io(this.config.serverUrl, {
      autoConnect: true,
      reconnection: this.config.reconnection,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      reconnectionDelayMax: this.config.reconnectionDelay * 10,
      timeout: this.config.timeout,
      transports: ['websocket', 'polling']
    });

    this.setupSocketEventHandlers();
  }

  /**
   * Disconnect from the health monitoring service
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionState = 'disconnected';
    this.emit('connectionStateChanged', this.connectionState);
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.connectionState = 'connected';
      this.emit('connectionStateChanged', this.connectionState);
      this.emit('connected');
      
      // Re-subscribe to previously subscribed agents
      for (const agentId of this.subscriptions) {
        this.socket!.emit('subscribe:agent', agentId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionState = 'disconnected';
      this.emit('connectionStateChanged', this.connectionState);
      this.emit('disconnected', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.connectionState = 'connected';
      this.emit('connectionStateChanged', this.connectionState);
      this.emit('reconnected', attemptNumber);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.connectionState = 'reconnecting';
      this.emit('connectionStateChanged', this.connectionState);
      this.emit('reconnecting', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      this.emit('reconnectError', error);
    });

    this.socket.on('reconnect_failed', () => {
      this.connectionState = 'disconnected';
      this.emit('connectionStateChanged', this.connectionState);
      this.emit('reconnectFailed');
    });

    // Health monitoring events
    this.socket.on('health:initial', (agents: AgentHealthStatus[]) => {
      this.handleInitialHealthData(agents);
    });

    this.socket.on('health:update', (healthUpdate: any) => {
      this.handleHealthUpdate(healthUpdate);
    });

    this.socket.on('health:agent', (agentStatus: AgentHealthStatus) => {
      this.handleAgentHealthUpdate(agentStatus);
    });

    this.socket.on('health:critical', (criticalAlert: any) => {
      this.handleCriticalAlert(criticalAlert);
    });

    this.socket.on('health:deregistered', (deregistration: any) => {
      this.handleAgentDeregistration(deregistration);
    });

    // Error handling
    this.socket.on('connect_error', (error) => {
      this.emit('connectionError', error);
    });

    this.socket.on('error', (error) => {
      this.emit('error', error);
    });
  }

  /**
   * Handle initial health data received on connection
   */
  private handleInitialHealthData(agents: AgentHealthStatus[]): void {
    this.agentStatuses.clear();
    
    for (const agent of agents) {
      this.agentStatuses.set(agent.agentId, agent);
      this.recordHealthTrend(agent);
    }

    this.emit('initialDataReceived', this.getDashboardData());
  }

  /**
   * Handle real-time health update
   */
  private handleHealthUpdate(healthUpdate: any): void {
    const { agentId, status, metrics, timestamp, metadata } = healthUpdate;
    
    const agentStatus: AgentHealthStatus = {
      agentId,
      serviceName: metadata?.serviceName || 'unknown',
      status,
      lastUpdated: new Date(timestamp),
      ttlExpiry: new Date(Date.now() + 30000), // Default 30s TTL
      metadata: metadata || {
        version: '1.0.0',
        capabilities: [],
        endpoints: { health: '', api: '' }
      },
      metrics
    };

    const previousStatus = this.agentStatuses.get(agentId);
    this.agentStatuses.set(agentId, agentStatus);
    this.recordHealthTrend(agentStatus);

    // Emit specific events based on status changes
    if (previousStatus && previousStatus.status !== agentStatus.status) {
      this.emit('healthTransition', {
        agentId,
        from: previousStatus.status,
        to: agentStatus.status,
        timestamp: agentStatus.lastUpdated
      });
    }

    this.emit('healthUpdate', {
      agentId,
      status: agentStatus,
      dashboardData: this.getDashboardData()
    });
  }

  /**
   * Handle specific agent health update
   */
  private handleAgentHealthUpdate(agentStatus: AgentHealthStatus): void {
    this.agentStatuses.set(agentStatus.agentId, agentStatus);
    this.recordHealthTrend(agentStatus);
    
    this.emit('agentHealthUpdate', {
      agentId: agentStatus.agentId,
      status: agentStatus
    });
  }

  /**
   * Handle critical health alert
   */
  private handleCriticalAlert(criticalAlert: any): void {
    this.emit('criticalAlert', {
      agentId: criticalAlert.agentId,
      previousStatus: criticalAlert.previousStatus,
      timestamp: new Date(criticalAlert.timestamp),
      severity: 'critical'
    });
  }

  /**
   * Handle agent deregistration
   */
  private handleAgentDeregistration(deregistration: any): void {
    const { agentId, timestamp } = deregistration;
    
    this.agentStatuses.delete(agentId);
    this.subscriptions.delete(agentId);
    
    this.emit('agentDeregistered', {
      agentId,
      timestamp: new Date(timestamp),
      dashboardData: this.getDashboardData()
    });
  }

  /**
   * Record health trend data for analytics
   */
  private recordHealthTrend(agentStatus: AgentHealthStatus): void {
    const trend: HealthTrend = {
      timestamp: agentStatus.lastUpdated.toISOString(),
      agentId: agentStatus.agentId,
      status: agentStatus.status,
      responseTime: agentStatus.metrics.responseTime,
      cpuUsage: agentStatus.metrics.resourceUtilization.cpu,
      memoryUsage: agentStatus.metrics.resourceUtilization.memory
    };

    this.healthTrends.push(trend);

    // Keep only last 1000 trend records to prevent memory bloat
    if (this.healthTrends.length > 1000) {
      this.healthTrends = this.healthTrends.slice(-1000);
    }
  }

  /**
   * Subscribe to a specific agent's health updates
   */
  public subscribeToAgent(agentId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('subscribe:agent', agentId);
    }
    this.subscriptions.add(agentId);
  }

  /**
   * Unsubscribe from a specific agent's health updates
   */
  public unsubscribeFromAgent(agentId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('unsubscribe:agent', agentId);
    }
    this.subscriptions.delete(agentId);
  }

  /**
   * Get current dashboard data
   */
  public getDashboardData(): HealthDashboardData {
    const agents = Array.from(this.agentStatuses.values());
    const now = new Date().toISOString();

    const healthyAgents = agents.filter(a => a.status === 'passing').length;
    const warningAgents = agents.filter(a => a.status === 'warning').length;
    const criticalAgents = agents.filter(a => a.status === 'critical').length;

    const totalResponseTime = agents.reduce((sum, agent) => sum + agent.metrics.responseTime, 0);
    const averageResponseTime = agents.length > 0 ? totalResponseTime / agents.length : 0;

    // Calculate overall health score (0-100)
    const overallHealthScore = agents.length > 0 
      ? Math.round(((healthyAgents * 100) + (warningAgents * 50) + (criticalAgents * 0)) / agents.length)
      : 100;

    return {
      timestamp: now,
      totalAgents: agents.length,
      healthyAgents,
      warningAgents,
      criticalAgents,
      agents: [...agents].sort((a, b) => a.agentId.localeCompare(b.agentId)),
      averageResponseTime,
      overallHealthScore
    };
  }

  /**
   * Get health trends for analytics
   */
  public getHealthTrends(
    since?: Date,
    agentId?: string
  ): HealthTrend[] {
    let trends = this.healthTrends;

    // Filter by date if specified
    if (since) {
      trends = trends.filter(t => new Date(t.timestamp) >= since);
    }

    // Filter by agent ID if specified
    if (agentId) {
      trends = trends.filter(t => t.agentId === agentId);
    }

    return trends.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Get agents filtered by health status
   */
  public getAgentsByStatus(status: 'passing' | 'warning' | 'critical'): AgentHealthStatus[] {
    return Array.from(this.agentStatuses.values())
      .filter(agent => agent.status === status)
      .sort((a, b) => a.agentId.localeCompare(b.agentId));
  }

  /**
   * Get specific agent status
   */
  public getAgentStatus(agentId: string): AgentHealthStatus | undefined {
    return this.agentStatuses.get(agentId);
  }

  /**
   * Get connection state
   */
  public getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Check if client is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current subscriptions
   */
  public getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Clear all health data (useful for testing)
   */
  public clearData(): void {
    this.agentStatuses.clear();
    this.healthTrends.length = 0;
    this.subscriptions.clear();
  }

  /**
   * Get health statistics summary
   */
  public getHealthStatistics(): any {
    const agents = Array.from(this.agentStatuses.values());
    
    if (agents.length === 0) {
      return {
        totalAgents: 0,
        healthPercentage: 0,
        averageResponseTime: 0,
        averageCpuUsage: 0,
        averageMemoryUsage: 0
      };
    }

    const healthyCount = agents.filter(a => a.status === 'passing').length;
    const healthPercentage = (healthyCount / agents.length) * 100;

    const totalResponseTime = agents.reduce((sum, a) => sum + a.metrics.responseTime, 0);
    const totalCpuUsage = agents.reduce((sum, a) => sum + a.metrics.resourceUtilization.cpu, 0);
    const totalMemoryUsage = agents.reduce((sum, a) => sum + a.metrics.resourceUtilization.memory, 0);

    return {
      totalAgents: agents.length,
      healthPercentage: Math.round(healthPercentage),
      averageResponseTime: Math.round(totalResponseTime / agents.length),
      averageCpuUsage: Math.round(totalCpuUsage / agents.length),
      averageMemoryUsage: Math.round(totalMemoryUsage / agents.length)
    };
  }
}

/**
 * Factory function to create UEP Health Monitoring Client
 */
export function createHealthMonitoringClient(
  config: Partial<HealthMonitoringClientConfig> = {}
): UEPHealthMonitoringClient {
  return new UEPHealthMonitoringClient(config);
}

// Export types
export type {
  HealthMonitoringClientConfig,
  HealthDashboardData,
  HealthTrend
};