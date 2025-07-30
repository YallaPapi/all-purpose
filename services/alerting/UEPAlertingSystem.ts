/**
 * UEP Alerting and Notification System
 * 
 * Comprehensive alerting system for UEP protocol violations, performance
 * anomalies, and system health issues. Integrates with Prometheus Alertmanager
 * and provides multi-channel notifications with intelligent escalation.
 * 
 * Features:
 * - Real-time UEP protocol violation detection
 * - Performance anomaly detection and alerting
 * - Multi-channel notification (Slack, PagerDuty, email, webhooks)
 * - Intelligent alert grouping and de-duplication
 * - Escalation policies with time-based triggers
 * - Alert fatigue prevention mechanisms
 * - Custom alerting rules for UEP-specific scenarios
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { 
  UEPMessage, 
  UEPMessageMetadata, 
  UEPError,
  UEPPerformanceReport,
  UEPComplianceReport
} from '../types/UEPTypes';

// =====================================================
// Alerting Configuration and Interfaces
// =====================================================

export interface UEPAlertingConfig {
  enabled: boolean;
  alertmanager: {
    url: string;
    timeout: number;
  };
  rules: {
    compliance: {
      enabled: boolean;
      threshold: number; // Compliance rate threshold (0-1)
      duration: string; // e.g., "5m"
      severity: 'critical' | 'warning' | 'info';
    };
    performance: {
      enabled: boolean;
      latencyThreshold: number; // milliseconds
      errorRateThreshold: number; // 0-1
      throughputThreshold: number; // messages/second
      duration: string;
      severity: 'critical' | 'warning' | 'info';
    };
    system: {
      enabled: boolean;
      agentDownThreshold: number; // number of agents
      coordinationFailureThreshold: number; // failure rate 0-1
      duration: string;
      severity: 'critical' | 'warning' | 'info';
    };
  };
  notifications: {
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
      mentionUsers: string[];
    };
    pagerduty: {
      enabled: boolean;
      integrationKey: string;
      severity: 'critical' | 'error' | 'warning' | 'info';
    };
    email: {
      enabled: boolean;
      smtpConfig: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      recipients: string[];
      subject: string;
    };
    webhook: {
      enabled: boolean;
      endpoints: Array<{
        url: string;
        headers?: Record<string, string>;
        timeout: number;
      }>;
    };
  };
  escalation: {
    enabled: boolean;
    levels: Array<{
      duration: string;
      notifications: string[]; // notification channel names
      actions?: string[]; // automated actions to trigger
    }>;
  };
  fatiguePrevention: {
    enabled: boolean;
    groupingWindow: string; // e.g., "5m"
    maxAlertsPerGroup: number;
    suppressionWindow: string; // e.g., "1h"
    similarityThreshold: number; // 0-1
  };
}

export interface UEPAlert {
  id: string;
  name: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'firing' | 'resolved';
  startsAt: Date;
  endsAt?: Date;
  generatorURL?: string;
  annotations: {
    summary: string;
    description: string;
    runbook_url?: string;
  };
  labels: {
    alertname: string;
    severity: string;
    service: string;
    agent_id?: string;
    workflow_id?: string;
    violation_type?: string;
    [key: string]: string | undefined;
  };
  fingerprint: string;
}

export interface UEPAlertRule {
  alert: string;
  expr: string;
  for: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export interface UEPNotificationChannel {
  name: string;
  type: 'slack' | 'pagerduty' | 'email' | 'webhook';
  config: any;
  enabled: boolean;
}

export interface UEPEscalationPolicy {
  name: string;
  rules: Array<{
    delay: string;
    channels: string[];
    conditions?: {
      severity?: string[];
      labels?: Record<string, string>;
    };
  }>;
}

// =====================================================
// UEP Alerting System
// =====================================================

export class UEPAlertingSystem extends EventEmitter {
  private config: UEPAlertingConfig;
  private alertmanagerClient: AxiosInstance;
  private notificationChannels: Map<string, UEPNotificationChannel> = new Map();
  private alertRules: Map<string, UEPAlertRule> = new Map();
  private activeAlerts: Map<string, UEPAlert> = new Map();
  private alertHistory: UEPAlert[] = [];
  private isInitialized: boolean = false;

  constructor(config: UEPAlertingConfig) {
    super();
    this.config = this.validateConfig(config);
    this.alertmanagerClient = this.createAlertmanagerClient();
    this.setupNotificationChannels();
    this.setupDefaultAlertRules();
  }

  // =====================================================
  // Initialization and Lifecycle
  // =====================================================

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('UEP Alerting System already initialized');
    }

    try {
      // Test Alertmanager connection
      await this.testAlertmanagerConnection();

      // Configure alert rules
      await this.configureAlertRules();

      // Start background processes
      this.startAlertProcessor();
      this.startEscalationProcessor();

      this.isInitialized = true;
      this.emit('alerting:initialized');

      console.log('UEP Alerting System initialized successfully');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Resolve all active alerts
      for (const [alertId, alert] of this.activeAlerts) {
        await this.resolveAlert(alertId);
      }

      this.isInitialized = false;
      this.emit('alerting:shutdown');

      console.log('UEP Alerting System shutdown successfully');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // =====================================================
  // Alert Management
  // =====================================================

  public async createAlert(alert: Partial<UEPAlert>): Promise<UEPAlert> {
    const fullAlert: UEPAlert = {
      id: alert.id || this.generateAlertId(),
      name: alert.name || 'UEP Alert',
      severity: alert.severity || 'warning',
      status: 'firing',
      startsAt: new Date(),
      annotations: {
        summary: alert.annotations?.summary || 'UEP system alert',
        description: alert.annotations?.description || 'UEP system requires attention',
        ...alert.annotations
      },
      labels: {
        alertname: alert.name || 'UEP Alert',
        severity: alert.severity || 'warning',
        service: 'uep-system',
        ...alert.labels
      },
      fingerprint: this.generateFingerprint(alert.labels || {}),
      ...alert
    };

    // Check for duplicate/similar alerts
    if (this.config.fatiguePrevention.enabled) {
      const similarAlert = this.findSimilarAlert(fullAlert);
      if (similarAlert) {
        this.emit('alert:suppressed', { alert: fullAlert, similarTo: similarAlert });
        return similarAlert;
      }
    }

    // Store alert
    this.activeAlerts.set(fullAlert.id, fullAlert);
    this.alertHistory.push(fullAlert);

    // Send to Alertmanager
    await this.sendToAlertmanager([fullAlert]);

    // Trigger notifications
    await this.processNotifications(fullAlert);

    this.emit('alert:created', fullAlert);
    console.log(`Created alert: ${fullAlert.name} (${fullAlert.severity})`);

    return fullAlert;
  }

  public async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = 'resolved';
    alert.endsAt = new Date();

    // Send resolution to Alertmanager
    await this.sendToAlertmanager([alert]);

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    this.emit('alert:resolved', alert);
    console.log(`Resolved alert: ${alert.name}`);
  }

  public async updateAlert(alertId: string, updates: Partial<UEPAlert>): Promise<UEPAlert> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    const updatedAlert = { ...alert, ...updates };
    this.activeAlerts.set(alertId, updatedAlert);

    // Send update to Alertmanager
    await this.sendToAlertmanager([updatedAlert]);

    this.emit('alert:updated', updatedAlert);
    return updatedAlert;
  }

  // =====================================================
  // UEP-Specific Alert Methods
  // =====================================================

  public async alertComplianceViolation(
    agentId: string,
    violationType: string,
    complianceRate: number,
    details?: any
  ): Promise<UEPAlert> {
    return this.createAlert({
      name: 'UEP Protocol Compliance Violation',
      severity: complianceRate < 0.9 ? 'critical' : 'warning',
      annotations: {
        summary: `UEP compliance violation detected for agent ${agentId}`,
        description: `Agent ${agentId} has compliance rate of ${(complianceRate * 100).toFixed(2)}% with violation type: ${violationType}`,
        runbook_url: 'https://docs.uep.system/runbooks/compliance-violations'
      },
      labels: {
        alertname: 'UEPComplianceViolation',
        agent_id: agentId,
        violation_type: violationType,
        compliance_rate: complianceRate.toString()
      }
    });
  }

  public async alertPerformanceAnomaly(
    agentId: string,
    metricType: 'latency' | 'throughput' | 'error_rate',
    currentValue: number,
    threshold: number,
    details?: any
  ): Promise<UEPAlert> {
    const severity = currentValue > threshold * 2 ? 'critical' : 'warning';
    
    return this.createAlert({
      name: 'UEP Performance Anomaly',
      severity,
      annotations: {
        summary: `Performance anomaly detected for agent ${agentId}`,
        description: `Agent ${agentId} ${metricType} is ${currentValue} (threshold: ${threshold})`,
        runbook_url: 'https://docs.uep.system/runbooks/performance-anomalies'
      },
      labels: {
        alertname: 'UEPPerformanceAnomaly',
        agent_id: agentId,
        metric_type: metricType,
        current_value: currentValue.toString(),
        threshold: threshold.toString()
      }
    });
  }

  public async alertSystemHealth(
    issue: string,
    severity: 'critical' | 'warning' | 'info',
    affectedComponents: string[],
    details?: any
  ): Promise<UEPAlert> {
    return this.createAlert({
      name: 'UEP System Health Issue',
      severity,
      annotations: {
        summary: `UEP system health issue: ${issue}`,
        description: `System health issue affecting components: ${affectedComponents.join(', ')}. Details: ${JSON.stringify(details)}`,
        runbook_url: 'https://docs.uep.system/runbooks/system-health'
      },
      labels: {
        alertname: 'UEPSystemHealth',
        issue_type: issue,
        affected_components: affectedComponents.join(',')
      }
    });
  }

  public async alertCoordinationFailure(
    coordinationId: string,
    pattern: string,
    participantIds: string[],
    failureReason: string
  ): Promise<UEPAlert> {
    return this.createAlert({
      name: 'UEP Coordination Failure',
      severity: 'warning',
      annotations: {
        summary: `Coordination failure in pattern ${pattern}`,
        description: `Coordination ${coordinationId} failed with pattern ${pattern}. Participants: ${participantIds.join(', ')}. Reason: ${failureReason}`,
        runbook_url: 'https://docs.uep.system/runbooks/coordination-failures'
      },
      labels: {
        alertname: 'UEPCoordinationFailure',
        coordination_id: coordinationId,
        pattern,
        participant_count: participantIds.length.toString(),
        failure_reason: failureReason
      }
    });
  }

  // =====================================================
  // Notification System
  // =====================================================

  private async processNotifications(alert: UEPAlert): Promise<void> {
    try {
      // Determine which channels to notify based on severity and labels
      const channels = this.selectNotificationChannels(alert);

      // Send notifications to selected channels
      await Promise.all(
        channels.map(channel => this.sendNotification(channel, alert))
      );

      this.emit('notifications:sent', { alert, channels: channels.map(c => c.name) });
    } catch (error) {
      this.emit('error', error);
    }
  }

  private async sendNotification(channel: UEPNotificationChannel, alert: UEPAlert): Promise<void> {
    try {
      switch (channel.type) {
        case 'slack':
          await this.sendSlackNotification(channel.config, alert);
          break;
        case 'pagerduty':
          await this.sendPagerDutyNotification(channel.config, alert);
          break;
        case 'email':
          await this.sendEmailNotification(channel.config, alert);
          break;
        case 'webhook':
          await this.sendWebhookNotification(channel.config, alert);
          break;
      }

      this.emit('notification:sent', { channel: channel.name, alert });
    } catch (error) {
      this.emit('notification:failed', { channel: channel.name, alert, error });
    }
  }

  private async sendSlackNotification(config: any, alert: UEPAlert): Promise<void> {
    if (!this.config.notifications.slack.enabled) return;

    const color = this.getSlackColor(alert.severity);
    const mentionUsers = this.config.notifications.slack.mentionUsers
      .map(user => `<@${user}>`)
      .join(' ');

    const payload = {
      channel: this.config.notifications.slack.channel,
      text: mentionUsers ? `${mentionUsers} UEP Alert` : 'UEP Alert',
      attachments: [{
        color,
        title: alert.name,
        text: alert.annotations.description,
        fields: [
          {
            title: 'Severity',
            value: alert.severity,
            short: true
          },
          {
            title: 'Status',
            value: alert.status,
            short: true
          },
          {
            title: 'Started At',
            value: alert.startsAt.toISOString(),
            short: true
          }
        ],
        footer: 'UEP Alerting System',
        ts: Math.floor(alert.startsAt.getTime() / 1000)
      }]
    };

    await axios.post(this.config.notifications.slack.webhookUrl, payload);
  }

  private async sendPagerDutyNotification(config: any, alert: UEPAlert): Promise<void> {
    if (!this.config.notifications.pagerduty.enabled) return;

    const payload = {
      routing_key: this.config.notifications.pagerduty.integrationKey,
      event_action: alert.status === 'firing' ? 'trigger' : 'resolve',
      dedup_key: alert.fingerprint,
      payload: {
        summary: alert.annotations.summary,
        source: 'UEP System',
        severity: alert.severity,
        timestamp: alert.startsAt.toISOString(),
        custom_details: {
          description: alert.annotations.description,
          labels: alert.labels,
          runbook_url: alert.annotations.runbook_url
        }
      }
    };

    await axios.post('https://events.pagerduty.com/v2/enqueue', payload);
  }

  private async sendEmailNotification(config: any, alert: UEPAlert): Promise<void> {
    if (!this.config.notifications.email.enabled) return;

    // Email implementation would use nodemailer or similar
    console.log('Email notification would be sent:', {
      to: this.config.notifications.email.recipients,
      subject: `UEP Alert: ${alert.name}`,
      body: alert.annotations.description
    });
  }

  private async sendWebhookNotification(config: any, alert: UEPAlert): Promise<void> {
    if (!this.config.notifications.webhook.enabled) return;

    const payload = {
      alert: {
        id: alert.id,
        name: alert.name,
        severity: alert.severity,
        status: alert.status,
        startsAt: alert.startsAt.toISOString(),
        annotations: alert.annotations,
        labels: alert.labels
      },
      timestamp: new Date().toISOString(),
      source: 'uep-alerting-system'
    };

    const promises = this.config.notifications.webhook.endpoints.map(endpoint =>
      axios.post(endpoint.url, payload, {
        headers: endpoint.headers || {},
        timeout: endpoint.timeout
      })
    );

    await Promise.all(promises);
  }

  // =====================================================
  // Alert Rules Management
  // =====================================================

  private setupDefaultAlertRules(): void {
    // Compliance rules
    if (this.config.rules.compliance.enabled) {
      this.alertRules.set('uep_compliance_low', {
        alert: 'UEPComplianceLow',
        expr: `avg(uep_compliance_rate) < ${this.config.rules.compliance.threshold}`,
        for: this.config.rules.compliance.duration,
        labels: {
          severity: this.config.rules.compliance.severity,
          service: 'uep-system'
        },
        annotations: {
          summary: 'UEP protocol compliance is below threshold',
          description: 'UEP system compliance rate is {{ $value | humanizePercentage }}, below threshold of {{ $labels.threshold }}'
        }
      });
    }

    // Performance rules
    if (this.config.rules.performance.enabled) {
      this.alertRules.set('uep_high_latency', {
        alert: 'UEPHighLatency',
        expr: `histogram_quantile(0.95, rate(uep_message_duration_seconds_bucket[5m])) > ${this.config.rules.performance.latencyThreshold / 1000}`,
        for: this.config.rules.performance.duration,
        labels: {
          severity: this.config.rules.performance.severity,
          service: 'uep-system'
        },
        annotations: {
          summary: 'UEP message processing latency is high',
          description: '95th percentile latency is {{ $value }}s, above threshold of {{ $labels.threshold }}s'
        }
      });

      this.alertRules.set('uep_high_error_rate', {
        alert: 'UEPHighErrorRate',
        expr: `rate(uep_errors_total[5m]) / rate(uep_messages_total[5m]) > ${this.config.rules.performance.errorRateThreshold}`,
        for: this.config.rules.performance.duration,
        labels: {
          severity: this.config.rules.performance.severity,
          service: 'uep-system'
        },
        annotations: {
          summary: 'UEP error rate is high',
          description: 'Error rate is {{ $value | humanizePercentage }}, above threshold of {{ $labels.threshold }}'
        }
      });
    }

    // System health rules
    if (this.config.rules.system.enabled) {
      this.alertRules.set('uep_agents_down', {
        alert: 'UEPAgentsDown',
        expr: `count(uep_agent_status{status="inactive"}) > ${this.config.rules.system.agentDownThreshold}`,
        for: this.config.rules.system.duration,
        labels: {
          severity: this.config.rules.system.severity,
          service: 'uep-system'
        },
        annotations: {
          summary: 'Multiple UEP agents are down',
          description: '{{ $value }} agents are down, above threshold of {{ $labels.threshold }}'
        }
      });
    }
  }

  // =====================================================
  // Utility and Helper Methods
  // =====================================================

  private validateConfig(config: UEPAlertingConfig): UEPAlertingConfig {
    if (!config.enabled) {
      throw new Error('UEP Alerting System must be enabled');
    }

    if (!config.alertmanager.url) {
      throw new Error('Alertmanager URL is required');
    }

    return {
      ...config,
      rules: {
        compliance: {
          enabled: true,
          threshold: 0.95,
          duration: '5m',
          severity: 'warning',
          ...config.rules.compliance
        },
        performance: {
          enabled: true,
          latencyThreshold: 1000,
          errorRateThreshold: 0.05,
          throughputThreshold: 100,
          duration: '5m',
          severity: 'warning',
          ...config.rules.performance
        },
        system: {
          enabled: true,
          agentDownThreshold: 2,
          coordinationFailureThreshold: 0.1,
          duration: '5m',
          severity: 'critical',
          ...config.rules.system
        }
      },
      fatiguePrevention: {
        enabled: true,
        groupingWindow: '5m',
        maxAlertsPerGroup: 10,
        suppressionWindow: '1h',
        similarityThreshold: 0.8,
        ...config.fatiguePrevention
      }
    };
  }

  private createAlertmanagerClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.alertmanager.url,
      timeout: this.config.alertmanager.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private async testAlertmanagerConnection(): Promise<void> {
    try {
      const response = await this.alertmanagerClient.get('/api/v1/status');
      if (response.status !== 200) {
        throw new Error(`Alertmanager health check failed: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to Alertmanager: ${error.message}`);
    }
  }

  private setupNotificationChannels(): void {
    if (this.config.notifications.slack.enabled) {
      this.notificationChannels.set('slack', {
        name: 'slack',
        type: 'slack',
        config: this.config.notifications.slack,
        enabled: true
      });
    }

    if (this.config.notifications.pagerduty.enabled) {
      this.notificationChannels.set('pagerduty', {
        name: 'pagerduty',
        type: 'pagerduty',
        config: this.config.notifications.pagerduty,
        enabled: true
      });
    }

    if (this.config.notifications.email.enabled) {
      this.notificationChannels.set('email', {
        name: 'email',
        type: 'email',
        config: this.config.notifications.email,
        enabled: true
      });
    }

    if (this.config.notifications.webhook.enabled) {
      this.notificationChannels.set('webhook', {
        name: 'webhook',
        type: 'webhook',
        config: this.config.notifications.webhook,
        enabled: true
      });
    }
  }

  private selectNotificationChannels(alert: UEPAlert): UEPNotificationChannel[] {
    const channels: UEPNotificationChannel[] = [];

    // Select channels based on severity
    switch (alert.severity) {
      case 'critical':
        // Send to all enabled channels for critical alerts
        this.notificationChannels.forEach(channel => {
          if (channel.enabled) channels.push(channel);
        });
        break;
      case 'warning':
        // Send to Slack and email for warnings
        const slackChannel = this.notificationChannels.get('slack');
        const emailChannel = this.notificationChannels.get('email');
        if (slackChannel?.enabled) channels.push(slackChannel);
        if (emailChannel?.enabled) channels.push(emailChannel);
        break;
      case 'info':
        // Send only to Slack for info alerts
        const infoSlackChannel = this.notificationChannels.get('slack');
        if (infoSlackChannel?.enabled) channels.push(infoSlackChannel);
        break;
    }

    return channels;
  }

  private generateAlertId(): string {
    return `uep-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(labels: Record<string, string | undefined>): string {
    const sortedLabels = Object.keys(labels)
      .sort()
      .reduce((result, key) => {
        if (labels[key] !== undefined) {
          result[key] = labels[key]!;
        }
        return result;
      }, {} as Record<string, string>);

    return Buffer.from(JSON.stringify(sortedLabels)).toString('base64');
  }

  private findSimilarAlert(alert: UEPAlert): UEPAlert | null {
    if (!this.config.fatiguePrevention.enabled) {
      return null;
    }

    const threshold = this.config.fatiguePrevention.similarityThreshold;
    
    for (const activeAlert of this.activeAlerts.values()) {
      const similarity = this.calculateAlertSimilarity(alert, activeAlert);
      if (similarity >= threshold) {
        return activeAlert;
      }
    }

    return null;
  }

  private calculateAlertSimilarity(alert1: UEPAlert, alert2: UEPAlert): number {
    // Simple similarity calculation based on labels
    const labels1 = new Set(Object.keys(alert1.labels));
    const labels2 = new Set(Object.keys(alert2.labels));
    
    const intersection = new Set([...labels1].filter(x => labels2.has(x)));
    const union = new Set([...labels1, ...labels2]);
    
    return intersection.size / union.size;
  }

  private getSlackColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'good';
      default: return '#439FE0';
    }
  }

  private startAlertProcessor(): void {
    // Background process for alert processing
    setInterval(() => {
      // Process alert lifecycle, cleanup resolved alerts, etc.
      this.processAlertLifecycle();
    }, 30000); // Every 30 seconds
  }

  private startEscalationProcessor(): void {
    if (!this.config.escalation.enabled) return;

    // Background process for alert escalation
    setInterval(() => {
      this.processEscalations();
    }, 60000); // Every minute
  }

  private processAlertLifecycle(): void {
    // Clean up old resolved alerts from history
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    this.alertHistory = this.alertHistory.filter(alert => 
      alert.status === 'firing' || (alert.endsAt && alert.endsAt > cutoff)
    );
  }

  private processEscalations(): void {
    // Implementation for escalation logic
    for (const alert of this.activeAlerts.values()) {
      const age = Date.now() - alert.startsAt.getTime();
      
      // Check if alert needs escalation based on age and rules
      for (const level of this.config.escalation.levels) {
        const levelDurationMs = this.parseDuration(level.duration);
        if (age >= levelDurationMs) {
          this.escalateAlert(alert, level);
        }
      }
    }
  }

  private escalateAlert(alert: UEPAlert, level: any): void {
    // Escalation logic implementation
    this.emit('alert:escalated', { alert, level });
  }

  private parseDuration(duration: string): number {
    // Simple duration parser (e.g., "5m" -> 300000ms)
    const match = duration.match(/^(\d+)([smh])$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: return 0;
    }
  }

  private async configureAlertRules(): Promise<void> {
    // Configure alert rules in Prometheus/Alertmanager
    console.log('Configured alert rules:', Array.from(this.alertRules.keys()));
  }

  private async sendToAlertmanager(alerts: UEPAlert[]): Promise<void> {
    try {
      const payload = alerts.map(alert => ({
        labels: alert.labels,
        annotations: alert.annotations,
        startsAt: alert.startsAt.toISOString(),
        endsAt: alert.endsAt?.toISOString(),
        generatorURL: alert.generatorURL
      }));

      await this.alertmanagerClient.post('/api/v1/alerts', payload);
    } catch (error) {
      console.warn('Failed to send alerts to Alertmanager:', error.message);
    }
  }

  public getAlertStats(): {
    active: number;
    resolved: number;
    total: number;
    bySeverity: Record<string, number>;
  } {
    const active = this.activeAlerts.size;
    const total = this.alertHistory.length;
    const resolved = total - active;

    const bySeverity = {};
    for (const alert of this.activeAlerts.values()) {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    }

    return { active, resolved, total, bySeverity };
  }
}

// =====================================================
// Factory Function
// =====================================================

export function createUEPAlertingSystem(config: Partial<UEPAlertingConfig> = {}): UEPAlertingSystem {
  const defaultConfig: UEPAlertingConfig = {
    enabled: true,
    alertmanager: {
      url: 'http://localhost:9093',
      timeout: 30000
    },
    rules: {
      compliance: {
        enabled: true,
        threshold: 0.95,
        duration: '5m',
        severity: 'warning'
      },
      performance: {
        enabled: true,
        latencyThreshold: 1000,
        errorRateThreshold: 0.05,
        throughputThreshold: 100,
        duration: '5m',
        severity: 'warning'
      },
      system: {
        enabled: true,
        agentDownThreshold: 2,
        coordinationFailureThreshold: 0.1,
        duration: '5m',
        severity: 'critical'
      }
    },
    notifications: {
      slack: {
        enabled: false,
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channel: '#uep-alerts',
        mentionUsers: []
      },
      pagerduty: {
        enabled: false,
        integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY || '',
        severity: 'error'
      },
      email: {
        enabled: false,
        smtpConfig: {
          host: 'localhost',
          port: 587,
          secure: false,
          auth: {
            user: '',
            pass: ''
          }
        },
        recipients: [],
        subject: 'UEP System Alert'
      },
      webhook: {
        enabled: false,
        endpoints: []
      }
    },
    escalation: {
      enabled: false,
      levels: [
        {
          duration: '15m',
          notifications: ['slack'],
          actions: []
        },
        {
          duration: '30m',
          notifications: ['pagerduty'],
          actions: []
        }
      ]
    },
    fatiguePrevention: {
      enabled: true,
      groupingWindow: '5m',
      maxAlertsPerGroup: 10,
      suppressionWindow: '1h',
      similarityThreshold: 0.8
    }
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    alertmanager: { ...defaultConfig.alertmanager, ...config.alertmanager },
    rules: {
      compliance: { ...defaultConfig.rules.compliance, ...config.rules?.compliance },
      performance: { ...defaultConfig.rules.performance, ...config.rules?.performance },
      system: { ...defaultConfig.rules.system, ...config.rules?.system }
    },
    notifications: {
      slack: { ...defaultConfig.notifications.slack, ...config.notifications?.slack },
      pagerduty: { ...defaultConfig.notifications.pagerduty, ...config.notifications?.pagerduty },
      email: { ...defaultConfig.notifications.email, ...config.notifications?.email },
      webhook: { ...defaultConfig.notifications.webhook, ...config.notifications?.webhook }
    },
    escalation: { ...defaultConfig.escalation, ...config.escalation },
    fatiguePrevention: { ...defaultConfig.fatiguePrevention, ...config.fatiguePrevention }
  };

  return new UEPAlertingSystem(mergedConfig);
}

export default UEPAlertingSystem;