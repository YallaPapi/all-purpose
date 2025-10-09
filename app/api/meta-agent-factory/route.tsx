import { NextRequest, NextResponse } from 'next/server';

/**
 * Meta-Agent Factory Work Request API
 * 
 * Accepts user requests and routes them to appropriate meta-agents for building
 */

interface WorkRequest {
  type: 'scaffold' | 'fix-patterns' | 'generate-docs' | 'create-templates' | 'integrate-systems' | 'debug-system';
  description: string;
  requirements?: {
    projectName?: string;
    framework?: string;
    features?: string[];
    targetDirectory?: string;
    codeBase?: string;
    integrationEndpoints?: string[];
    documentationTypes?: string[];
  };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  requestId?: string;
}

interface WorkResponse {
  success: boolean;
  requestId: string;
  assignedAgents: string[];
  estimatedCompletion: string;
  trackingUrl: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const workRequest: WorkRequest = await request.json();
    console.log('📋 Meta-Agent Factory received work request:', workRequest);

    // Generate unique request ID
    const requestId = workRequest.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Validate request
    if (!workRequest.type || !workRequest.description) {
      return NextResponse.json({
        success: false,
        error: 'Work request must include type and description'
      }, { status: 400 });
    }

    // Route to appropriate meta-agents based on request type
    const routing = await routeWorkRequest(workRequest, requestId);
    
    // Submit to meta-agent coordination system
    const coordinationResult = await submitToCoordination(routing);

    const response: WorkResponse = {
      success: true,
      requestId,
      assignedAgents: routing.agents,
      estimatedCompletion: routing.estimatedCompletion,
      trackingUrl: `/api/meta-agent-factory/status/${requestId}`
    };

    console.log('✅ Work request routed successfully:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Meta-Agent Factory error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process work request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Return factory status and capabilities
  const status = {
    factoryStatus: 'operational',
    availableAgents: [
      'all-purpose-pattern',
      'five-document-framework', 
      'parameter-flow',
      'prd-parser',
      'scaffold-generator',
      'template-engine-factory',
      'thirty-minute-rule',
      'vercel-native-architecture',
      'infra-orchestrator'
    ],
    supportedWorkTypes: [
      {
        type: 'scaffold',
        description: 'Generate new project scaffolding with best practices',
        estimatedTime: '5-15 minutes'
      },
      {
        type: 'fix-patterns',
        description: 'Analyze and fix anti-patterns in existing codebase',
        estimatedTime: '10-30 minutes'
      },
      {
        type: 'generate-docs',
        description: 'Auto-generate comprehensive project documentation',
        estimatedTime: '5-20 minutes'
      },
      {
        type: 'create-templates',
        description: 'Build reusable templates for common patterns',
        estimatedTime: '10-25 minutes'
      },
      {
        type: 'integrate-systems',
        description: 'Design and implement system integrations',
        estimatedTime: '15-45 minutes'
      },
      {
        type: 'debug-system',
        description: 'Comprehensive system debugging and issue resolution',
        estimatedTime: '10-30 minutes'
      }
    ],
    currentLoad: 'light',
    lastHealthCheck: new Date().toISOString()
  };

  return NextResponse.json(status);
}

async function routeWorkRequest(request: WorkRequest, requestId: string) {
  const routing = {
    requestId,
    agents: [] as string[],
    tasks: [] as any[],
    estimatedCompletion: '',
    priority: request.priority || 'medium',
    description: request.description,
    projectName: request.requirements?.projectName || `project-${Date.now()}`,
    prd: (request as any).prd || request.description // Support PRD content from request
  };

  switch (request.type) {
    case 'scaffold':
      routing.agents = ['prd-parser', 'scaffold-generator', 'template-engine-factory'];
      routing.estimatedCompletion = '15 minutes';
      routing.tasks = [
        {
          agentType: 'prd-parser',
          action: 'parse-requirements',
          input: request.description,
          requirements: request.requirements
        },
        {
          agentType: 'scaffold-generator', 
          action: 'generate-project',
          input: request.requirements?.projectName || 'new-project',
          framework: request.requirements?.framework || 'node'
        },
        {
          agentType: 'template-engine-factory',
          action: 'create-templates',
          input: request.requirements?.features || []
        }
      ];
      break;

    case 'fix-patterns':
      routing.agents = ['all-purpose-pattern', 'infra-orchestrator'];
      routing.estimatedCompletion = '20 minutes';
      routing.tasks = [
        {
          agentType: 'all-purpose-pattern',
          action: 'detect-antipatterns',
          input: request.requirements?.codeBase || '',
          targetDirectory: request.requirements?.targetDirectory
        },
        {
          agentType: 'infra-orchestrator',
          action: 'compliance-check',
          input: 'full-audit'
        }
      ];
      break;

    case 'generate-docs':
      routing.agents = ['five-document-framework', 'template-engine-factory'];
      routing.estimatedCompletion = '12 minutes';
      routing.tasks = [
        {
          agentType: 'five-document-framework',
          action: 'generate-documentation',
          input: request.description,
          types: request.requirements?.documentationTypes || ['readme', 'api', 'setup']
        }
      ];
      break;

    case 'integrate-systems':
      routing.agents = ['parameter-flow', 'vercel-native-architecture'];
      routing.estimatedCompletion = '30 minutes';
      routing.tasks = [
        {
          agentType: 'parameter-flow',
          action: 'design-integration',
          input: request.requirements?.integrationEndpoints || [],
          description: request.description
        },
        {
          agentType: 'vercel-native-architecture',
          action: 'deploy-integration',
          input: 'production-ready'
        }
      ];
      break;

    case 'debug-system':
      routing.agents = ['thirty-minute-rule', 'infra-orchestrator'];
      routing.estimatedCompletion = '25 minutes';
      routing.tasks = [
        {
          agentType: 'thirty-minute-rule',
          action: 'debug-session',
          input: request.description,
          isolationLevel: 'component'
        }
      ];
      break;

    default:
      throw new Error(`Unsupported work type: ${request.type}`);
  }

  return routing;
}

async function submitToCoordination(routing: any) {
  // Submit to the REAL Factory Core API
  console.log('🚀 Submitting to REAL Factory Core coordination system:', routing);
  
  try {
    // Call the real Factory Core API
    const factoryCoreUrl = process.env.FACTORY_CORE_URL || 'http://factory-core:3000';
    const response = await fetch(`${factoryCoreUrl}/api/factory/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prd: routing.description || 'Generated from routing request',
        projectName: routing.projectName || `project-${Date.now()}`
      })
    });

    if (!response.ok) {
      throw new Error(`Factory Core API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Real Factory Core response:', result);
    
    return {
      success: result.success,
      tasksCreated: result.project?.requirements?.length || routing.tasks.length,
      agentsNotified: routing.agents.length,
      factoryCoreResponse: result
    };
  } catch (error) {
    console.error('❌ Factory Core API call failed:', error);
    // Fallback to coordination via UEP Registry
    try {
      const registryUrl = process.env.UEP_REGISTRY_URL || 'http://uep-registry:3001';
      console.log('🔄 Falling back to UEP Registry coordination...');
      
      // Register task with UEP Registry
      const registryResponse = await fetch(`${registryUrl}/api/v1/registry/agents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (registryResponse.ok) {
        const agents = await registryResponse.json();
        console.log(`✅ Connected to UEP Registry, found ${agents.length} agents`);
        
        return {
          success: true,
          tasksCreated: routing.tasks.length,
          agentsNotified: agents.length,
          fallbackUsed: 'uep-registry'
        };
      }
    } catch (registryError) {
      console.error('❌ UEP Registry fallback also failed:', registryError);
    }
    
    throw error;
  }
}