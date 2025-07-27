#!/usr/bin/env node

/**
 * Agent Integration Adapter
 * 
 * This module provides standardized interfaces for all meta-agents to work with the UEP Factory.
 * Generated using Parameter Flow Agent principles for bulletproof parameter mapping.
 * 
 * Purpose: Bridge the gap between what the factory expects and what agents actually provide.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Standardized Agent Interface Adapter
 * Maps factory expectations to actual agent implementations
 */
export class AgentIntegrationAdapter {
  constructor(agentInstance, agentType, config = {}) {
    this.agentInstance = agentInstance;
    this.agentType = agentType;
    this.config = config;
    this.isInitialized = false;
  }

  /**
   * Standardized process method for all agents
   * Maps to appropriate agent-specific methods
   */
  async process(input, options = {}) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (this.agentType) {
        case 'prd-parser':
          // PRD Parser already has process method (we added it)
          result = await this.agentInstance.process(input, options);
          break;
          
        case 'scaffold-generator':
          // Map to processWithUEPContext for Enhanced Scaffold Generator
          result = await this.agentInstance.processWithUEPContext(
            input,
            options.memory || '',
            options.uepMetadata || null
          );
          break;
          
        default:
          // Generic fallback - try process method first, then _processCore
          if (this.agentInstance.process && typeof this.agentInstance.process === 'function') {
            result = await this.agentInstance.process(input, options);
          } else if (this.agentInstance._processCore && typeof this.agentInstance._processCore === 'function') {
            result = await this.agentInstance._processCore(input, options.memory || '');
          } else {
            throw new Error(`Agent type '${this.agentType}' does not have a compatible process method`);
          }
      }
      
      return {
        success: true,
        result,
        processingTime: Date.now() - startTime,
        agentType: this.agentType,
        timestamp: new Date().toISOString(),
        adapterUsed: true
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        agentType: this.agentType,
        timestamp: new Date().toISOString(),
        adapterUsed: true
      };
    }
  }

  /**
   * Standardized generate method for generator-type agents
   * Maps to appropriate agent-specific generation methods
   */
  async generate(options = {}) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (this.agentType) {
        case 'scaffold-generator':
          // Map generate to processWithUEPContext for Enhanced Scaffold Generator
          result = await this.agentInstance.processWithUEPContext(
            options.requirements || options,
            '', // empty memory
            null // no UEP metadata
          );
          
          // Transform result to expected generate format
          return {
            success: true,
            agentName: options.projectName || 'generated-project',
            outputDirectory: options.outputDirectory || './generated',
            generatedFiles: result.files || [],
            directories: result.directories || [],
            summary: result.summary || 'Project generated successfully',
            processingTime: Date.now() - startTime,
            adapterUsed: true
          };
          
        default:
          throw new Error(`Agent type '${this.agentType}' does not support generate operations`);
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        agentType: this.agentType,
        adapterUsed: true
      };
    }
  }

  /**
   * Standardized start method
   * Maps to agent-specific initialization
   */
  async start() {
    if (this.agentInstance.start && typeof this.agentInstance.start === 'function') {
      await this.agentInstance.start();
    } else if (this.agentInstance.initialize && typeof this.agentInstance.initialize === 'function') {
      await this.agentInstance.initialize();
    }
    
    this.isInitialized = true;
  }

  /**
   * Standardized stop method
   * Maps to agent-specific cleanup
   */
  async stop() {
    if (this.agentInstance.stop && typeof this.agentInstance.stop === 'function') {
      await this.agentInstance.stop();
    } else if (this.agentInstance.cleanup && typeof this.agentInstance.cleanup === 'function') {
      await this.agentInstance.cleanup();
    }
    
    this.isInitialized = false;
  }

  /**
   * Get agent status and capabilities
   */
  getStatus() {
    return {
      agentType: this.agentType,
      isInitialized: this.isInitialized,
      hasProcessMethod: this.hasMethod('process'),
      hasGenerateMethod: this.hasMethod('generate'),
      hasStartMethod: this.hasMethod('start'),
      hasStopMethod: this.hasMethod('stop'),
      adapterVersion: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if agent has a specific method
   */
  hasMethod(methodName) {
    return this.agentInstance[methodName] && typeof this.agentInstance[methodName] === 'function';
  }

  /**
   * Get agent metrics (if available)
   */
  getMetrics() {
    if (this.agentInstance.getMetrics && typeof this.agentInstance.getMetrics === 'function') {
      return this.agentInstance.getMetrics();
    }
    
    return {
      agentType: this.agentType,
      isInitialized: this.isInitialized,
      adapterVersion: '1.0.0'
    };
  }
}

/**
 * Factory Integration Adapter
 * Enhances the UEP Meta-Agent Factory with parameter mapping capabilities
 */
export class FactoryIntegrationAdapter {
  constructor(originalFactory) {
    this.originalFactory = originalFactory;
    this.adapters = new Map();
  }

  /**
   * Enhanced createAgent method with automatic adapter wrapping
   */
  async createAgent(agentType, agentId, config = {}) {
    // Create the original agent
    const originalAgent = await this.originalFactory.createAgent(agentType, agentId, config);
    
    // Wrap it with the integration adapter
    const adapter = new AgentIntegrationAdapter(originalAgent, agentType, config);
    
    // Store the adapter for management
    this.adapters.set(agentId, adapter);
    
    // Return the adapter which provides standardized interface
    return adapter;
  }

  /**
   * Get all managed adapters
   */
  getAdapters() {
    return Array.from(this.adapters.values());
  }

  /**
   * Get adapter by ID
   */
  getAdapter(agentId) {
    return this.adapters.get(agentId);
  }

  /**
   * Get factory statistics including adapter info
   */
  getStatistics() {
    const originalStats = this.originalFactory.getStatistics ? this.originalFactory.getStatistics() : {};
    
    return {
      ...originalStats,
      adaptersActive: this.adapters.size,
      adaptersById: Array.from(this.adapters.keys()),
      integrationLayerActive: true,
      adapterVersion: '1.0.0'
    };
  }

  /**
   * Cleanup all adapters
   */
  async cleanup() {
    // Stop all adapters
    for (const adapter of this.adapters.values()) {
      try {
        await adapter.stop();
      } catch (error) {
        console.warn(`Failed to stop adapter: ${error.message}`);
      }
    }
    
    // Clear adapters map
    this.adapters.clear();
    
    // Cleanup original factory
    if (this.originalFactory.cleanup && typeof this.originalFactory.cleanup === 'function') {
      await this.originalFactory.cleanup();
    }
  }
}

/**
 * Parameter Mapping Utilities
 * Based on Parameter Flow Agent principles
 */
export class ParameterMapper {
  /**
   * Map factory configuration to agent-specific configuration
   */
  static mapFactoryConfigToAgent(factoryConfig, agentType) {
    const baseConfig = {
      agentId: factoryConfig.agentId || `${agentType}-${Date.now()}`,
      logLevel: factoryConfig.logLevel || 'minimal',
      enableUEP: factoryConfig.enableUEP !== false,
      enableValidation: factoryConfig.enableValidation !== false
    };

    switch (agentType) {
      case 'prd-parser':
        return {
          ...baseConfig,
          watchDir: factoryConfig.watchDir || 'docs',
          outputDir: factoryConfig.outputDir || '.taskmaster/tasks',
          prdPattern: factoryConfig.prdPattern || /^prd_(.+)\.md$/,
          researchEnabled: factoryConfig.researchEnabled !== false,
          contextEnabled: factoryConfig.contextEnabled !== false,
          memoryEnabled: factoryConfig.memoryEnabled !== false
        };
        
      case 'scaffold-generator':
        return {
          ...baseConfig,
          outputDir: factoryConfig.outputDir || process.cwd(),
          templatesDir: factoryConfig.templatesDir || './src/meta-agents/scaffold-generator/templates',
          includeTests: factoryConfig.includeTests !== false,
          includeGitignore: factoryConfig.includeGitignore !== false,
          collisionDetection: factoryConfig.collisionDetection !== false,
          enhancedValidation: factoryConfig.enhancedValidation !== false,
          enhancedContext: factoryConfig.enhancedContext !== false
        };
        
      default:
        return baseConfig;
    }
  }

  /**
   * Map process input to agent-specific format
   */
  static mapProcessInput(input, agentType, options = {}) {
    switch (agentType) {
      case 'prd-parser':
        // PRD Parser expects filepath or content
        if (typeof input === 'string' && input.includes('# ')) {
          // This is content
          return input;
        } else {
          // This is a filepath
          return input;
        }
        
      case 'scaffold-generator':
        // Scaffold Generator expects structured data
        if (typeof input === 'string') {
          // Try to parse as JSON
          try {
            return JSON.parse(input);
          } catch {
            // Return as metadata object
            return {
              tasks: [],
              metadata: {
                projectName: options.agentName || 'generated-project',
                description: input
              }
            };
          }
        }
        return input;
        
      default:
        return input;
    }
  }
}

// Export for use in updated factory
export default {
  AgentIntegrationAdapter,
  FactoryIntegrationAdapter,
  ParameterMapper
};