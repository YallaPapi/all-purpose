/**
 * Agent Memory Service - Provides memory management for meta-agents
 */
export class AgentMemory {
    constructor() {
        this.memories = new Map();
    }

    /**
     * Store memory for an agent
     * @param {string} agentId 
     * @param {string} key 
     * @param {any} value 
     */
    store(agentId, key, value) {
        if (!this.memories.has(agentId)) {
            this.memories.set(agentId, new Map());
        }
        this.memories.get(agentId).set(key, {
            value,
            timestamp: Date.now()
        });
    }

    /**
     * Retrieve memory for an agent
     * @param {string} agentId 
     * @param {string} key 
     * @returns {any}
     */
    retrieve(agentId, key) {
        const agentMemory = this.memories.get(agentId);
        if (!agentMemory) return null;
        const entry = agentMemory.get(key);
        return entry ? entry.value : null;
    }

    /**
     * Clear memory for an agent
     * @param {string} agentId 
     */
    clear(agentId) {
        this.memories.delete(agentId);
    }

    /**
     * Get all memories for an agent
     * @param {string} agentId 
     * @returns {Object}
     */
    getAll(agentId) {
        const agentMemory = this.memories.get(agentId);
        if (!agentMemory) return {};
        
        const result = {};
        for (const [key, entry] of agentMemory.entries()) {
            result[key] = entry.value;
        }
        return result;
    }
}