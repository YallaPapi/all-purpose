/**
 * UEP Agent Integration Bridge
 * 
 * JavaScript bridge for integrating existing Node.js meta-agents with UEP system.
 * Provides easy integration for existing agents without requiring TypeScript migration.
 * 
 * Usage:
 *   const { enhanceAgentWithUEP } = require('./uep/agentIntegration');
 *   const enhancedAgent = await enhanceAgentWithUEP(myAgent, 'my-agent-id');
 */

const path = require('path');

// Dynamic import helper for TypeScript modules
async function importUEPWrapper() {
  try {
    // Try to import the compiled TypeScript module
    const { createUEPAgentWrapper } = require('../../dist/uep/UEPAgentWrapper.js');
    return createUEPAgentWrapper;
  } catch (error) {
    console.warn('⚠️ UEP TypeScript modules not found. UEP features will be disabled.');
    console.warn('   Run: npm run build or npx tsc to compile UEP modules');
    return null;
  }
}

/**
 * Enhance an existing Node.js agent with UEP capabilities
 * @param {Object} agent - The agent to enhance
 * @param {string} agentId - Unique identifier for the agent
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Enhanced agent with UEP integration
 */
async function enhanceAgentWithUEP(agent, agentId, options = {}) {
  try {
    const createWrapper = await importUEPWrapper();
    
    if (!createWrapper) {
      // Return agent with UEP disabled if TypeScript modules not available
      return createFallbackWrapper(agent, agentId, options);
    }

    // Configure UEP wrapper
    const uepConfig = {
      enableUEP: options.enableUEP !== false,
      enableValidation: options.enableValidation !== false,
      enableMemoryIntegration: options.enableMemoryIntegration !== false,
      enableCaching: options.enableCaching !== false,
      enableDebugMode: options.enableDebugMode || false,
      timeout: options.timeout || 60000,
      agentType: options.agentType || 'meta-agent',
      workingDirectory: options.workingDirectory || process.cwd(),
      logLevel: options.logLevel || 'minimal'
    };

    // Create UEP wrapper
    const wrapper = createWrapper(uepConfig);
    
    // Wrap the agent
    const wrappedAgent = await wrapper.wrapAgent(agent, agentId, options.agentType);
    
    // Add convenience methods for JavaScript usage
    return enhanceForJavaScript(wrappedAgent, wrapper);

  } catch (error) {
    console.error(`❌ Failed to enhance agent ${agentId} with UEP:`, error.message);
    console.warn(`⚠️ Falling back to non-UEP wrapper for agent ${agentId}`);
    
    // Return fallback wrapper if UEP enhancement fails
    return createFallbackWrapper(agent, agentId, options);
  }
}

/**
 * Create fallback wrapper when UEP is not available
 */
function createFallbackWrapper(agent, agentId, options) {
  console.log(`🔄 Creating fallback wrapper for agent ${agentId} (UEP disabled)`);
  
  return {
    originalAgent: agent,
    agentId,
    agentType: options.agentType || 'meta-agent',
    isUEPEnabled: false,
    
    // Pass-through process method
    process: async (input, processOptions = {}) => {
      const startTime = Date.now();
      
      try {
        let result;
        
        if (typeof agent.process === 'function') {
          result = await agent.process(input, processOptions);
        } else if (typeof agent._processCore === 'function') {
          result = await agent._processCore(input);
        } else if (typeof agent === 'function') {
          result = await agent(input, processOptions);
        } else {
          throw new Error('Agent does not have a recognizable process method');
        }

        return {
          success: true,
          result,
          processingTime: Date.now() - startTime,
          originalResult: result,
          agentId,
          timestamp: new Date().toISOString(),
          uepEnabled: false
        };

      } catch (error) {
        return {
          success: false,
          result: { error: error.message },
          processingTime: Date.now() - startTime,
          originalResult: null,
          agentId,
          timestamp: new Date().toISOString(),
          uepEnabled: false
        };
      }
    },

    // Preserve original methods
    initialize: agent.initialize ? agent.initialize.bind(agent) : undefined,
    cleanup: agent.cleanup ? agent.cleanup.bind(agent) : undefined,
    
    getStatus: () => {
      const originalStatus = agent.getStatus ? agent.getStatus() : { initialized: true };
      return {
        ...originalStatus,
        uep: {
          enabled: false,
          agentId,
          agentType: options.agentType || 'meta-agent',
          wrapperVersion: '1.0.0-fallback'
        }
      };
    },

    // Additional convenience methods
    isEnhanced: () => false,
    getOriginalAgent: () => agent,
    getAgentId: () => agentId
  };
}

/**
 * Enhance wrapped agent with JavaScript-friendly methods
 */
function enhanceForJavaScript(wrappedAgent, wrapper) {
  return {
    ...wrappedAgent,
    
    // Additional convenience methods for JavaScript usage
    isEnhanced: () => wrappedAgent.isUEPEnabled,
    getOriginalAgent: () => wrappedAgent.originalAgent,
    getAgentId: () => wrappedAgent.agentId,
    getWrapper: () => wrapper,
    
    // Simplified process method that returns just the result for backward compatibility
    processSimple: async (input, options = {}) => {
      const result = await wrappedAgent.process(input, options);
      return result.success ? result.result : result;
    },

    // Method to check UEP status
    getUEPStatus: () => ({
      enabled: wrappedAgent.isUEPEnabled,
      agentId: wrappedAgent.agentId,
      agentType: wrappedAgent.agentType,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Create a UEP-enhanced agent factory
 * @param {Object} factoryConfig - Configuration for the agent factory
 * @returns {Object} Enhanced agent factory
 */
async function createUEPAgentFactory(factoryConfig = {}) {
  const createWrapper = await importUEPWrapper();
  
  if (!createWrapper) {
    console.warn('⚠️ UEP not available. Creating fallback factory.');
    return createFallbackFactory(factoryConfig);
  }

  const defaultConfig = {
    enableUEP: true,
    enableValidation: true,
    enableMemoryIntegration: true,
    enableCaching: true,
    enableDebugMode: false,
    timeout: 60000,
    workingDirectory: process.cwd(),
    logLevel: 'minimal',
    ...factoryConfig
  };

  const wrapper = createWrapper(defaultConfig);
  const enhancedAgents = new Map();

  return {
    // Enhanced agent creation
    createAgent: async (agentClass, agentId, agentConfig = {}) => {
      try {
        // Create agent instance
        const agentInstance = new agentClass({
          ...agentConfig,
          agentId,
          memoryEnabled: defaultConfig.enableMemoryIntegration
        });

        // Initialize if needed
        if (agentInstance.initialize) {
          await agentInstance.initialize();
        }

        // Wrap with UEP
        const enhanced = await wrapper.wrapAgent(agentInstance, agentId, agentConfig.agentType);
        const jsEnhanced = enhanceForJavaScript(enhanced, wrapper);
        
        enhancedAgents.set(agentId, jsEnhanced);
        
        console.log(`✅ Created UEP-enhanced agent: ${agentId}`);
        return jsEnhanced;

      } catch (error) {
        console.error(`❌ Failed to create enhanced agent ${agentId}:`, error.message);
        throw error;
      }
    },

    // Get enhanced agent by ID
    getAgent: (agentId) => enhancedAgents.get(agentId),

    // List all enhanced agents
    listAgents: () => Array.from(enhancedAgents.keys()),

    // Remove agent
    removeAgent: async (agentId) => {
      const agent = enhancedAgents.get(agentId);
      if (agent && agent.cleanup) {
        await agent.cleanup();
      }
      enhancedAgents.delete(agentId);
      console.log(`🗑️ Removed agent: ${agentId}`);
    },

    // Get factory statistics
    getStatistics: () => ({
      totalAgents: enhancedAgents.size,
      uepEnabled: defaultConfig.enableUEP,
      configuration: defaultConfig,
      agents: Array.from(enhancedAgents.values()).map(agent => ({
        id: agent.getAgentId(),
        type: agent.agentType,
        enhanced: agent.isEnhanced()
      }))
    }),

    // Cleanup all agents
    cleanup: async () => {
      const cleanupPromises = Array.from(enhancedAgents.values())
        .filter(agent => agent.cleanup)
        .map(agent => agent.cleanup());
      
      await Promise.allSettled(cleanupPromises);
      enhancedAgents.clear();
      console.log('🧹 Agent factory cleanup completed');
    }
  };
}

/**
 * Create fallback factory when UEP is not available
 */
function createFallbackFactory(factoryConfig) {
  console.log('🔄 Creating fallback agent factory (UEP disabled)');
  
  const agents = new Map();

  return {
    createAgent: async (agentClass, agentId, agentConfig = {}) => {
      const agentInstance = new agentClass({
        ...agentConfig,
        agentId
      });

      if (agentInstance.initialize) {
        await agentInstance.initialize();
      }

      const wrapper = createFallbackWrapper(agentInstance, agentId, agentConfig);
      agents.set(agentId, wrapper);
      
      console.log(`✅ Created fallback agent: ${agentId}`);
      return wrapper;
    },

    getAgent: (agentId) => agents.get(agentId),
    listAgents: () => Array.from(agents.keys()),
    
    removeAgent: async (agentId) => {
      const agent = agents.get(agentId);
      if (agent && agent.cleanup) {
        await agent.cleanup();
      }
      agents.delete(agentId);
    },

    getStatistics: () => ({
      totalAgents: agents.size,
      uepEnabled: false,
      configuration: factoryConfig
    }),

    cleanup: async () => {
      const cleanupPromises = Array.from(agents.values())
        .filter(agent => agent.cleanup)
        .map(agent => agent.cleanup());
      
      await Promise.allSettled(cleanupPromises);
      agents.clear();
    }
  };
}

/**
 * Integration helper for existing agents
 */
async function integrateExistingAgent(agentPath, agentId, options = {}) {
  try {
    // Dynamically require the agent
    const AgentClass = require(path.resolve(agentPath));
    
    // Handle different export patterns
    const ActualAgent = AgentClass.default || AgentClass.main || AgentClass;
    
    if (typeof ActualAgent === 'function') {
      // Agent is a class
      return await enhanceAgentWithUEP(ActualAgent, agentId, options);
    } else if (typeof ActualAgent === 'object' && ActualAgent.process) {
      // Agent is an object with process method
      return await enhanceAgentWithUEP(ActualAgent, agentId, options);
    } else {
      throw new Error(`Invalid agent format at ${agentPath}`);
    }

  } catch (error) {
    console.error(`❌ Failed to integrate agent from ${agentPath}:`, error.message);
    throw error;
  }
}

module.exports = {
  enhanceAgentWithUEP,
  createUEPAgentFactory,
  integrateExistingAgent,
  createFallbackWrapper
};