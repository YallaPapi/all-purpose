/**
 * Registry Cache Service
 * 
 * Redis-based caching service for UEP agent registry data.
 * Provides fast access to frequently requested agent information
 * and reduces load on etcd storage.
 */

import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RegisteredAgent } from './dto/registry.dto';
import { metricsHelpers } from '../monitoring/prometheus.setup';

@Injectable()
export class RegistryCacheService {
  private readonly logger = new Logger(RegistryCacheService.name);
  private redis: Redis;
  private readonly keyPrefix = 'uep:registry:';
  private defaultTtl: number;
  private initialized = false;

  constructor(
    @Optional() private readonly configService?: ConfigService,
  ) {
    // DEBUG: Enhanced ConfigService validation
    console.log('🔍 RegistryCacheService constructor - ConfigService:', {
      exists: !!this.configService,
      type: typeof this.configService,
      hasGet: typeof this.configService?.get === 'function',
      constructor: this.configService?.constructor?.name,
    });
    
    if (!this.configService) {
      console.warn('⚠️  ConfigService not available - using environment variables and defaults');
      // Don't throw error - use fallback initialization
    } else if (typeof this.configService.get !== 'function') {
      console.error('❌ ConfigService.get method is missing!');
      throw new Error('ConfigService.get method not available - invalid ConfigService instance');
    } else {
      console.log('✅ ConfigService validation passed in RegistryCacheService');
    }
    
    // Defer initialization to avoid potential race conditions
    this.initializeAsync();
  }

  private async initializeAsync(): Promise<void> {
    try {
      // Initialize Redis connection with ConfigService or environment variables
      const redisHost = this.configService?.get<string>('REDIS_HOST') || process.env.REDIS_HOST || 'localhost';
      const redisPort = this.configService?.get<number>('REDIS_PORT') || parseInt(process.env.REDIS_PORT || '6379');
      const redisPassword = this.configService?.get<string>('REDIS_PASSWORD') || process.env.REDIS_PASSWORD;
      const redisDb = this.configService?.get<number>('REDIS_DB') || parseInt(process.env.REDIS_DB || '0');

      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        db: redisDb,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        keyPrefix: this.keyPrefix,
        retryStrategy: (times: number) => {
          const delay = Math.min(100 + times * 2, 2000);
          return delay;
        },
      });

      this.defaultTtl = this.configService?.get<number>('DISCOVERY_CACHE_TTL_SECONDS') || parseInt(process.env.DISCOVERY_CACHE_TTL_SECONDS || '60');

      // Redis event handlers
      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis cache');
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis cache error:', error);
      });

      this.redis.on('ready', () => {
        this.logger.log('Redis cache ready');
        this.initialized = true;
      });

      this.redis.on('close', () => {
        this.logger.warn('Redis cache connection closed');
        this.initialized = false;
      });

      this.redis.on('reconnecting', () => {
        this.logger.log('Redis cache reconnecting...');
      });

      this.logger.log('RegistryCacheService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RegistryCacheService:', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      // Wait a bit for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!this.initialized) {
        throw new Error('RegistryCacheService not properly initialized');
      }
    }
  }

  /**
   * Cache an agent
   */
  async setAgent(agentId: string, agent: RegisteredAgent, ttl?: number): Promise<void> {
    try {
      await this.ensureInitialized();
      
      const key = `agent:${agentId}`;
      const value = JSON.stringify(agent);
      const cacheTtl = ttl || this.defaultTtl;

      await this.redis.setex(key, cacheTtl, value);
      
      // Also cache by type for quick type-based queries
      await this.addToTypeSet(agent.type, agentId, cacheTtl);
      
      // Cache capabilities for discovery
      await this.cacheAgentCapabilities(agentId, agent.capabilities, cacheTtl);

      this.logger.debug(`Cached agent: ${agentId} (TTL: ${cacheTtl}s)`);
      metricsHelpers.setCacheSize('agent', await this.getAgentCacheSize());

    } catch (error) {
      this.logger.error(`Failed to cache agent ${agentId}:`, error);
    }
  }

  /**
   * Get agent from cache
   */
  async getAgent(agentId: string): Promise<RegisteredAgent | null> {
    try {
      const key = `agent:${agentId}`;
      const value = await this.redis.get(key);

      if (!value) {
        return null;
      }

      const agent = JSON.parse(value) as RegisteredAgent;
      
      // Convert date strings back to Date objects
      agent.registeredAt = new Date(agent.registeredAt);
      agent.lastHeartbeat = new Date(agent.lastHeartbeat);
      agent.health.lastChecked = agent.health.lastChecked ? new Date(agent.health.lastChecked) : undefined;
      agent.metadata.lastUpdated = new Date(agent.metadata.lastUpdated);

      this.logger.debug(`Retrieved agent from cache: ${agentId}`);
      return agent;

    } catch (error) {
      this.logger.error(`Failed to get agent ${agentId} from cache:`, error);
      return null;
    }
  }

  /**
   * Remove agent from cache
   */
  async removeAgent(agentId: string): Promise<void> {
    try {
      // Get agent data first to remove from type sets
      const agent = await this.getAgent(agentId);
      
      const key = `agent:${agentId}`;
      await this.redis.del(key);

      if (agent) {
        // Remove from type set
        await this.removeFromTypeSet(agent.type, agentId);
        
        // Remove capabilities cache
        await this.removeAgentCapabilities(agentId);
      }

      this.logger.debug(`Removed agent from cache: ${agentId}`);
      metricsHelpers.setCacheSize('agent', await this.getAgentCacheSize());

    } catch (error) {
      this.logger.error(`Failed to remove agent ${agentId} from cache:`, error);
    }
  }

  /**
   * Get agents by type from cache
   */
  async getAgentsByType(type: 'meta' | 'domain' | 'system'): Promise<string[]> {
    try {
      const key = `type:${type}`;
      const agentIds = await this.redis.smembers(key);
      
      this.logger.debug(`Retrieved ${agentIds.length} agents of type ${type} from cache`);
      return agentIds;

    } catch (error) {
      this.logger.error(`Failed to get agents by type ${type} from cache:`, error);
      return [];
    }
  }

  /**
   * Search agents by capability
   */
  async getAgentsByCapability(capability: string): Promise<string[]> {
    try {
      const key = `capability:${capability}`;
      const agentIds = await this.redis.smembers(key);
      
      this.logger.debug(`Found ${agentIds.length} agents with capability ${capability}`);
      return agentIds;

    } catch (error) {
      this.logger.error(`Failed to search agents by capability ${capability}:`, error);
      return [];
    }
  }

  /**
   * Get all cached agent IDs
   */
  async getAllAgentIds(): Promise<string[]> {
    try {
      const pattern = `${this.keyPrefix}agent:*`;
      const keys = await this.redis.keys(pattern);
      
      // Extract agent IDs from keys
      const agentIds = keys.map(key => 
        key.replace(`${this.keyPrefix}agent:`, '')
      );

      return agentIds;

    } catch (error) {
      this.logger.error('Failed to get all agent IDs from cache:', error);
      return [];
    }
  }

  /**
   * Cache discovery query result
   */
  async cacheDiscoveryResult(
    queryKey: string, 
    result: any, 
    ttl?: number
  ): Promise<void> {
    try {
      const key = `discovery:${queryKey}`;
      const value = JSON.stringify(result);
      const cacheTtl = ttl || this.defaultTtl;

      await this.redis.setex(key, cacheTtl, value);
      
      this.logger.debug(`Cached discovery result: ${queryKey} (TTL: ${cacheTtl}s)`);
      metricsHelpers.setCacheSize('discovery', await this.getDiscoveryCacheSize());

    } catch (error) {
      this.logger.error(`Failed to cache discovery result ${queryKey}:`, error);
    }
  }

  /**
   * Get cached discovery result
   */
  async getCachedDiscoveryResult(queryKey: string): Promise<any | null> {
    try {
      const key = `discovery:${queryKey}`;
      const value = await this.redis.get(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value);

    } catch (error) {
      this.logger.error(`Failed to get cached discovery result ${queryKey}:`, error);
      return null;
    }
  }

  /**
   * Invalidate all cached data
   */
  async invalidateAll(): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cache entries`);
      }

    } catch (error) {
      this.logger.error('Failed to invalidate cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    agentCount: number;
    discoveryCount: number;
    typeCount: Record<string, number>;
    capabilityCount: number;
    memoryUsage: string;
  }> {
    try {
      const [
        agentCount,
        discoveryCount,
        memoryInfo,
        metaAgents,
        domainAgents,
        systemAgents,
        capabilityKeys,
      ] = await Promise.all([
        this.getAgentCacheSize(),
        this.getDiscoveryCacheSize(),
        this.redis.memory('USAGE', `${this.keyPrefix}*`),
        this.redis.scard(`type:meta`),
        this.redis.scard(`type:domain`),
        this.redis.scard(`type:system`),
        this.redis.keys(`${this.keyPrefix}capability:*`),
      ]);

      return {
        agentCount,
        discoveryCount,
        typeCount: {
          meta: metaAgents,
          domain: domainAgents,
          system: systemAgents,
        },
        capabilityCount: capabilityKeys.length,
        memoryUsage: this.formatBytes(memoryInfo as number),
      };

    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return {
        agentCount: 0,
        discoveryCount: 0,
        typeCount: { meta: 0, domain: 0, system: 0 },
        capabilityCount: 0,
        memoryUsage: '0 B',
      };
    }
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const testKey = `health:${Date.now()}`;
      const testValue = 'health-check';

      // Test write
      await this.redis.set(testKey, testValue, 'EX', 10);
      
      // Test read
      const retrievedValue = await this.redis.get(testKey);
      
      // Test delete
      await this.redis.del(testKey);

      const latency = Date.now() - startTime;

      if (retrievedValue === testValue) {
        return { healthy: true, latency };
      } else {
        return { healthy: false, latency, error: 'Read/write test failed' };
      }

    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    this.logger.log('Redis cache connection closed');
  }

  /**
   * Private helper methods
   */

  private async addToTypeSet(type: string, agentId: string, ttl: number): Promise<void> {
    const key = `type:${type}`;
    await this.redis.sadd(key, agentId);
    await this.redis.expire(key, ttl);
  }

  private async removeFromTypeSet(type: string, agentId: string): Promise<void> {
    const key = `type:${type}`;
    await this.redis.srem(key, agentId);
  }

  private async cacheAgentCapabilities(
    agentId: string, 
    capabilities: any[], 
    ttl: number
  ): Promise<void> {
    for (const capability of capabilities) {
      const key = `capability:${capability.name}`;
      await this.redis.sadd(key, agentId);
      await this.redis.expire(key, ttl);
    }
  }

  private async removeAgentCapabilities(agentId: string): Promise<void> {
    // Get agent to find its capabilities
    const agent = await this.getAgent(agentId);
    if (agent) {
      for (const capability of agent.capabilities) {
        const key = `capability:${capability.name}`;
        await this.redis.srem(key, agentId);
      }
    }
  }

  private async getAgentCacheSize(): Promise<number> {
    const keys = await this.redis.keys(`${this.keyPrefix}agent:*`);
    return keys.length;
  }

  private async getDiscoveryCacheSize(): Promise<number> {
    const keys = await this.redis.keys(`${this.keyPrefix}discovery:*`);
    return keys.length;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}