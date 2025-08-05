/**
 * Agent Health Monitor Service
 * 
 * Automated health monitoring service for registered UEP agents.
 * Performs periodic health checks, tracks health metrics, and manages
 * health status transitions with circuit breaker patterns.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bull';
import axios, { AxiosResponse } from 'axios';
import { EtcdService } from '../etcd/etcd.service';
import { RegistryCacheService } from './registry-cache.service';
import { metricsHelpers } from '../monitoring/prometheus.setup';
import { RegisteredAgent, HealthStatus, AgentHealthStatus } from './dto/registry.dto';

interface HealthCheckJob {
  agentId: string;
  healthEndpoint?: string;
  timeout?: number;
  retryCount?: number;
}

interface AgentLeaseJob {
  agentId: string;
  leaseId: number;
  ttl: number;
}

interface HealthCheckResult {
  agentId: string;
  status: HealthStatus;
  responseTime: number;
  error?: string;
  endpoint?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

interface CircuitBreakerState {
  agentId: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
}

@Injectable()
@Processor('health-monitoring')
export class AgentHealthMonitorService {
  private readonly logger = new Logger(AgentHealthMonitorService.name);
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly healthCheckTimeout: number;
  private readonly maxFailureCount: number;
  private readonly circuitBreakerTimeout: number;
  private readonly healthHistoryRetentionHours: number;

  constructor(
    private readonly etcdService: EtcdService,
    private readonly cacheService: RegistryCacheService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.healthCheckTimeout = this.configService.get<number>('HEALTH_CHECK_TIMEOUT_MS', 5000);
    this.maxFailureCount = this.configService.get<number>('MAX_HEALTH_FAILURES', 3);
    this.circuitBreakerTimeout = this.configService.get<number>('CIRCUIT_BREAKER_TIMEOUT_MS', 60000);
    this.healthHistoryRetentionHours = this.configService.get<number>('HEALTH_HISTORY_RETENTION_HOURS', 24);
    
    this.logger.log(`Health Monitor Service initialized (timeout: ${this.healthCheckTimeout}ms, max failures: ${this.maxFailureCount})`);
  }

  /**
   * Process regular agent health monitoring
   */
  @Process('monitor-agent-health')
  async monitorAgentHealth(job: Job<HealthCheckJob>): Promise<void> {
    const { agentId, healthEndpoint, timeout, retryCount = 0 } = job.data;

    try {
      this.logger.debug(`Health check for agent: ${agentId}`);

      // Get agent information
      const agent = await this.cacheService.getAgent(agentId);
      if (!agent) {
        this.logger.warn(`Health check skipped - agent not found: ${agentId}`);
        return;
      }

      // Check circuit breaker state
      const circuitState = this.getCircuitBreakerState(agentId);
      if (circuitState.state === 'open' && !this.shouldAttemptHealthCheck(circuitState)) {
        this.logger.debug(`Health check skipped - circuit breaker open: ${agentId}`);
        return;
      }

      // Perform health check
      const healthResult = await this.performHealthCheck(
        agentId,
        healthEndpoint || agent.healthEndpoint,
        timeout || this.healthCheckTimeout
      );

      // Update circuit breaker state
      await this.updateCircuitBreakerState(agentId, healthResult);

      // Update agent health status
      await this.updateAgentHealthStatus(agentId, healthResult);

      // Store health history
      await this.storeHealthHistory(healthResult);

      this.logger.debug(`Health check completed for agent: ${agentId} (status: ${healthResult.status})`);

    } catch (error) {
      this.logger.error(`Health monitoring failed for agent ${agentId}:`, error);
      
      // Handle monitoring failure
      await this.handleHealthCheckFailure(agentId, error, retryCount);
    }
  }

  /**
   * Process intensive health monitoring for unhealthy agents
   */
  @Process('intensive-health-monitoring')
  async intensiveHealthMonitoring(job: Job<HealthCheckJob>): Promise<void> {
    const { agentId } = job.data;

    try {
      this.logger.debug(`Intensive health monitoring for agent: ${agentId}`);

      const agent = await this.cacheService.getAgent(agentId);
      if (!agent) {
        return;
      }

      // Perform multiple health checks with shorter intervals
      const healthResults: HealthCheckResult[] = [];
      
      for (let i = 0; i < 3; i++) {
        const result = await this.performHealthCheck(
          agentId,
          agent.healthEndpoint,
          this.healthCheckTimeout / 2 // Shorter timeout for intensive monitoring
        );
        
        healthResults.push(result);
        
        // If agent becomes healthy, we can stop intensive monitoring
        if (result.status === HealthStatus.HEALTHY) {
          break;
        }
        
        // Wait between checks
        if (i < 2) {
          await this.sleep(2000); // 2 second delay
        }
      }

      // Analyze results and update status
      const finalResult = this.analyzeIntensiveHealthResults(healthResults);
      await this.updateAgentHealthStatus(agentId, finalResult);

      // Store all results in history
      for (const result of healthResults) {
        await this.storeHealthHistory(result);
      }

    } catch (error) {
      this.logger.error(`Intensive health monitoring failed for agent ${agentId}:`, error);
    }
  }

  /**
   * Process agent lease monitoring
   */
  @Process('monitor-agent-lease')
  async monitorAgentLease(job: Job<AgentLeaseJob>): Promise<void> {
    const { agentId, leaseId, ttl } = job.data;

    try {
      this.logger.debug(`Lease monitoring for agent: ${agentId} (lease: ${leaseId})`);

      // Check if agent still exists
      const agent = await this.cacheService.getAgent(agentId);
      if (!agent) {
        this.logger.debug(`Lease monitoring stopped - agent not found: ${agentId}`);
        return;
      }

      // Check lease status (this would use etcd lease APIs in real implementation)
      const leaseStatus = await this.checkLeaseStatus(leaseId);
      
      if (!leaseStatus.active) {
        this.logger.warn(`Lease expired for agent: ${agentId} (lease: ${leaseId})`);
        
        // Mark agent as unhealthy due to lease expiration
        const expiredHealthResult: HealthCheckResult = {
          agentId,
          status: HealthStatus.UNHEALTHY,
          responseTime: 0,
          error: 'Lease expired',
          timestamp: new Date(),
          details: { leaseId, reason: 'lease_expired' },
        };

        await this.updateAgentHealthStatus(agentId, expiredHealthResult);
        
        // Emit lease expired event
        this.eventEmitter.emit('agent.lease.expired', {
          agentId,
          leaseId,
          ttl,
        });
      }

    } catch (error) {
      this.logger.error(`Lease monitoring failed for agent ${agentId}:`, error);
    }
  }

  /**
   * Process health check batch operations
   */
  @Process('batch-health-check')
  async batchHealthCheck(job: Job<{ agentIds: string[] }>): Promise<void> {
    const { agentIds } = job.data;
    const startTime = Date.now();

    try {
      this.logger.debug(`Batch health check for ${agentIds.length} agents`);

      const healthCheckPromises = agentIds.map(agentId => 
        this.performSingleHealthCheck(agentId).catch(error => {
          this.logger.error(`Batch health check failed for ${agentId}:`, error);
          return null;
        })
      );

      const results = await Promise.all(healthCheckPromises);
      const successfulResults = results.filter(result => result !== null);

      // Update all health statuses
      for (const result of successfulResults) {
        await this.updateAgentHealthStatus(result.agentId, result);
        await this.storeHealthHistory(result);
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`Batch health check completed: ${successfulResults.length}/${agentIds.length} successful in ${processingTime}ms`);

    } catch (error) {
      this.logger.error('Batch health check failed:', error);
      throw error;
    }
  }

  /**
   * Job event handlers
   */

  @OnQueueActive()
  onActive(job: Job): void {
    this.logger.debug(`Health monitoring job started: ${job.name} (ID: ${job.id})`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any): void {
    this.logger.debug(`Health monitoring job completed: ${job.name} (ID: ${job.id})`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Health monitoring job failed: ${job.name} (ID: ${job.id})`, error);
  }

  /**
   * Public methods for external access
   */

  async getAgentHealthHistory(agentId: string, hours: number = 1): Promise<HealthCheckResult[]> {
    try {
      const historyKey = `uep/registry/health-history/${agentId}`;
      const historyData = await this.etcdService.getPrefix(historyKey);
      
      const results: HealthCheckResult[] = [];
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);

      for (const [key, value] of Object.entries(historyData)) {
        try {
          const result = JSON.parse(value) as HealthCheckResult;
          if (new Date(result.timestamp) >= cutoffTime) {
            results.push(result);
          }
        } catch (error) {
          this.logger.warn(`Failed to parse health history for key ${key}:`, error);
        }
      }

      return results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      this.logger.error(`Failed to get health history for agent ${agentId}:`, error);
      return [];
    }
  }

  async getSystemHealthMetrics(): Promise<{
    totalAgents: number;
    healthyAgents: number;
    unhealthyAgents: number;
    degradedAgents: number;
    unknownAgents: number;
    averageResponseTime: number;
    circuitBreakersOpen: number;
  }> {
    try {
      const allAgents = await this.cacheService.getAllAgentIds();
      const healthMetrics = {
        totalAgents: allAgents.length,
        healthyAgents: 0,
        unhealthyAgents: 0,
        degradedAgents: 0,
        unknownAgents: 0,
        averageResponseTime: 0,
        circuitBreakersOpen: 0,
      };

      let totalResponseTime = 0;
      let responseTimeCount = 0;

      for (const agentId of allAgents) {
        const agent = await this.cacheService.getAgent(agentId);
        if (agent) {
          switch (agent.health.status) {
            case HealthStatus.HEALTHY:
              healthMetrics.healthyAgents++;
              break;
            case HealthStatus.UNHEALTHY:
              healthMetrics.unhealthyAgents++;
              break;
            case HealthStatus.DEGRADED:
              healthMetrics.degradedAgents++;
              break;
            default:
              healthMetrics.unknownAgents++;
          }

          if (agent.health.responseTime) {
            totalResponseTime += agent.health.responseTime;
            responseTimeCount++;
          }
        }

        // Check circuit breaker status
        const circuitState = this.circuitBreakers.get(agentId);
        if (circuitState && circuitState.state === 'open') {
          healthMetrics.circuitBreakersOpen++;
        }
      }

      if (responseTimeCount > 0) {
        healthMetrics.averageResponseTime = totalResponseTime / responseTimeCount;
      }

      return healthMetrics;
    } catch (error) {
      this.logger.error('Failed to get system health metrics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async performHealthCheck(
    agentId: string,
    endpoint?: string,
    timeout: number = this.healthCheckTimeout
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    if (!endpoint) {
      return {
        agentId,
        status: HealthStatus.UNKNOWN,
        responseTime: 0,
        error: 'No health endpoint configured',
        timestamp: new Date(),
      };
    }

    try {
      const response: AxiosResponse = await axios.get(endpoint, {
        timeout,
        headers: { 'User-Agent': 'UEP-Registry-Health-Monitor/1.0' },
        validateStatus: (status) => status < 500, // Accept 4xx as valid responses
      });

      const responseTime = Date.now() - startTime;
      let status: HealthStatus;
      let details: Record<string, any> = {};

      // Determine health status based on response
      if (response.status >= 200 && response.status < 300) {
        status = HealthStatus.HEALTHY;
        
        // Try to parse response body for additional health info
        if (response.data && typeof response.data === 'object') {
          details = response.data;
          
          // Check for specific health indicators in response
          if (response.data.status === 'degraded') {
            status = HealthStatus.DEGRADED;
          }
        }
      } else if (response.status >= 400 && response.status < 500) {
        status = HealthStatus.DEGRADED;
        details = { httpStatus: response.status, statusText: response.statusText };
      } else {
        status = HealthStatus.UNHEALTHY;
        details = { httpStatus: response.status, statusText: response.statusText };
      }

      return {
        agentId,
        status,
        responseTime,
        endpoint,
        timestamp: new Date(),
        details,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        agentId,
        status: HealthStatus.UNHEALTHY,
        responseTime,
        endpoint,
        error: error.message,
        timestamp: new Date(),
        details: {
          errorCode: error.code,
          errorType: error.constructor.name,
        },
      };
    }
  }

  private async performSingleHealthCheck(agentId: string): Promise<HealthCheckResult> {
    const agent = await this.cacheService.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return this.performHealthCheck(agentId, agent.healthEndpoint);
  }

  private getCircuitBreakerState(agentId: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(agentId)) {
      this.circuitBreakers.set(agentId, {
        agentId,
        state: 'closed',
        failureCount: 0,
      });
    }
    return this.circuitBreakers.get(agentId)!;
  }

  private shouldAttemptHealthCheck(circuitState: CircuitBreakerState): boolean {
    if (circuitState.state !== 'open') return true;
    if (!circuitState.nextRetryTime) return false;
    
    return new Date() >= circuitState.nextRetryTime;
  }

  private async updateCircuitBreakerState(agentId: string, healthResult: HealthCheckResult): Promise<void> {
    const circuitState = this.getCircuitBreakerState(agentId);
    
    if (healthResult.status === HealthStatus.HEALTHY) {
      // Success - reset circuit breaker
      circuitState.state = 'closed';
      circuitState.failureCount = 0;
      circuitState.lastFailureTime = undefined;
      circuitState.nextRetryTime = undefined;
    } else {
      // Failure - increment failure count
      circuitState.failureCount++;
      circuitState.lastFailureTime = new Date();
      
      if (circuitState.failureCount >= this.maxFailureCount) {
        // Open circuit breaker
        circuitState.state = 'open';
        circuitState.nextRetryTime = new Date(Date.now() + this.circuitBreakerTimeout);
        
        this.logger.warn(`Circuit breaker opened for agent: ${agentId} (failures: ${circuitState.failureCount})`);
      }
    }
  }

  private async updateAgentHealthStatus(agentId: string, healthResult: HealthCheckResult): Promise<void> {
    try {
      const healthStatus: AgentHealthStatus = {
        status: healthResult.status,
        responseTime: healthResult.responseTime,
        lastChecked: healthResult.timestamp,
        message: healthResult.error || 'Health check completed',
        metadata: healthResult.details,
      };

      // Get current agent to preserve consecutive failures count
      const currentAgent = await this.cacheService.getAgent(agentId);
      if (currentAgent) {
        if (healthResult.status === HealthStatus.HEALTHY) {
          healthStatus.consecutiveFailures = 0;
        } else {
          healthStatus.consecutiveFailures = (currentAgent.health.consecutiveFailures || 0) + 1;
        }
      }

      // Update health status via registry service (this would emit events)
      this.eventEmitter.emit('agent.health.updated', {
        agentId,
        health: healthStatus,
      });

      // Record metrics
      metricsHelpers.recordHealthCheck(
        agentId,
        healthResult.status === HealthStatus.HEALTHY ? 'success' : 'failure',
        healthResult.responseTime,
      );

    } catch (error) {
      this.logger.error(`Failed to update health status for agent ${agentId}:`, error);
    }
  }

  private async storeHealthHistory(healthResult: HealthCheckResult): Promise<void> {
    try {
      const historyKey = `uep/registry/health-history/${healthResult.agentId}/${Date.now()}`;
      const historyTtl = this.healthHistoryRetentionHours * 60 * 60; // Convert hours to seconds
      
      await this.etcdService.putWithLease(historyKey, JSON.stringify(healthResult), historyTtl);
      
    } catch (error) {
      this.logger.warn(`Failed to store health history for agent ${healthResult.agentId}:`, error);
    }
  }

  private async handleHealthCheckFailure(agentId: string, error: any, retryCount: number): Promise<void> {
    const maxRetries = 3;
    
    if (retryCount < maxRetries) {
      // Retry with exponential backoff
      const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      
      setTimeout(async () => {
        try {
          await this.monitorAgentHealth({
            data: { agentId, retryCount: retryCount + 1 },
          } as Job<HealthCheckJob>);
        } catch (retryError) {
          this.logger.error(`Health check retry failed for agent ${agentId}:`, retryError);
        }
      }, retryDelay);
    } else {
      // Max retries exceeded - mark as unhealthy
      const failureResult: HealthCheckResult = {
        agentId,
        status: HealthStatus.UNHEALTHY,
        responseTime: 0,
        error: `Health check failed after ${maxRetries} retries: ${error.message}`,
        timestamp: new Date(),
      };
      
      await this.updateAgentHealthStatus(agentId, failureResult);
    }
  }

  private analyzeIntensiveHealthResults(results: HealthCheckResult[]): HealthCheckResult {
    // Return the last result, but could implement more sophisticated analysis
    const lastResult = results[results.length - 1];
    const healthyCount = results.filter(r => r.status === HealthStatus.HEALTHY).length;
    
    // If majority of intensive checks are healthy, mark as healthy
    if (healthyCount > results.length / 2) {
      return {
        ...lastResult,
        status: HealthStatus.HEALTHY,
        details: {
          ...lastResult.details,
          intensiveCheckResults: results.map(r => r.status),
          healthyRatio: healthyCount / results.length,
        },
      };
    }
    
    return lastResult;
  }

  private async checkLeaseStatus(leaseId: number): Promise<{ active: boolean; ttl?: number }> {
    // This would use etcd lease APIs to check lease status
    // For now, return a mock implementation
    return { active: true, ttl: 300 };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}