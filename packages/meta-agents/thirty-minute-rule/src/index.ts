/**
 * Thirty-Minute Rule Agent - Main Export
 * 
 * The Anti-Debugging-Loop Guardian that prevents endless debugging by architecting
 * time-bounded problem solving with systematic debugging procedures.
 * 
 * Following All-Purpose Pattern: NO hardcoded limitations on project types or debugging scenarios
 */

export { ThirtyMinuteRuleAgent } from './core/ThirtyMinuteRuleAgent.js';
export { DebuggingSessionManager } from './core/DebuggingSessionManager.js';
export { ComponentIsolationTester } from './core/ComponentIsolationTester.js';
export { DebugEndpointGenerator } from './debug/DebugEndpointGenerator.js';

export * from './types/index.js';

// Re-export for convenience
export { default } from './core/ThirtyMinuteRuleAgent.js';

/**
 * Create a new Thirty-Minute Rule Agent with default configuration
 */
import { ThirtyMinuteRuleAgent } from './core/ThirtyMinuteRuleAgent.js';
import type { ThirtyMinuteRuleConfig } from './types/index.js';

export function createThirtyMinuteRuleAgent(config?: ThirtyMinuteRuleConfig): ThirtyMinuteRuleAgent {
  return new ThirtyMinuteRuleAgent(config);
}

/**
 * Quick-start function for common debugging scenarios
 */
export async function startQuickDebuggingSession(
  description: string,
  options?: {
    timeLimit?: number;
    component?: string;
    autoSetup?: boolean;
  }
): Promise<ThirtyMinuteRuleAgent> {
  const agent = new ThirtyMinuteRuleAgent({
    defaultTimeLimit: options?.timeLimit,
    autoGenerateEndpoints: options?.autoSetup !== false,
    isolationTestingEnabled: options?.autoSetup !== false
  });

  await agent.initialize();

  // Start the debugging session
  const sessionId = await agent.startDebuggingSession({
    description,
    component: options?.component,
    timeLimit: options?.timeLimit,
    autoGenerateEndpoints: options?.autoSetup !== false,
    runIsolationTests: options?.autoSetup !== false
  });

  console.log(`🚀 Quick debugging session started: ${sessionId}`);

  return agent;
}