#!/usr/bin/env node

/**
 * Production UEP Agent with Advanced Capability Advertisement
 * 
 * Example demonstrating production-ready capability advertisement integration
 * with comprehensive monitoring, error handling, and lifecycle management.
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.3
 */

import { 
  createProductionCapabilityAdvertisement,
  AgentCapability,
  CapabilityAdvertisementConfig 
} from '../src/index.js';
import chalk from 'chalk';
import { createServer } from 'http';
import express from 'express';

// Production agent configuration
const config: CapabilityAdvertisementConfig = {
  agentId: process.env.AGENT_ID || 'production-agent-001',
  agentName: 'Production Processing Agent',
  agentVersion: '2.1.0',
  registryUrl: process.env.CAPABILITY_REGISTRY_URL || 'http://localhost:3001',
  
  // Enable production features
  autoDiscovery: true,
  enableLogging: true,
  enableMetrics: true,
  gracefulShutdown: true,
  
  // Initial capabilities
  initialCapabilities: [
    {
      id: 'document-processing',
      name: 'Enterprise Document Processing',
      version: { major: 2, minor: 1, patch: 0 },
      description: 'High-performance document processing with OCR, text extraction, and analysis',
      category: 'document-processing',
      parameters: [
        {
          name: 'document',
          type: 'string | Buffer',
          description: 'Document data (PDF, DOC, etc.)',
          required: true
        },
        {
          name: 'options',
          type: 'object',
          description: 'Processing options',
          required: false,
          defaultValue: { ocr: true, analysis: true, format: 'json' }
        }
      ],
      returns: {
        type: 'object',
        description: 'Document processing results',
        schema: {
          text: { type: 'string' },
          metadata: { type: 'object' },
          analysis: { type: 'object' }
        }
      },
      performance: {
        averageLatency: 2000,
        maxLatency: 10000,
        throughput: 20,
        resourceUsage: {
          cpu: 60,
          memory: 512,
          storage: 100
        },
        scalingLimits: {
          maxConcurrentRequests: 10,
          maxQueueSize: 50
        }
      },
      constraints: {
        platformRequirements: ['linux', 'darwin'],
        resourceRequirements: {
          minCpu: 2,
          minMemory: 1024,
          minStorage: 500
        }
      },
      reliability: {
        successRate: 0.98,
        errorHandling: ['retry', 'fallback', 'circuit-breaker'],
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential',
          baseDelay: 1000
        }
      },
      documentation: {
        detailedDescription: 'Enterprise-grade document processing service with advanced OCR capabilities, intelligent text extraction, and comprehensive document analysis including layout detection, table extraction, and content classification.',
        useCases: [
          'Legal document analysis',
          'Invoice processing',
          'Contract extraction',
          'Research paper analysis'
        ],
        limitations: [
          'Maximum file size: 50MB',
          'Supported formats: PDF, DOC, DOCX, TXT',
          'OCR accuracy depends on document quality'
        ],
        troubleshooting: {
          'OCR_FAILED': 'Check document quality and try again',
          'TIMEOUT_ERROR': 'Document too large, split into smaller chunks',
          'UNSUPPORTED_FORMAT': 'Convert document to supported format'
        }
      },
      tags: ['document', 'ocr', 'analysis', 'enterprise', 'pdf'],
      compliance: {
        standards: ['SOC2', 'GDPR'],
        certifications: ['ISO27001'],
        auditTrail: true,
        dataClassification: 'confidential'
      }
    },
    {
      id: 'workflow-automation',
      name: 'Intelligent Workflow Automation',
      version: { major: 1, minor: 3, patch: 2 },
      description: 'AI-powered workflow automation with decision trees and process optimization',
      category: 'automation',
      parameters: [
        {
          name: 'workflow',
          type: 'object',
          description: 'Workflow definition',
          required: true
        },
        {
          name: 'context',
          type: 'object',
          description: 'Execution context and variables',
          required: false,
          defaultValue: {}
        }
      ],
      returns: {
        type: 'object',
        description: 'Workflow execution results',
        schema: {
          status: { type: 'string', enum: ['completed', 'failed', 'paused'] },
          results: { type: 'object' },
          metrics: { type: 'object' }
        }
      },
      performance: {
        averageLatency: 500,
        maxLatency: 5000,
        throughput: 100
      },
      tags: ['automation', 'workflow', 'ai', 'optimization']
    }
  ],
  
  // Advanced registration configuration
  registrationConfig: {
    ttl: 7200, // 2 hours
    heartbeatInterval: 30000, // 30 seconds
    autoReregister: true,
    maxRetries: 10,
    consul: {
      enabled: process.env.CONSUL_ENABLED === 'true',
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT || '8500'),
      serviceName: 'production-uep-agent',
      tags: ['production', 'v2', 'enterprise']
    },
    health: {
      endpoint: 'http://localhost:3000/health',
      interval: 30000,
      timeout: 5000,
      retries: 3
    }
  },
  
  // Advanced capability management configuration
  capabilityManagerConfig: {
    performanceTracking: true,
    autoVersioning: false, // Disabled in production
    autoDeprecation: false,
    autoRemoval: false,
    performanceThresholds: {
      maxLatency: 10000,
      minSuccessRate: 0.95,
      maxErrorRate: 0.05
    },
    dependencyResolution: {
      autoResolve: true,
      conflictStrategy: 'stable',
      maxDepth: 3
    }
  }
};

class ProductionAgent {
  private factory: any;
  private server: any;
  private app: express.Application;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  async start() {
    try {
      console.log(chalk.blue('🏭 Starting Production UEP Agent...'));
      
      // Create production capability advertisement factory
      this.factory = createProductionCapabilityAdvertisement(config);
      
      // Setup comprehensive event handling
      this.setupEventHandlers();
      
      // Start HTTP server
      await this.startHttpServer();
      
      // Initialize capability advertisement
      await this.factory.initialize();
      
      console.log(chalk.green('🚀 Production UEP Agent started successfully'));
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      // Simulate production workload
      this.simulateProductionWorkload();
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start Production UEP Agent:'), error);
      process.exit(1);
    }
  }

  private setupMiddleware() {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(chalk.cyan(`📨 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`));
      });
      next();
    });
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const status = this.factory?.getStatus() || {};
      
      res.json({
        status: status.health?.status || 'unknown',
        timestamp: new Date().toISOString(),
        agent: {
          id: config.agentId,
          version: config.agentVersion,
          uptime: status.uptime || 0,
          registered: status.registered || false,
          capabilities: status.capabilitiesCount || 0
        },
        dependencies: {
          registry: status.registered ? 'healthy' : 'unhealthy'
        }
      });
    });

    // Capabilities endpoint
    this.app.get('/capabilities', (req, res) => {
      const capabilities = this.factory?.getCapabilities() || [];
      res.json({
        count: capabilities.length,
        capabilities: capabilities.map(cap => ({
          id: cap.id,
          name: cap.name,
          version: `${cap.version.major}.${cap.version.minor}.${cap.version.patch}`,
          category: cap.category,
          description: cap.description
        }))
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      // In production, this would integrate with Prometheus
      const status = this.factory?.getStatus() || {};
      res.json({
        uptime_seconds: status.uptime || 0,
        capabilities_total: status.capabilitiesCount || 0,
        registered: status.registered ? 1 : 0,
        health_status: status.health?.status || 'unknown',
        memory_usage_bytes: process.memoryUsage().heapUsed,
        cpu_usage_percent: process.cpuUsage().user / 1000000
      });
    });

    // Document processing endpoint (example capability implementation)
    this.app.post('/api/document-processing', async (req, res) => {
      const startTime = Date.now();
      
      try {
        // Simulate document processing
        const { document, options = {} } = req.body;
        
        if (!document) {
          return res.status(400).json({ error: 'Document is required' });
        }
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
        
        const result = {
          text: 'Extracted text content...',
          metadata: {
            pages: 10,
            words: 1500,
            format: 'pdf'
          },
          analysis: {
            language: 'en',
            confidence: 0.95,
            topics: ['business', 'financial']
          }
        };
        
        // Record successful invocation
        const latency = Date.now() - startTime;
        this.factory?.recordInvocation('document-processing', latency, true);
        
        res.json(result);
        
      } catch (error) {
        const latency = Date.now() - startTime;
        this.factory?.recordInvocation('document-processing', latency, false, error);
        
        console.error(chalk.red('❌ Document processing error:'), error);
        res.status(500).json({ error: 'Processing failed' });
      }
    });
  }

  private async startHttpServer(): Promise<void> {
    const port = parseInt(process.env.PORT || '3000');
    
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, () => {
        console.log(chalk.green(`🌐 HTTP server listening on port ${port}`));
        resolve(void 0);
      });
      
      this.server.on('error', reject);
    });
  }

  private setupEventHandlers() {
    this.factory.on('initialized', () => {
      console.log(chalk.green('✅ Capability advertisement initialized'));
    });
    
    this.factory.on('registered', (data: any) => {
      console.log(chalk.green(`✅ Agent registered with registry: ${data.registrationId}`));
    });
    
    this.factory.on('deregistered', () => {
      console.log(chalk.yellow('⚠️ Agent deregistered from registry'));
    });
    
    this.factory.on('capabilityAdded', (event: any) => {
      console.log(chalk.blue(`📋 Capability added: ${event.capability.id} v${event.capability.version.major}.${event.capability.version.minor}.${event.capability.version.patch}`));
    });
    
    this.factory.on('capabilityUpdated', (event: any) => {
      console.log(chalk.cyan(`🔄 Capability updated: ${event.capability.id}`));
    });
    
    this.factory.on('performanceWarning', (warning: any) => {
      console.warn(chalk.yellow(`⚠️ Performance warning: ${warning.capabilityId} - ${warning.type} = ${warning.value}`));
    });
    
    this.factory.on('error', (error: Error) => {
      console.error(chalk.red('❌ Factory error:'), error);
    });
  }

  private startPerformanceMonitoring() {
    // Monitor and report status every 60 seconds
    setInterval(() => {
      const status = this.factory.getStatus();
      const capabilities = this.factory.getCapabilities();
      
      console.log(chalk.magenta('\n📊 Performance Report:'));
      console.log(chalk.magenta(`   Status: ${status.registered ? 'Registered' : 'Not Registered'}`));
      console.log(chalk.magenta(`   Health: ${status.health.status}`));
      console.log(chalk.magenta(`   Uptime: ${Math.floor(status.uptime / 60)}m ${status.uptime % 60}s`));
      console.log(chalk.magenta(`   Capabilities: ${capabilities.length}`));
      console.log(chalk.magenta(`   Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`));
      
      // Log capability performance if available
      capabilities.forEach(cap => {
        const perfData = this.factory.capabilityManager?.getPerformanceData(cap.id);
        if (perfData && perfData.totalInvocations > 0) {
          const successRate = (perfData.successfulInvocations / perfData.totalInvocations * 100).toFixed(1);
          console.log(chalk.magenta(`     ${cap.id}: ${perfData.totalInvocations} calls, ${successRate}% success, ${Math.round(perfData.averageLatency)}ms avg`));
        }
      });
      
    }, 60000);
  }

  private simulateProductionWorkload() {
    // Simulate periodic capability invocations to demonstrate performance tracking
    setInterval(() => {
      if (this.isShuttingDown) return;
      
      // Simulate document processing calls
      const docLatency = Math.random() * 3000 + 500;
      const docSuccess = Math.random() > 0.05; // 95% success rate
      this.factory.recordInvocation('document-processing', docLatency, docSuccess, 
        docSuccess ? undefined : new Error('Simulated processing error'));
      
      // Simulate workflow automation calls
      const workflowLatency = Math.random() * 1000 + 200;
      const workflowSuccess = Math.random() > 0.02; // 98% success rate
      this.factory.recordInvocation('workflow-automation', workflowLatency, workflowSuccess,
        workflowSuccess ? undefined : new Error('Simulated workflow error'));
      
    }, 5000 + Math.random() * 10000); // Random interval between 5-15 seconds
  }

  async shutdown() {
    console.log(chalk.yellow('🔄 Shutting down Production UEP Agent...'));
    this.isShuttingDown = true;
    
    try {
      // Stop HTTP server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            console.log(chalk.green('✅ HTTP server stopped'));
            resolve();
          });
        });
      }
      
      // Stop capability advertisement
      if (this.factory) {
        await this.factory.stop();
      }
      
      console.log(chalk.green('✅ Production UEP Agent shutdown completed'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error during shutdown:'), error);
    }
  }
}

async function main() {
  const agent = new ProductionAgent();
  
  // Setup graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(chalk.yellow(`\n🔄 Received ${signal}, initiating graceful shutdown...`));
    await agent.shutdown();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'), error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });

  // Start the agent
  await agent.start();
}

main().catch(console.error);