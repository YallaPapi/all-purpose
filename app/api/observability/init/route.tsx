/**
 * Observability Initialization API
 * 
 * Serverless-compatible initialization for Vercel deployment
 * Initializes coordinator and creates sample data for demonstration
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Sample agent data for demonstration
const SAMPLE_AGENTS = [
  {
    id: 'all-purpose-pattern-001',
    name: 'All-Purpose Pattern Agent',
    type: 'all-purpose-pattern',
    status: 'idle',
    capabilities: ['pattern-detection', 'code-analysis', 'anti-pattern-removal'],
    location: './src/meta-agents/all-purpose-pattern',
    lastSeen: new Date().toISOString()
  },
  {
    id: 'template-engine-001', 
    name: 'Template Engine Factory',
    type: 'template-engine',
    status: 'idle',
    capabilities: ['template-generation', 'code-scaffolding', 'dynamic-content'],
    location: './src/meta-agents/template-engine-factory',
    lastSeen: new Date().toISOString()
  },
  {
    id: 'parameter-flow-001',
    name: 'Parameter Flow Agent', 
    type: 'parameter-flow',
    status: 'idle',
    capabilities: ['integration-mapping', 'data-transformation', 'flow-validation'],
    location: './src/meta-agents/parameter-flow',
    lastSeen: new Date().toISOString()
  },
  {
    id: 'scaffold-generator-001',
    name: 'Scaffold Generator Agent',
    type: 'scaffold-generator', 
    status: 'working',
    capabilities: ['project-scaffolding', 'file-generation', 'template-processing'],
    location: './src/meta-agents/scaffold-generator',
    lastSeen: new Date().toISOString()
  },
  {
    id: 'prd-parser-001',
    name: 'PRD Parser Agent',
    type: 'prd-parser',
    status: 'idle', 
    capabilities: ['requirement-parsing', 'task-generation', 'git-integration'],
    location: './src/meta-agents/prd-parser',
    lastSeen: new Date().toISOString()
  },
  {
    id: 'vercel-native-001',
    name: 'Vercel Native Architecture Agent',
    type: 'vercel-native',
    status: 'idle',
    capabilities: ['deployment-optimization', 'serverless-architecture', 'performance-monitoring'],
    location: './src/meta-agents/vercel-native-architecture', 
    lastSeen: new Date().toISOString()
  },
  {
    id: 'thirty-minute-rule-001',
    name: 'Thirty Minute Rule Agent',
    type: 'thirty-minute-rule',
    status: 'idle',
    capabilities: ['debug-endpoint-generation', 'component-isolation', 'fallback-strategies'],
    location: './src/meta-agents/thirty-minute-rule',
    lastSeen: new Date().toISOString()
  },
  {
    id: 'five-document-framework-001', 
    name: 'Five Document Framework Agent',
    type: 'five-document-framework',
    status: 'working',
    capabilities: ['documentation-generation', 'consistency-validation', 'template-processing'],
    location: './src/meta-agents/five-document-framework',
    lastSeen: new Date().toISOString()
  },
  {
    id: 'infra-orchestrator-001',
    name: 'Infrastructure Orchestrator Agent',
    type: 'infra-orchestrator', 
    status: 'idle',
    capabilities: ['pattern-detection', 'infrastructure-orchestration', 'template-based-solutions'],
    location: './src/meta-agents/infra-orchestrator',
    lastSeen: new Date().toISOString()
  }
];

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'full';

  try {
    switch (action) {
      case 'full':
        await initializeFullSystem();
        break;
      case 'agents':
        await initializeAgents();
        break;
      case 'tasks':
        await initializeTasks();
        break;
      case 'knowledge':
        await initializeKnowledge();
        break;
      case 'clear':
        await clearAllData();
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Observability system initialized (${action})`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Initialization error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function initializeFullSystem() {
  await Promise.all([
    initializeAgents(),
    initializeTasks(), 
    initializeKnowledge(),
    initializeMetrics()
  ]);
}

async function initializeAgents() {
  // Store agent data
  for (const agent of SAMPLE_AGENTS) {
    await redis.hset(`observability:agent:${agent.id}`, {
      name: agent.name,
      type: agent.type,
      status: agent.status,
      capabilities: JSON.stringify(agent.capabilities),
      location: agent.location,
      lastSeen: agent.lastSeen,
      tasksCompleted: Math.floor(Math.random() * 10),
      knowledgeShared: Math.floor(Math.random() * 5),
      errorRate: Math.random() * 0.1
    });

    // Create registration event
    await recordEvent({
      eventType: 'agent',
      eventName: 'agent_registered',
      agentId: agent.id,
      data: {
        agentName: agent.name,
        agentType: agent.type,
        capabilities: agent.capabilities,
        status: agent.status
      },
      metadata: {
        newState: agent.status,
        tags: ['agent', 'registration', agent.type]
      }
    });
  }
}

async function initializeTasks() {
  const sampleTasks = [
    {
      id: 'task-001',
      requestingAgentId: 'all-purpose-pattern-001',
      assignedAgentId: 'template-engine-001',
      taskType: 'generation',
      description: 'Generate templates for anti-pattern fixes',
      priority: 'high',
      status: 'completed',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      completedAt: new Date(Date.now() - 1800000).toISOString() // 30 min ago
    },
    {
      id: 'task-002', 
      requestingAgentId: 'scaffold-generator-001',
      assignedAgentId: 'parameter-flow-001',
      taskType: 'validation',
      description: 'Validate integration flow for generated templates',
      priority: 'medium',
      status: 'in_progress',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      startedAt: new Date(Date.now() - 900000).toISOString() // 15 min ago
    },
    {
      id: 'task-003',
      requestingAgentId: 'prd-parser-001',
      taskType: 'analysis',
      description: 'Analyze requirements for new feature implementation',
      priority: 'high',
      status: 'pending',
      createdAt: new Date(Date.now() - 300000).toISOString() // 5 min ago
    }
  ];

  for (const task of sampleTasks) {
    // Store task data
    await redis.hset(`observability:task:${task.id}`, task);

    // Create task events
    await recordEvent({
      eventType: 'task',
      eventName: 'task_created',
      taskId: task.id,
      agentId: task.requestingAgentId,
      data: {
        taskType: task.taskType,
        description: task.description,
        priority: task.priority,
        assignedAgent: task.assignedAgentId
      },
      metadata: {
        newState: 'pending',
        priority: task.priority,
        relevantAgents: [task.requestingAgentId, task.assignedAgentId].filter(Boolean),
        tags: ['task', 'creation', task.taskType, task.priority]
      },
      timestamp: task.createdAt
    });

    if (task.status !== 'pending') {
      await recordEvent({
        eventType: 'task',
        eventName: 'task_updated',
        taskId: task.id,
        agentId: task.assignedAgentId || task.requestingAgentId,
        data: {
          status: task.status,
          taskType: task.taskType,
          priority: task.priority
        },
        metadata: {
          newState: task.status,
          priority: task.priority,
          duration: task.completedAt ? 
            new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime() : 
            undefined,
          tags: ['task', 'update', task.status, task.taskType]
        },
        timestamp: task.completedAt || task.startedAt || task.createdAt
      });
    }
  }
}

async function initializeKnowledge() {
  const sampleKnowledge = [
    {
      id: 'knowledge-001',
      sourceAgentId: 'all-purpose-pattern-001',
      knowledgeType: 'pattern',
      title: 'Common React Anti-Patterns Detected',
      content: 'Found 12 hardcoded arrays and 8 prop drilling instances in component analysis',
      tags: ['react', 'patterns', 'anti-patterns'],
      relevantAgents: ['template-engine-001', 'scaffold-generator-001'],
      confidence: 0.95,
      createdAt: new Date(Date.now() - 2700000).toISOString() // 45 min ago
    },
    {
      id: 'knowledge-002',
      sourceAgentId: 'parameter-flow-001', 
      knowledgeType: 'solution',
      title: 'Integration Template for API Endpoints',
      content: 'Created reusable template for REST API endpoint integration with error handling',
      tags: ['integration', 'api', 'templates'],
      relevantAgents: ['template-engine-001', 'infra-orchestrator-001'],
      confidence: 0.88,
      createdAt: new Date(Date.now() - 1200000).toISOString() // 20 min ago
    },
    {
      id: 'knowledge-003',
      sourceAgentId: 'vercel-native-001',
      knowledgeType: 'configuration',
      title: 'Serverless Optimization Patterns',
      content: 'Identified optimal patterns for serverless function performance on Vercel',
      tags: ['vercel', 'serverless', 'optimization'],
      relevantAgents: ['infra-orchestrator-001', 'thirty-minute-rule-001'],
      confidence: 0.92,
      createdAt: new Date(Date.now() - 600000).toISOString() // 10 min ago
    }
  ];

  for (const knowledge of sampleKnowledge) {
    // Store knowledge data
    await redis.hset(`observability:knowledge:${knowledge.id}`, {
      ...knowledge,
      tags: JSON.stringify(knowledge.tags),
      relevantAgents: JSON.stringify(knowledge.relevantAgents)
    });

    // Create knowledge sharing event
    await recordEvent({
      eventType: 'knowledge',
      eventName: 'knowledge_shared',
      knowledgeId: knowledge.id,
      agentId: knowledge.sourceAgentId,
      data: {
        knowledgeType: knowledge.knowledgeType,
        title: knowledge.title,
        confidence: knowledge.confidence,
        tags: knowledge.tags,
        relevantAgents: knowledge.relevantAgents
      },
      metadata: {
        relevantAgents: knowledge.relevantAgents,
        tags: ['knowledge', 'sharing', knowledge.knowledgeType]
      },
      timestamp: knowledge.createdAt
    });

    // Create notification events for relevant agents
    for (const agentId of knowledge.relevantAgents) {
      await recordEvent({
        eventType: 'knowledge',
        eventName: 'knowledge_notification',
        knowledgeId: knowledge.id,
        agentId: agentId,
        data: {
          sourceAgent: knowledge.sourceAgentId,
          knowledgeType: knowledge.knowledgeType,
          title: knowledge.title
        },
        metadata: {
          relevantAgents: [agentId, knowledge.sourceAgentId],
          tags: ['knowledge', 'notification', knowledge.knowledgeType]
        },
        timestamp: knowledge.createdAt
      });
    }
  }
}

async function initializeMetrics() {
  const metrics = {
    totalEvents: 50,
    activeAgents: SAMPLE_AGENTS.filter(a => a.status !== 'offline').length,
    completedTasks: 8,
    sharedKnowledge: 3,
    averageCoordinationTime: 2450,
    systemHealth: 'healthy',
    eventsByType: {
      agent: 18,
      task: 15,
      knowledge: 12,
      coordination: 3,
      system: 2
    },
    agentPerformance: Object.fromEntries(
      SAMPLE_AGENTS.map(agent => [
        agent.id,
        {
          tasksCompleted: Math.floor(Math.random() * 5) + 1,
          averageTime: Math.floor(Math.random() * 3000) + 1000,
          successRate: 0.85 + Math.random() * 0.15,
          lastSeen: agent.lastSeen
        }
      ])
    )
  };

  await redis.set('observability:metrics:current', JSON.stringify(metrics));
  await redis.lpush('observability:metrics:history', JSON.stringify({
    timestamp: new Date(),
    ...metrics
  }));
}

async function recordEvent(eventData: any) {
  const event = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: eventData.timestamp || new Date().toISOString(),
    ...eventData
  };

  // Store in Redis
  await redis.lpush('observability:events', JSON.stringify(event));
  await redis.ltrim('observability:events', 0, 999); // Keep last 1000
  
  // Store by type
  await redis.lpush(`observability:events:${event.eventType}`, JSON.stringify(event));
  await redis.ltrim(`observability:events:${event.eventType}`, 0, 299); // Keep last 300 per type
}

async function clearAllData() {
  const keys = await redis.keys('observability:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}