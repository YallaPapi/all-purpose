import { DatabaseConnection } from '../database/DatabaseConnection';
import { RedisClient } from '../cache/RedisClient';
import { ConsulClient } from '../discovery/ConsulClient';
import { Logger } from '../utils/Logger';
import { v4 as uuidv4 } from 'uuid';

export interface AgentInfo {
  id: string;
  name: string;
  type: 'backend' | 'frontend' | 'devops' | 'qa' | 'documentation' | 'integration' | 'orchestration';
  version: string;
  capabilities: string[];
  endpoint: string;
  status: 'starting' | 'ready' | 'busy' | 'error' | 'stopping';
  metadata: {
    [key: string]: any;
  };
  registeredAt: Date;
  lastHeartbeat: Date;
  tags: string[];
}

export interface AgentFilters {
  type?: string;
  status?: string;
  capability?: string;
  limit?: number;
  offset?: number;
}

export interface RegistryStats {
  totalAgents: number;
  agentsByType: { [type: string]: number };
  agentsByStatus: { [status: string]: number };
  averageResponseTime: number;
  uptime: number;
}

export class AgentRegistryManager {
  private logger: Logger;
  private heartbeatInterval: NodeJS.Timeout;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private database: DatabaseConnection,
    private redis: RedisClient,
    private consul: ConsulClient
  ) {
    this.logger = new Logger('AgentRegistryManager');
    this.startBackgroundTasks();
  }

  async registerAgent(agentInfo: Partial<AgentInfo>): Promise<AgentInfo> {
    try {
      // Validate required fields
      if (!agentInfo.name || !agentInfo.type || !agentInfo.endpoint) {
        throw new Error('Missing required fields: name, type, and endpoint are required');
      }

      // Generate ID if not provided
      const id = agentInfo.id || uuidv4();

      // Check if agent already exists
      const existingAgent = await this.getAgent(id);
      if (existingAgent) {
        throw new Error(`Agent with ID ${id} already exists`);
      }

      const agent: AgentInfo = {
        id,
        name: agentInfo.name,
        type: agentInfo.type as AgentInfo['type'],
        version: agentInfo.version || '1.0.0',
        capabilities: agentInfo.capabilities || [],
        endpoint: agentInfo.endpoint,
        status: 'starting',
        metadata: agentInfo.metadata || {},
        registeredAt: new Date(),
        lastHeartbeat: new Date(),
        tags: agentInfo.tags || []
      };

      // Store in database
      await this.database.query(
        `INSERT INTO agents (id, name, type, version, capabilities, endpoint, status, metadata, registered_at, last_heartbeat, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          agent.id,
          agent.name,
          agent.type,
          agent.version,
          JSON.stringify(agent.capabilities),
          agent.endpoint,
          agent.status,
          JSON.stringify(agent.metadata),
          agent.registeredAt,
          agent.lastHeartbeat,
          JSON.stringify(agent.tags)
        ]
      );

      // Cache in Redis
      await this.redis.setex(`agent:${agent.id}`, 3600, JSON.stringify(agent));

      // Register with Consul for service discovery
      await this.consul.registerService({
        name: `meta-agent-${agent.type}`,
        id: agent.id,
        address: this.extractHostFromEndpoint(agent.endpoint),
        port: this.extractPortFromEndpoint(agent.endpoint),
        check: {
          http: `${agent.endpoint}/health`,
          interval: '30s',
          timeout: '10s'
        },
        tags: [...agent.tags, agent.type, 'meta-agent', ...agent.capabilities],
        meta: {
          version: agent.version,
          type: agent.type,
          capabilities: agent.capabilities.join(',')
        }
      });

      // Add to capability indices
      for (const capability of agent.capabilities) {
        await this.redis.sadd(`capability:${capability}`, agent.id);
      }

      // Add to type index
      await this.redis.sadd(`type:${agent.type}`, agent.id);

      this.logger.info(`Agent registered successfully: ${agent.id}`, { agent });
      return agent;

    } catch (error) {
      this.logger.error('Failed to register agent', error);
      throw error;
    }
  }

  async deregisterAgent(agentId: string): Promise<void> {
    try {
      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Remove from database
      await this.database.query('DELETE FROM agents WHERE id = $1', [agentId]);

      // Remove from Redis cache
      await this.redis.del(`agent:${agentId}`);

      // Remove from Consul
      await this.consul.deregisterService(agentId);

      // Remove from capability indices
      for (const capability of agent.capabilities) {
        await this.redis.srem(`capability:${capability}`, agentId);
      }

      // Remove from type index
      await this.redis.srem(`type:${agent.type}`, agentId);

      this.logger.info(`Agent deregistered successfully: ${agentId}`);

    } catch (error) {
      this.logger.error('Failed to deregister agent', error, { agentId });
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<AgentInfo | null> {
    try {
      // Try cache first
      const cached = await this.redis.get(`agent:${agentId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fall back to database
      const result = await this.database.query(
        'SELECT * FROM agents WHERE id = $1',
        [agentId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const agent: AgentInfo = {
        id: row.id,
        name: row.name,
        type: row.type,
        version: row.version,
        capabilities: JSON.parse(row.capabilities),
        endpoint: row.endpoint,
        status: row.status,
        metadata: JSON.parse(row.metadata),
        registeredAt: row.registered_at,
        lastHeartbeat: row.last_heartbeat,
        tags: JSON.parse(row.tags)
      };

      // Cache for future requests
      await this.redis.setex(`agent:${agentId}`, 3600, JSON.stringify(agent));

      return agent;

    } catch (error) {
      this.logger.error('Failed to get agent', error, { agentId });
      throw error;
    }
  }

  async listAgents(filters: AgentFilters = {}): Promise<{
    agents: AgentInfo[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      const { type, status, limit = 50, offset = 0 } = filters;
      
      let whereClause = '';
      const params: any[] = [];
      let paramIndex = 1;

      if (type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM agents WHERE 1=1 ${whereClause}`;
      const countResult = await this.database.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get agents with pagination
      const query = `
        SELECT * FROM agents 
        WHERE 1=1 ${whereClause}
        ORDER BY registered_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await this.database.query(query, params);

      const agents = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        version: row.version,
        capabilities: JSON.parse(row.capabilities),
        endpoint: row.endpoint,
        status: row.status,
        metadata: JSON.parse(row.metadata),
        registeredAt: row.registered_at,
        lastHeartbeat: row.last_heartbeat,
        tags: JSON.parse(row.tags)
      }));

      return { agents, total, limit, offset };

    } catch (error) {
      this.logger.error('Failed to list agents', error, { filters });
      throw error;
    }
  }

  async updateAgentStatus(agentId: string, status: AgentInfo['status'], metadata?: any): Promise<void> {
    try {
      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      const updatedMetadata = metadata ? { ...agent.metadata, ...metadata } : agent.metadata;

      // Update database
      await this.database.query(
        'UPDATE agents SET status = $1, metadata = $2, last_heartbeat = $3 WHERE id = $4',
        [status, JSON.stringify(updatedMetadata), new Date(), agentId]
      );

      // Update cache
      const updatedAgent = { ...agent, status, metadata: updatedMetadata, lastHeartbeat: new Date() };
      await this.redis.setex(`agent:${agentId}`, 3600, JSON.stringify(updatedAgent));

      this.logger.info(`Agent status updated: ${agentId} -> ${status}`);

    } catch (error) {
      this.logger.error('Failed to update agent status', error, { agentId, status });
      throw error;
    }
  }

  async findAgentsByCapability(capability: string): Promise<AgentInfo[]> {
    try {
      // Use Redis set for fast lookup
      const agentIds = await this.redis.smembers(`capability:${capability}`);
      
      const agents: AgentInfo[] = [];
      for (const agentId of agentIds) {
        const agent = await this.getAgent(agentId);
        if (agent && agent.status === 'ready') {
          agents.push(agent);
        }
      }

      // Sort by least recently used (load balancing)
      agents.sort((a, b) => a.lastHeartbeat.getTime() - b.lastHeartbeat.getTime());

      return agents;

    } catch (error) {
      this.logger.error('Failed to find agents by capability', error, { capability });
      throw error;
    }
  }

  async recordHeartbeat(agentId: string, metadata?: any): Promise<void> {
    try {
      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      const updatedMetadata = metadata ? { ...agent.metadata, ...metadata } : agent.metadata;
      const now = new Date();

      // Update database
      await this.database.query(
        'UPDATE agents SET last_heartbeat = $1, metadata = $2 WHERE id = $3',
        [now, JSON.stringify(updatedMetadata), agentId]
      );

      // Update cache
      const updatedAgent = { ...agent, lastHeartbeat: now, metadata: updatedMetadata };
      await this.redis.setex(`agent:${agentId}`, 3600, JSON.stringify(updatedAgent));

    } catch (error) {
      this.logger.error('Failed to record heartbeat', error, { agentId });
      throw error;
    }
  }

  async getRegistryStats(): Promise<RegistryStats> {
    try {
      // Get agent counts by type
      const typeResult = await this.database.query(
        'SELECT type, COUNT(*) as count FROM agents GROUP BY type'
      );
      const agentsByType = typeResult.rows.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count);
        return acc;
      }, {});

      // Get agent counts by status
      const statusResult = await this.database.query(
        'SELECT status, COUNT(*) as count FROM agents GROUP BY status'
      );
      const agentsByStatus = statusResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {});

      // Get total count
      const totalResult = await this.database.query('SELECT COUNT(*) FROM agents');
      const totalAgents = parseInt(totalResult.rows[0].count);

      // Calculate average response time (mock for now)
      const averageResponseTime = 125; // ms

      // Calculate uptime
      const uptime = process.uptime();

      return {
        totalAgents,
        agentsByType,
        agentsByStatus,
        averageResponseTime,
        uptime
      };

    } catch (error) {
      this.logger.error('Failed to get registry stats', error);
      throw error;
    }
  }

  private startBackgroundTasks(): void {
    // Heartbeat monitoring - check for stale agents every 60 seconds
    this.heartbeatInterval = setInterval(async () => {
      try {
        const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
        
        const staleAgents = await this.database.query(
          'SELECT id FROM agents WHERE last_heartbeat < $1 AND status != $2',
          [staleThreshold, 'error']
        );

        for (const row of staleAgents.rows) {
          await this.updateAgentStatus(row.id, 'error', { 
            error: 'Heartbeat timeout',
            lastSeen: staleThreshold 
          });
          this.logger.warn(`Agent marked as error due to stale heartbeat: ${row.id}`);
        }
      } catch (error) {
        this.logger.error('Heartbeat monitoring failed', error);
      }
    }, 60000);

    // Cleanup old entries every hour
    this.cleanupInterval = setInterval(async () => {
      try {
        const cleanupThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
        
        const result = await this.database.query(
          'DELETE FROM agents WHERE status = $1 AND last_heartbeat < $2',
          ['error', cleanupThreshold]
        );

        if (result.rowCount > 0) {
          this.logger.info(`Cleaned up ${result.rowCount} stale agent records`);
        }
      } catch (error) {
        this.logger.error('Cleanup task failed', error);
      }
    }, 3600000);
  }

  private extractHostFromEndpoint(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      return url.hostname;
    } catch {
      return 'localhost';
    }
  }

  private extractPortFromEndpoint(endpoint: string): number {
    try {
      const url = new URL(endpoint);
      return parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80);
    } catch {
      return 3000;
    }
  }

  public stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}