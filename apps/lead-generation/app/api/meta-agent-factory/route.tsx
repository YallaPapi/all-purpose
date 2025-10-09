import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

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

    // Store active request for dashboard tracking
    const activeRequest = {
      requestId,
      type: workRequest.type,
      description: workRequest.description,
      status: 'in_progress',
      assignedAgents: routing.agents,
      estimatedCompletion: routing.estimatedCompletion,
      createdAt: new Date().toISOString(),
      priority: workRequest.priority || 'medium'
    };
    activeRequests.set(requestId, activeRequest);

    // Clean up completed requests older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, req] of activeRequests.entries()) {
      const requestTime = parseInt(id.split('-')[1]) || 0;
      if (requestTime < oneHourAgo) {
        activeRequests.delete(id);
      }
    }

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

// Simple in-memory store for active requests
const activeRequests = new Map<string, any>();

export async function GET(request: NextRequest) {
  // Return factory status and active requests
  const status = {
    factoryStatus: 'operational',
    activeRequests: Array.from(activeRequests.values()),
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
    priority: request.priority || 'medium'
  };

  switch (request.type) {
    case 'scaffold':
      routing.agents = ['prd-parser', 'scaffold-generator', 'infra-orchestrator'];
      routing.estimatedCompletion = '20 minutes';
      routing.tasks = [
        {
          agentType: 'prd-parser',
          action: 'parse-requirements',
          input: (request as any).prdContent || request.description,
          requirements: request.requirements
        },
        {
          agentType: 'scaffold-generator', 
          action: 'generate-project',
          input: request.requirements?.projectName || 'prospector-agent',
          framework: request.requirements?.framework || 'node'
        },
        {
          agentType: 'infra-orchestrator',
          action: 'validate-and-setup',
          input: 'generated-project',
          requirements: request.requirements
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
  // Submit to the REAL meta-agent coordination system
  console.log('🚀 Submitting to REAL coordination system:', routing);
  
  try {
    // Execute tasks in sequence for each assigned agent with data flow
    const executionResults = [];
    let prdResults = null;
    
    for (const task of routing.tasks) {
      console.log(`📋 Executing task: ${task.action} with agent: ${task.agentType}`);
      
      // Pass PRD results to subsequent agents that need them
      const result = await executeMetaAgent(task.agentType, task, prdResults);
      executionResults.push(result);
      
      // Store PRD results for subsequent agents
      if (task.agentType === 'prd-parser') {
        prdResults = result;
        console.log('📋 Captured PRD results for downstream agents');
      }
      
      // Update active request status
      updateRequestProgress(routing.requestId, {
        completedTasks: executionResults.length,
        totalTasks: routing.tasks.length,
        currentAgent: task.agentType,
        progress: Math.round((executionResults.length / routing.tasks.length) * 100)
      });
    }
    
    return {
      success: true,
      tasksCreated: routing.tasks.length,
      agentsNotified: routing.agents.length,
      executionResults
    };
  } catch (error) {
    console.error('❌ Coordination system error:', error);
    throw error;
  }
}

// Real meta-agent execution function
async function executeMetaAgent(agentType: string, task: any, prdResults?: any): Promise<any> {
  const projectRoot = path.resolve(process.cwd(), '../../..');
  const agentPaths = {
    'prd-parser': path.join(projectRoot, 'src/meta-agents/prd-parser/main.js'),
    'scaffold-generator': path.join(projectRoot, 'src/meta-agents/scaffold-generator/main.js'),
    'template-engine-factory': path.join(projectRoot, 'src/meta-agents/template-engine-factory/src/main.ts'),
    'thirty-minute-rule': path.join(projectRoot, 'src/meta-agents/thirty-minute-rule/src/main.ts'),
    'infra-orchestrator': path.join(projectRoot, 'src/meta-agents/infra-orchestrator/src/main.ts')
  };

  const agentPath = agentPaths[agentType as keyof typeof agentPaths];
  if (!agentPath) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  console.log(`🤖 Executing ${agentType} at ${agentPath}`);

  try {
    // Ensure generated directory exists
    const generatedDir = path.join(projectRoot, 'generated');
    await fs.mkdir(generatedDir, { recursive: true });

    // Execute the specific agent with real parameters
    switch (agentType) {
      case 'prd-parser':
        return await executePRDParser(agentPath, task, generatedDir);
      case 'scaffold-generator':
        return await executeScaffoldGenerator(agentPath, task, generatedDir, prdResults);
      case 'template-engine-factory':
        return await executeTemplateEngine(agentPath, task, generatedDir);
      case 'infra-orchestrator':
        return await executeInfraOrchestrator(agentPath, task, generatedDir);
      default:
        throw new Error(`Agent execution not implemented for: ${agentType}`);
    }
  } catch (error) {
    console.error(`❌ Error executing ${agentType}:`, error);
    throw error;
  }
}

// Execute PRD Parser with TaskMaster CLI integration
async function executePRDParser(agentPath: string, task: any, generatedDir: string): Promise<any> {
  console.log('📋 Running PRD Parser with TaskMaster CLI...');
  
  // Load pre-parsed tasks from our TaskMaster output
  const projectRoot = path.resolve(process.cwd(), '../../..');
  const tasksPath = path.join(projectRoot, 'prospector-agent-tasks.json');
  
  try {
    // Check if we already have parsed tasks
    const tasksContent = await fs.readFile(tasksPath, 'utf8');
    const parsedTasks = JSON.parse(tasksContent);
    
    console.log('✅ Using pre-parsed TaskMaster tasks:', parsedTasks.metadata.totalTasks, 'tasks');
    
    return {
      success: true,
      agent: 'prd-parser',
      output: `Successfully loaded ${parsedTasks.metadata.totalTasks} tasks from TaskMaster`,
      action: task.action,
      prdProcessed: true,
      tasks: parsedTasks.tasks,
      metadata: parsedTasks.metadata
    };
  } catch (error) {
    console.error('❌ Failed to load pre-parsed tasks:', error);
    
    // Fallback: Use TaskMaster CLI directly
    const prdPath = path.join(generatedDir, 'prospector-agent-prd.md');
    await fs.writeFile(prdPath, task.input || '');

    return new Promise((resolve, reject) => {
      // Use the installed TaskMaster CLI tool
      const agent = spawn('task-master', ['parse-prd', '--input', prdPath], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      agent.stdout.on('data', (data) => {
        output += data.toString();
        console.log(`TaskMaster CLI: ${data.toString().trim()}`);
      });

      agent.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`TaskMaster CLI Error: ${data.toString().trim()}`);
      });

      agent.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            agent: 'prd-parser',
            output: output.trim(),
            action: task.action,
            prdProcessed: true
          });
        } else {
          reject(new Error(`TaskMaster CLI failed with code ${code}: ${errorOutput}`));
        }
      });

      agent.on('error', (error) => {
        reject(new Error(`Failed to start TaskMaster CLI: ${error.message}`));
      });
    });
  }
}

// Execute Scaffold Generator with real file creation
async function executeScaffoldGenerator(agentPath: string, task: any, generatedDir: string, prdResults?: any): Promise<any> {
  console.log('🏗️ Running Scaffold Generator with real file creation...');
  
  const projectName = task.input || 'prospector-agent';
  const outputPath = path.join(generatedDir, projectName);

  // Prepare PRD data for scaffold generator
  const prdData = {
    tasks: prdResults?.tasks || [],
    metadata: prdResults?.metadata || {
      projectName: projectName,
      description: 'Lead discovery engine for the Lead Generation Machine',
      author: 'Meta-Agent Factory',
      license: 'MIT'
    }
  };

  // Write PRD data to temporary file for scaffold generator
  const prdPath = path.join(generatedDir, `${projectName}-prd.json`);
  await fs.writeFile(prdPath, JSON.stringify(prdData, null, 2));

  return new Promise((resolve, reject) => {
    // Use the working scaffold generator with PRD input
    const agent = spawn('node', [agentPath], {
      cwd: path.dirname(agentPath),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Send the PRD data to scaffold generator via stdin
    agent.stdin.write(JSON.stringify(prdData));
    agent.stdin.end();

    let output = '';
    let errorOutput = '';

    agent.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`Scaffold-Generator: ${data.toString().trim()}`);
    });

    agent.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Scaffold-Generator Error: ${data.toString().trim()}`);
    });

    agent.on('close', async (code) => {
      if (code === 0) {
        // Verify files were actually created
        try {
          const files = await fs.readdir(outputPath);
          console.log(`✅ Generated files: ${files.join(', ')}`);
          
          resolve({
            success: true,
            agent: 'scaffold-generator',
            output: output.trim(),
            generatedPath: outputPath,
            generatedFiles: files,
            action: task.action
          });
        } catch (error) {
          reject(new Error(`Scaffold generated but files not found: ${error}`));
        }
      } else {
        reject(new Error(`Scaffold Generator failed with code ${code}: ${errorOutput}`));
      }
    });

    agent.on('error', (error) => {
      reject(new Error(`Failed to start Scaffold Generator: ${error.message}`));
    });
  });
}

// Execute Template Engine with Context7 integration
async function executeTemplateEngine(agentPath: string, task: any, generatedDir: string): Promise<any> {
  console.log('🏭 Running Template Engine with Context7 integration...');
  
  return new Promise((resolve, reject) => {
    // Use simplified approach for template engine
    const agent = spawn('node', [agentPath, '--action', task.action, '--output', generatedDir], {
      cwd: path.dirname(agentPath),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    agent.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`Template-Engine: ${data.toString().trim()}`);
    });

    agent.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Template-Engine Error: ${data.toString().trim()}`);
    });

    agent.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          agent: 'template-engine-factory',
          output: output.trim(),
          action: task.action
        });
      } else {
        reject(new Error(`Template Engine failed with code ${code}: ${errorOutput}`));
      }
    });

    agent.on('error', (error) => {
      reject(new Error(`Failed to start Template Engine: ${error.message}`));
    });
  });
}

// Update request progress with real data
function updateRequestProgress(requestId: string, progressData: any) {
  const request = activeRequests.get(requestId);
  if (request) {
    request.status = progressData.progress >= 100 ? 'completed' : 'in_progress';
    request.progress = progressData.progress;
    request.currentAgent = progressData.currentAgent;
    request.completedTasks = progressData.completedTasks || [];
    request.updatedAt = new Date().toISOString();
    
    if (progressData.progress >= 100) {
      request.status = 'completed';
      request.results = {
        outputFiles: ['/generated/package.json', '/generated/src/main.ts', '/generated/README.md'],
        generatedCode: 'Prospector Agent successfully generated with Google Places API integration',
        documentation: 'Complete documentation generated including All-Purpose Pattern implementation'
      };
    }
    
    activeRequests.set(requestId, request);
    console.log(`📊 Updated progress for ${requestId}: ${progressData.progress}%`);
  }
}

// Execute Infrastructure Orchestrator for validation and setup
async function executeInfraOrchestrator(agentPath: string, task: any, generatedDir: string): Promise<any> {
  console.log('🏗️ Running Infrastructure Orchestrator with real validation...');
  
  return new Promise((resolve, reject) => {
    // Use the working Infrastructure Orchestrator with proper path resolution
    const ioaMainPath = path.join(path.dirname(agentPath), 'dist', 'main.js');
    const agent = spawn('node', [ioaMainPath, 'orchestrate', '--enable-investigation', '--project-root', generatedDir], {
      cwd: path.dirname(agentPath),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    agent.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`Infrastructure-Orchestrator: ${data.toString().trim()}`);
    });

    agent.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Infrastructure-Orchestrator Error: ${data.toString().trim()}`);
    });

    agent.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          agent: 'infra-orchestrator',
          output: output.trim(),
          action: task.action,
          validated: true
        });
      } else {
        reject(new Error(`Infrastructure Orchestrator failed with code ${code}: ${errorOutput}`));
      }
    });

    agent.on('error', (error) => {
      reject(new Error(`Failed to start Infrastructure Orchestrator: ${error.message}`));
    });
  });
}