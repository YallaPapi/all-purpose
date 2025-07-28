import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { UEPValidationEngine } from './core/UEPValidationEngine.js';
import { UEPProtocolProcessor } from './core/UEPProtocolProcessor.js';
import { UEPEnforcementEngine } from './core/UEPEnforcementEngine.js';
import { EventBus } from '../../../shared/messaging/EventBus.js';
import { Logger } from './utils/Logger.js';
import { config } from './config/environment.js';

const app = express();
const server = createServer(app);
const logger = new Logger('uep-service');

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const eventBus = new EventBus(config.nats.url);
const validationEngine = new UEPValidationEngine();
const protocolProcessor = new UEPProtocolProcessor();
const enforcementEngine = new UEPEnforcementEngine(eventBus);

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    uep: {
      validation: validationEngine.getStatus(),
      enforcement: enforcementEngine.getStatus(),
      eventBus: eventBus.isConnected_()
    }
  });
});

// UEP Validation Endpoint (for Traefik ForwardAuth)
app.post('/validate', async (req, res) => {
  try {
    const { method, path, headers, body } = req.body;
    
    const validation = await validationEngine.validateRequest({
      method,
      path,
      headers,
      body
    });

    if (validation.valid) {
      res.status(200).json({
        valid: true,
        protocol: validation.protocol,
        metadata: validation.metadata
      });
    } else {
      res.status(403).json({
        valid: false,
        violations: validation.violations,
        enforcement: validation.enforcement
      });
    }
  } catch (error) {
    logger.error('UEP validation error:', error);
    res.status(500).json({
      valid: false,
      error: 'Internal validation error'
    });
  }
});

// Event Validation Endpoint
app.post('/validate/event', async (req, res) => {
  try {
    const { eventType, eventData } = req.body;
    
    const validation = await validationEngine.validateEvent(eventType, eventData);
    
    res.json({
      valid: validation.valid,
      violations: validation.violations,
      correctedData: validation.correctedData
    });
  } catch (error) {
    logger.error('Event validation error:', error);
    res.status(500).json({
      valid: false,
      error: error.message
    });
  }
});

// Agent Wrapper Configuration
app.post('/agent/wrap', async (req, res) => {
  try {
    const { agentId, agentType, config } = req.body;
    
    const wrapperConfig = await enforcementEngine.createAgentWrapper(
      agentId,
      agentType,
      config
    );
    
    res.json({
      success: true,
      wrapper: wrapperConfig
    });
  } catch (error) {
    logger.error('Agent wrapping error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Protocol Processing
app.post('/protocol/process', async (req, res) => {
  try {
    const { protocolData, context } = req.body;
    
    const result = await protocolProcessor.process(protocolData, context);
    
    res.json({
      success: true,
      result,
      protocol: result.protocol,
      enforcement: result.enforcement
    });
  } catch (error) {
    logger.error('Protocol processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// UEP Metrics
app.get('/metrics', (req, res) => {
  const metrics = {
    validation: validationEngine.getMetrics(),
    enforcement: enforcementEngine.getMetrics(),
    protocol: protocolProcessor.getMetrics()
  };
  
  res.json(metrics);
});

// UEP Violations Report
app.get('/violations', async (req, res) => {
  try {
    const { since, severity, limit } = req.query;
    
    const violations = await enforcementEngine.getViolations({
      since: since as string,
      severity: severity as string,
      limit: parseInt(limit as string) || 100
    });
    
    res.json(violations);
  } catch (error) {
    logger.error('Violations query error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Protocol Status
app.get('/protocol/status', (req, res) => {
  res.json({
    active: protocolProcessor.isActive(),
    rules: protocolProcessor.getActiveRules(),
    enforcement: enforcementEngine.getEnforcementStatus(),
    lastUpdate: protocolProcessor.getLastUpdate()
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled UEP service error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal UEP service error'
  });
});

const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, gracefully closing UEP service...');
  
  await enforcementEngine.shutdown();
  await eventBus.disconnect();
  
  server.close(() => {
    logger.info('UEP service closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(config.port, async () => {
  logger.info(`UEP Validation Service running on port ${config.port}`);
  
  try {
    // Initialize EventBus connection
    await eventBus.connect();
    logger.info('✅ UEP EventBus connected');
    
    // Initialize enforcement engine
    await enforcementEngine.initialize();
    logger.info('✅ UEP Enforcement Engine initialized');
    
    // Set up UEP event subscriptions
    await eventBus.subscribe('meta.agent.*', async (message) => {
      await enforcementEngine.enforceProtocol('meta-agent', message);
    });
    
    await eventBus.subscribe('factory.*', async (message) => {
      await enforcementEngine.enforceProtocol('factory', message);
    });
    
    await eventBus.subscribe('domain.*', async (message) => {
      await enforcementEngine.enforceProtocol('domain', message);
    });
    
    logger.info('✅ UEP event subscriptions active');
    
  } catch (error) {
    logger.error('❌ UEP service initialization failed:', error);
  }
});