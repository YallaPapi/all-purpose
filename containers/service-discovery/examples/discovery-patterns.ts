/**
 * Service Discovery Patterns Examples
 * Task 191.3: Common patterns for service discovery in UEP agents
 */

import { ServiceDiscoveryClient, createRedisOnlyConfig } from '../ServiceDiscoveryClient.js';
import { createAgentHelper } from '../AgentServiceHelper.js';

/**
 * Pattern 1: Load-Balanced Service Selection
 * Select the best available agent based on current load and performance
 */
export async function loadBalancedSelection() {
  const client = new ServiceDiscoveryClient(createRedisOnlyConfig());
  await client.initialize();

  // Find the least loaded PRD parser
  const result = await client.discoverAgents({
    agentType: 'prd-parser',
    healthyOnly: true,
    maxLoad: 80,
    sortBy: 'load',
    sortOrder: 'asc',
    limit: 1
  });

  if (result.agents.length > 0) {
    const bestAgent = result.agents[0];
    console.log(`Selected agent ${bestAgent.agentId} with ${bestAgent.currentMetrics.currentLoad}% load`);
    return bestAgent;
  } else {
    console.log('No suitable agents found');
    return null;
  }
}

/**
 * Pattern 2: Capability-Based Discovery
 * Find agents that have specific capabilities
 */
export async function capabilityBasedDiscovery() {
  const client = new ServiceDiscoveryClient(createRedisOnlyConfig());
  await client.initialize();

  // Find agents that can both parse and validate
  const capableAgents = await client.discoverAgents({
    capabilities: ['parsing', 'validation'],
    healthyOnly: true,
    environment: 'production'
  });

  console.log(`Found ${capableAgents.agents.length} agents with parsing and validation capabilities`);
  return capableAgents.agents;
}

/**
 * Pattern 3: Circuit Breaker with Fallback
 * Implement circuit breaker pattern for resilient service discovery
 */
export class ResilientServiceDiscovery {
  private client: ServiceDiscoveryClient;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime?: Date;
  private fallbackAgents: any[] = [];

  constructor() {
    this.client = new ServiceDiscoveryClient(createRedisOnlyConfig({
      client: {
        circuitBreakerEnabled: true,
        circuitBreakerThreshold: 3,
        circuitBreakerTimeout: 30000
      }
    }));

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('circuitBreakerOpen', () => {
      this.circuitBreakerState = 'open';
      console.warn('Service discovery circuit breaker opened - using fallback');
    });

    this.client.on('circuitBreakerReset', () => {
      this.circuitBreakerState = 'closed';
      this.failureCount = 0;
      console.info('Service discovery circuit breaker reset');
    });
  }

  async findAgentWithFallback(agentType: string): Promise<any> {
    try {
      if (this.circuitBreakerState === 'open') {
        return this.getFallbackAgent(agentType);
      }

      const result = await this.client.discoverAgents({
        agentType,
        healthyOnly: true,
        limit: 1
      });

      if (result.agents.length > 0) {
        // Cache successful result as fallback
        this.fallbackAgents = result.agents;
        return result.agents[0];
      } else {
        return this.getFallbackAgent(agentType);
      }

    } catch (error) {
      console.warn(`Service discovery failed, using fallback: ${error instanceof Error ? error.message : String(error)}`);
      return this.getFallbackAgent(agentType);
    }
  }

  private getFallbackAgent(agentType: string): any {
    const fallback = this.fallbackAgents.find(agent => agent.agentType === agentType);
    if (fallback) {
      console.log(`Using fallback agent: ${fallback.agentId}`);
      return fallback;
    }

    // Ultimate fallback - hardcoded known-good agents
    const hardcodedFallbacks: Record<string, any> = {
      'prd-parser': {
        agentId: 'fallback-prd-parser',
        network: { address: 'prd-parser-service', port: 3000 }
      }
    };

    return hardcodedFallbacks[agentType] || null;
  }
}

/**
 * Pattern 4: Service Mesh Integration
 * Integrate with service mesh for advanced routing and load balancing
 */
export class ServiceMeshIntegration {
  private helper;

  constructor() {
    this.helper = createAgentHelper({
      agentType: 'service-mesh-aware',
      host: 'localhost',
      port: 3000,
      capabilities: ['mesh-integration']
    });
  }

  async findAgentViaServiceMesh(serviceName: string): Promise<any> {
    // First try service discovery
    const agents = await this.helper.findAgents(serviceName, { healthy: true, limit: 1 });
    
    if (agents.length > 0) {
      return agents[0];
    }

    // Fallback to service mesh DNS
    return {
      agentId: 'mesh-' + serviceName,
      network: {
        address: `${serviceName}.uep.svc.cluster.local`,
        port: 80
      }
    };
  }

  async makeServiceMeshRequest(serviceName: string, path: string, options: any = {}): Promise<any> {
    const agent = await this.findAgentViaServiceMesh(serviceName);
    
    const url = `http://${agent.network.address}:${agent.network.port}${path}`;
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Mesh': 'true',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    return response.json();
  }
}

/**
 * Pattern 5: Coordinated Multi-Agent Workflows
 * Orchestrate complex workflows across multiple agents
 */
export class WorkflowOrchestrator {
  private helper;

  constructor() {
    this.helper = createAgentHelper({
      agentType: 'workflow-orchestrator',
      host: 'localhost',
      port: 3000,
      capabilities: ['orchestration', 'workflow-management']
    });
  }

  async executeWorkflow(workflowSteps: Array<{
    agentType: string;
    endpoint: string;
    payload: any;
    dependencies?: string[];
  }>): Promise<any> {
    const results: Record<string, any> = {};
    const errors: Array<{ step: string; error: string }> = [];

    // Execute steps in dependency order
    for (const step of workflowSteps) {
      try {
        // Wait for dependencies
        if (step.dependencies) {
          for (const dep of step.dependencies) {
            if (!results[dep]) {
              throw new Error(`Dependency ${dep} not completed`);
            }
          }
        }

        // Find best agent for this step
        const agent = await this.helper.getBestAgent(step.agentType, {
          maxLoad: 70,
          maxResponseTime: 1000
        });

        if (!agent) {
          throw new Error(`No available agents of type ${step.agentType}`);
        }

        // Execute step
        const response = await fetch(
          `http://${agent.network.address}:${agent.network.port}${step.endpoint}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...step.payload,
              workflowContext: results // Pass previous results
            })
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        results[step.agentType] = result;

        console.log(`Workflow step ${step.agentType} completed successfully`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ step: step.agentType, error: errorMsg });
        console.error(`Workflow step ${step.agentType} failed: ${errorMsg}`);
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors
    };
  }
}

/**
 * Pattern 6: Health-Aware Load Distribution
 * Distribute load based on real-time health and performance metrics
 */
export class HealthAwareLoadBalancer {
  private client: ServiceDiscoveryClient;
  private healthCache: Map<string, { health: number; timestamp: number }> = new Map();

  constructor() {
    this.client = new ServiceDiscoveryClient(createRedisOnlyConfig());
  }

  async selectOptimalAgent(agentType: string, requestComplexity: 'low' | 'medium' | 'high' = 'medium'): Promise<any> {
    // Get all healthy agents of the type
    const result = await this.client.discoverAgents({
      agentType,
      healthyOnly: true,
      sortBy: 'load',
      sortOrder: 'asc'
    });

    if (result.agents.length === 0) {
      throw new Error(`No healthy agents of type ${agentType} available`);
    }

    // Calculate health scores
    const scoredAgents = await Promise.all(
      result.agents.map(async (agent) => {
        const healthScore = await this.calculateHealthScore(agent, requestComplexity);
        return { agent, healthScore };
      })
    );

    // Sort by health score (highest first)
    scoredAgents.sort((a, b) => b.healthScore - a.healthScore);

    const selectedAgent = scoredAgents[0].agent;
    console.log(`Selected agent ${selectedAgent.agentId} with health score ${scoredAgents[0].healthScore.toFixed(2)}`);

    return selectedAgent;
  }

  private async calculateHealthScore(agent: any, complexity: string): Promise<number> {
    let score = 100; // Start with perfect score

    // Penalize high load
    score -= agent.currentMetrics.currentLoad;

    // Penalize high response time
    if (agent.currentMetrics.averageResponseTime > 100) {
      score -= (agent.currentMetrics.averageResponseTime - 100) / 10;
    }

    // Penalize high error rate
    score -= agent.currentMetrics.errorRate * 1000;

    // Penalize high queue length
    score -= agent.currentMetrics.queueLength * 5;

    // Adjust for request complexity
    const complexityMultipliers = { low: 1.2, medium: 1.0, high: 0.8 };
    score *= complexityMultipliers[complexity];

    // Check recent health from cache
    const cachedHealth = this.healthCache.get(agent.agentId);
    if (cachedHealth && Date.now() - cachedHealth.timestamp < 60000) {
      score *= cachedHealth.health / 100;
    }

    return Math.max(0, Math.min(100, score));
  }

  async updateAgentHealth(agentId: string, health: number): void {
    this.healthCache.set(agentId, {
      health: Math.max(0, Math.min(100, health)),
      timestamp: Date.now()
    });
  }
}

// Example usage of all patterns
export async function demonstratePatterns() {
  console.log('=== Service Discovery Patterns Demo ===\n');

  // Pattern 1: Load-balanced selection
  console.log('1. Load-Balanced Selection:');
  await loadBalancedSelection();

  // Pattern 2: Capability-based discovery
  console.log('\n2. Capability-Based Discovery:');
  await capabilityBasedDiscovery();

  // Pattern 3: Resilient discovery with circuit breaker
  console.log('\n3. Resilient Service Discovery:');
  const resilientDiscovery = new ResilientServiceDiscovery();
  await resilientDiscovery.findAgentWithFallback('prd-parser');

  // Pattern 4: Service mesh integration
  console.log('\n4. Service Mesh Integration:');
  const meshIntegration = new ServiceMeshIntegration();
  await meshIntegration.findAgentViaServiceMesh('scaffold-generator');

  // Pattern 5: Workflow orchestration
  console.log('\n5. Workflow Orchestration:');
  const orchestrator = new WorkflowOrchestrator();
  const workflowResult = await orchestrator.executeWorkflow([
    {
      agentType: 'prd-parser',
      endpoint: '/parse',
      payload: { content: 'sample PRD' }
    },
    {
      agentType: 'scaffold-generator',
      endpoint: '/generate',
      payload: { type: 'api' },
      dependencies: ['prd-parser']
    }
  ]);
  console.log('Workflow result:', workflowResult.success ? 'SUCCESS' : 'FAILED');

  // Pattern 6: Health-aware load balancing
  console.log('\n6. Health-Aware Load Balancing:');
  const loadBalancer = new HealthAwareLoadBalancer();
  await loadBalancer.selectOptimalAgent('prd-parser', 'high');

  console.log('\n=== Demo Complete ===');
}

// Run demo if this file is executed directly
if (require.main === module) {
  demonstratePatterns().catch(console.error);
}