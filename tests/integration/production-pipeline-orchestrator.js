/**
 * Production Pipeline Orchestrator
 * 
 * Based on TaskMaster research insights:
 * - Complete integration of continuous validation with test dashboard
 * - Automated deployment gates using dashboard metrics
 * - Production readiness enforcement with real-time monitoring
 * - Full CI/CD pipeline orchestration with rollback capabilities
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const yaml = require('js-yaml');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ValidationDashboardIntegration = require('./validation-dashboard-integration');

// Load pipeline configuration
const CONFIG_PATH = path.join(__dirname, 'deployment-pipeline-config.yml');

class ProductionPipelineOrchestrator {
  constructor(configPath = CONFIG_PATH) {
    this.configPath = configPath;
    this.config = null;
    this.integration = null;
    
    // Express app and server
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    // Pipeline state
    this.activePipelines = new Map();
    this.pipelineHistory = [];
    this.deploymentGates = new Map();
    
    this.initializeOrchestrator();
  }
  
  async initializeOrchestrator() {
    try {
      // Load configuration
      await this.loadConfiguration();
      
      // Setup express middleware
      this.setupMiddleware();
      
      // Setup API routes
      this.setupRoutes();
      
      // Setup WebSocket handlers
      this.setupWebSocketHandlers();
      
      // Initialize validation dashboard integration
      this.integration = new ValidationDashboardIntegration(this.config.integrations);
      
      // Setup integration event handlers
      this.setupIntegrationHandlers();
      
      console.log('✅ Production Pipeline Orchestrator initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize orchestrator:', error);
      throw error;
    }
  }
  
  async loadConfiguration() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = yaml.load(configData);
      console.log(`📋 Loaded pipeline configuration: ${this.config.name} v${this.config.version}`);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw new Error(`Invalid configuration file: ${this.configPath}`);
    }
  }
  
  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }
  
  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: this.config.version,
        active_pipelines: this.activePipelines.size
      });
    });
    
    // Pipeline execution
    this.app.post('/api/pipeline/execute', async (req, res) => {
      try {
        const { environment, options = {} } = req.body;
        
        if (!environment) {
          return res.status(400).json({ error: 'Environment is required' });
        }
        
        if (!this.config.environments[environment]) {
          return res.status(400).json({ error: `Unknown environment: ${environment}` });
        }
        
        const pipelineId = await this.executePipeline(environment, options);
        
        res.json({
          pipelineId,
          environment,
          status: 'started',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Pipeline execution failed:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Pipeline status
    this.app.get('/api/pipeline/:pipelineId/status', (req, res) => {
      const { pipelineId } = req.params;
      const pipeline = this.activePipelines.get(pipelineId);
      
      if (!pipeline) {
        return res.status(404).json({ error: 'Pipeline not found' });
      }
      
      res.json(pipeline);
    });
    
    // Active pipelines
    this.app.get('/api/pipelines/active', (req, res) => {
      const pipelines = Array.from(this.activePipelines.values());
      res.json({ pipelines, count: pipelines.length });
    });
    
    // Pipeline history
    this.app.get('/api/pipelines/history', (req, res) => {
      const { limit = 10, offset = 0 } = req.query;
      const history = this.pipelineHistory
        .slice(offset, offset + limit)
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      
      res.json({ 
        history, 
        total: this.pipelineHistory.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    });
    
    // Deployment gates
    this.app.get('/api/gates/:environment', async (req, res) => {
      try {
        const { environment } = req.params;
        const gateStatus = await this.integration.getDeploymentGateStatus(environment);
        res.json(gateStatus);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Stop pipeline
    this.app.post('/api/pipeline/:pipelineId/stop', async (req, res) => {
      try {
        const { pipelineId } = req.params;
        await this.stopPipeline(pipelineId);
        res.json({ message: 'Pipeline stopped', pipelineId });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Rollback deployment
    this.app.post('/api/deployment/:environment/rollback', async (req, res) => {
      try {
        const { environment } = req.params;
        await this.rollbackDeployment(environment);
        res.json({ message: 'Rollback initiated', environment });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Configuration
    this.app.get('/api/config', (req, res) => {
      const safeConfig = {
        name: this.config.name,
        version: this.config.version,
        environments: Object.keys(this.config.environments),
        stages: Object.keys(this.config.stages),
        deployment_strategies: Object.keys(this.config.deployment_strategies)
      };
      res.json(safeConfig);
    });
    
    // Metrics endpoint
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = await this.collectMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
  
  setupWebSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 Client connected: ${socket.id}`);
      
      // Send current state
      socket.emit('orchestrator-state', {
        activePipelines: Array.from(this.activePipelines.values()),
        configuration: {
          name: this.config.name,
          version: this.config.version,
          environments: Object.keys(this.config.environments)
        }
      });
      
      // Handle pipeline subscription
      socket.on('subscribe-pipeline', (pipelineId) => {
        socket.join(`pipeline-${pipelineId}`);
        console.log(`📡 Client ${socket.id} subscribed to pipeline ${pipelineId}`);
      });
      
      // Handle environment subscription
      socket.on('subscribe-environment', (environment) => {
        socket.join(`environment-${environment}`);
        console.log(`📡 Client ${socket.id} subscribed to environment ${environment}`);
      });
      
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });
  }
  
  setupIntegrationHandlers() {
    // Forward integration events to WebSocket clients
    this.integration.on('pipeline-stage-started', (data) => {
      this.io.to(`pipeline-${data.pipelineId}`).emit('stage-started', data);
      this.io.to(`environment-${data.environment}`).emit('stage-started', data);
    });
    
    this.integration.on('pipeline-stage-completed', (data) => {
      this.io.to(`pipeline-${data.pipelineId}`).emit('stage-completed', data);
      this.io.to(`environment-${data.environment}`).emit('stage-completed', data);
    });
    
    this.integration.on('pipeline-stage-failed', (data) => {
      this.io.to(`pipeline-${data.pipelineId}`).emit('stage-failed', data);
      this.io.to(`environment-${data.environment}`).emit('stage-failed', data);
    });
    
    this.integration.on('deployment-gate-result', (data) => {
      this.io.to(`environment-${data.environment}`).emit('gate-result', data);
    });
    
    this.integration.on('monitoring-alert', (data) => {
      this.io.to(`environment-${data.environment}`).emit('monitoring-alert', data);
    });
  }
  
  // Main pipeline execution
  async executePipeline(environment, options = {}) {
    const pipelineId = uuidv4();
    console.log(`🚀 Starting pipeline ${pipelineId} for ${environment}`);
    
    const pipeline = {
      id: pipelineId,
      environment,
      options,
      startTime: new Date(),
      status: 'running',
      currentStage: null,
      stages: [],
      results: {}
    };
    
    this.activePipelines.set(pipelineId, pipeline);
    
    // Broadcast pipeline started
    this.io.emit('pipeline-started', pipeline);
    
    try {
      // Execute stages in sequence
      const stageNames = Object.keys(this.config.stages);
      
      for (const stageName of stageNames) {
        pipeline.currentStage = stageName;
        console.log(`📋 Executing stage: ${stageName}`);
        
        const stageResult = await this.executeStage(pipelineId, stageName, environment, options);
        pipeline.stages.push(stageResult);
        pipeline.results[stageName] = stageResult;
        
        // Check if stage failed
        if (stageResult.status === 'failed' || stageResult.status === 'blocked') {
          throw new Error(`Stage ${stageName} failed: ${stageResult.error || stageResult.gateResult?.reason}`);
        }
      }
      
      // Pipeline completed successfully
      pipeline.status = 'completed';
      pipeline.endTime = new Date();
      pipeline.duration = pipeline.endTime - pipeline.startTime;
      pipeline.currentStage = null;
      
      console.log(`✅ Pipeline ${pipelineId} completed successfully in ${pipeline.duration}ms`);
      
      // Broadcast success
      this.io.emit('pipeline-completed', pipeline);
      
    } catch (error) {
      // Pipeline failed
      pipeline.status = 'failed';
      pipeline.error = error.message;
      pipeline.endTime = new Date();
      pipeline.duration = pipeline.endTime - pipeline.startTime;
      
      console.error(`❌ Pipeline ${pipelineId} failed: ${error.message}`);
      
      // Handle rollback if configured
      if (this.shouldRollback(environment, pipeline)) {
        await this.rollbackDeployment(environment);
      }
      
      // Broadcast failure
      this.io.emit('pipeline-failed', pipeline);
      
      throw error;
      
    } finally {
      // Move to history and cleanup
      this.pipelineHistory.unshift(pipeline);
      this.activePipelines.delete(pipelineId);
      
      // Keep history size manageable
      if (this.pipelineHistory.length > 100) {
        this.pipelineHistory = this.pipelineHistory.slice(0, 100);
      }
    }
    
    return pipelineId;
  }
  
  async executeStage(pipelineId, stageName, environment, options) {
    const stageConfig = this.config.stages[stageName];
    console.log(`⚡ Executing stage: ${stageName}`);
    
    // Use the integration to execute the stage
    try {
      const stageResult = await this.integration.executePipelineStage(
        pipelineId, 
        stageName, 
        environment, 
        { ...options, ...stageConfig }
      );
      
      return stageResult;
      
    } catch (error) {
      return {
        pipelineId,
        stage: stageName,
        environment,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  shouldRollback(environment, pipeline) {
    const envConfig = this.config.environments[environment];
    const pipelineConfig = this.config.pipeline;
    
    // Check if rollback is enabled for this environment
    if (!pipelineConfig.rollbackOnFailure) {
      return false;
    }
    
    // Check if deployment stage was reached
    const deploymentStage = pipeline.stages.find(s => s.stage === 'deploy');
    return deploymentStage && deploymentStage.status === 'completed';
  }
  
  async rollbackDeployment(environment) {
    console.log(`🔄 Initiating rollback for ${environment}`);
    
    try {
      // Use integration rollback functionality
      await this.integration.performRollback(environment);
      
      // Broadcast rollback
      this.io.to(`environment-${environment}`).emit('rollback-completed', {
        environment,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Failed to rollback ${environment}:`, error);
      throw error;
    }
  }
  
  async stopPipeline(pipelineId) {
    const pipeline = this.activePipelines.get(pipelineId);
    
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }
    
    pipeline.status = 'stopped';
    pipeline.endTime = new Date();
    pipeline.duration = pipeline.endTime - pipeline.startTime;
    
    // Move to history
    this.pipelineHistory.unshift(pipeline);
    this.activePipelines.delete(pipelineId);
    
    // Broadcast stop
    this.io.emit('pipeline-stopped', pipeline);
    
    console.log(`🛑 Pipeline ${pipelineId} stopped`);
  }
  
  async collectMetrics() {
    const now = new Date();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    
    // Recent pipeline metrics
    const recentPipelines = this.pipelineHistory.filter(p => 
      (now - new Date(p.startTime)) < day
    );
    
    const successfulPipelines = recentPipelines.filter(p => p.status === 'completed');
    const failedPipelines = recentPipelines.filter(p => p.status === 'failed');
    
    // Calculate metrics
    const metrics = {
      timestamp: now.toISOString(),
      pipelines: {
        active: this.activePipelines.size,
        total_today: recentPipelines.length,
        successful_today: successfulPipelines.length,
        failed_today: failedPipelines.length,
        success_rate: recentPipelines.length > 0 
          ? (successfulPipelines.length / recentPipelines.length * 100).toFixed(2)
          : 0
      },
      performance: {
        avg_duration: recentPipelines.length > 0
          ? Math.round(recentPipelines.reduce((sum, p) => sum + (p.duration || 0), 0) / recentPipelines.length)
          : 0,
        fastest_pipeline: recentPipelines.length > 0
          ? Math.min(...recentPipelines.map(p => p.duration || Infinity))
          : 0,
        slowest_pipeline: recentPipelines.length > 0
          ? Math.max(...recentPipelines.map(p => p.duration || 0))
          : 0
      },
      environments: {}
    };
    
    // Environment-specific metrics
    for (const env of Object.keys(this.config.environments)) {
      const envPipelines = recentPipelines.filter(p => p.environment === env);
      metrics.environments[env] = {
        total: envPipelines.length,
        successful: envPipelines.filter(p => p.status === 'completed').length,
        failed: envPipelines.filter(p => p.status === 'failed').length
      };
    }
    
    return metrics;
  }
  
  // Server lifecycle
  async start(port = 3002) {
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        console.log(`🚀 Production Pipeline Orchestrator running on port ${port}`);
        console.log(`📊 Dashboard: http://localhost:${port}`);
        console.log(`🔌 WebSocket: ws://localhost:${port}`);
        resolve();
      });
    });
  }
  
  async stop() {
    console.log('🛑 Stopping Production Pipeline Orchestrator...');
    
    // Stop all active pipelines
    for (const pipelineId of this.activePipelines.keys()) {
      await this.stopPipeline(pipelineId);
    }
    
    // Cleanup integration
    if (this.integration) {
      await this.integration.cleanup();
    }
    
    // Close server
    this.server.close();
    
    console.log('✅ Production Pipeline Orchestrator stopped');
  }
}

// Export for use in other modules
module.exports = ProductionPipelineOrchestrator;

// CLI execution
if (require.main === module) {
  const orchestrator = new ProductionPipelineOrchestrator();
  
  async function startOrchestrator() {
    try {
      await orchestrator.start(3002);
      
      // Example: Auto-execute a pipeline after startup
      setTimeout(async () => {
        console.log('🎯 Executing example pipeline for staging...');
        try {
          const pipelineId = await orchestrator.executePipeline('staging', {
            trigger: 'example',
            strategy: 'blue_green'
          });
          console.log(`✅ Example pipeline started: ${pipelineId}`);
        } catch (error) {
          console.error('❌ Example pipeline failed:', error);
        }
      }, 5000);
      
    } catch (error) {
      console.error('❌ Failed to start orchestrator:', error);
      process.exit(1);
    }
  }
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    await orchestrator.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    await orchestrator.stop();
    process.exit(0);
  });
  
  startOrchestrator();
}