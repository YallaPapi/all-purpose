#!/usr/bin/env node

/**
 * Agent Memory Integration
 * Wraps the TypeScript working memory system for JavaScript agents
 * Provides seamless memory integration for all meta-agents
 */

require('dotenv').config();

// Since we're integrating with JS agents, we'll directly implement the Redis functions
const { Redis } = require('@upstash/redis');

// Redis client following existing project patterns
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Configuration
const MEMORY_DEPTH = parseInt(process.env.MEMORY_DEPTH || '20');

/**
 * Generate Redis key for agent memory
 * Format: agent:mem:{agentName}
 */
const memoryKey = (agent) => `agent:mem:${agent}`;

/**
 * Save task+result entry to Redis
 * Automatically maintains the last N entries (default: 20)
 * 
 * @param {string} agent - Agent name/identifier
 * @param {string} entry - Task and result information to store
 */
async function appendToMemory(agent, entry) {
  try {
    const key = memoryKey(agent);
    
    // Create timestamped entry
    const timestampedEntry = `[${new Date().toISOString()}] ${entry}`;
    
    // Add entry to the right side of the list (newest)
    await redis.rpush(key, timestampedEntry);
    
    // Trim to keep only the last MEMORY_DEPTH entries
    await redis.ltrim(key, -MEMORY_DEPTH, -1);
    
    console.log(`✅ Memory appended for agent '${agent}': ${entry.substring(0, 100)}...`);
    
  } catch (error) {
    console.error(`❌ Failed to append memory for agent '${agent}':`, error);
    // Don't throw - gracefully degrade without memory
  }
}

/**
 * Fetch and return concatenated memory string
 * Returns the last N entries in chronological order (oldest to newest)
 * 
 * @param {string} agent - Agent name/identifier
 * @returns {Promise<string>} Concatenated memory string or empty string if no memory/error
 */
async function getMemory(agent) {
  try {
    const key = memoryKey(agent);
    
    // Get all entries from the list (0 to -1 means all entries)
    const items = await redis.lrange(key, 0, -1);
    
    if (!items || items.length === 0) {
      console.log(`ℹ️  No memory found for agent '${agent}'`);
      return '';
    }
    
    // Join entries with double newlines for readability
    const memoryString = items.join('\n\n');
    
    console.log(`✅ Retrieved memory for agent '${agent}': ${items.length} entries`);
    
    return memoryString;
    
  } catch (error) {
    console.error(`❌ Failed to retrieve memory for agent '${agent}':`, error);
    // Return empty string on error for graceful degradation
    return '';
  }
}

/**
 * Clear all memory for an agent (useful for reset operations)
 * 
 * @param {string} agent - Agent name/identifier
 */
async function clearMemory(agent) {
  try {
    const key = memoryKey(agent);
    await redis.del(key);
    console.log(`✅ Memory cleared for agent '${agent}'`);
  } catch (error) {
    console.error(`❌ Failed to clear memory for agent '${agent}':`, error);
  }
}

/**
 * Get memory statistics for an agent
 * 
 * @param {string} agent - Agent name/identifier
 * @returns {Promise<Object>} Object with memory statistics
 */
async function getMemoryStats(agent) {
  try {
    const key = memoryKey(agent);
    const items = await redis.lrange(key, 0, -1);
    
    const stats = {
      entryCount: items?.length || 0,
      memorySize: items?.join('').length || 0,
      oldestEntry: items?.[0] || undefined,
      newestEntry: items?.[items?.length - 1] || undefined,
    };
    
    console.log(`📊 Memory stats for agent '${agent}':`, stats);
    return stats;
    
  } catch (error) {
    console.error(`❌ Failed to get memory stats for agent '${agent}':`, error);
    return { entryCount: 0, memorySize: 0 };
  }
}

/**
 * Enhanced agent task execution with automatic memory integration
 * This is the main function agents should use to wrap their task execution
 * 
 * @param {string} agentName - Agent name/identifier
 * @param {string} task - Description of the task being executed
 * @param {Function} executeTask - Function that executes the task and returns result
 * @returns {Promise<string>} Task execution result
 */
async function runAgentTaskWithMemory(agentName, task, executeTask) {
  
  // Get recent memory for context
  const memory = await getMemory(agentName);
  
  // Construct enhanced context for the task
  const contextualPrompt = memory ? 
    `Previous context for ${agentName}:\n${memory}\n\nCurrent task: ${task}` : 
    `Current task: ${task}`;
  
  console.log(`🧠 ${agentName} executing with ${memory ? `${memory.split('\n\n').length} previous memory entries` : 'no previous memory'}`);
  
  // Execute the task with contextual information
  const result = await executeTask(contextualPrompt, memory);
  
  // Store the task and result in memory
  await appendToMemory(agentName, `TASK: ${task}\nRESULT: ${result}`);
  
  return result;
}

/**
 * Agent Memory Wrapper Class
 * Provides easy integration for existing agent classes
 */
class AgentMemoryWrapper {
  constructor(agentName, baseAgent = null) {
    this.agentName = agentName;
    this.baseAgent = baseAgent;
  }

  /**
   * Wrap a method to automatically add memory integration
   * @param {string} methodName - Name of the method to wrap
   * @param {Function} originalMethod - Original method to wrap
   * @returns {Function} Memory-enhanced method
   */
  wrapMethodWithMemory(methodName, originalMethod) {
    return async (...args) => {
      const task = `${methodName}(${args.length} args)`;
      
      return await runAgentTaskWithMemory(
        this.agentName,
        task,
        async (contextualPrompt) => {
          // Call original method with enhanced context
          return await originalMethod.apply(this.baseAgent || this, args);
        }
      );
    };
  }

  /**
   * Execute a task with memory context
   * @param {string} taskDescription - Description of the task
   * @param {Function} taskFunction - Function to execute
   * @returns {Promise} Task result
   */
  async executeWithMemory(taskDescription, taskFunction) {
    return await runAgentTaskWithMemory(this.agentName, taskDescription, taskFunction);
  }

  /**
   * Get agent's memory
   * @returns {Promise<string>} Memory string
   */
  async getMemory() {
    return await getMemory(this.agentName);
  }

  /**
   * Append to agent's memory
   * @param {string} entry - Entry to append
   */
  async appendToMemory(entry) {
    return await appendToMemory(this.agentName, entry);
  }

  /**
   * Clear agent's memory
   */
  async clearMemory() {
    return await clearMemory(this.agentName);
  }

  /**
   * Get memory statistics
   * @returns {Promise<Object>} Memory stats
   */
  async getMemoryStats() {
    return await getMemoryStats(this.agentName);
  }
}

/**
 * Create memory-enhanced agent
 * @param {string} agentName - Agent name
 * @param {Object} baseAgent - Base agent instance (optional)
 * @returns {AgentMemoryWrapper} Memory-enhanced agent wrapper
 */
function createMemoryEnhancedAgent(agentName, baseAgent = null) {
  return new AgentMemoryWrapper(agentName, baseAgent);
}

module.exports = {
  // Core memory functions
  appendToMemory,
  getMemory,
  clearMemory,
  getMemoryStats,
  runAgentTaskWithMemory,
  
  // Integration classes
  AgentMemoryWrapper,
  createMemoryEnhancedAgent,
  
  // Configuration
  memoryConfig: {
    MEMORY_DEPTH,
    KEY_PREFIX: 'agent:mem:',
  }
};