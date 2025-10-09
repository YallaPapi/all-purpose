/**
 * UEP Agent Communication Examples
 * 
 * Demonstrates how different agents can use UEP communication patterns
 * for coordinated workflows in the Meta-Agent Factory system.
 */

import { UEPAgentCommunicator, createUEPCommunicator, UEPRequest, UEPEvent } from '../UEPAgentCommunication.js';

/**
 * Example Meta-Agent: PRD Parser Agent using UEP Communication
 */
export class UEPPRDParserAgent {
  private communicator: UEPAgentCommunicator;

  constructor(communicator: UEPAgentCommunicator) {
    this.communicator = communicator;
    this.setupRequestHandlers();
  }

  /**
   * Parse PRD and coordinate with other agents
   */
  async parsePRD(prdContent: string): Promise<any> {
    console.log('PRD Parser: Starting PRD analysis...');

    // 1. Parse the PRD content
    const parsedData = await this.internalParse(prdContent);

    // 2. Request architecture analysis from Infrastructure Orchestrator
    const architectureData = await this.communicator.request(
      'infrastructure-orchestrator',
      'analyze-architecture',
      { prdData: parsedData },
      { priority: 'high', timeout: 60000 }
    );

    // 3. Publish PRD parsed event for other agents
    await this.communicator.publishEvent('prd-parsed', {
      prdId: parsedData.id,
      requirements: parsedData.requirements,
      architecture: architectureData.data
    }, { tags: ['coordination', 'planning'] });

    // 4. Request scaffold generation
    const scaffoldResult = await this.communicator.request(
      'scaffold-generator',
      'generate-scaffold',
      { 
        requirements: parsedData.requirements,
        architecture: architectureData.data
      },
      { priority: 'high' }
    );

    return {
      prdData: parsedData,
      architecture: architectureData.data,
      scaffold: scaffoldResult.data
    };
  }

  private async internalParse(content: string): Promise<any> {
    // Simulate PRD parsing logic
    return {
      id: `prd_${Date.now()}`,
      requirements: {
        functional: ['User authentication', 'Data processing', 'API endpoints'],
        technical: ['Node.js', 'TypeScript', 'Docker'],
        performance: ['<100ms response time', 'Support 1000 concurrent users']
      },
      complexity: 'medium'
    };
  }

  private setupRequestHandlers(): void {
    // Override the base handleIncomingRequest method
    (this.communicator as any).handleIncomingRequest = async (request: UEPRequest, msg: any) => {
      switch (request.method) {
        case 'parse-prd':
          const result = await this.parsePRD(request.data.content);
          await this.sendResponse(request, 'success', result);
          break;
        case 'validate-requirements':
          const validation = await this.validateRequirements(request.data);
          await this.sendResponse(request, 'success', validation);
          break;
        default:
          await this.sendResponse(request, 'error', { message: 'Method not supported' });
      }
      msg.ack();
    };
  }

  private async validateRequirements(data: any): Promise<any> {
    // Simulate requirements validation
    return {
      valid: true,
      issues: [],
      recommendations: ['Consider adding security requirements']
    };
  }

  private async sendResponse(request: UEPRequest, status: 'success' | 'error', data: any): Promise<void> {
    const response = {
      id: `res_${Date.now()}`,
      requestId: request.id,
      from: 'prd-parser',
      to: request.from,
      status,
      data,
      timestamp: new Date(),
      version: request.version,
      latency: Date.now() - new Date(request.timestamp).getTime()
    };

    const responseSubject = `UEP.v1.responses.${request.from}`;
    await (this.communicator as any).config.jetStreamClient.publish(responseSubject, JSON.stringify(response));
  }
}

/**
 * Example Meta-Agent: Infrastructure Orchestrator using UEP Communication
 */
export class UEPInfrastructureOrchestrator {
  private communicator: UEPAgentCommunicator;
  private activeWorkflows: Map<string, any> = new Map();

  constructor(communicator: UEPAgentCommunicator) {
    this.communicator = communicator;
    this.setupRequestHandlers();
    this.subscribeToEvents();
  }

  /**
   * Orchestrate multi-agent workflow
   */
  async orchestrateProject(projectData: any): Promise<any> {
    const workflowId = `workflow_${Date.now()}`;
    console.log(`Infrastructure Orchestrator: Starting workflow ${workflowId}`);

    this.activeWorkflows.set(workflowId, {
      id: workflowId,
      status: 'in-progress',
      startTime: Date.now(),
      steps: []
    });

    try {
      // 1. Coordinate with Template Engine Factory
      const templateResult = await this.communicator.request(
        'template-engine-factory',
        'generate-templates',
        { projectData },
        { priority: 'high' }
      );

      // 2. Coordinate with All-Purpose Pattern Agent
      const patternResult = await this.communicator.request(
        'all-purpose-pattern',
        'apply-patterns',
        { 
          projectData,
          templates: templateResult.data
        },
        { priority: 'high' }
      );

      // 3. Submit containerization work to queue
      const containerizationTask = await this.communicator.submitWork(
        'containerization-queue',
        {
          projectData,
          templates: templateResult.data,
          patterns: patternResult.data
        },
        { expectResponse: true, priority: 'high' }
      );

      // 4. Publish orchestration complete event
      await this.communicator.publishEvent('orchestration-complete', {
        workflowId,
        projectData,
        results: {
          templates: templateResult.data,
          patterns: patternResult.data,
          containerization: containerizationTask
        }
      });

      this.activeWorkflows.set(workflowId, {
        ...this.activeWorkflows.get(workflowId),
        status: 'completed',
        endTime: Date.now()
      });

      return {
        workflowId,
        status: 'completed',
        results: {
          templates: templateResult.data,
          patterns: patternResult.data,
          containerization: containerizationTask
        }
      };

    } catch (error) {
      this.activeWorkflows.set(workflowId, {
        ...this.activeWorkflows.get(workflowId),
        status: 'failed',
        error: error.message,
        endTime: Date.now()
      });

      throw error;
    }
  }

  private setupRequestHandlers(): void {
    (this.communicator as any).handleIncomingRequest = async (request: UEPRequest, msg: any) => {
      switch (request.method) {
        case 'orchestrate-project':
          const result = await this.orchestrateProject(request.data);
          await this.sendResponse(request, 'success', result);
          break;
        case 'analyze-architecture':
          const analysis = await this.analyzeArchitecture(request.data);
          await this.sendResponse(request, 'success', analysis);
          break;
        case 'get-workflow-status':
          const status = this.activeWorkflows.get(request.data.workflowId);
          await this.sendResponse(request, 'success', status || { error: 'Workflow not found' });
          break;
        default:
          await this.sendResponse(request, 'error', { message: 'Method not supported' });
      }
      msg.ack();
    };
  }

  private async subscribeToEvents(): Promise<void> {
    // Subscribe to relevant events from other agents
    await this.communicator.subscribeToEvents([
      'prd-parsed',
      'scaffold-generated',
      'deployment-complete'
    ], async (event: UEPEvent) => {
      console.log(`Infrastructure Orchestrator: Received event ${event.eventType} from ${event.from}`);
      
      switch (event.eventType) {
        case 'prd-parsed':
          await this.handlePRDParsedEvent(event);
          break;
        case 'scaffold-generated':
          await this.handleScaffoldGeneratedEvent(event);
          break;
        case 'deployment-complete':
          await this.handleDeploymentCompleteEvent(event);
          break;
      }
    });
  }

  private async analyzeArchitecture(data: any): Promise<any> {
    // Simulate architecture analysis
    return {
      architecture: 'microservices',
      components: ['api-gateway', 'auth-service', 'data-service'],
      patterns: ['circuit-breaker', 'service-discovery'],
      scalingStrategy: 'horizontal'
    };
  }

  private async handlePRDParsedEvent(event: UEPEvent): Promise<void> {
    console.log('Processing PRD parsed event:', event.data.prdId);
    // Trigger orchestration workflow based on parsed PRD
  }

  private async handleScaffoldGeneratedEvent(event: UEPEvent): Promise<void> {
    console.log('Processing scaffold generated event:', event.data.scaffoldId);
    // Continue with next steps in orchestration
  }

  private async handleDeploymentCompleteEvent(event: UEPEvent): Promise<void> {
    console.log('Processing deployment complete event:', event.data.deploymentId);
    // Update workflow status and notify stakeholders
  }

  private async sendResponse(request: UEPRequest, status: 'success' | 'error', data: any): Promise<void> {
    const response = {
      id: `res_${Date.now()}`,
      requestId: request.id,
      from: 'infrastructure-orchestrator',
      to: request.from,
      status,
      data,
      timestamp: new Date(),
      version: request.version,
      latency: Date.now() - new Date(request.timestamp).getTime()
    };

    const responseSubject = `UEP.v1.responses.${request.from}`;
    await (this.communicator as any).config.jetStreamClient.publish(responseSubject, JSON.stringify(response));
  }
}

/**
 * Example Domain Agent: Frontend Agent using UEP Communication
 */
export class UEPFrontendAgent {
  private communicator: UEPAgentCommunicator;

  constructor(communicator: UEPAgentCommunicator) {
    this.communicator = communicator;
    this.setupWorkQueueProcessing();
    this.setupRequestHandlers();
  }

  private async setupWorkQueueProcessing(): Promise<void> {
    // Process frontend development tasks from the queue
    await this.communicator.processWorkQueue('frontend-tasks', async (task) => {
      console.log('Frontend Agent: Processing task:', task.type);
      
      switch (task.type) {
        case 'generate-components':
          return await this.generateComponents(task.data);
        case 'setup-routing':
          return await this.setupRouting(task.data);
        case 'configure-state-management':
          return await this.configureStateManagement(task.data);
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
    });
  }

  private setupRequestHandlers(): void {
    (this.communicator as any).handleIncomingRequest = async (request: UEPRequest, msg: any) => {
      switch (request.method) {
        case 'generate-frontend':
          const result = await this.generateFrontend(request.data);
          await this.sendResponse(request, 'success', result);
          break;
        case 'validate-design':
          const validation = await this.validateDesign(request.data);
          await this.sendResponse(request, 'success', validation);
          break;
        default:
          await this.sendResponse(request, 'error', { message: 'Method not supported' });
      }
      msg.ack();
    };
  }

  private async generateComponents(data: any): Promise<any> {
    // Simulate component generation
    return {
      components: ['UserForm', 'DataTable', 'Navigation'],
      framework: 'React',
      styling: 'TailwindCSS'
    };
  }

  private async setupRouting(data: any): Promise<any> {
    // Simulate routing setup
    return {
      routes: ['/login', '/dashboard', '/settings'],
      routingLibrary: 'React Router'
    };
  }

  private async configureStateManagement(data: any): Promise<any> {
    // Simulate state management setup
    return {
      stateManager: 'Redux Toolkit',
      stores: ['userStore', 'appStore'],
      middleware: ['thunk', 'logger']
    };
  }

  private async generateFrontend(data: any): Promise<any> {
    // Coordinate with Backend Agent for API specs
    const apiSpecs = await this.communicator.request(
      'backend-agent',
      'get-api-specs',
      { projectId: data.projectId },
      { priority: 'normal' }
    );

    // Generate frontend based on API specs
    const components = await this.generateComponents(data);
    const routing = await this.setupRouting(data);
    const stateManagement = await this.configureStateManagement(data);

    // Publish frontend generation complete event
    await this.communicator.publishEvent('frontend-generated', {
      projectId: data.projectId,
      components: components.components,
      apiIntegration: apiSpecs.data
    });

    return {
      components,
      routing,
      stateManagement,
      apiIntegration: apiSpecs.data
    };
  }

  private async validateDesign(data: any): Promise<any> {
    // Simulate design validation
    return {
      valid: true,
      issues: [],
      recommendations: ['Consider adding loading states', 'Implement error boundaries']
    };
  }

  private async sendResponse(request: UEPRequest, status: 'success' | 'error', data: any): Promise<void> {
    const response = {
      id: `res_${Date.now()}`,
      requestId: request.id,
      from: 'frontend-agent',
      to: request.from,
      status,
      data,
      timestamp: new Date(),
      version: request.version,
      latency: Date.now() - new Date(request.timestamp).getTime()
    };

    const responseSubject = `UEP.v1.responses.${request.from}`;
    await (this.communicator as any).config.jetStreamClient.publish(responseSubject, JSON.stringify(response));
  }
}

/**
 * Example usage of UEP communication in an agent factory setup
 */
export async function initializeUEPAgentFactory(): Promise<void> {
  const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';

  // Initialize communicators for different agents
  const prdParserComm = await createUEPCommunicator(natsUrl, 'prd-parser', 'meta');
  const infrastructureComm = await createUEPCommunicator(natsUrl, 'infrastructure-orchestrator', 'meta');
  const frontendComm = await createUEPCommunicator(natsUrl, 'frontend-agent', 'domain');

  // Create agent instances
  const prdParser = new UEPPRDParserAgent(prdParserComm);
  const orchestrator = new UEPInfrastructureOrchestrator(infrastructureComm);
  const frontendAgent = new UEPFrontendAgent(frontendComm);

  console.log('UEP Agent Factory initialized successfully!');
  console.log('Agents are ready to process requests via UEP protocol.');

  // Example workflow execution
  setTimeout(async () => {
    try {
      const samplePRD = `
        Product Requirements:
        - User authentication system
        - RESTful API with CRUD operations
        - React frontend with responsive design
        - Containerized deployment
      `;

      console.log('Starting example workflow...');
      const result = await prdParser.parsePRD(samplePRD);
      console.log('Workflow completed:', result);
    } catch (error) {
      console.error('Workflow failed:', error);
    }
  }, 5000);
}

// Export for use in other modules
export {
  UEPPRDParserAgent,
  UEPInfrastructureOrchestrator,
  UEPFrontendAgent
};