import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { AgentRegistryManager } from './core/AgentRegistryManager';
import { DatabaseConnection } from './database/DatabaseConnection';
import { RedisClient } from './cache/RedisClient';
import { ConsulClient } from './discovery/ConsulClient';
import { HealthCheckService } from './services/HealthCheckService';
import { MetricsService } from './services/MetricsService';
import { Logger } from './utils/Logger';

dotenv.config();

class AgentRegistryService {
  private app: express.Application;
  private server: any;
  private registryManager: AgentRegistryManager;
  private database: DatabaseConnection;
  private redis: RedisClient;
  private consul: ConsulClient;
  private healthCheck: HealthCheckService;
  private metrics: MetricsService;
  private logger: Logger;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3010');
    this.logger = new Logger('AgentRegistryService');
    
    this.initializeDatabase();
    this.initializeCache();
    this.initializeServiceDiscovery();
    this.initializeServices();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandlers();
  }

  private async initializeDatabase(): Promise<void> {
    this.database = new DatabaseConnection({
      host: process.env.DB_HOST || 'postgres-registry',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'agent_registry',
      user: process.env.DB_USER || 'registry_user',
      password: process.env.DB_PASSWORD || 'registry_password'
    });
    await this.database.connect();
  }

  private async initializeCache(): Promise<void> {
    this.redis = new RedisClient({
      host: process.env.REDIS_HOST || 'redis-registry',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
    await this.redis.connect();
  }

  private async initializeServiceDiscovery(): Promise<void> {
    this.consul = new ConsulClient({
      host: process.env.CONSUL_HOST || 'consul',
      port: parseInt(process.env.CONSUL_PORT || '8500'),
      secure: process.env.CONSUL_SECURE === 'true'
    });
    await this.consul.connect();
  }

  private initializeServices(): void {
    this.registryManager = new AgentRegistryManager(this.database, this.redis, this.consul);
    this.healthCheck = new HealthCheckService(this.database, this.redis, this.consul);
    this.metrics = new MetricsService();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use(limiter);

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message: string) => this.logger.info(message.trim()) }
    }));

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.requestId = req.headers['x-request-id'] as string || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.healthCheck.getHealthStatus();
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
      } catch (error) {
        this.logger.error('Health check failed', error);
        res.status(503).json({ status: 'unhealthy', error: error.message });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        const metrics = await this.metrics.getMetrics();
        res.json(metrics);
      } catch (error) {
        this.logger.error('Metrics collection failed', error);
        res.status(500).json({ error: 'Failed to collect metrics' });
      }
    });

    // Agent registration
    this.app.post('/api/agents/register', async (req, res) => {
      try {
        const agentInfo = req.body;
        const result = await this.registryManager.registerAgent(agentInfo);
        this.logger.info(`Agent registered: ${agentInfo.id}`, { requestId: req.requestId });
        res.status(201).json(result);
      } catch (error) {
        this.logger.error('Agent registration failed', error, { requestId: req.requestId });
        res.status(400).json({ error: error.message });
      }
    });

    // Agent deregistration
    this.app.delete('/api/agents/:agentId', async (req, res) => {
      try {
        const { agentId } = req.params;
        await this.registryManager.deregisterAgent(agentId);
        this.logger.info(`Agent deregistered: ${agentId}`, { requestId: req.requestId });
        res.status(204).send();
      } catch (error) {
        this.logger.error('Agent deregistration failed', error, { requestId: req.requestId });
        res.status(400).json({ error: error.message });
      }
    });

    // Get agent info
    this.app.get('/api/agents/:agentId', async (req, res) => {
      try {
        const { agentId } = req.params;
        const agent = await this.registryManager.getAgent(agentId);
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
        res.json(agent);
      } catch (error) {
        this.logger.error('Get agent failed', error, { requestId: req.requestId });
        res.status(500).json({ error: error.message });
      }
    });

    // List all agents
    this.app.get('/api/agents', async (req, res) => {
      try {
        const { type, status, limit, offset } = req.query;
        const filters = {
          type: type as string,
          status: status as string,
          limit: parseInt(limit as string) || 50,
          offset: parseInt(offset as string) || 0
        };
        const agents = await this.registryManager.listAgents(filters);
        res.json(agents);
      } catch (error) {
        this.logger.error('List agents failed', error, { requestId: req.requestId });
        res.status(500).json({ error: error.message });
      }
    });

    // Update agent status
    this.app.patch('/api/agents/:agentId/status', async (req, res) => {
      try {
        const { agentId } = req.params;
        const { status, metadata } = req.body;
        await this.registryManager.updateAgentStatus(agentId, status, metadata);
        this.logger.info(`Agent status updated: ${agentId} -> ${status}`, { requestId: req.requestId });
        res.status(200).json({ success: true });
      } catch (error) {
        this.logger.error('Update agent status failed', error, { requestId: req.requestId });
        res.status(400).json({ error: error.message });
      }
    });

    // Service discovery - find agents by capability
    this.app.get('/api/discovery/capabilities/:capability', async (req, res) => {
      try {
        const { capability } = req.params;
        const agents = await this.registryManager.findAgentsByCapability(capability);
        res.json(agents);
      } catch (error) {
        this.logger.error('Service discovery failed', error, { requestId: req.requestId });
        res.status(500).json({ error: error.message });
      }
    });

    // Agent heartbeat
    this.app.post('/api/agents/:agentId/heartbeat', async (req, res) => {
      try {
        const { agentId } = req.params;
        const { metadata } = req.body;
        await this.registryManager.recordHeartbeat(agentId, metadata);
        res.status(200).json({ success: true });
      } catch (error) {
        this.logger.error('Heartbeat failed', error, { requestId: req.requestId });
        res.status(400).json({ error: error.message });
      }
    });

    // Registry statistics
    this.app.get('/api/registry/stats', async (req, res) => {
      try {
        const stats = await this.registryManager.getRegistryStats();
        res.json(stats);
      } catch (error) {
        this.logger.error('Get registry stats failed', error, { requestId: req.requestId });
        res.status(500).json({ error: error.message });
      }
    });
  }

  private initializeErrorHandlers(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error', error, { requestId: req.requestId });
      
      res.status(error.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    });
  }

  public async start(): Promise<void> {
    try {
      this.server = this.app.listen(this.port, () => {
        this.logger.info(`Agent Registry Service started on port ${this.port}`);
      });

      // Register this service with Consul
      await this.consul.registerService({
        name: 'agent-registry-service',
        id: `agent-registry-${process.env.HOSTNAME || 'localhost'}`,
        address: process.env.SERVICE_HOST || 'localhost',
        port: this.port,
        check: {
          http: `http://${process.env.SERVICE_HOST || 'localhost'}:${this.port}/health`,
          interval: '10s',
          timeout: '5s'
        },
        tags: ['agent-registry', 'microservice', 'meta-agent-factory']
      });

      // Graceful shutdown handlers
      process.on('SIGTERM', () => this.shutdown('SIGTERM'));
      process.on('SIGINT', () => this.shutdown('SIGINT'));
      process.on('uncaughtException', (error) => {
        this.logger.error('Uncaught exception', error);
        this.shutdown('uncaughtException');
      });
      process.on('unhandledRejection', (reason, promise) => {
        this.logger.error('Unhandled rejection', { reason, promise });
        this.shutdown('unhandledRejection');
      });

    } catch (error) {
      this.logger.error('Failed to start Agent Registry Service', error);
      process.exit(1);
    }
  }

  private async shutdown(signal: string): Promise<void> {
    this.logger.info(`Received ${signal}, starting graceful shutdown`);

    if (this.server) {
      this.server.close(async () => {
        this.logger.info('HTTP server closed');

        try {
          // Deregister from Consul
          await this.consul.deregisterService(`agent-registry-${process.env.HOSTNAME || 'localhost'}`);
          
          // Close database connections
          await this.database.disconnect();
          await this.redis.disconnect();
          
          this.logger.info('All connections closed, exiting');
          process.exit(0);
        } catch (error) {
          this.logger.error('Error during shutdown', error);
          process.exit(1);
        }
      });
    } else {
      process.exit(0);
    }
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

// Start the service
const service = new AgentRegistryService();
service.start().catch((error) => {
  console.error('Failed to start Agent Registry Service:', error);
  process.exit(1);
});