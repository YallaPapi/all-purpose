import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config/environment.js';
import { MetaAgentFactory } from './core/MetaAgentFactory.js';
import { HealthCheckService } from './services/HealthCheckService.js';
import { AuthService } from './services/AuthService.js';
import { MetricsService } from './services/MetricsService.js';
import { Logger } from './utils/Logger.js';
import { EventBus } from '../../../shared/messaging/EventBus.js';

const app = express();
const server = createServer(app);
const logger = new Logger('factory-core');

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP'
});
app.use(limiter);

const eventBus = new EventBus(config.nats.url);
const metaAgentFactory = new MetaAgentFactory(eventBus);
const healthService = new HealthCheckService();
const authService = new AuthService();
const metricsService = new MetricsService();

app.get('/health', (req, res) => {
  const health = healthService.getHealthStatus();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/metrics', (req, res) => {
  const metrics = metricsService.getPrometheusMetrics();
  res.set('Content-Type', 'text/plain').send(metrics);
});

app.post('/auth/validate', authService.validateToken.bind(authService));

app.post('/api/factory/meta-agents', async (req, res) => {
  try {
    const { agentType, config: agentConfig } = req.body;
    const result = await metaAgentFactory.createMetaAgent(agentType, agentConfig);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Meta-agent creation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/factory/meta-agents', async (req, res) => {
  try {
    const agents = await metaAgentFactory.listActiveAgents();
    res.json({ success: true, data: agents });
  } catch (error) {
    logger.error('Failed to list meta-agents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/factory/meta-agents/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { task } = req.body;
    const result = await metaAgentFactory.executeAgentTask(id, task);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Meta-agent execution failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const gracefulShutdown = () => {
  logger.info('Received shutdown signal, gracefully closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(config.port, async () => {
  logger.info(`Factory Core server running on port ${config.port}`);
  logger.info('Available Meta-Agents:', metaAgentFactory.getAvailableAgentTypes());
  
  // Initialize EventBus
  try {
    await eventBus.connect();
    logger.info('✅ EventBus connected successfully');
    
    // Set up event subscriptions
    await eventBus.subscribe('factory.task.assigned', async (message) => {
      logger.info('📋 Task assigned:', message.data);
      metricsService.incrementCounter('factory_tasks_assigned_total');
    });

    await eventBus.subscribe('meta.agent.created', async (message) => {
      logger.info('🤖 Meta-agent created:', message.data);
      metricsService.incrementCounter('factory_agents_created_total');
    });

  } catch (error) {
    logger.error('❌ EventBus connection failed:', error);
  }
});