#!/usr/bin/env node

/**
 * UEP Example Agent Implementation
 * 
 * This example demonstrates how to implement a UEP agent that works
 * with the base agent Dockerfile template. It includes:
 * 
 * - Health check endpoint
 * - Metrics endpoint  
 * - Graceful shutdown handling
 * - Structured logging
 * - Environment configuration
 * - Signal handling
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import winston from 'winston';
import promClient from 'prom-client';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config();

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  // Agent identification
  AGENT_TYPE: process.env.AGENT_TYPE || 'example-agent',
  AGENT_NAME: process.env.AGENT_NAME || 'UEP Example Agent',
  AGENT_VERSION: process.env.AGENT_VERSION || '1.0.0',
  AGENT_ID: process.env.AGENT_ID || uuidv4(),
  
  // Server configuration
  PORT: parseInt(process.env.SERVICE_PORT || process.env.PORT || '3000'),
  HOST: process.env.HOST || '0.0.0.0',
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'production',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Timeouts
  SHUTDOWN_TIMEOUT: parseInt(process.env.SHUTDOWN_TIMEOUT || '30000'),
  STARTUP_TIMEOUT: parseInt(process.env.STARTUP_TIMEOUT || '60000'),
  
  // Health check configuration
  HEALTH_CHECK_PATH: process.env.HEALTH_CHECK_PATH || '/health',
  METRICS_PATH: process.env.METRICS_PATH || '/metrics'
};

// =============================================================================
// Logging Setup
// =============================================================================

const logger = winston.createLogger({
  level: CONFIG.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    agent_type: CONFIG.AGENT_TYPE,
    agent_id: CONFIG.AGENT_ID,
    agent_version: CONFIG.AGENT_VERSION
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// =============================================================================
// Metrics Setup
// =============================================================================

// Create a Registry to register the metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'agent_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'agent_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const agentTasksProcessed = new promClient.Counter({
  name: 'agent_tasks_processed_total',
  help: 'Total number of tasks processed by the agent',
  labelNames: ['task_type', 'status']
});

const agentUptime = new promClient.Gauge({
  name: 'agent_uptime_seconds',
  help: 'Agent uptime in seconds'
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(agentTasksProcessed);
register.registerMetric(agentUptime);

// Update uptime metric every 10 seconds
setInterval(() => {
  agentUptime.set(Math.floor(process.uptime()));
}, 10000);

// =============================================================================
// Express App Setup
// =============================================================================

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || false,
  credentials: true
}));

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim(), { component: 'http' })
  }
}));

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
});

// =============================================================================
// Routes
// =============================================================================

// Health check endpoint (required by Dockerfile template)
app.get(CONFIG.HEALTH_CHECK_PATH, (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    version: CONFIG.AGENT_VERSION,
    agent: {
      id: CONFIG.AGENT_ID,
      type: CONFIG.AGENT_TYPE,
      name: CONFIG.AGENT_NAME
    },
    environment: CONFIG.NODE_ENV,
    nodejs: process.version,
    pid: process.pid
  };
  
  res.json(health);
});

// Metrics endpoint (required by Dockerfile template)
app.get(CONFIG.METRICS_PATH, async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    agent: {
      id: CONFIG.AGENT_ID,
      type: CONFIG.AGENT_TYPE,
      name: CONFIG.AGENT_NAME,
      version: CONFIG.AGENT_VERSION
    },
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    endpoints: {
      health: CONFIG.HEALTH_CHECK_PATH,
      metrics: CONFIG.METRICS_PATH,
      api: '/api'
    }
  });
});

// Example API endpoint
app.get('/api/status', (req, res) => {
  // Simulate some processing
  const taskType = 'status_check';
  agentTasksProcessed.labels(taskType, 'success').inc();
  
  res.json({
    message: 'Agent is functioning correctly',
    processed_at: new Date().toISOString(),
    request_id: req.headers['x-request-id'] || uuidv4()
  });
});

// Example task processing endpoint
app.post('/api/process', (req, res) => {
  try {
    const { task, data } = req.body;
    
    logger.info('Processing task', { task, data_keys: Object.keys(data || {}) });
    
    // Simulate task processing
    const result = {
      task_id: uuidv4(),
      task_type: task || 'unknown',
      status: 'completed',
      processed_at: new Date().toISOString(),
      result: {
        message: 'Task processed successfully',
        data: data || {}
      }
    };
    
    // Update metrics
    agentTasksProcessed.labels(task || 'unknown', 'success').inc();
    
    res.json(result);
    
  } catch (error) {
    logger.error('Error processing task', { error: error.message });
    agentTasksProcessed.labels('unknown', 'error').inc();
    res.status(500).json({ error: 'Task processing failed' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method
  });
  
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: CONFIG.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// Server Management
// =============================================================================

let server;
let isShuttingDown = false;

// Graceful shutdown function
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal', { signal });
    return;
  }
  
  isShuttingDown = true;
  logger.info('Graceful shutdown initiated', { signal });
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Set shutdown timeout
  const shutdownTimer = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, CONFIG.SHUTDOWN_TIMEOUT);
  
  try {
    // Perform cleanup operations
    logger.info('Performing cleanup operations...');
    
    // Clear metrics intervals
    register.clear();
    
    // Any other cleanup operations go here
    // e.g., close database connections, save state, etc.
    
    logger.info('Cleanup completed successfully');
    clearTimeout(shutdownTimer);
    process.exit(0);
    
  } catch (error) {
    logger.error('Error during cleanup', { error: error.message });
    clearTimeout(shutdownTimer);
    process.exit(1);
  }
}

// Signal handlers (works with Dockerfile template signal handling)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

// =============================================================================
// Server Startup
// =============================================================================

async function startServer() {
  try {
    // Set startup timeout
    const startupTimer = setTimeout(() => {
      logger.error('Startup timeout exceeded', { timeout: CONFIG.STARTUP_TIMEOUT });
      process.exit(1);
    }, CONFIG.STARTUP_TIMEOUT);
    
    // Start the server
    server = app.listen(CONFIG.PORT, CONFIG.HOST, () => {
      clearTimeout(startupTimer);
      
      logger.info('Agent started successfully', {
        agent_type: CONFIG.AGENT_TYPE,
        agent_name: CONFIG.AGENT_NAME,
        agent_version: CONFIG.AGENT_VERSION,
        agent_id: CONFIG.AGENT_ID,
        port: CONFIG.PORT,
        host: CONFIG.HOST,
        environment: CONFIG.NODE_ENV,
        node_version: process.version,
        pid: process.pid,
        endpoints: {
          health: CONFIG.HEALTH_CHECK_PATH,
          metrics: CONFIG.METRICS_PATH
        }
      });
    });
    
    server.on('error', (error) => {
      logger.error('Server error', { error: error.message });
      clearTimeout(startupTimer);
      process.exit(1);
    });
    
  } catch (error) {
    logger.error('Failed to start agent', { error: error.message });
    process.exit(1);
  }
}

// Start the agent if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;