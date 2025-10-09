/**
 * Sample UEP Agent Implementation
 * 
 * Demonstrates how to use the UEP Agent Container Template with:
 * - Health check endpoints
 * - UEP protocol compliance
 * - Automatic service registration
 * - OpenTelemetry integration
 * - Graceful shutdown handling
 * 
 * Based on TaskMaster research findings and Context7 methodology
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { 
  UEPAgentWrapper, 
  UEPConfig, 
  ValidateUEP, 
  UEPAgent, 
  createUEPMessage,
  UEPProtocolMessage 
} from '../src/uep-agent-wrapper';

// =============================================================================
// Sample Agent Configuration
// =============================================================================

const agentConfig: Partial<UEPConfig> = {
  agentType: 'sample-agent',
  agentName: 'Sample UEP Agent',
  version: '1.0.0',
  port: parseInt(process.env.SERVICE_PORT || '3000'),
  capabilities: ['http', 'health', 'metrics', 'tracing', 'sample-processing'],
  metadata: {
    description: 'Sample agent demonstrating UEP compliance',
    features: ['message-processing', 'data-validation', 'real-time-monitoring'],
    maintainer: 'UEP Meta-Agent Factory',
  }
};

// =============================================================================
// Sample Agent Class with UEP Integration
// =============================================================================

@UEPAgent(agentConfig)
class SampleUEPAgent {
  private app: express.Application;
  private server: any;
  public uepWrapper!: UEPAgentWrapper; // Injected by decorator

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-UEP-Message-ID'],
    }));

    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP',
        retryAfter: '15 minutes'
      }
    });
    this.app.use(limiter);

    // UEP middleware integration
    const middleware = this.uepWrapper.getExpressMiddleware();
    this.app.use(middleware.tracing);
    this.app.use('/api', middleware.validateUEP);
  }

  private setupRoutes(): void {
    // UEP Health Check Endpoint (enhanced)
    this.app.get('/health', async (req, res) => {
      const middleware = this.uepWrapper.getExpressMiddleware();
      await middleware.healthCheck(req, res);
    });

    // Readiness probe (Kubernetes-style)
    this.app.get('/ready', async (req, res) => {
      try {
        const isReady = this.uepWrapper.getRegistrationStatus() === 'registered' &&
                       this.uepWrapper.isHealthy();
        
        if (isReady) {
          res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            agentId: this.uepWrapper.getConfig().agentId
          });
        } else {
          res.status(503).json({
            status: 'not-ready',
            timestamp: new Date().toISOString(),
            agentId: this.uepWrapper.getConfig().agentId,
            reason: 'Agent not fully initialized'
          });
        }
      } catch (error) {
        res.status(503).json({
          status: 'error',
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Liveness probe
    this.app.get('/live', (req, res) => {
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        pid: process.pid
      });
    });

    // Metrics endpoint (Prometheus-compatible)
    this.app.get('/metrics', (req, res) => {
      const memUsage = process.memoryUsage();
      const metrics = [
        '# HELP agent_uptime_seconds Agent uptime in seconds',
        '# TYPE agent_uptime_seconds gauge',
        `agent_uptime_seconds ${Math.floor(process.uptime())}`,
        '',
        '# HELP agent_memory_usage_bytes Agent memory usage in bytes',
        '# TYPE agent_memory_usage_bytes gauge',
        `agent_memory_usage_bytes{type="rss"} ${memUsage.rss}`,
        `agent_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}`,
        `agent_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}`,
        `agent_memory_usage_bytes{type="external"} ${memUsage.external}`,
        '',
        '# HELP agent_registration_status UEP registration status (1=registered, 0=not registered)',
        '# TYPE agent_registration_status gauge',
        `agent_registration_status ${this.uepWrapper.getRegistrationStatus() === 'registered' ? 1 : 0}`,
        '',
        '# HELP agent_requests_total Total number of requests processed',
        '# TYPE agent_requests_total counter',
        `agent_requests_total ${this.getRequestCount()}`,
      ].join('\\n');
      
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    });

    // Sample API endpoints with UEP protocol validation
    this.app.post('/api/process', this.processMessage.bind(this));
    this.app.post('/api/validate', this.validateData.bind(this));
    this.app.get('/api/status', this.getAgentStatus.bind(this));

    // Default error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        agentId: this.uepWrapper.getConfig().agentId
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
        agentId: this.uepWrapper.getConfig().agentId
      });
    });
  }

  // =============================================================================
  // Sample Business Logic with UEP Protocol Validation
  // =============================================================================

  @ValidateUEP
  private async processMessage(req: express.Request, res: express.Response): Promise<void> {
    try {
      const message = req.body as UEPProtocolMessage;
      
      // Sample processing logic
      const processedData = {
        originalMessageId: message.messageId,
        processedAt: new Date().toISOString(),
        processingAgent: this.uepWrapper.getConfig().agentId,
        result: `Processed ${message.messageType} from ${message.source.agentId}`,
        payload: message.payload
      };

      // Create UEP-compliant response
      const responseMessage = createUEPMessage(
        'process-response',
        processedData,
        {
          agentId: this.uepWrapper.getConfig().agentId,
          agentType: this.uepWrapper.getConfig().agentType
        },
        message.source,
        this.uepWrapper.getConfig().protocolVersion
      );

      res.status(200).json(responseMessage);
    } catch (error) {
      res.status(400).json({
        error: 'Processing failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
        agentId: this.uepWrapper.getConfig().agentId
      });
    }
  }

  @ValidateUEP
  private async validateData(req: express.Request, res: express.Response): Promise<void> {
    try {
      const message = req.body as UEPProtocolMessage;
      
      // Sample validation logic
      const validation = {
        messageId: message.messageId,
        isValid: true,
        validatedAt: new Date().toISOString(),
        validationAgent: this.uepWrapper.getConfig().agentId,
        checks: [
          { name: 'structure', passed: true, details: 'Message structure is valid' },
          { name: 'protocol', passed: true, details: 'Protocol version compatible' },
          { name: 'payload', passed: typeof message.payload === 'object', details: 'Payload format valid' }
        ]
      };

      const responseMessage = createUEPMessage(
        'validation-response',
        validation,
        {
          agentId: this.uepWrapper.getConfig().agentId,
          agentType: this.uepWrapper.getConfig().agentType
        },
        message.source,
        this.uepWrapper.getConfig().protocolVersion
      );

      res.status(200).json(responseMessage);
    } catch (error) {
      res.status(400).json({
        error: 'Validation failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
        agentId: this.uepWrapper.getConfig().agentId
      });
    }
  }

  private async getAgentStatus(req: express.Request, res: express.Response): Promise<void> {
    try {
      const config = this.uepWrapper.getConfig();
      const healthStatus = await this.uepWrapper.getHealthStatus();
      
      const agentStatus = {
        agent: {
          id: config.agentId,
          type: config.agentType,
          name: config.agentName,
          version: config.version,
          protocolVersion: config.protocolVersion
        },
        health: healthStatus,
        registration: {
          status: this.uepWrapper.getRegistrationStatus(),
          registryUrl: config.registryUrl,
          autoRegister: config.autoRegister
        },
        capabilities: config.capabilities,
        metadata: config.metadata,
        runtime: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: Math.floor(process.uptime()),
          pid: process.pid
        }
      };

      res.status(200).json(agentStatus);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get agent status',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // =============================================================================
  // Agent Lifecycle Management
  // =============================================================================

  public async initialize(): Promise<void> {
    console.log(`Initializing ${agentConfig.agentName}...`);
    
    // Initialize UEP wrapper (handled by decorator)
    await this.uepWrapper.initialize();
    
    // Set up event listeners
    this.uepWrapper.on('registered', (data) => {
      console.log(`Agent registered successfully: ${data.agentId}`);
    });

    this.uepWrapper.on('registrationFailed', (data) => {
      console.error(`Agent registration failed: ${data.agentId}`);
    });

    this.uepWrapper.on('healthCheck', (status) => {
      if (status.status !== 'healthy') {
        console.warn(`Health check warning: ${status.status}`);
      }
    });

    // Start HTTP server
    this.server = createServer(this.app);
    this.server.listen(agentConfig.port, () => {
      console.log(`Sample UEP Agent listening on port ${agentConfig.port}`);
      console.log(`Health check: http://localhost:${agentConfig.port}/health`);
      console.log(`Metrics: http://localhost:${agentConfig.port}/metrics`);
      console.log(`Agent Status: http://localhost:${agentConfig.port}/api/status`);
    });
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Sample UEP Agent...');
    
    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          console.log('HTTP server closed');
          resolve();
        });
      });
    }

    // Shutdown UEP wrapper (handled by decorator)
    await this.uepWrapper.shutdown();
    
    console.log('Sample UEP Agent shutdown completed');
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private requestCount = 0;

  private getRequestCount(): number {
    return this.requestCount;
  }

  // Middleware to count requests
  private countRequests = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    this.requestCount++;
    next();
  };
}

// =============================================================================
// Application Bootstrap
// =============================================================================

async function bootstrap(): Promise<void> {
  try {
    console.log('Starting Sample UEP Agent...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Node Version:', process.version);
    console.log('Platform:', process.platform);
    
    const agent = new SampleUEPAgent();
    await agent.initialize();
    
    console.log('Sample UEP Agent started successfully');
  } catch (error) {
    console.error('Failed to start Sample UEP Agent:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
if (require.main === module) {
  bootstrap();
}

export default SampleUEPAgent;