/**
 * Working Memory System for AI Agents
 * Persistent Redis-based memory to store and retrieve recent task history per agent
 */

import { Redis } from '@upstash/redis';

// Redis client following existing project patterns
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Configuration
const MEMORY_DEPTH = parseInt(process.env.MEMORY_DEPTH || '20');

/**
 * Generate Redis key for agent memory
 * Format: agent:mem:{agentName}
 */
const memoryKey = (agent: string): string => `agent:mem:${agent}`;

/**
 * Save task+result entry to Redis
 * Automatically maintains the last N entries (default: 20)
 * 
 * @param agent - Agent name/identifier
 * @param entry - Task and result information to store
 */
export async function appendToMemory(agent: string, entry: string): Promise<void> {
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
 * @param agent - Agent name/identifier
 * @returns Concatenated memory string or empty string if no memory/error
 */
export async function getMemory(agent: string): Promise<string> {
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
 * @param agent - Agent name/identifier
 */
export async function clearMemory(agent: string): Promise<void> {
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
 * @param agent - Agent name/identifier
 * @returns Object with memory statistics
 */
export async function getMemoryStats(agent: string): Promise<{
  entryCount: number;
  memorySize: number;
  oldestEntry?: string;
  newestEntry?: string;
}> {
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
 * List all agents that have memory stored
 * 
 * @returns Array of agent names with stored memory
 */
export async function listAgentsWithMemory(): Promise<string[]> {
  try {
    // Scan for all keys matching the memory pattern
    const keys = await redis.keys('agent:mem:*');
    
    // Extract agent names from keys
    const agents = keys.map(key => key.replace('agent:mem:', ''));
    
    console.log(`📋 Found ${agents.length} agents with memory:`, agents);
    return agents;
    
  } catch (error) {
    console.error('❌ Failed to list agents with memory:', error);
    return [];
  }
}

/**
 * Example usage in agent code
 * This shows how to integrate memory into an existing agent
 */
export async function runAgentTaskWithMemory(
  agentName: string, 
  task: string, 
  executeTask: (prompt: string) => Promise<string>
): Promise<string> {
  
  // Get recent memory for context
  const memory = await getMemory(agentName);
  
  // Construct prompt with memory context
  const prompt = `
You are ${agentName}.

${memory ? `Here is what you've recently done:\n${memory}\n` : ''}

Your current task is: ${task}
  `.trim();
  
  // Execute the task
  const result = await executeTask(prompt);
  
  // Store the task and result in memory
  await appendToMemory(agentName, `TASK: ${task}\nRESULT: ${result}`);
  
  return result;
}

// Export configuration for external use
export const memoryConfig = {
  MEMORY_DEPTH,
  KEY_PREFIX: 'agent:mem:',
};