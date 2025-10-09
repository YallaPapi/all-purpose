/**
 * Service Registry Monitoring System
 * Task 220.5: Monitoring, Visualization, and Operational Tooling
 */

import { EventEmitter } from 'events';
import { ConsulServiceRegistry } from '../ConsulServiceRegistry.js';
import { AgentRegistrationMetadata, AgentStatus } from '../types/AgentRegistration.js';

export interface RegistryMetrics {
  totalAgents: number;
  healthyAgents: number;
  unhealthyAgents: number;
  agentsByType: Record<string, number>;
  agentsByEnvironment: Record<string, number>;
  agentsByStatus: Record<AgentStatus, number>;
  averageLoad: number;
  totalCapacity: number;
  averageResponseTime: number;
  totalErrorRate: number;
  registrationsLastHour: number;
  deregistrationsLastHour: number;
  healthCheckFailures: number;
  lastUpdated: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (metrics: RegistryMetrics, agents: AgentRegistrationMetadata[]) => boolean;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  cooldownPeriod: number; // minutes
  lastTriggered?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  data?: any;
}

export interface MonitoringEvents {
  metricsUpdated: [RegistryMetrics];
  alertTriggered: [Alert];
  alertResolved: [string, string]; // alertId, timestamp
  healthCheckFailed: [string, Error];
  agentStatusChanged: [string, AgentStatus, AgentStatus]; // agentId, oldStatus, newStatus
}

export class ServiceRegistryMonitor extends EventEmitter {
  private registry: ConsulServiceRegistry;
  private metrics: RegistryMetrics;
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private eventHistory: Array<{ timestamp: string; event: string; data: any }> = [];
  private maxHistorySize = 1000;

  constructor(registry: ConsulServiceRegistry) {
    super();
    this.registry = registry;
    this.metrics = this.createEmptyMetrics();
    
    this.setupDefaultAlertRules();
    this.setupRegistryEventListeners();
  }

  /**
   * Start monitoring
   */
  start(intervalMs: number = 30000): void {
    console.log('Starting service registry monitoring...');
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateMetrics();
        await this.evaluateAlerts();
      } catch (error) {
        console.error('Monitoring update failed:', error);
      }
    }, intervalMs);

    // Initial update
    this.updateMetrics();
    
    console.log(`Monitoring started with ${intervalMs}ms interval`);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    console.log('Service registry monitoring stopped');
  }

  /**
   * Get current metrics
   */
  getMetrics(): RegistryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get event history
   */
  getEventHistory(limit: number = 100): Array<{ timestamp: string; event: string; data: any }> {
    return this.eventHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    console.log(`Added alert rule: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    console.log(`Removed alert rule: ${ruleId}`);
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.emit('alertResolved', alertId, alert.resolvedAt);
      this.addToHistory('alert_resolved', { alertId, alert });
    }
  }

  /**
   * Get service registry health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 100;

    // Check agent health
    const healthyRatio = this.metrics.totalAgents > 0 
      ? this.metrics.healthyAgents / this.metrics.totalAgents 
      : 1;
    
    if (healthyRatio < 0.5) {
      issues.push(`Only ${Math.round(healthyRatio * 100)}% of agents are healthy`);
      score -= 50;
    } else if (healthyRatio < 0.8) {
      issues.push(`${Math.round(healthyRatio * 100)}% of agents are healthy (warning threshold)`);
      score -= 20;
    }

    // Check load
    if (this.metrics.averageLoad > 90) {
      issues.push(`High average load: ${this.metrics.averageLoad}%`);
      score -= 20;
    } else if (this.metrics.averageLoad > 80) {
      issues.push(`Elevated average load: ${this.metrics.averageLoad}%`);
      score -= 10;
    }

    // Check error rate
    if (this.metrics.totalErrorRate > 0.05) {
      issues.push(`High error rate: ${Math.round(this.metrics.totalErrorRate * 100)}%`);
      score -= 15;
    }

    // Check response time
    if (this.metrics.averageResponseTime > 1000) {
      issues.push(`High response time: ${this.metrics.averageResponseTime}ms`);
      score -= 10;
    }

    // Check active critical alerts
    const criticalAlerts = this.getActiveAlerts().filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      issues.push(`${criticalAlerts.length} critical alert(s) active`);
      score -= criticalAlerts.length * 10;
    }

    let status: 'healthy' | 'degraded' | 'critical';
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 50) {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    return { status, score: Math.max(0, score), issues };
  }

  // Private methods

  private async updateMetrics(): Promise<void> {
    try {
      const agents = await this.registry.getAllAgents();
      
      this.metrics = {
        totalAgents: agents.length,
        healthyAgents: agents.filter(a => a.status === 'healthy').length,
        unhealthyAgents: agents.filter(a => a.status === 'unhealthy').length,
        
        agentsByType: this.groupBy(agents, a => a.agentType),
        agentsByEnvironment: this.groupBy(agents, a => a.environment),
        agentsByStatus: this.groupBy(agents, a => a.status),
        
        averageLoad: agents.length > 0 
          ? agents.reduce((sum, a) => sum + a.currentMetrics.currentLoad, 0) / agents.length 
          : 0,
        
        totalCapacity: agents.reduce((sum, a) => sum + a.currentMetrics.maxCapacity, 0),
        
        averageResponseTime: agents.length > 0 
          ? agents.reduce((sum, a) => sum + a.currentMetrics.averageResponseTime, 0) / agents.length 
          : 0,
        
        totalErrorRate: agents.length > 0 
          ? agents.reduce((sum, a) => sum + a.currentMetrics.errorRate, 0) / agents.length 
          : 0,
        
        registrationsLastHour: this.countEventsInLastHour('agent_registered'),
        deregistrationsLastHour: this.countEventsInLastHour('agent_deregistered'),
        healthCheckFailures: this.countEventsInLastHour('health_check_failed'),
        
        lastUpdated: new Date().toISOString()
      };

      this.emit('metricsUpdated', this.metrics);
      this.addToHistory('metrics_updated', this.metrics);
      
    } catch (error) {
      console.error('Failed to update monitoring metrics:', error);
    }
  }

  private async evaluateAlerts(): Promise<void> {
    const agents = await this.registry.getAllAgents();
    
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      
      // Check cooldown period
      if (rule.lastTriggered) {
        const lastTriggered = new Date(rule.lastTriggered).getTime();
        const cooldownEnd = lastTriggered + (rule.cooldownPeriod * 60 * 1000);
        if (Date.now() < cooldownEnd) continue;
      }

      try {
        const shouldTrigger = rule.condition(this.metrics, agents);
        
        if (shouldTrigger) {
          this.triggerAlert(rule);
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${rule.id}:`, error);
      }
    }
  }

  private triggerAlert(rule: AlertRule): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Alert: ${rule.name} - ${rule.description}`,
      timestamp: new Date().toISOString(),
      resolved: false,
      data: { metrics: this.metrics }
    };

    this.alerts.set(alert.id, alert);
    rule.lastTriggered = alert.timestamp;
    
    this.emit('alertTriggered', alert);
    this.addToHistory('alert_triggered', alert);
    
    console.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_unhealthy_agents',
        name: 'High Unhealthy Agent Count',
        description: 'More than 50% of agents are unhealthy',
        condition: (metrics) => metrics.totalAgents > 0 && (metrics.unhealthyAgents / metrics.totalAgents) > 0.5,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 10
      },
      {
        id: 'no_agents_available',
        name: 'No Agents Available',
        description: 'No agents are currently registered',
        condition: (metrics) => metrics.totalAgents === 0,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 5
      },
      {
        id: 'high_average_load',
        name: 'High Average Load',
        description: 'Average load across all agents exceeds 90%',
        condition: (metrics) => metrics.averageLoad > 90,
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 15
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Average error rate exceeds 5%',
        condition: (metrics) => metrics.totalErrorRate > 0.05,
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 10
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        description: 'Average response time exceeds 2 seconds',
        condition: (metrics) => metrics.averageResponseTime > 2000,
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 10
      },
      {
        id: 'frequent_health_check_failures',
        name: 'Frequent Health Check Failures',
        description: 'More than 10 health check failures in the last hour',
        condition: (metrics) => metrics.healthCheckFailures > 10,
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 30
      },
      {
        id: 'agent_type_unavailable',
        name: 'Critical Agent Type Unavailable',
        description: 'No healthy agents available for critical agent types',
        condition: (metrics, agents) => {
          const criticalTypes = ['prd-parser', 'scaffold-generator', 'infra-orchestrator'];
          return criticalTypes.some(type => {
            const typeAgents = agents.filter(a => a.agentType === type);
            const healthyTypeAgents = typeAgents.filter(a => a.status === 'healthy');
            return typeAgents.length > 0 && healthyTypeAgents.length === 0;
          });
        },
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 5
      }
    ];

    defaultRules.forEach(rule => this.alertRules.set(rule.id, rule));
    console.log(`Setup ${defaultRules.length} default alert rules`);
  }

  private setupRegistryEventListeners(): void {
    this.registry.on('agentRegistered', (metadata) => {
      this.addToHistory('agent_registered', { agentId: metadata.agentId, agentType: metadata.agentType });
    });

    this.registry.on('agentDeregistered', (agentId) => {
      this.addToHistory('agent_deregistered', { agentId });
    });

    this.registry.on('agentUpdated', (agentId, update) => {
      this.addToHistory('agent_updated', { agentId, update });
      
      // Check for status changes
      if (update.status) {
        // We'd need to track previous status to emit status change events
        // For now, just log the update
        console.log(`Agent ${agentId} status updated to: ${update.status}`);
      }
    });

    this.registry.on('healthCheckFailed', (agentId, error) => {
      this.addToHistory('health_check_failed', { agentId, error: error.message });
      this.emit('healthCheckFailed', agentId, error);
    });

    this.registry.on('error', (error) => {
      this.addToHistory('registry_error', { error: error.message });
    });
  }

  private createEmptyMetrics(): RegistryMetrics {
    return {
      totalAgents: 0,
      healthyAgents: 0,
      unhealthyAgents: 0,
      agentsByType: {},
      agentsByEnvironment: {},
      agentsByStatus: {} as Record<AgentStatus, number>,
      averageLoad: 0,
      totalCapacity: 0,
      averageResponseTime: 0,
      totalErrorRate: 0,
      registrationsLastHour: 0,
      deregistrationsLastHour: 0,
      healthCheckFailures: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, number> {
    return array.reduce((acc, item) => {
      const key = keyFn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private addToHistory(event: string, data: any): void {
    this.eventHistory.push({
      timestamp: new Date().toISOString(),
      event,
      data
    });

    // Trim history if it gets too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  private countEventsInLastHour(eventType: string): number {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.eventHistory.filter(event => 
      event.event === eventType && 
      new Date(event.timestamp) > oneHourAgo
    ).length;
  }
}

// Export typed event emitter interface
export interface ServiceRegistryMonitor {
  on<K extends keyof MonitoringEvents>(event: K, listener: (...args: MonitoringEvents[K]) => void): this;
  emit<K extends keyof MonitoringEvents>(event: K, ...args: MonitoringEvents[K]): boolean;
}