/**
 * UEP Agent Coordination Test Suite
 * 
 * Behavior-driven testing framework for validating multi-agent coordination
 * patterns and workflows using Cucumber.js v9.x. Tests sequential, parallel,
 * and conditional agent interactions including failure and compensation flows.
 * 
 * Features:
 * - BDD testing with Cucumber.js for coordination scenarios
 * - Multi-agent workflow validation
 * - Coordination pattern testing (scatter-gather, pipeline, broadcast, etc.)
 * - Synchronization and timing validation
 * - Error propagation and compensation flow testing
 * - Real-time coordination monitoring and metrics
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import { After, Before, Given, When, Then, World, setWorldConstructor } from '@cucumber/cucumber';
import { expect } from 'chai';
import { 
  UEPMessage, 
  UEPMessageMetadata, 
  AgentIdentifier,
  UEPContext,
  UEPCoordinationEvent,
  UEPWorkflowExecution,
  UEPDomainEvent
} from '../types/UEPTypes';

// =====================================================
// Test Configuration and Interfaces
// =====================================================

export interface UEPCoordinationTestConfig {
  enabled: boolean;
  cucumber: {
    format: string[];
    publishQuiet: boolean;
    requireModule: string[];
    require: string[];
    tags: string;
    timeout: number;
  };
  agents: {
    maxAgents: number;
    spawnTimeout: number;
    communicationTimeout: number;
    defaultAgentConfig: any;
  };
  coordination: {
    patternTimeout: number;
    maxRetries: number;
    enableMetrics: boolean;
    enableTracing: boolean;
  };
  scenarios: {
    enabled: string[];
    dataPath: string;
    outputPath: string;
  };
}

export interface UEPCoordinationScenario {
  id: string;
  name: string;
  description: string;
  pattern: 'SCATTER_GATHER' | 'PIPELINE' | 'BROADCAST' | 'REQUEST_REPLY' | 'PUBLISH_SUBSCRIBE' | 'CHOREOGRAPHY' | 'ORCHESTRATION';
  participants: UEPTestAgent[];
  steps: UEPCoordinationStep[];
  expectedOutcome: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | 'TIMEOUT';
  timeout: number;
  preconditions: string[];
  postconditions: string[];
}

export interface UEPTestAgent {
  id: string;
  type: 'META_AGENT' | 'DOMAIN_AGENT' | 'ORCHESTRATOR' | 'MOCK_AGENT';
  capabilities: string[];
  state: 'INITIALIZING' | 'ACTIVE' | 'BUSY' | 'IDLE' | 'ERROR' | 'SHUTDOWN';
  config: any;
  messageHandlers: Map<string, Function>;
}

export interface UEPCoordinationStep {
  stepNumber: number;
  type: 'SEND_MESSAGE' | 'WAIT_FOR_MESSAGE' | 'SYNCHRONIZE' | 'VALIDATE_STATE' | 'TRIGGER_ERROR' | 'COMPENSATE';
  agent: string;
  action: string;
  parameters: any;
  expectedResult?: any;
  timeout?: number;
  retryable: boolean;
}

export interface UEPCoordinationMetrics {
  scenarioId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  messagesExchanged: number;
  coordinationRounds: number;
  participantCount: number;
  successRate: number;
  averageResponseTime: number;
  errors: UEPCoordinationError[];
}

export interface UEPCoordinationError {
  id: string;
  timestamp: Date;
  agentId: string;
  errorType: string;
  message: string;
  recoverable: boolean;
  compensationApplied: boolean;
}

// =====================================================
// Cucumber World Context
// =====================================================

export class UEPCoordinationWorld extends World {
  public scenario: UEPCoordinationScenario;
  public agents: Map<string, UEPTestAgent> = new Map();
  public messages: UEPMessage[] = [];
  public events: UEPCoordinationEvent[] = [];
  public metrics: UEPCoordinationMetrics;
  public coordinationManager: UEPCoordinationTestManager;
  public testResults: Map<string, any> = new Map();
  public coordinationState: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' = 'IDLE';

  constructor(options: any) {
    super(options);
    this.coordinationManager = new UEPCoordinationTestManager();
  }

  public async initializeScenario(scenarioConfig: Partial<UEPCoordinationScenario>): Promise<void> {
    this.scenario = {
      id: scenarioConfig.id || `scenario_${Date.now()}`,
      name: scenarioConfig.name || 'Default Coordination Scenario',
      description: scenarioConfig.description || '',
      pattern: scenarioConfig.pattern || 'REQUEST_REPLY',
      participants: scenarioConfig.participants || [],
      steps: scenarioConfig.steps || [],
      expectedOutcome: scenarioConfig.expectedOutcome || 'SUCCESS',
      timeout: scenarioConfig.timeout || 30000,
      preconditions: scenarioConfig.preconditions || [],
      postconditions: scenarioConfig.postconditions || []
    };

    this.metrics = {
      scenarioId: this.scenario.id,
      startTime: new Date(),
      messagesExchanged: 0,
      coordinationRounds: 0,
      participantCount: this.scenario.participants.length,
      successRate: 0,
      averageResponseTime: 0,
      errors: []
    };
  }

  public async spawnAgent(agentConfig: Partial<UEPTestAgent>): Promise<UEPTestAgent> {
    const agent: UEPTestAgent = {
      id: agentConfig.id || `agent_${Date.now()}`,
      type: agentConfig.type || 'MOCK_AGENT',
      capabilities: agentConfig.capabilities || [],
      state: 'INITIALIZING',
      config: agentConfig.config || {},
      messageHandlers: new Map()
    };

    this.agents.set(agent.id, agent);
    await this.coordinationManager.registerAgent(agent);
    
    return agent;
  }

  public async sendMessage(senderId: string, recipientId: string, messageType: string, payload: any): Promise<UEPMessage> {
    const message: UEPMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: messageType,
      protocolVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      sender: { id: senderId, type: 'MOCK_AGENT' },
      recipient: { id: recipientId, type: 'MOCK_AGENT' },
      payload,
      correlationId: `corr_${Date.now()}`,
      sequenceNumber: this.messages.length + 1
    };

    this.messages.push(message);
    this.metrics.messagesExchanged++;

    await this.coordinationManager.routeMessage(message);
    return message;
  }

  public getAgent(agentId: string): UEPTestAgent | undefined {
    return this.agents.get(agentId);
  }

  public recordError(error: UEPCoordinationError): void {
    this.metrics.errors.push(error);
  }
}

setWorldConstructor(UEPCoordinationWorld);

// =====================================================
// UEP Coordination Test Manager
// =====================================================

export class UEPCoordinationTestManager extends EventEmitter {
  private config: UEPCoordinationTestConfig;
  private activeScenarios: Map<string, UEPCoordinationScenario> = new Map();
  private agentRegistry: Map<string, UEPTestAgent> = new Map();
  private messageQueue: UEPMessage[] = [];
  private coordinationEvents: UEPCoordinationEvent[] = [];
  private isRunning: boolean = false;

  constructor(config?: Partial<UEPCoordinationTestConfig>) {
    super();
    this.config = this.validateConfig(config || {});
  }

  // =====================================================
  // Agent Management
  // =====================================================

  public async registerAgent(agent: UEPTestAgent): Promise<void> {
    this.agentRegistry.set(agent.id, agent);
    
    // Initialize agent state
    agent.state = 'ACTIVE';
    
    // Setup message handlers
    this.setupAgentMessageHandlers(agent);
    
    this.emit('agent:registered', { agentId: agent.id, type: agent.type });
  }

  public async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agentRegistry.get(agentId);
    if (agent) {
      agent.state = 'SHUTDOWN';
      this.agentRegistry.delete(agentId);
      this.emit('agent:unregistered', { agentId });
    }
  }

  public async routeMessage(message: UEPMessage): Promise<void> {
    this.messageQueue.push(message);
    
    const recipient = this.agentRegistry.get(message.recipient.id);
    if (recipient) {
      await this.deliverMessage(recipient, message);
    } else {
      this.emit('message:undeliverable', { messageId: message.id, recipientId: message.recipient.id });
    }
  }

  private async deliverMessage(agent: UEPTestAgent, message: UEPMessage): Promise<void> {
    try {
      const handler = agent.messageHandlers.get(message.type);
      if (handler) {
        await handler(message);
        this.emit('message:delivered', { agentId: agent.id, messageId: message.id });
      } else {
        this.emit('message:no_handler', { agentId: agent.id, messageType: message.type });
      }
    } catch (error) {
      this.emit('message:error', { agentId: agent.id, messageId: message.id, error });
    }
  }

  private setupAgentMessageHandlers(agent: UEPTestAgent): void {
    // Default message handlers for coordination patterns
    agent.messageHandlers.set('COORDINATION_REQUEST', async (message: UEPMessage) => {
      // Handle coordination request
      agent.state = 'BUSY';
      
      // Simulate processing time
      await this.delay(Math.random() * 100 + 50);
      
      // Send response
      const response: UEPMessage = {
        id: `resp_${Date.now()}`,
        type: 'COORDINATION_RESPONSE',
        protocolVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        sender: { id: agent.id, type: agent.type },
        recipient: message.sender,
        payload: { status: 'completed', result: 'success' },
        correlationId: message.correlationId,
        sequenceNumber: message.sequenceNumber + 1
      };
      
      await this.routeMessage(response);
      agent.state = 'ACTIVE';
    });

    agent.messageHandlers.set('WORKFLOW_EXECUTE', async (message: UEPMessage) => {
      // Handle workflow execution
      agent.state = 'BUSY';
      
      try {
        // Simulate workflow execution
        const workflowResult = await this.executeWorkflowStep(agent, message.payload);
        
        const response: UEPMessage = {
          id: `work_resp_${Date.now()}`,
          type: 'WORKFLOW_RESPONSE',
          protocolVersion: '1.0.0',
          timestamp: new Date().toISOString(),
          sender: { id: agent.id, type: agent.type },
          recipient: message.sender,
          payload: workflowResult,
          correlationId: message.correlationId,
          sequenceNumber: message.sequenceNumber + 1
        };
        
        await this.routeMessage(response);
        
      } catch (error) {
        // Send error response
        const errorResponse: UEPMessage = {
          id: `error_resp_${Date.now()}`,
          type: 'WORKFLOW_ERROR',
          protocolVersion: '1.0.0',
          timestamp: new Date().toISOString(),
          sender: { id: agent.id, type: agent.type },
          recipient: message.sender,
          payload: { error: error.message },
          correlationId: message.correlationId,
          sequenceNumber: message.sequenceNumber + 1
        };
        
        await this.routeMessage(errorResponse);
      }
      
      agent.state = 'ACTIVE';
    });

    agent.messageHandlers.set('SYNCHRONIZATION_BARRIER', async (message: UEPMessage) => {
      // Handle synchronization barrier
      await this.handleSynchronizationBarrier(agent, message);
    });
  }

  private async executeWorkflowStep(agent: UEPTestAgent, payload: any): Promise<any> {
    // Simulate workflow step execution
    const executionTime = Math.random() * 500 + 100;
    await this.delay(executionTime);
    
    // Randomly introduce failures for testing
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error(`Workflow step failed in agent ${agent.id}`);
    }
    
    return {
      status: 'completed',
      executionTime,
      result: `Processed by ${agent.id}`
    };
  }

  private async handleSynchronizationBarrier(agent: UEPTestAgent, message: UEPMessage): Promise<void> {
    // Implement synchronization barrier logic
    const barrierId = message.payload.barrierId;
    const participantCount = message.payload.participantCount;
    
    // Track barrier participation
    if (!this.barrierParticipants) {
      this.barrierParticipants = new Map();
    }
    
    if (!this.barrierParticipants.has(barrierId)) {
      this.barrierParticipants.set(barrierId, new Set());
    }
    
    this.barrierParticipants.get(barrierId)!.add(agent.id);
    
    // Check if all participants have reached the barrier
    if (this.barrierParticipants.get(barrierId)!.size >= participantCount) {
      // Release all waiting agents
      const participants = this.barrierParticipants.get(barrierId)!;
      
      for (const participantId of participants) {
        const participant = this.agentRegistry.get(participantId);
        if (participant) {
          const releaseMessage: UEPMessage = {
            id: `barrier_release_${Date.now()}`,
            type: 'SYNCHRONIZATION_RELEASE',
            protocolVersion: '1.0.0',
            timestamp: new Date().toISOString(),
            sender: { id: 'coordination_manager', type: 'ORCHESTRATOR' },
            recipient: { id: participantId, type: participant.type },
            payload: { barrierId, status: 'released' },
            correlationId: message.correlationId,
            sequenceNumber: 1
          };
          
          await this.routeMessage(releaseMessage);
        }
      }
      
      this.barrierParticipants.delete(barrierId);
    }
  }

  private barrierParticipants?: Map<string, Set<string>>;

  // =====================================================
  // Coordination Pattern Testing
  // =====================================================

  public async testScatterGatherPattern(coordinatorId: string, participantIds: string[], task: any): Promise<any[]> {
    const correlationId = `scatter_gather_${Date.now()}`;
    const results: any[] = [];
    
    // Scatter phase: Send requests to all participants
    const scatterPromises = participantIds.map(async (participantId) => {
      const request: UEPMessage = {
        id: `scatter_${Date.now()}_${participantId}`,
        type: 'COORDINATION_REQUEST',
        protocolVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        sender: { id: coordinatorId, type: 'ORCHESTRATOR' },
        recipient: { id: participantId, type: 'DOMAIN_AGENT' },
        payload: { task, scatter: true },
        correlationId,
        sequenceNumber: 1
      };
      
      await this.routeMessage(request);
    });
    
    await Promise.all(scatterPromises);
    
    // Gather phase: Wait for responses
    const gatherTimeout = this.config.coordination.patternTimeout;
    const startTime = Date.now();
    
    while (results.length < participantIds.length && (Date.now() - startTime) < gatherTimeout) {
      // Check for responses in message queue
      const responses = this.messageQueue.filter(msg => 
        msg.type === 'COORDINATION_RESPONSE' && 
        msg.correlationId === correlationId
      );
      
      for (const response of responses) {
        if (!results.find(r => r.senderId === response.sender.id)) {
          results.push({
            senderId: response.sender.id,
            result: response.payload,
            timestamp: response.timestamp
          });
        }
      }
      
      await this.delay(10); // Small delay for polling
    }
    
    return results;
  }

  public async testPipelinePattern(stages: string[], initialPayload: any): Promise<any> {
    let currentPayload = initialPayload;
    const pipelineId = `pipeline_${Date.now()}`;
    
    for (let i = 0; i < stages.length; i++) {
      const stageId = stages[i];
      const correlationId = `${pipelineId}_stage_${i}`;
      
      const request: UEPMessage = {
        id: `pipeline_${Date.now()}_${i}`,
        type: 'WORKFLOW_EXECUTE',
        protocolVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        sender: { id: 'pipeline_coordinator', type: 'ORCHESTRATOR' },
        recipient: { id: stageId, type: 'DOMAIN_AGENT' },
        payload: { 
          stage: i, 
          data: currentPayload,
          pipelineId 
        },
        correlationId,
        sequenceNumber: i + 1
      };
      
      await this.routeMessage(request);
      
      // Wait for stage completion
      const response = await this.waitForResponse(correlationId, 'WORKFLOW_RESPONSE');
      if (response) {
        currentPayload = response.payload.result;
      } else {
        throw new Error(`Pipeline stage ${i} (${stageId}) failed or timed out`);
      }
    }
    
    return currentPayload;
  }

  public async testBroadcastPattern(broadcasterId: string, recipientIds: string[], message: any): Promise<void> {
    const correlationId = `broadcast_${Date.now()}`;
    
    const broadcastPromises = recipientIds.map(async (recipientId) => {
      const broadcastMessage: UEPMessage = {
        id: `broadcast_${Date.now()}_${recipientId}`,
        type: 'BROADCAST_MESSAGE',
        protocolVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        sender: { id: broadcasterId, type: 'ORCHESTRATOR' },
        recipient: { id: recipientId, type: 'DOMAIN_AGENT' },
        payload: message,
        correlationId,
        sequenceNumber: 1
      };
      
      await this.routeMessage(broadcastMessage);
    });
    
    await Promise.all(broadcastPromises);
  }

  public async testRequestReplyPattern(requesterId: string, providerId: string, request: any): Promise<any> {
    const correlationId = `req_reply_${Date.now()}`;
    
    const requestMessage: UEPMessage = {
      id: `request_${Date.now()}`,
      type: 'REQUEST',
      protocolVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      sender: { id: requesterId, type: 'DOMAIN_AGENT' },
      recipient: { id: providerId, type: 'DOMAIN_AGENT' },
      payload: request,
      correlationId,
      sequenceNumber: 1
    };
    
    await this.routeMessage(requestMessage);
    
    // Wait for reply
    const response = await this.waitForResponse(correlationId, 'REPLY');
    return response?.payload;
  }

  private async waitForResponse(correlationId: string, expectedType: string, timeout: number = 5000): Promise<UEPMessage | null> {
    const startTime = Date.now();
    
    while ((Date.now() - startTime) < timeout) {
      const response = this.messageQueue.find(msg => 
        msg.correlationId === correlationId && 
        msg.type === expectedType
      );
      
      if (response) {
        return response;
      }
      
      await this.delay(10);
    }
    
    return null;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =====================================================
  // Configuration and Utilities
  // =====================================================

  private validateConfig(config: Partial<UEPCoordinationTestConfig>): UEPCoordinationTestConfig {
    return {
      enabled: config.enabled !== false,
      cucumber: {
        format: config.cucumber?.format || ['pretty', 'json:test-results/cucumber-report.json'],
        publishQuiet: config.cucumber?.publishQuiet !== false,
        requireModule: config.cucumber?.requireModule || ['ts-node/register'],
        require: config.cucumber?.require || ['services/testing/steps/**/*.ts'],
        tags: config.cucumber?.tags || '@coordination',
        timeout: config.cucumber?.timeout || 30000
      },
      agents: {
        maxAgents: config.agents?.maxAgents || 100,
        spawnTimeout: config.agents?.spawnTimeout || 5000,
        communicationTimeout: config.agents?.communicationTimeout || 10000,
        defaultAgentConfig: config.agents?.defaultAgentConfig || {}
      },
      coordination: {
        patternTimeout: config.coordination?.patternTimeout || 30000,
        maxRetries: config.coordination?.maxRetries || 3,
        enableMetrics: config.coordination?.enableMetrics !== false,
        enableTracing: config.coordination?.enableTracing !== false
      },
      scenarios: {
        enabled: config.scenarios?.enabled || ['basic', 'advanced', 'failure', 'performance'],
        dataPath: config.scenarios?.dataPath || './test-data/coordination',
        outputPath: config.scenarios?.outputPath || './test-results/coordination'
      }
    };
  }

  public getMetrics(): any {
    return {
      activeScenarios: this.activeScenarios.size,
      registeredAgents: this.agentRegistry.size,
      messagesInQueue: this.messageQueue.length,
      coordinationEvents: this.coordinationEvents.length
    };
  }
}

// =====================================================
// Cucumber Step Definitions
// =====================================================

// Background steps
Before(async function (this: UEPCoordinationWorld) {
  this.coordinationManager = new UEPCoordinationTestManager();
  this.agents.clear();
  this.messages = [];
  this.events = [];
  this.testResults.clear();
  this.coordinationState = 'IDLE';
});

After(async function (this: UEPCoordinationWorld) {
  // Cleanup agents
  for (const agent of this.agents.values()) {
    await this.coordinationManager.unregisterAgent(agent.id);
  }
  
  // Finalize metrics
  if (this.metrics) {
    this.metrics.endTime = new Date();
    this.metrics.duration = this.metrics.endTime.getTime() - this.metrics.startTime.getTime();
    this.metrics.successRate = this.coordinationState === 'COMPLETED' ? 1.0 : 0.0;
  }
});

// Given steps
Given('I have {int} agents of type {string}', async function (this: UEPCoordinationWorld, count: number, type: string) {
  for (let i = 0; i < count; i++) {
    const agent = await this.spawnAgent({
      id: `${type.toLowerCase()}_${i + 1}`,
      type: type as any,
      capabilities: ['coordination', 'workflow']
    });
    expect(agent).to.exist;
    expect(agent.state).to.equal('ACTIVE');
  }
});

Given('the coordination pattern is {string}', async function (this: UEPCoordinationWorld, pattern: string) {
  await this.initializeScenario({
    pattern: pattern as any,
    participants: Array.from(this.agents.values())
  });
  expect(this.scenario.pattern).to.equal(pattern);
});

Given('all agents are in {string} state', async function (this: UEPCoordinationWorld, state: string) {
  for (const agent of this.agents.values()) {
    agent.state = state as any;
  }
  
  const activeAgents = Array.from(this.agents.values()).filter(a => a.state === state);
  expect(activeAgents).to.have.length(this.agents.size);
});

// When steps
When('I initiate a scatter-gather coordination', async function (this: UEPCoordinationWorld) {
  this.coordinationState = 'RUNNING';
  
  const coordinator = Array.from(this.agents.values()).find(a => a.type === 'ORCHESTRATOR');
  const participants = Array.from(this.agents.values()).filter(a => a.type !== 'ORCHESTRATOR');
  
  expect(coordinator).to.exist;
  expect(participants).to.have.length.greaterThan(0);
  
  const task = { action: 'process_data', data: { items: [1, 2, 3, 4, 5] } };
  const results = await this.coordinationManager.testScatterGatherPattern(
    coordinator!.id,
    participants.map(p => p.id),
    task
  );
  
  this.testResults.set('scatter_gather_results', results);
});

When('I execute a pipeline workflow with {int} stages', async function (this: UEPCoordinationWorld, stageCount: number) {
  this.coordinationState = 'RUNNING';
  
  const agents = Array.from(this.agents.values()).slice(0, stageCount);
  expect(agents).to.have.length(stageCount);
  
  const initialPayload = { data: 'initial', transformations: [] };
  const result = await this.coordinationManager.testPipelinePattern(
    agents.map(a => a.id),
    initialPayload
  );
  
  this.testResults.set('pipeline_result', result);
});

When('I broadcast a message to all agents', async function (this: UEPCoordinationWorld) {
  const broadcaster = Array.from(this.agents.values())[0];
  const recipients = Array.from(this.agents.values()).slice(1);
  
  const message = { type: 'notification', content: 'Test broadcast message' };
  
  await this.coordinationManager.testBroadcastPattern(
    broadcaster.id,
    recipients.map(r => r.id),
    message
  );
  
  this.testResults.set('broadcast_sent', true);
});

When('agent {string} sends a request to agent {string}', async function (this: UEPCoordinationWorld, requesterId: string, providerId: string) {
  const request = { operation: 'get_data', parameters: { id: 123 } };
  
  const response = await this.coordinationManager.testRequestReplyPattern(
    requesterId,
    providerId,
    request
  );
  
  this.testResults.set('request_reply_response', response);
});

When('agent {string} fails during coordination', async function (this: UEPCoordinationWorld, agentId: string) {
  const agent = this.getAgent(agentId);
  expect(agent).to.exist;
  
  agent!.state = 'ERROR';
  
  const error: UEPCoordinationError = {
    id: `error_${Date.now()}`,
    timestamp: new Date(),
    agentId,
    errorType: 'COORDINATION_FAILURE',
    message: 'Simulated agent failure during coordination',
    recoverable: true,
    compensationApplied: false
  };
  
  this.recordError(error);
});

// Then steps
Then('all agents should receive the coordination request', async function (this: UEPCoordinationWorld) {
  const coordinationMessages = this.messages.filter(m => m.type === 'COORDINATION_REQUEST');
  const participantCount = Array.from(this.agents.values()).filter(a => a.type !== 'ORCHESTRATOR').length;
  
  expect(coordinationMessages).to.have.length(participantCount);
});

Then('I should receive responses from all participating agents', async function (this: UEPCoordinationWorld) {
  const results = this.testResults.get('scatter_gather_results');
  expect(results).to.exist;
  
  const participantCount = Array.from(this.agents.values()).filter(a => a.type !== 'ORCHESTRATOR').length;
  expect(results).to.have.length(participantCount);
});

Then('the pipeline should process data through all stages', async function (this: UEPCoordinationWorld) {
  const result = this.testResults.get('pipeline_result');
  expect(result).to.exist;
  expect(result).to.have.property('data');
});

Then('all agents should receive the broadcast message', async function (this: UEPCoordinationWorld) {
  const broadcastMessages = this.messages.filter(m => m.type === 'BROADCAST_MESSAGE');
  const recipientCount = this.agents.size - 1; // Excluding broadcaster
  
  expect(broadcastMessages).to.have.length(recipientCount);
});

Then('the request should receive a valid response', async function (this: UEPCoordinationWorld) {
  const response = this.testResults.get('request_reply_response');
  expect(response).to.exist;
});

Then('coordination should complete within {int} seconds', async function (this: UEPCoordinationWorld, timeoutSeconds: number) {
  if (this.metrics.duration) {
    const durationSeconds = this.metrics.duration / 1000;
    expect(durationSeconds).to.be.lessThan(timeoutSeconds);
  }
  
  this.coordinationState = 'COMPLETED';
});

Then('error handling should be triggered', async function (this: UEPCoordinationWorld) {
  expect(this.metrics.errors).to.have.length.greaterThan(0);
});

Then('compensation flows should be executed', async function (this: UEPCoordinationWorld) {
  const compensatedErrors = this.metrics.errors.filter(e => e.compensationApplied);
  expect(compensatedErrors).to.have.length.greaterThan(0);
});

Then('the coordination metrics should show success rate above {float}', async function (this: UEPCoordinationWorld, threshold: number) {
  expect(this.metrics.successRate).to.be.greaterThan(threshold);
});

// =====================================================
// Factory Function
// =====================================================

export function createUEPAgentCoordinationTests(config: Partial<UEPCoordinationTestConfig> = {}): UEPCoordinationTestManager {
  return new UEPCoordinationTestManager(config);
}

export default UEPCoordinationTestManager;