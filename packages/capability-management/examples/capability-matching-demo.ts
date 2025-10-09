#!/usr/bin/env node

/**
 * UEP Capability Matching and Negotiation Demo
 * 
 * Demonstration of advanced capability matching and negotiation algorithms
 * including version compatibility, performance-based ranking, constraint
 * satisfaction, and Contract Net Protocol negotiation.
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.4
 */

import {
  CapabilityMatchingEngine,
  ContractNetProtocol,
  ConstraintSatisfactionSolver,
  AgentCapability,
  CapabilityRequirement,
  CapabilitySearchResult,
  MatchingCriteria,
  AgentPerformanceData
} from '../src/index.js';
import chalk from 'chalk';

// Sample agent capabilities for demonstration
const sampleCapabilities: AgentCapability[] = [
  {
    id: 'ml-inference',
    name: 'Machine Learning Inference Engine',
    version: { major: 2, minor: 1, patch: 0 },
    description: 'High-performance ML model inference with GPU acceleration',
    category: 'machine-learning',
    parameters: [
      {
        name: 'model',
        type: 'string',
        description: 'Model name or path',
        required: true
      },
      {
        name: 'input_data',
        type: 'array',
        description: 'Input data for inference',
        required: true
      }
    ],
    returns: {
      type: 'object',
      description: 'Inference results with confidence scores'
    },
    performance: {
      averageLatency: 150,
      maxLatency: 300,
      throughput: 200,
      resourceUsage: {
        cpu: 40,
        memory: 2048,
        storage: 100
      }
    },
    constraints: {
      platformRequirements: ['linux', 'gpu'],
      resourceRequirements: {
        minCpu: 4,
        minMemory: 1024,
        minStorage: 500
      }
    },
    reliability: {
      successRate: 0.98,
      errorHandling: ['retry', 'fallback'],
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'exponential',
        baseDelay: 1000
      }
    },
    tags: ['ml', 'inference', 'gpu', 'high-performance']
  },
  {
    id: 'ml-inference',
    name: 'ML Inference Service (CPU)',
    version: { major: 1, minor: 8, patch: 5 },
    description: 'CPU-based ML inference service with broader model support',
    category: 'machine-learning',
    parameters: [
      {
        name: 'model',
        type: 'string',
        description: 'Model name or path',
        required: true
      },
      {
        name: 'input_data',
        type: 'array',
        description: 'Input data for inference',
        required: true
      }
    ],
    returns: {
      type: 'object',
      description: 'Inference results'
    },
    performance: {
      averageLatency: 800,
      maxLatency: 2000,
      throughput: 50,
      resourceUsage: {
        cpu: 80,
        memory: 1024,
        storage: 200
      }
    },
    constraints: {
      platformRequirements: ['linux', 'windows', 'darwin'],
      resourceRequirements: {
        minCpu: 2,
        minMemory: 512,
        minStorage: 200
      }
    },
    reliability: {
      successRate: 0.95,
      errorHandling: ['retry'],
      retryPolicy: {
        maxRetries: 2,
        backoffStrategy: 'linear',
        baseDelay: 500
      }
    },
    tags: ['ml', 'inference', 'cpu', 'compatible']
  },
  {
    id: 'ml-inference',
    name: 'Legacy ML Service',
    version: { major: 1, minor: 2, patch: 1 },
    description: 'Legacy ML inference service with limited capabilities',
    category: 'machine-learning',
    parameters: [
      {
        name: 'model',
        type: 'string',
        description: 'Model name',
        required: true
      }
    ],
    returns: {
      type: 'object',
      description: 'Basic inference results'
    },
    performance: {
      averageLatency: 1500,
      maxLatency: 5000,
      throughput: 20
    },
    constraints: {
      platformRequirements: ['linux'],
      resourceRequirements: {
        minCpu: 1,
        minMemory: 256,
        minStorage: 100
      }
    },
    reliability: {
      successRate: 0.85,
      errorHandling: ['retry']
    },
    deprecated: true,
    deprecationNotice: 'Use newer ML inference services for better performance',
    tags: ['ml', 'inference', 'legacy']
  }
];

// Sample performance data for agents
const performanceData = new Map<string, AgentPerformanceData>([
  ['agent-1', {
    agentId: 'agent-1',
    capability: sampleCapabilities[0],
    metrics: {
      averageLatency: 145,
      throughput: 210,
      successRate: 0.99,
      availability: 0.98,
      currentLoad: 0.3,
      lastUpdated: new Date()
    },
    constraints: {
      satisfied: true,
      violations: [],
      score: 1.0
    }
  }],
  ['agent-2', {
    agentId: 'agent-2',
    capability: sampleCapabilities[1],
    metrics: {
      averageLatency: 750,
      throughput: 55,
      successRate: 0.96,
      availability: 0.99,
      currentLoad: 0.6,
      lastUpdated: new Date()
    },
    constraints: {
      satisfied: true,
      violations: [],
      score: 0.9
    }
  }],
  ['agent-3', {
    agentId: 'agent-3',
    capability: sampleCapabilities[2],
    metrics: {
      averageLatency: 1200,
      throughput: 25,
      successRate: 0.88,
      availability: 0.85,
      currentLoad: 0.8,
      lastUpdated: new Date()
    },
    constraints: {
      satisfied: false,
      violations: ['High latency', 'Low availability'],
      score: 0.6
    }
  }]
]);

async function demonstrateCapabilityMatching() {
  console.log(chalk.blue('\n🎯 === CAPABILITY MATCHING DEMONSTRATION ===\n'));
  
  // Create capability requirement
  const requirement: CapabilityRequirement = {
    capabilityId: 'ml-inference',
    versionRange: {
      operator: '>=',
      version: { major: 1, minor: 5, patch: 0 }
    },
    optional: false,
    constraints: {
      platformRequirements: ['linux'],
      resourceRequirements: {
        minCpu: 2,
        minMemory: 512
      }
    },
    priority: 8
  };
  
  console.log(chalk.cyan('📋 Capability Requirement:'));
  console.log(`   Capability: ${requirement.capabilityId}`);
  console.log(`   Version: ${requirement.versionRange?.operator}${requirement.versionRange?.version.major}.${requirement.versionRange?.version.minor}.${requirement.versionRange?.version.patch}`);
  console.log(`   Platform: ${requirement.constraints?.platformRequirements?.join(', ')}`);
  console.log(`   Min CPU: ${requirement.constraints?.resourceRequirements?.minCpu} cores`);
  console.log(`   Min Memory: ${requirement.constraints?.resourceRequirements?.minMemory} MB\n`);
  
  // Create search results from sample capabilities
  const searchResults: CapabilitySearchResult[] = sampleCapabilities.map((capability, index) => ({
    capability,
    agentId: `agent-${index + 1}`,
    compatibilityScore: 0.8,
    performanceScore: 0.7,
    overallScore: 0.75,
    matchReasons: ['Initial match']
  }));
  
  // Configure matching criteria
  const matchingCriteria: MatchingCriteria = {
    versionWeight: 0.3,
    allowPrerelease: false,
    performanceWeight: 0.4,
    latencyWeight: 0.4,
    throughputWeight: 0.3,
    reliabilityWeight: 0.3,
    constraintWeight: 0.3,
    hardConstraints: true,
    preferStable: true,
    preferLatest: true,
    loadBalancing: 'performance',
    enableNegotiation: true,
    negotiationTimeout: 5000,
    maxCandidates: 3
  };
  
  // Create and configure matching engine
  const matchingEngine = new CapabilityMatchingEngine(matchingCriteria);
  
  console.log(chalk.blue('🔍 Starting capability matching process...\n'));
  
  // Find best matches
  const matches = await matchingEngine.findBestMatches(
    requirement,
    searchResults,
    performanceData
  );
  
  // Display results
  console.log(chalk.green(`✅ Found ${matches.length} ranked matches:\n`));
  
  matches.forEach((match, index) => {
    const status = match.capability.deprecated ? '⚠️ DEPRECATED' : '✅ ACTIVE';
    console.log(chalk.magenta(`${index + 1}. Agent: ${match.agentId} ${status}`));
    console.log(`   Capability: ${match.capability.name}`);
    console.log(`   Version: ${match.capability.version.major}.${match.capability.version.minor}.${match.capability.version.patch}`);
    console.log(`   Scores:`);
    console.log(`     Version Compatibility: ${(match.compatibilityScore * 100).toFixed(1)}%`);
    console.log(`     Performance: ${(match.performanceScore * 100).toFixed(1)}%`);
    console.log(`     Constraints: ${(match.constraintScore * 100).toFixed(1)}%`);
    console.log(`     Overall: ${(match.overallScore * 100).toFixed(1)}%`);
    
    if (match.performanceData) {
      console.log(`   Real-time Metrics:`);
      console.log(`     Latency: ${match.performanceData.metrics.averageLatency}ms`);
      console.log(`     Throughput: ${match.performanceData.metrics.throughput} req/s`);
      console.log(`     Success Rate: ${(match.performanceData.metrics.successRate * 100).toFixed(1)}%`);
      console.log(`     Current Load: ${(match.performanceData.metrics.currentLoad * 100).toFixed(1)}%`);
    }
    
    console.log(`   Match Reasons: ${match.matchReasons.join(', ')}`);
    
    if (match.negotiationData) {
      console.log(`   Negotiation:`);
      console.log(`     Bid Price: ${match.negotiationData.bidPrice.toFixed(3)}`);
      console.log(`     Estimated Latency: ${match.negotiationData.estimatedLatency}ms`);
      console.log(`     Confidence: ${(match.negotiationData.confidence * 100).toFixed(1)}%`);
    }
    
    console.log('');
  });
  
  return matches;
}

async function demonstrateContractNetProtocol() {
  console.log(chalk.blue('\n🤝 === CONTRACT NET PROTOCOL DEMONSTRATION ===\n'));
  
  // Create Contract Net Protocol instance
  const cnp = new ContractNetProtocol();
  
  // Set up event listeners
  cnp.on('callForProposals', ({ sessionId, cfp }) => {
    console.log(chalk.cyan(`📢 Call for Proposals broadcasted for session: ${sessionId}`));
    console.log(`   Task: ${cfp.taskDescription}`);
    console.log(`   Deadline: ${cfp.deadline.toISOString()}`);
    console.log(`   Proposal Deadline: ${cfp.proposalDeadline.toISOString()}\n`);
    
    // Simulate agent responses
    setTimeout(() => simulateAgentProposals(cnp, sessionId), 1000);
  });
  
  cnp.on('proposalReceived', ({ sessionId, agentId, proposal }) => {
    console.log(chalk.blue(`📝 Proposal received from ${agentId}:`));
    console.log(`   Price: ${proposal.price.toFixed(3)}`);
    console.log(`   Completion Time: ${proposal.estimatedCompletionTime.toISOString()}`);
    console.log(`   Quality Guarantee: ${(proposal.qualityGuarantee * 100).toFixed(1)}%`);
    console.log(`   Reliability Score: ${(proposal.reliabilityScore * 100).toFixed(1)}%\n`);
  });
  
  cnp.on('contractAwarded', ({ sessionId, winnerAgentId, contractAward }) => {
    console.log(chalk.green(`🏆 Contract awarded to ${winnerAgentId}:`));
    console.log(`   Contract ID: ${contractAward.contractId}`);
    console.log(`   Final Price: ${contractAward.winningBid.price.toFixed(3)}`);
    console.log(`   Deliverables: ${contractAward.deliverables.join(', ')}`);
    console.log(`   Penalties:`);
    console.log(`     Late Delivery: ${contractAward.penalties.lateDelivery.toFixed(3)}`);
    console.log(`     Quality Breach: ${contractAward.penalties.qualityBreach.toFixed(3)}`);
    console.log(`     Cancellation: ${contractAward.penalties.cancellation.toFixed(3)}\n`);
  });
  
  // Create capability requirement for negotiation
  const requirement: CapabilityRequirement = {
    capabilityId: 'ml-inference',
    versionRange: {
      operator: '>=',
      version: { major: 2, minor: 0, patch: 0 }
    },
    constraints: {
      platformRequirements: ['linux'],
      resourceRequirements: {
        minCpu: 4,
        minMemory: 1024
      }
    }
  };
  
  // Initiate negotiation
  console.log(chalk.blue('🚀 Initiating Contract Net Protocol negotiation...\n'));
  
  const sessionId = await cnp.initiateNegotiation(
    'task-manager-001',
    'ml-task-001',
    requirement,
    {
      budget: 100,
      evaluationCriteria: {
        price: 0.4,
        quality: 0.3,
        delivery: 0.2,
        reliability: 0.1
      }
    }
  );
  
  // Wait for negotiation to complete
  await new Promise(resolve => {
    cnp.on('contractAwarded', resolve);
    cnp.on('negotiationFailed', resolve);
    
    // Timeout after 10 seconds
    setTimeout(resolve, 10000);
  });
  
  return sessionId;
}

function simulateAgentProposals(cnp: ContractNetProtocol, sessionId: string) {
  // Simulate proposals from different agents
  const proposals = [
    {
      agentId: 'agent-1',
      proposal: {
        bidId: 'bid-agent-1-001',
        price: 85.5,
        estimatedCompletionTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        qualityGuarantee: 0.98,
        reliabilityScore: 0.95,
        terms: { sla: '99.9%', support: '24/7' },
        capability: sampleCapabilities[0],
        agentExperience: {
          totalTasks: 150,
          successRate: 0.98,
          averageRating: 4.8,
          lastActivity: new Date()
        },
        constraints: {
          dependencies: ['gpu-driver'],
          exclusiveAccess: false,
          maxConcurrency: 5
        }
      }
    },
    {
      agentId: 'agent-2',
      proposal: {
        bidId: 'bid-agent-2-001',
        price: 75.0,
        estimatedCompletionTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
        qualityGuarantee: 0.90,
        reliabilityScore: 0.92,
        terms: { sla: '99.5%', support: 'business-hours' },
        capability: sampleCapabilities[1],
        agentExperience: {
          totalTasks: 80,
          successRate: 0.94,
          averageRating: 4.5,
          lastActivity: new Date()
        },
        constraints: {
          maxConcurrency: 3
        }
      }
    },
    {
      agentId: 'agent-3',
      proposal: {
        bidId: 'bid-agent-3-001',
        price: 45.0,
        estimatedCompletionTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        qualityGuarantee: 0.80,
        reliabilityScore: 0.85,
        terms: { sla: '95%' },
        capability: sampleCapabilities[2],
        agentExperience: {
          totalTasks: 200,
          successRate: 0.85,
          averageRating: 3.8,
          lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        },
        constraints: {
          maxConcurrency: 1
        }
      }
    }
  ];
  
  // Submit proposals with delays
  proposals.forEach((item, index) => {
    setTimeout(() => {
      cnp.submitProposal(sessionId, item.agentId, item.proposal);
    }, (index + 1) * 500);
  });
}

async function demonstrateConstraintSatisfaction() {
  console.log(chalk.blue('\n🧩 === CONSTRAINT SATISFACTION DEMONSTRATION ===\n'));
  
  // Create constraint satisfaction solver
  const solver = new ConstraintSatisfactionSolver();
  
  // Create capability requirement
  const requirement: CapabilityRequirement = {
    capabilityId: 'ml-inference',
    versionRange: {
      operator: '>=',
      version: { major: 1, minor: 5, patch: 0 }
    },
    constraints: {
      platformRequirements: ['linux'],
      resourceRequirements: {
        minCpu: 2,
        minMemory: 512
      }
    }
  };
  
  console.log(chalk.cyan('🎯 Solving capability constraints for agent selection...\n'));
  
  // Solve constraint satisfaction for all candidate capabilities
  const constraintResults = solver.solveCapabilityConstraints(requirement, sampleCapabilities);
  
  console.log(chalk.green(`✅ Constraint satisfaction results:\n`));
  
  constraintResults.forEach((result, index) => {
    const feasibilityStatus = result.feasible ? '✅ FEASIBLE' : '❌ INFEASIBLE';
    console.log(chalk.magenta(`${index + 1}. ${result.capability.name} ${feasibilityStatus}`));
    console.log(`   Agent ID: ${result.agentId}`);
    console.log(`   Version: ${result.capability.version.major}.${result.capability.version.minor}.${result.capability.version.patch}`);
    console.log(`   Satisfaction Score: ${(result.satisfactionScore * 100).toFixed(1)}%`);
    console.log(`   Constraint Violations: ${result.violationCount}`);
    
    if (result.variables.size > 0) {
      console.log(`   Variable Assignments:`);
      for (const [varName, value] of result.variables) {
        console.log(`     ${varName}: ${value}`);
      }
    }
    
    console.log('');
  });
  
  // Demonstrate custom CSP problem
  console.log(chalk.cyan('🔧 Creating custom CSP problem...\n'));
  
  const variables = new Map();
  variables.set('agent', solver.createVariable('agent', ['agent-1', 'agent-2', 'agent-3'], 10));
  variables.set('platform', solver.createVariable('platform', ['linux', 'windows', 'darwin'], 8));
  variables.set('memory', solver.createVariable('memory', [512, 1024, 2048, 4096], 7));
  
  const constraints = [
    solver.createConstraint(
      'agent_platform_compatibility',
      'hard',
      ['agent', 'platform'],
      (values) => {
        const agent = values.get('agent');
        const platform = values.get('platform');
        
        // Define agent-platform compatibility
        const compatibility = {
          'agent-1': ['linux'],
          'agent-2': ['linux', 'windows', 'darwin'],
          'agent-3': ['linux']
        };
        
        return compatibility[agent]?.includes(platform) || false;
      },
      'Agent must support the required platform',
      10
    ),
    solver.createConstraint(
      'memory_requirement',
      'hard',
      ['agent', 'memory'],
      (values) => {
        const agent = values.get('agent');
        const memory = values.get('memory');
        
        // Define minimum memory requirements per agent
        const requirements = {
          'agent-1': 1024,
          'agent-2': 512,
          'agent-3': 256
        };
        
        return memory >= requirements[agent];
      },
      'Agent must have sufficient memory',
      9
    ),
    solver.createConstraint(
      'performance_preference',
      'soft',
      ['agent'],
      (values) => {
        const agent = values.get('agent');
        // Prefer higher performance agents
        return agent === 'agent-1';
      },
      'Prefer high-performance agents',
      5,
      0.3
    )
  ];
  
  const cspProblem = {
    variables,
    constraints
  };
  
  console.log(chalk.blue('🔄 Solving custom CSP problem...\n'));
  
  const solution = solver.solve(cspProblem);
  
  console.log(chalk.green('📊 CSP Solution Results:'));
  console.log(`   Satisfied: ${solution.satisfied ? '✅ YES' : '❌ NO'}`);
  console.log(`   Satisfaction Score: ${(solution.satisfactionScore * 100).toFixed(1)}%`);
  console.log(`   Search Statistics:`);
  console.log(`     Nodes Explored: ${solution.searchStats.nodesExplored}`);
  console.log(`     Backtracks: ${solution.searchStats.backtrackCount}`);
  console.log(`     Constraint Checks: ${solution.searchStats.constraintChecks}`);
  console.log(`     Solution Time: ${solution.searchStats.solutionTime}ms`);
  
  if (solution.assignment.size > 0) {
    console.log(`   Variable Assignments:`);
    for (const [varName, value] of solution.assignment) {
      console.log(`     ${varName}: ${value}`);
    }
  }
  
  if (solution.hardViolations.length > 0) {
    console.log(`   Hard Violations: ${solution.hardViolations.join(', ')}`);
  }
  
  if (solution.softViolations.length > 0) {
    console.log(`   Soft Violations: ${solution.softViolations.join(', ')}`);
  }
  
  console.log('');
}

async function main() {
  try {
    console.log(chalk.green('🚀 UEP Capability Matching and Negotiation Algorithms Demo\n'));
    
    // Demonstrate capability matching
    const matches = await demonstrateCapabilityMatching();
    
    // Demonstrate Contract Net Protocol
    const sessionId = await demonstrateContractNetProtocol();
    
    // Demonstrate constraint satisfaction
    await demonstrateConstraintSatisfaction();
    
    console.log(chalk.green('\n✅ === DEMONSTRATION COMPLETED ==='));
    console.log(chalk.blue('All capability matching and negotiation algorithms demonstrated successfully!'));
    
  } catch (error) {
    console.error(chalk.red('❌ Demo failed:'), error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🔄 Demo interrupted by user'));
  process.exit(0);
});

// Start the demonstration
main().catch(console.error);