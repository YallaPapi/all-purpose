#!/usr/bin/env node

/**
 * UEP Meta-Agent Factory
 * 
 * Central factory for creating and managing UEP-enhanced meta-agents.
 * Provides a standardized interface for all meta-agents with Universal Execution Protocol integration.
 * 
 * Features:
 * - Centralized agent creation and management
 * - UEP standardization across all agents
 * - Agent lifecycle management
 * - Cross-agent communication
 * - Performance monitoring and analytics
 * - Configuration management
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import path from 'path';
import { EventEmitter } from 'events';
import { Command } from 'commander';
import { createUEPAgentFactory } from '../uep/agentIntegration.js';

// Import enhanced agents
import EnhancedPRDParser from './enhanced-prd-parser.js';
import { EnhancedScaffoldGenerator } from './enhanced-scaffold-generator.js';

/**
 * UEP Meta-Agent Factory Configuration
 */
const DEFAULT_FACTORY_CONFIG = {
  // UEP Configuration
  enableUEP: true,
  enableValidation: true,
  enableMemoryIntegration: true,
  enableCaching: true,
  enableDebugMode: false,
  
  // Performance Configuration
  timeout: 180000, // 3 minutes default
  maxConcurrentAgents: 10,
  enablePerformanceMonitoring: true,
  
  // Logging Configuration
  logLevel: 'minimal', // silent, minimal, verbose, debug
  enableAuditLogging: true,
  
  // Directory Configuration
  workingDirectory: process.cwd(),
  agentsDirectory: path.join(process.cwd(), 'src/meta-agents'),
  outputDirectory: path.join(process.cwd(), '.taskmaster'),
  
  // Agent-specific defaults
  agentDefaults: {
    'prd-parser': {
      watchDir: 'docs',
      outputDir: '.taskmaster/tasks',
      researchEnabled: true,
      contextEnabled: true
    },
    'scaffold-generator': {
      outputDir: process.cwd(),
      templatesDir: 'templates',
      includeTests: true,
      includeGitignore: true,
      collisionDetection: true
    }
  }
};

/**
 * Agent Registry Entry
 */
class AgentRegistryEntry {
  constructor(agentId, agentType, agentInstance, config) {
    this.agentId = agentId;
    this.agentType = agentType;
    this.agentInstance = agentInstance;
    this.config = config;
    this.createdAt = new Date();
    this.lastUsed = new Date();
    this.usageCount = 0;
    this.status = 'active';
    this.metrics = {
      totalProcessingTime: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageComplianceScore: 0
    };
  }

  updateMetrics(processingTime, success, complianceScore) {
    this.usageCount++;
    this.lastUsed = new Date();
    this.metrics.totalProcessingTime += processingTime;
    
    if (success) {
      this.metrics.successfulTasks++;
    } else {
      this.metrics.failedTasks++;
    }
    
    if (complianceScore !== undefined) {
      // Running average of compliance scores
      const totalScores = this.metrics.successfulTasks;
      this.metrics.averageComplianceScore = 
        (this.metrics.averageComplianceScore * (totalScores - 1) + complianceScore) / totalScores;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.usageCount > 0 ? this.metrics.successfulTasks / this.usageCount : 0,
      averageProcessingTime: this.usageCount > 0 ? this.metrics.totalProcessingTime / this.usageCount : 0,
      uptime: Date.now() - this.createdAt.getTime()
    };
  }
}

/**
 * UEP Meta-Agent Factory Implementation
 */
class UEPMetaAgentFactory extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      ...DEFAULT_FACTORY_CONFIG,
      ...config
    };

    this.agentRegistry = new Map();
    this.uepFactory = null;
    this.isInitialized = false;
    this.activeAgents = new Set();
    this.globalMetrics = {
      totalAgentsCreated: 0,
      totalTasksProcessed: 0,
      totalProcessingTime: 0,
      averageComplianceScore: 0
    };

    // Bind methods
    this.createAgent = this.createAgent.bind(this);
    this.getAgent = this.getAgent.bind(this);
    this.removeAgent = this.removeAgent.bind(this);
  }

  /**
   * Initialize the UEP Meta-Agent Factory
   */
  async initialize() {
    try {
      console.log('🏭 Initializing UEP Meta-Agent Factory...');

      // Initialize UEP agent factory
      this.uepFactory = await createUEPAgentFactory(this.config);

      this.isInitialized = true;

      console.log('✅ UEP Meta-Agent Factory initialized successfully');
      console.log(`   - UEP Enabled: ${this.config.enableUEP}`);
      console.log(`   - Max Concurrent Agents: ${this.config.maxConcurrentAgents}`);
      console.log(`   - Performance Monitoring: ${this.config.enablePerformanceMonitoring}`);

      this.emit('factory:initialized', {
        timestamp: new Date().toISOString(),
        config: this.config
      });

    } catch (error) {
      console.error('❌ Failed to initialize UEP Meta-Agent Factory:', error.message);
      throw error;
    }
  }

  /**
   * Create and register a new agent
   */
  async createAgent(agentType, agentId, agentConfig = {}) {
    if (!this.isInitialized) {
      throw new Error('Factory not initialized. Call initialize() first.');
    }

    if (this.agentRegistry.has(agentId)) {
      throw new Error(`Agent with ID "${agentId}" already exists`);
    }

    if (this.activeAgents.size >= this.config.maxConcurrentAgents) {
      throw new Error(`Maximum concurrent agents limit reached (${this.config.maxConcurrentAgents})`);
    }

    try {
      console.log(`🔧 Creating ${agentType} agent: ${agentId}`);

      // Merge default configuration
      const defaultConfig = this.config.agentDefaults[agentType] || {};
      const finalConfig = {
        ...defaultConfig,
        ...agentConfig,
        agentId,
        // UEP configuration from factory
        uepEnabled: this.config.enableUEP,
        enhancedValidation: this.config.enableValidation,
        enhancedContext: true,
        memoryEnabled: this.config.enableMemoryIntegration,
        logLevel: this.config.logLevel
      };

      // Create agent instance based on type
      let agentInstance;
      switch (agentType) {
        case 'prd-parser':
          agentInstance = new EnhancedPRDParser(finalConfig);
          break;
          
        case 'scaffold-generator':
          agentInstance = new EnhancedScaffoldGenerator(finalConfig);
          await agentInstance.initialize(); // Scaffold generator needs explicit initialization
          break;
          
        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }

      // Create registry entry
      const registryEntry = new AgentRegistryEntry(agentId, agentType, agentInstance, finalConfig);
      
      // Register agent
      this.agentRegistry.set(agentId, registryEntry);
      this.activeAgents.add(agentId);
      this.globalMetrics.totalAgentsCreated++;

      // Set up agent event forwarding
      this.setupAgentEventForwarding(agentInstance, agentId, agentType);

      console.log(`✅ Created ${agentType} agent: ${agentId}`);
      
      this.emit('agent:created', {
        agentId,
        agentType,
        config: finalConfig,
        timestamp: new Date().toISOString()
      });

      return this.createAgentProxy(registryEntry);

    } catch (error) {
      console.error(`❌ Failed to create ${agentType} agent "${agentId}":`, error.message);
      throw error;
    }
  }

  /**
   * Get an existing agent
   */
  getAgent(agentId) {
    const registryEntry = this.agentRegistry.get(agentId);
    if (!registryEntry) {
      return null;
    }

    return this.createAgentProxy(registryEntry);
  }

  /**
   * Remove and cleanup an agent
   */
  async removeAgent(agentId) {
    const registryEntry = this.agentRegistry.get(agentId);
    if (!registryEntry) {
      throw new Error(`Agent "${agentId}" not found`);
    }

    try {
      console.log(`🗑️ Removing agent: ${agentId}`);

      // Cleanup agent instance
      if (registryEntry.agentInstance.cleanup) {
        await registryEntry.agentInstance.cleanup();
      }

      // Stop agent if it has a stop method (for PRD parser)
      if (registryEntry.agentInstance.stop) {
        await registryEntry.agentInstance.stop();
      }

      // Remove from registry
      this.agentRegistry.delete(agentId);
      this.activeAgents.delete(agentId);

      console.log(`✅ Removed agent: ${agentId}`);
      
      this.emit('agent:removed', {
        agentId,
        agentType: registryEntry.agentType,
        metrics: registryEntry.getMetrics(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Failed to remove agent "${agentId}":`, error.message);
      throw error;
    }
  }

  /**
   * List all registered agents
   */
  listAgents() {
    return Array.from(this.agentRegistry.values()).map(entry => ({
      agentId: entry.agentId,
      agentType: entry.agentType,
      status: entry.status,
      createdAt: entry.createdAt,
      lastUsed: entry.lastUsed,
      usageCount: entry.usageCount,
      metrics: entry.getMetrics()
    }));
  }

  /**
   * Get factory statistics
   */
  getStatistics() {
    const agents = Array.from(this.agentRegistry.values());
    
    return {
      factory: {
        initialized: this.isInitialized,
        activeAgents: this.activeAgents.size,
        totalAgentsCreated: this.globalMetrics.totalAgentsCreated,
        totalTasksProcessed: this.globalMetrics.totalTasksProcessed,
        averageComplianceScore: this.globalMetrics.averageComplianceScore
      },
      agents: agents.map(entry => ({
        id: entry.agentId,
        type: entry.agentType,
        metrics: entry.getMetrics()
      })),
      performance: {
        totalProcessingTime: this.globalMetrics.totalProcessingTime,
        averageProcessingTime: this.globalMetrics.totalTasksProcessed > 0 ? 
          this.globalMetrics.totalProcessingTime / this.globalMetrics.totalTasksProcessed : 0
      },
      configuration: this.config
    };
  }

  /**
   * Create agent proxy with enhanced functionality
   */
  createAgentProxy(registryEntry) {
    const self = this;
    
    return {
      // Agent information
      agentId: registryEntry.agentId,
      agentType: registryEntry.agentType,
      status: registryEntry.status,
      
      // Enhanced process method with metrics tracking
      process: async function(input, options = {}) {
        const startTime = Date.now();
        
        try {
          // Call agent's process method
          const result = await registryEntry.agentInstance.process(input, options);
          
          const processingTime = Date.now() - startTime;
          const success = result && (result.success !== false);
          const complianceScore = result?.uepMetadata?.complianceScore;
          
          // Update metrics
          registryEntry.updateMetrics(processingTime, success, complianceScore);
          self.updateGlobalMetrics(processingTime, success, complianceScore);
          
          // Emit processing event
          self.emit('agent:processed', {
            agentId: registryEntry.agentId,
            agentType: registryEntry.agentType,
            processingTime,
            success,
            complianceScore,
            timestamp: new Date().toISOString()
          });
          
          return result;
          
        } catch (error) {
          const processingTime = Date.now() - startTime;
          registryEntry.updateMetrics(processingTime, false);
          self.updateGlobalMetrics(processingTime, false);
          
          self.emit('agent:error', {
            agentId: registryEntry.agentId,
            agentType: registryEntry.agentType,
            error: error.message,
            processingTime,
            timestamp: new Date().toISOString()
          });
          
          throw error;
        }
      },

      // Delegate other methods to the agent instance
      initialize: registryEntry.agentInstance.initialize?.bind(registryEntry.agentInstance),
      cleanup: registryEntry.agentInstance.cleanup?.bind(registryEntry.agentInstance),
      start: registryEntry.agentInstance.start?.bind(registryEntry.agentInstance),
      stop: registryEntry.agentInstance.stop?.bind(registryEntry.agentInstance),
      
      // Enhanced status with factory information
      getStatus: function() {
        const agentStatus = registryEntry.agentInstance.getStatus ? 
          registryEntry.agentInstance.getStatus() : { initialized: true };
        
        return {
          ...agentStatus,
          factory: {
            agentId: registryEntry.agentId,
            agentType: registryEntry.agentType,
            metrics: registryEntry.getMetrics(),
            managedByFactory: true
          }
        };
      },

      // Get agent metrics
      getMetrics: () => registryEntry.getMetrics(),
      
      // Get original agent instance (for advanced usage)
      getOriginalAgent: () => registryEntry.agentInstance
    };
  }

  /**
   * Set up event forwarding from agent instances
   */
  setupAgentEventForwarding(agentInstance, agentId, agentType) {
    if (agentInstance.on && typeof agentInstance.on === 'function') {
      // Forward agent events with factory context
      const forwardEvent = (eventName) => {
        agentInstance.on(eventName, (data) => {
          this.emit(`agent:${eventName}`, {
            ...data,
            agentId,
            agentType,
            factoryManaged: true
          });
        });
      };

      // Common agent events to forward
      const eventsToForward = [
        'prd:completed', 'prd:error', 'prd:processing_start',
        'scaffold:completed', 'scaffold:error',
        'agent:started', 'agent:stopped',
        'error'
      ];

      eventsToForward.forEach(forwardEvent);
    }
  }

  /**
   * Update global factory metrics
   */
  updateGlobalMetrics(processingTime, success, complianceScore) {
    this.globalMetrics.totalTasksProcessed++;
    this.globalMetrics.totalProcessingTime += processingTime;
    
    if (complianceScore !== undefined) {
      const totalTasks = this.globalMetrics.totalTasksProcessed;
      this.globalMetrics.averageComplianceScore = 
        (this.globalMetrics.averageComplianceScore * (totalTasks - 1) + complianceScore) / totalTasks;
    }
  }

  /**
   * Cleanup all agents and shutdown factory
   */
  async cleanup() {
    try {
      console.log('🧹 Cleaning up UEP Meta-Agent Factory...');

      // Cleanup all agents
      const cleanupPromises = Array.from(this.agentRegistry.keys()).map(agentId => 
        this.removeAgent(agentId).catch(error => 
          console.warn(`⚠️ Failed to cleanup agent ${agentId}:`, error.message)
        )
      );

      await Promise.allSettled(cleanupPromises);

      // Cleanup UEP factory
      if (this.uepFactory && this.uepFactory.cleanup) {
        await this.uepFactory.cleanup();
      }

      this.isInitialized = false;
      console.log('✅ UEP Meta-Agent Factory cleanup completed');

      this.emit('factory:cleanup', {
        timestamp: new Date().toISOString(),
        statistics: this.getStatistics()
      });

    } catch (error) {
      console.error('❌ Factory cleanup failed:', error.message);
      throw error;
    }
  }
}

/**
 * Factory function for creating UEP Meta-Agent Factory
 */
async function createUEPMetaAgentFactory(config = {}) {
  const factory = new UEPMetaAgentFactory(config);
  await factory.initialize();
  return factory;
}

/**
 * CLI interface for factory management
 */
function runFactoryCLI() {
  const program = new Command();

  program
    .name('uep-meta-agent-factory')
    .description('UEP Meta-Agent Factory CLI')
    .version('1.0.0');

  program
    .command('start')
    .description('Start the UEP Meta-Agent Factory')
    .option('-c, --config <file>', 'Configuration file')
    .option('--log-level <level>', 'Log level (silent, minimal, verbose, debug)', 'minimal')
    .action(async (options) => {
      try {
        const config = {
          logLevel: options.logLevel
        };

        const factory = await createUEPMetaAgentFactory(config);
        
        console.log('🏭 UEP Meta-Agent Factory is running');
        console.log('Press Ctrl+C to shutdown gracefully');

        // Graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\n🛑 Shutting down UEP Meta-Agent Factory...');
          await factory.cleanup();
          process.exit(0);
        });

        // Keep process alive
        setInterval(() => {}, 1000);

      } catch (error) {
        console.error('❌ Failed to start factory:', error.message);
        process.exit(1);
      }
    });

  return program;
}

// Export for usage
export {
  UEPMetaAgentFactory,
  createUEPMetaAgentFactory,
  runFactoryCLI,
  DEFAULT_FACTORY_CONFIG
};

// Execute CLI if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFactoryCLI().then(program => program.parse()).catch(error => {
    console.error('CLI failed:', error);
    process.exit(1);
  });
}