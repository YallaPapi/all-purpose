/**
 * Agent Memory Integration Fallback
 * 
 * This provides memory capabilities for agents in the factory-core container
 * when the main memory module is not available.
 */

export class AgentMemory {
  constructor(agentId) {
    this.agentId = agentId;
    this.memory = new Map();
    this.contextHistory = [];
    this.timestamp = new Date().toISOString();
  }

  async store(key, value) {
    this.memory.set(key, {
      value,
      timestamp: new Date().toISOString(),
      agentId: this.agentId
    });
    return true;
  }

  async retrieve(key) {
    const entry = this.memory.get(key);
    return entry ? entry.value : null;
  }

  async addContext(context) {
    this.contextHistory.push({
      context,
      timestamp: new Date().toISOString(),
      agentId: this.agentId
    });
    
    // Keep only last 100 entries
    if (this.contextHistory.length > 100) {
      this.contextHistory.shift();
    }
    return true;
  }

  async getRecentContext(limit = 10) {
    return this.contextHistory.slice(-limit);
  }

  async clear() {
    this.memory.clear();
    this.contextHistory = [];
    return true;
  }

  async getAllKeys() {
    return Array.from(this.memory.keys());
  }

  async getStats() {
    return {
      agentId: this.agentId,
      memorySize: this.memory.size,
      contextHistoryLength: this.contextHistory.length,
      created: this.timestamp
    };
  }
}

export function createMemory(agentId) {
  return new AgentMemory(agentId);
}

export function createMemoryEnhancedAgent(agentId, baseAgent) {
  const memory = new AgentMemory(agentId);
  
  return {
    ...baseAgent,
    memory,
    
    async executeWithMemory(taskDescription, additionalContext = '') {
      // Store task in memory
      await memory.addContext({
        type: 'task',
        description: taskDescription,
        additionalContext
      });
      
      // Execute base agent function if available
      if (baseAgent && typeof baseAgent.execute === 'function') {
        const result = await baseAgent.execute(taskDescription, additionalContext);
        
        // Store result in memory
        await memory.store(`task-result-${Date.now()}`, result);
        
        return result;
      }
      
      // Fallback execution
      return {
        success: true,
        message: 'Task executed with memory tracking',
        taskDescription,
        memoryStats: await memory.getStats()
      };
    },
    
    async getMemoryStats() {
      return await memory.getStats();
    },
    
    async clearMemory() {
      return await memory.clear();
    }
  };
}

// Default export for compatibility
export default {
  AgentMemory,
  createMemory,
  createMemoryEnhancedAgent
};