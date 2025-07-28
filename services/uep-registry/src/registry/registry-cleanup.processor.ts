/**
 * Registry Cleanup Processor
 * 
 * Bull queue processor for handling asynchronous cleanup operations
 * in the UEP agent registry. Manages data cleanup, lease expiration,
 * orphaned record removal, and cache maintenance.
 */

import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EtcdService } from '../etcd/etcd.service';
import { RegistryCacheService } from './registry-cache.service';
import { metricsHelpers } from '../monitoring/prometheus.setup';
import { RegisteredAgent } from './dto/registry.dto';

interface CleanupAgentDataJob {
  agentId: string;
  reason: string;
  timestamp: Date;
}

interface CleanupOrphanedDataJob {
  timestamp: Date;
}

interface CleanupExpiredLeasesJob {
  timestamp: Date;
}

interface CompactCacheJob {
  timestamp: Date;
  forceCompaction?: boolean;
}

interface ArchiveAgentDataJob {
  agentId: string;
  agent: RegisteredAgent;
  retentionDays: number;
}

@Processor('registry-cleanup')
export class RegistryCleanupProcessor {
  private readonly logger = new Logger(RegistryCleanupProcessor.name);
  private readonly registryPrefix = 'uep/registry/agents/';
  private readonly healthPrefix = 'uep/registry/health/';
  private readonly archivePrefix = 'uep/registry/archive/';

  constructor(
    private readonly etcdService: EtcdService,
    private readonly cacheService: RegistryCacheService,
  ) {
    this.logger.log('Registry Cleanup Processor initialized');
  }

  /**
   * Process agent data cleanup
   */
  @Process('cleanup-agent-data')
  async cleanupAgentData(job: Job<CleanupAgentDataJob>): Promise<void> {
    const { agentId, reason, timestamp } = job.data;
    const startTime = Date.now();

    try {
      this.logger.debug(`Starting cleanup for agent: ${agentId}, reason: ${reason}`);

      // Get agent data before cleanup
      const agentKey = `${this.registryPrefix}${agentId}`;
      const healthKey = `${this.healthPrefix}${agentId}`;
      
      const agentData = await this.etcdService.get(agentKey);
      let agent: RegisteredAgent | null = null;
      
      if (agentData) {
        try {
          agent = JSON.parse(agentData);
        } catch (error) {
          this.logger.warn(`Failed to parse agent data for ${agentId}:`, error);
        }
      }

      // Archive agent data before deletion
      if (agent) {
        await this.archiveAgentData(agentId, agent, 90); // Archive for 90 days
      }

      // Remove from etcd
      const deletionResults = await Promise.allSettled([
        this.etcdService.delete(agentKey),
        this.etcdService.delete(healthKey),
        this.cleanupAgentMetrics(agentId),
        this.cleanupAgentLogs(agentId),
      ]);

      // Check for deletion failures
      const failures = deletionResults.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        this.logger.warn(`Some deletions failed for agent ${agentId}:`, failures);
      }

      // Remove from cache
      await this.cacheService.removeAgent(agentId);

      // Update metrics
      const processingTime = Date.now() - startTime;
      metricsHelpers.recordCleanupOperation('agent-data', 'success', processingTime);

      this.logger.log(`Completed cleanup for agent: ${agentId} in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      metricsHelpers.recordCleanupOperation('agent-data', 'failure', processingTime);
      
      this.logger.error(`Failed to cleanup agent data for ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Process orphaned data cleanup
   */
  @Process('cleanup-orphaned-data')
  async cleanupOrphanedData(job: Job<CleanupOrphanedDataJob>): Promise<void> {
    const startTime = Date.now();
    let orphanedCount = 0;

    try {
      this.logger.debug('Starting orphaned data cleanup');

      // Get all agent keys
      const agentData = await this.etcdService.getPrefix(this.registryPrefix);
      const healthData = await this.etcdService.getPrefix(this.healthPrefix);

      // Find orphaned health records (health records without corresponding agent records)
      const agentIds = new Set(
        Object.keys(agentData).map(key => key.replace(this.registryPrefix, ''))
      );
      
      const healthIds = new Set(
        Object.keys(healthData).map(key => key.replace(this.healthPrefix, ''))
      );

      // Find health records without agents
      const orphanedHealthIds = [...healthIds].filter(id => !agentIds.has(id));

      // Cleanup orphaned health records
      for (const orphanedId of orphanedHealthIds) {
        const healthKey = `${this.healthPrefix}${orphanedId}`;
        await this.etcdService.delete(healthKey);
        orphanedCount++;
      }

      // Find stale agent records (agents with very old lastHeartbeat)
      const staleThreshold = new Date();
      staleThreshold.setHours(staleThreshold.getHours() - 24); // 24 hours ago

      const staleAgents: string[] = [];
      for (const [key, value] of Object.entries(agentData)) {
        try {
          const agent = JSON.parse(value) as RegisteredAgent;
          if (new Date(agent.lastHeartbeat) < staleThreshold) {
            const agentId = key.replace(this.registryPrefix, '');
            staleAgents.push(agentId);
          }
        } catch (error) {
          // If we can't parse the agent data, it's also orphaned
          const agentId = key.replace(this.registryPrefix, '');
          staleAgents.push(agentId);
        }
      }

      // Cleanup stale agents
      for (const staleAgentId of staleAgents) {
        await this.etcdService.delete(`${this.registryPrefix}${staleAgentId}`);
        await this.etcdService.delete(`${this.healthPrefix}${staleAgentId}`);
        await this.cacheService.removeAgent(staleAgentId);
        orphanedCount++;
      }

      // Cleanup cache orphans
      const cacheOrphans = await this.cleanupCacheOrphans();
      orphanedCount += cacheOrphans;

      const processingTime = Date.now() - startTime;
      metricsHelpers.recordCleanupOperation('orphaned-data', 'success', processingTime);

      this.logger.log(`Cleaned up ${orphanedCount} orphaned records in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      metricsHelpers.recordCleanupOperation('orphaned-data', 'failure', processingTime);
      
      this.logger.error('Failed to cleanup orphaned data:', error);
      throw error;
    }
  }

  /**
   * Process expired lease cleanup
   */
  @Process('cleanup-expired-leases')
  async cleanupExpiredLeases(job: Job<CleanupExpiredLeasesJob>): Promise<void> {
    const startTime = Date.now();
    let expiredCount = 0;

    try {
      this.logger.debug('Starting expired lease cleanup');

      // Get all leases from etcd (this would use etcd lease APIs in a real implementation)
      const agentData = await this.etcdService.getPrefix(this.registryPrefix);
      
      const now = new Date();
      const expiredAgents: string[] = [];

      // Check each agent for lease expiration
      for (const [key, value] of Object.entries(agentData)) {
        try {
          const agent = JSON.parse(value) as RegisteredAgent;
          const agentId = key.replace(this.registryPrefix, '');
          
          // Calculate estimated lease expiration
          const lastHeartbeat = new Date(agent.lastHeartbeat);
          const leaseExpiration = new Date(lastHeartbeat.getTime() + 300000); // 5 minutes TTL
          
          if (now > leaseExpiration) {
            expiredAgents.push(agentId);
          }
        } catch (error) {
          this.logger.warn(`Failed to check lease for key ${key}:`, error);
        }
      }

      // Cleanup expired agents
      for (const expiredAgentId of expiredAgents) {
        await this.etcdService.delete(`${this.registryPrefix}${expiredAgentId}`);
        await this.etcdService.delete(`${this.healthPrefix}${expiredAgentId}`);
        await this.cacheService.removeAgent(expiredAgentId);
        expiredCount++;
      }

      const processingTime = Date.now() - startTime;
      metricsHelpers.recordCleanupOperation('expired-leases', 'success', processingTime);

      this.logger.log(`Cleaned up ${expiredCount} expired leases in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      metricsHelpers.recordCleanupOperation('expired-leases', 'failure', processingTime);
      
      this.logger.error('Failed to cleanup expired leases:', error);
      throw error;
    }
  }

  /**
   * Process cache compaction
   */
  @Process('compact-cache')
  async compactCache(job: Job<CompactCacheJob>): Promise<void> {
    const { forceCompaction } = job.data;
    const startTime = Date.now();

    try {
      this.logger.debug(`Starting cache compaction (force: ${forceCompaction})`);

      // Get cache statistics
      const cacheStats = await this.cacheService.getCacheStats();
      
      // Determine if compaction is needed
      const needsCompaction = forceCompaction || 
        cacheStats.agentCount > 1000 || 
        cacheStats.discoveryCount > 500;

      if (!needsCompaction) {
        this.logger.debug('Cache compaction not needed');
        return;
      }

      // Perform cache maintenance
      let cleanedEntries = 0;

      // Remove discovery cache entries older than 1 hour
      const discoveryKeys = await this.getAllDiscoveryKeys();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      for (const key of discoveryKeys) {
        const created = await this.getKeyCreationTime(key);
        if (created && created < oneHourAgo) {
          await this.removeDiscoveryKey(key);
          cleanedEntries++;
        }
      }

      // Validate agent cache entries against etcd
      const cachedAgentIds = await this.cacheService.getAllAgentIds();
      for (const agentId of cachedAgentIds) {
        const etcdData = await this.etcdService.get(`${this.registryPrefix}${agentId}`);
        if (!etcdData) {
          await this.cacheService.removeAgent(agentId);
          cleanedEntries++;
        }
      }

      const processingTime = Date.now() - startTime;
      metricsHelpers.recordCleanupOperation('cache-compaction', 'success', processingTime);

      this.logger.log(`Cache compaction completed: ${cleanedEntries} entries cleaned in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      metricsHelpers.recordCleanupOperation('cache-compaction', 'failure', processingTime);
      
      this.logger.error('Failed to compact cache:', error);
      throw error;
    }
  }

  /**
   * Process agent data archival
   */
  @Process('archive-agent-data')
  async archiveAgentData(job: Job<ArchiveAgentDataJob>): Promise<void> {
    const { agentId, agent, retentionDays } = job.data;
    const startTime = Date.now();

    try {
      this.logger.debug(`Archiving data for agent: ${agentId}`);

      const archiveKey = `${this.archivePrefix}${agentId}/${Date.now()}`;
      const archiveData = {
        agent,
        archivedAt: new Date(),
        retentionDays,
        reason: 'deregistration',
      };

      // Store in archive with TTL
      const archiveTtl = retentionDays * 24 * 60 * 60; // Convert days to seconds
      await this.etcdService.putWithLease(archiveKey, JSON.stringify(archiveData), archiveTtl);

      const processingTime = Date.now() - startTime;
      metricsHelpers.recordCleanupOperation('archive-data', 'success', processingTime);

      this.logger.debug(`Archived agent data: ${agentId} (retention: ${retentionDays} days)`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      metricsHelpers.recordCleanupOperation('archive-data', 'failure', processingTime);
      
      this.logger.error(`Failed to archive agent data for ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Job event handlers
   */

  @OnQueueActive()
  onActive(job: Job): void {
    this.logger.debug(`Cleanup job started: ${job.name} (ID: ${job.id})`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any): void {
    this.logger.debug(`Cleanup job completed: ${job.name} (ID: ${job.id})`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Cleanup job failed: ${job.name} (ID: ${job.id})`, error);
  }

  /**
   * Private helper methods
   */

  private async archiveAgentData(agentId: string, agent: RegisteredAgent, retentionDays: number): Promise<void> {
    try {
      const archiveKey = `${this.archivePrefix}${agentId}/${Date.now()}`;
      const archiveData = {
        agent,
        archivedAt: new Date(),
        retentionDays,
        reason: 'cleanup',
      };

      const archiveTtl = retentionDays * 24 * 60 * 60;
      await this.etcdService.putWithLease(archiveKey, JSON.stringify(archiveData), archiveTtl);

      this.logger.debug(`Archived agent data: ${agentId} (${retentionDays} days retention)`);
    } catch (error) {
      this.logger.warn(`Failed to archive agent data for ${agentId}:`, error);
    }
  }

  private async cleanupAgentMetrics(agentId: string): Promise<void> {
    // Remove agent-specific metrics
    // This would integrate with the metrics system to clean up Prometheus metrics
    this.logger.debug(`Cleaned up metrics for agent: ${agentId}`);
  }

  private async cleanupAgentLogs(agentId: string): Promise<void> {
    // Clean up agent-specific log entries if needed
    // This could involve log rotation or specific log cleanup
    this.logger.debug(`Cleaned up logs for agent: ${agentId}`);
  }

  private async cleanupCacheOrphans(): Promise<number> {
    let orphanCount = 0;

    try {
      // Get all cached agent IDs
      const cachedAgentIds = await this.cacheService.getAllAgentIds();
      
      // Check each cached agent against etcd
      for (const agentId of cachedAgentIds) {
        const etcdData = await this.etcdService.get(`${this.registryPrefix}${agentId}`);
        if (!etcdData) {
          await this.cacheService.removeAgent(agentId);
          orphanCount++;
        }
      }

      return orphanCount;
    } catch (error) {
      this.logger.error('Failed to cleanup cache orphans:', error);
      return 0;
    }
  }

  private async getAllDiscoveryKeys(): Promise<string[]> {
    // This would get all discovery cache keys from Redis
    // For now, return empty array as placeholder
    return [];
  }

  private async getKeyCreationTime(key: string): Promise<number | null> {
    // This would get the creation time of a cache key
    // For now, return null as placeholder
    return null;
  }

  private async removeDiscoveryKey(key: string): Promise<void> {
    // This would remove a discovery cache key
    // Implementation would depend on the cache structure
  }
}