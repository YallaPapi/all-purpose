/**
 * Agent Startup Template with Service Discovery Integration
 * Task 191.4: Template for integrating existing UEP agents with service discovery
 */

const express = require('express');
const { createAgentHelper, createHealthEndpoint, createMetricsEndpoint } = require('./AgentServiceHelper');

class UEPAgentWithServiceDiscovery {
  constructor(agentConfig, serviceDiscoveryOptions = {}) {
    this.agentConfig = agentConfig;
    this.app = express();
    
    // Create service discovery helper
    this.serviceHelper = createAgentHelper({
      agentType: process.env.AGENT_TYPE || agentConfig.type,
      agentName: process.env.AGENT_NAME || agentConfig.name,
      version: process.env.npm_package_version || '1.0.0',
      host: process.env.SERVICE_HOST || '0.0.0.0',
      port: parseInt(process.env.SERVICE_PORT || agentConfig.port || '3000'),
      capabilities: (process.env.CAPABILITIES || '').split(',').filter(Boolean),
      environment: process.env.UEP_ENVIRONMENT || 'development',
      cluster: process.env.CLUSTER_NAME || 'uep-cluster',
      namespace: process.env.NAMESPACE || 'uep',
      labels: {
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.UEP_ENVIRONMENT || 'development',
        team: 'uep-factory'
      },
      annotations: {
        'uep.io/managed-by': 'docker-compose',
        'uep.io/created-at': new Date().toISOString()
      }
    }, {
      registryUrl: this.buildRegistryUrl(),
      registryType: process.env.REGISTRY_TYPE || 'redis',
      autoRegisterOnStartup: process.env.AUTO_REGISTER !== 'false',
      autoDeregisterOnShutdown: true,
      autoHealthReporting: true,
      enableDiscoveryCache: true,
      ...serviceDiscoveryOptions
    });

    this.setupMiddleware();
    this.setupStandardEndpoints();
    this.setupServiceDiscoveryIntegration();
  }

  buildRegistryUrl() {
    const registryType = process.env.REGISTRY_TYPE || 'redis';
    
    if (registryType === 'redis') {
      const host = process.env.REDIS_HOST || 'localhost';
      const port = process.env.REDIS_PORT || '6379';
      const password = process.env.REDIS_PASSWORD;
      
      let url = `redis://${host}:${port}`;
      if (password) {
        url = `redis://:${password}@${host}:${port}`;
      }
      return url;
    }
    
    if (registryType === 'consul') {
      const host = process.env.CONSUL_HOST || 'localhost';
      const port = process.env.CONSUL_PORT || '8500';
      return `http://${host}:${port}`;
    }
    
    throw new Error(`Unsupported registry type: ${registryType}`);
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
    
    // Service discovery headers
    this.app.use((req, res, next) => {
      res.setHeader('X-UEP-Agent-Type', process.env.AGENT_TYPE || 'unknown');
      res.setHeader('X-UEP-Agent-Version', process.env.npm_package_version || '1.0.0');
      next();
    });
  }

  setupStandardEndpoints() {
    // Health check endpoint (required for service discovery)
    this.app.get('/health', createHealthEndpoint());
    
    // Metrics endpoint
    this.app.get('/metrics', createMetricsEndpoint(this.serviceHelper));
    
    // Service discovery endpoints
    this.app.get('/service-info', (req, res) => {
      res.json({
        agentType: process.env.AGENT_TYPE,
        agentName: process.env.AGENT_NAME,
        version: process.env.npm_package_version || '1.0.0',
        capabilities: (process.env.CAPABILITIES || '').split(',').filter(Boolean),
        environment: process.env.UEP_ENVIRONMENT,
        status: 'healthy',
        uptime: process.uptime(),
        metrics: this.serviceHelper.getMetrics()
      });
    });
    
    // Discovery endpoint - find other agents
    this.app.get('/discover/:agentType', async (req, res) => {
      try {
        const { agentType } = req.params;
        const { healthy = true, limit = 10 } = req.query;
        
        const agents = await this.serviceHelper.findAgents(agentType, {
          healthy: healthy === 'true',
          limit: parseInt(limit)
        });
        
        res.json({
          success: true,
          agentType,
          agents: agents.map(agent => ({
            id: agent.agentId,
            name: agent.agentName,
            type: agent.agentType,
            address: agent.network.address,
            port: agent.network.port,
            load: agent.currentMetrics.currentLoad,
            status: agent.status
          }))
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  setupServiceDiscoveryIntegration() {
    // Event handlers
    this.serviceHelper.on('agentRegistered', (metadata) => {
      console.log(`✅ Agent registered with service discovery: ${metadata.agentId}`);
    });
    
    this.serviceHelper.on('agentDeregistered', (agentId) => {
      console.log(`❌ Agent deregistered from service discovery: ${agentId}`);
    });
    
    this.serviceHelper.on('error', (error) => {
      console.error(`🚨 Service discovery error: ${error.message}`);
    });
  }

  // Method to make requests to other agents via service discovery
  async callAgent(agentType, endpoint, options = {}) {
    try {
      const agent = await this.serviceHelper.getBestAgent(agentType, {
        maxLoad: 80,
        maxResponseTime: 1000
      });
      
      if (!agent) {
        throw new Error(`No available agents of type: ${agentType}`);
      }
      
      const url = `http://${agent.network.address}:${agent.network.port}${endpoint}`;
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-UEP-Source-Agent': process.env.AGENT_TYPE,
          'X-UEP-Request-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error(`Failed to call ${agentType}${endpoint}:`, error.message);
      throw error;
    }
  }

  // Method to update load metrics
  async updateLoad(load, metrics = {}) {
    try {
      await this.serviceHelper.updateLoad(load, metrics);
    } catch (error) {
      console.error('Failed to update load metrics:', error.message);
    }
  }

  // Method to report health status
  async reportHealth(status = 'healthy', metadata = {}) {
    try {
      await this.serviceHelper.reportHealth(status, metadata);
    } catch (error) {
      console.error('Failed to report health:', error.message);
    }
  }

  async start() {
    try {
      // Start service discovery helper
      await this.serviceHelper.start();
      
      // Start HTTP server
      const port = parseInt(process.env.SERVICE_PORT || this.agentConfig.port || '3000');
      this.server = this.app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 ${process.env.AGENT_NAME || 'UEP Agent'} listening on port ${port}`);
        console.log(`📡 Service discovery enabled: ${process.env.SERVICE_DISCOVERY_ENABLED !== 'false'}`);
        console.log(`🏷️  Agent type: ${process.env.AGENT_TYPE}`);
        console.log(`🎯 Capabilities: ${process.env.CAPABILITIES || 'none'}`);
      });
      
    } catch (error) {
      console.error('Failed to start agent:', error);
      process.exit(1);
    }
  }

  async stop() {
    console.log('Stopping agent...');
    
    try {
      // Stop HTTP server
      if (this.server) {
        this.server.close();
      }
      
      // Stop service discovery helper
      await this.serviceHelper.stop('Agent shutdown');
      
      console.log('Agent stopped successfully');
      
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

// Graceful shutdown handling
function setupGracefulShutdown(agent) {
  const shutdown = (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    agent.stop().then(() => {
      process.exit(0);
    }).catch((error) => {
      console.error('Shutdown error:', error);
      process.exit(1);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
}

// Environment validation
function validateEnvironment() {
  const required = ['AGENT_TYPE', 'AGENT_NAME'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  // Validate service discovery configuration
  if (process.env.SERVICE_DISCOVERY_ENABLED !== 'false') {
    const registryType = process.env.REGISTRY_TYPE || 'redis';
    
    if (registryType === 'redis') {
      if (!process.env.REDIS_HOST) {
        console.error('REDIS_HOST is required when using Redis registry');
        process.exit(1);
      }
    } else if (registryType === 'consul') {
      if (!process.env.CONSUL_HOST) {
        console.error('CONSUL_HOST is required when using Consul registry');
        process.exit(1);
      }
    }
  }
}

module.exports = {
  UEPAgentWithServiceDiscovery,
  setupGracefulShutdown,
  validateEnvironment
};

// If this file is run directly, provide usage example
if (require.main === module) {
  validateEnvironment();
  
  const agent = new UEPAgentWithServiceDiscovery({
    type: process.env.AGENT_TYPE,
    name: process.env.AGENT_NAME,
    port: process.env.SERVICE_PORT || 3000
  });
  
  setupGracefulShutdown(agent);
  agent.start();
}