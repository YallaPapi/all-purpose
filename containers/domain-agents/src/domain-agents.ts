import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config/environment.js';
import { DomainAgentManager } from './core/DomainAgentManager.js';
import { HealthCheckService } from './services/HealthCheckService.js';
import { MetricsService } from './services/MetricsService.js';
import { Logger } from './utils/Logger.js';

const app = express();
const server = createServer(app);
const logger = new Logger('domain-agents');

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP'
});
app.use(limiter);

const domainManager = new DomainAgentManager();
const healthService = new HealthCheckService();
const metricsService = new MetricsService();

app.get('/health', (req, res) => {
  const health = healthService.getHealthStatus();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/metrics', (req, res) => {
  const metrics = metricsService.getPrometheusMetrics();
  res.set('Content-Type', 'text/plain').send(metrics);
});

app.get('/api/agents/domains', async (req, res) => {
  try {
    const agents = await domainManager.getAvailableDomains();
    res.json({ success: true, data: agents });
  } catch (error) {
    logger.error('Failed to get domain agents:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/agents/domains/:domain/execute', async (req, res) => {
  try {
    const { domain } = req.params;
    const { task } = req.body;
    const result = await domainManager.executeTask(domain, task);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Domain agent execution failed:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/agents/domains/:domain/analyze', async (req, res) => {
  try {
    const { domain } = req.params;
    const { data } = req.body;
    const analysis = await domainManager.analyzeDomain(domain, data);
    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error('Domain analysis failed:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/agents/domains/:domain/status', async (req, res) => {
  try {
    const { domain } = req.params;
    const status = await domainManager.getDomainStatus(domain);
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Failed to get domain status:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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

server.listen(config.port, () => {
  logger.info(`Domain Agents server running on port ${config.port}`);
  logger.info('Available Domain Agents:', domainManager.listDomains());
});