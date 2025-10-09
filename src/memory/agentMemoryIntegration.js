/**
 * Agent Memory Integration
 * Provides memory persistence and context awareness for meta-agents
 */

class AgentMemory {
  constructor(agentId) {
    this.agentId = agentId;
    this.memory = new Map();
    this.contextHistory = [];
  }

  async store(key, value) {
    this.memory.set(key, {
      value,
      timestamp: new Date().toISOString(),
      agentId: this.agentId
    });
  }

  async retrieve(key) {
    const entry = this.memory.get(key);
    return entry ? entry.value : null;
  }

  async addContext(context) {
    this.contextHistory.push({
      context,
      timestamp: new Date().toISOString()
    });
    // Keep only last 100 entries
    if (this.contextHistory.length > 100) {
      this.contextHistory.shift();
    }
  }

  async getRecentContext(limit = 10) {
    return this.contextHistory.slice(-limit);
  }

  async clear() {
    this.memory.clear();
    this.contextHistory = [];
  }
}

function createMemory(agentId) {
  return new AgentMemory(agentId);
}

function createMemoryEnhancedAgent(agentId, baseAgent) {
  const memory = createMemory(agentId);
  
  return {
    memory,
    async executeWithMemory(taskDescription, executeFn) {
      // Add task to context
      await memory.addContext(taskDescription);
      
      // Get recent context for the agent
      const recentContext = await memory.getRecentContext();
      const contextStr = recentContext
        .map(c => `[${c.timestamp}] ${c.context}`)
        .join('\n');
      
      // Execute with context
      const result = await executeFn(taskDescription, contextStr);
      
      // Store result in memory
      await memory.store(`task_${Date.now()}`, {
        task: taskDescription,
        result: result
      });
      
      return result;
    }
  };
}

// Export as ES modules
export { AgentMemory, createMemory, createMemoryEnhancedAgent };
