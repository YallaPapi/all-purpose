/**
 * Meta-Agent Coordinator - Handles coordination with other meta-agents
 * 
 * Enables seamless coordination across unlimited meta-agents
 * Following All-Purpose Pattern: NO hardcoded limitations on agent coordination
 */

import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';

import {
  ParameterFlowConfig
} from '../types/index.js';

interface MetaAgentInfo {
  agentId: string;
  agentType: string;
  agentName: string;
  version: string;
  capabilities: string[];
  status: 'online' | 'offline' | 'busy' | 'error';
  endpoint?: string;
  lastSeen: Date;
  metadata: Record<string, any>;
}

interface CoordinationMessage {
  messageId: string;
  senderId: string;
  receiverId: string;
  messageType: 'request' | 'response' | 'notification' | 'event';
  payload: Record<string, any>;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  replyTo?: string;
}

interface CoordinationRequest {
  requestId: string;
  requestType: string;
  targetAgent: string;
  parameters: Record<string, any>;
  timeout?: number;
  callback?: (response: any) => void;
}

export class MetaAgentCoordinator extends EventEmitter {
  private config: ParameterFlowConfig;
  private isInitialized: boolean = false;

  // Agent registry and coordination
  private registeredAgents: Map<string, MetaAgentInfo> = new Map();
  private pendingRequests: Map<string, CoordinationRequest> = new Map();
  private messageHistory: Map<string, CoordinationMessage[]> = new Map();
  private coordinationMetrics: Map<string, any> = new Map();

  // Known meta-agents in the system
  private readonly KNOWN_META_AGENTS = [
    'PRD-Parser Agent',
    'Scaffold Generator Agent', 
    '5-Document Framework Agent',
    'Thirty-Minute Rule Agent',
    'Template Engine Factory Agent',
    'Parameter Flow Agent',
    'Vercel-Native Architecture Agent',
    'Infrastructure Orchestrator Agent'
  ];

  constructor(config: ParameterFlowConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.isInitialized = true;
      
      // Initialize communication channels
      await this.initializeCommunicationChannels();
      
      // Discover and register available meta-agents
      await this.discoverMetaAgents();
      
      // Set up periodic health checks
      this.setupHealthMonitoring();
      
      // Initialize coordination metrics
      this.initializeMetrics();
      
      console.log(chalk.blue('🤝 Meta-Agent Coordinator initialized'));
      console.log(chalk.gray(`   Discovered ${this.registeredAgents.size} meta-agents`));
      
      this.emit('coordinator:initialized', {
        registeredAgents: Array.from(this.registeredAgents.keys()),
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to initialize Meta-Agent Coordinator: ${error.message}`));
      throw error;
    }
  }

  /**
   * Initialize coordination with all meta-agents
   */
  async initializeCoordination(): Promise<void> {
    console.log(chalk.blue('🔄 Initializing meta-agent coordination...'));
    
    // Register Parameter Flow Agent
    await this.registerAgent({
      agentId: 'parameter-flow-agent',
      agentType: 'integration-builder',
      agentName: 'Parameter Flow Agent',
      version: '1.0.0',
      capabilities: [
        'integration-architecture',
        'parameter-mapping',
        'data-transformation',
        'integration-testing'
      ],
      status: 'online',
      lastSeen: new Date(),
      metadata: {
        description: 'The INTEGRATION BUILDER for System Architecture',
        patterns: ['all-purpose-pattern'],
        integrationTypes: ['unlimited']
      }
    });

    // Attempt to discover and connect to other meta-agents
    for (const agentName of this.KNOWN_META_AGENTS) {
      if (agentName !== 'Parameter Flow Agent') {
        await this.attemptAgentConnection(agentName);
      }
    }

    // Set up inter-agent communication protocols
    await this.setupCommunicationProtocols();
    
    console.log(chalk.green('✅ Meta-agent coordination initialized'));
  }

  /**
   * Register a meta-agent
   */
  async registerAgent(agentInfo: MetaAgentInfo): Promise<void> {
    console.log(chalk.blue(`📝 Registering agent: ${agentInfo.agentName}`));
    
    this.registeredAgents.set(agentInfo.agentId, {
      ...agentInfo,
      lastSeen: new Date()
    });

    // Initialize message history for this agent
    this.messageHistory.set(agentInfo.agentId, []);
    
    // Initialize metrics for this agent
    this.coordinationMetrics.set(agentInfo.agentId, {
      messagesExchanged: 0,
      requestsSent: 0,
      responsesReceived: 0,
      averageResponseTime: 0,
      errorCount: 0,
      lastInteraction: new Date()
    });

    this.emit('agent:registered', {
      agentId: agentInfo.agentId,
      agentName: agentInfo.agentName,
      capabilities: agentInfo.capabilities,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send coordination request to another meta-agent
   */
  async sendRequest(targetAgentId: string, requestType: string, parameters: Record<string, any>, timeout: number = 30000): Promise<any> {
    const requestId = `req-${uuidv4().substring(0, 8)}`;
    const targetAgent = this.registeredAgents.get(targetAgentId);
    
    if (!targetAgent) {
      throw new Error(`Meta-agent not found: ${targetAgentId}`);
    }

    if (targetAgent.status !== 'online') {
      throw new Error(`Meta-agent not available: ${targetAgentId} (status: ${targetAgent.status})`);
    }

    console.log(chalk.blue(`📤 Sending request to ${targetAgent.agentName}: ${requestType}`));

    const message: CoordinationMessage = {
      messageId: `msg-${requestId}`,
      senderId: 'parameter-flow-agent',
      receiverId: targetAgentId,
      messageType: 'request',
      payload: {
        requestType,
        parameters,
        requestId
      },
      timestamp: new Date(),
      priority: 'medium'
    };

    // Store pending request
    const request: CoordinationRequest = {
      requestId,
      requestType,
      targetAgent: targetAgentId,
      parameters,
      timeout
    };
    this.pendingRequests.set(requestId, request);

    // Send message (in real implementation, this would use actual communication)
    await this.sendMessage(message);

    // Wait for response with timeout
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${requestType} to ${targetAgent.agentName}`));
      }, timeout);

      // Set up response handler
      request.callback = (response: any) => {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(requestId);
        
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Request failed'));
        }
      };
    });
  }

  /**
   * Send notification to meta-agent(s)
   */
  async sendNotification(targetAgentId: string | 'broadcast', notificationType: string, data: Record<string, any>): Promise<void> {
    console.log(chalk.blue(`📢 Sending notification: ${notificationType}`));

    if (targetAgentId === 'broadcast') {
      // Send to all registered agents
      for (const [agentId, agent] of this.registeredAgents) {
        if (agentId !== 'parameter-flow-agent' && agent.status === 'online') {
          await this.sendNotificationToAgent(agentId, notificationType, data);
        }
      }
    } else {
      await this.sendNotificationToAgent(targetAgentId, notificationType, data);
    }
  }

  /**
   * Request integration architecture assistance from other agents
   */
  async requestIntegrationAssistance(integrationRequest: {
    assistanceType: 'architecture-review' | 'component-analysis' | 'testing-strategy' | 'deployment-guidance';
    integrationArchitecture: any;
    specificRequirements?: Record<string, any>;
  }): Promise<any> {
    console.log(chalk.blue(`🤝 Requesting integration assistance: ${integrationRequest.assistanceType}`));

    const assistanceResults: any[] = [];

    // Request assistance from relevant meta-agents based on assistance type
    switch (integrationRequest.assistanceType) {
      case 'architecture-review':
        // Request review from Infrastructure Orchestrator Agent
        if (this.registeredAgents.has('infrastructure-orchestrator-agent')) {
          try {
            const response = await this.sendRequest(
              'infrastructure-orchestrator-agent',
              'review-integration-architecture',
              { architecture: integrationRequest.integrationArchitecture }
            );
            assistanceResults.push({
              sourceAgent: 'infrastructure-orchestrator-agent',
              assistanceType: 'architecture-review',
              response
            });
          } catch (error: any) {
            console.warn(chalk.yellow(`⚠️  Failed to get architecture review: ${error.message}`));
          }
        }
        break;

      case 'component-analysis':
        // Request analysis from Template Engine Factory Agent
        if (this.registeredAgents.has('template-engine-factory-agent')) {
          try {
            const response = await this.sendRequest(
              'template-engine-factory-agent',
              'analyze-integration-components',
              { 
                components: integrationRequest.integrationArchitecture.topology.components,
                requirements: integrationRequest.specificRequirements
              }
            );
            assistanceResults.push({
              sourceAgent: 'template-engine-factory-agent',
              assistanceType: 'component-analysis',
              response
            });
          } catch (error: any) {
            console.warn(chalk.yellow(`⚠️  Failed to get component analysis: ${error.message}`));
          }
        }
        break;

      case 'testing-strategy':
        // Request strategy from Thirty-Minute Rule Agent
        if (this.registeredAgents.has('thirty-minute-rule-agent')) {
          try {
            const response = await this.sendRequest(
              'thirty-minute-rule-agent',
              'recommend-testing-strategy',
              { 
                integrationComplexity: integrationRequest.integrationArchitecture.quality.complexityScore,
                testingRequirements: integrationRequest.specificRequirements
              }
            );
            assistanceResults.push({
              sourceAgent: 'thirty-minute-rule-agent',
              assistanceType: 'testing-strategy',
              response
            });
          } catch (error: any) {
            console.warn(chalk.yellow(`⚠️  Failed to get testing strategy: ${error.message}`));
          }
        }
        break;

      case 'deployment-guidance':
        // Request guidance from Vercel-Native Architecture Agent
        if (this.registeredAgents.has('vercel-native-architecture-agent')) {
          try {
            const response = await this.sendRequest(
              'vercel-native-architecture-agent',
              'provide-deployment-guidance',
              { 
                architecture: integrationRequest.integrationArchitecture,
                deploymentRequirements: integrationRequest.specificRequirements
              }
            );
            assistanceResults.push({
              sourceAgent: 'vercel-native-architecture-agent',
              assistanceType: 'deployment-guidance',
              response
            });
          } catch (error: any) {
            console.warn(chalk.yellow(`⚠️  Failed to get deployment guidance: ${error.message}`));
          }
        }
        break;
    }

    return {
      assistanceType: integrationRequest.assistanceType,
      assistanceResults,
      summary: this.summarizeAssistanceResults(assistanceResults),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Coordinate with PRD-Parser Agent for requirements analysis
   */
  async coordinateRequirementsAnalysis(requirements: any): Promise<any> {
    console.log(chalk.blue('📋 Coordinating requirements analysis with PRD-Parser Agent...'));

    if (!this.registeredAgents.has('prd-parser-agent')) {
      console.warn(chalk.yellow('⚠️  PRD-Parser Agent not available'));
      return { available: false, message: 'PRD-Parser Agent not registered' };
    }

    try {
      const response = await this.sendRequest(
        'prd-parser-agent',
        'analyze-integration-requirements',
        { requirements }
      );

      return {
        available: true,
        analysis: response,
        recommendations: response.recommendations || [],
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.warn(chalk.yellow(`⚠️  Failed to coordinate with PRD-Parser Agent: ${error.message}`));
      return { available: false, error: error.message };
    }
  }

  /**
   * Share integration patterns with Template Engine Factory Agent
   */
  async shareIntegrationPatterns(patterns: any[]): Promise<void> {
    console.log(chalk.blue('🔄 Sharing integration patterns with Template Engine Factory Agent...'));

    if (!this.registeredAgents.has('template-engine-factory-agent')) {
      console.warn(chalk.yellow('⚠️  Template Engine Factory Agent not available'));
      return;
    }

    try {
      await this.sendNotification(
        'template-engine-factory-agent',
        'integration-patterns-update',
        { patterns, source: 'parameter-flow-agent' }
      );
      
      console.log(chalk.green('✅ Integration patterns shared successfully'));
    } catch (error: any) {
      console.warn(chalk.yellow(`⚠️  Failed to share integration patterns: ${error.message}`));
    }
  }

  /**
   * Get coordination status
   */
  getCoordinationStatus(): any {
    const onlineAgents = Array.from(this.registeredAgents.values()).filter(agent => agent.status === 'online');
    const totalMetrics = Array.from(this.coordinationMetrics.values()).reduce(
      (total, metrics) => ({
        messagesExchanged: total.messagesExchanged + metrics.messagesExchanged,
        requestsSent: total.requestsSent + metrics.requestsSent,
        responsesReceived: total.responsesReceived + metrics.responsesReceived,
        errorCount: total.errorCount + metrics.errorCount
      }),
      { messagesExchanged: 0, requestsSent: 0, responsesReceived: 0, errorCount: 0 }
    );

    return {
      coordinatorStatus: 'active',
      registeredAgents: this.registeredAgents.size,
      onlineAgents: onlineAgents.length,
      pendingRequests: this.pendingRequests.size,
      totalCommunications: totalMetrics.messagesExchanged,
      successRate: totalMetrics.requestsSent > 0 ? 
        ((totalMetrics.responsesReceived / totalMetrics.requestsSent) * 100).toFixed(2) + '%' : 'N/A',
      errorRate: totalMetrics.requestsSent > 0 ?
        ((totalMetrics.errorCount / totalMetrics.requestsSent) * 100).toFixed(2) + '%' : 'N/A',
      agents: onlineAgents.map(agent => ({
        id: agent.agentId,
        name: agent.agentName,
        type: agent.agentType,
        capabilities: agent.capabilities,
        lastSeen: agent.lastSeen
      }))
    };
  }

  /**
   * Private helper methods
   */

  private async initializeCommunicationChannels(): Promise<void> {
    // Initialize event-based communication
    this.setupEventHandlers();
    
    // Initialize HTTP communication endpoints if configured
    if (this.config.metaAgentCoordination?.communicationProtocols?.includes('http')) {
      await this.setupHttpCommunication();
    }
    
    // Initialize WebSocket communication if configured
    if (this.config.metaAgentCoordination?.communicationProtocols?.includes('websocket')) {
      await this.setupWebSocketCommunication();
    }
    
    // Initialize message queue communication if configured
    if (this.config.metaAgentCoordination?.communicationProtocols?.includes('message-queue')) {
      await this.setupMessageQueueCommunication();
    }
  }

  private setupEventHandlers(): void {
    // Handle incoming coordination events
    this.on('coordination:message', this.handleIncomingMessage.bind(this));
    this.on('coordination:response', this.handleIncomingResponse.bind(this));
    this.on('coordination:notification', this.handleIncomingNotification.bind(this));
  }

  private async setupHttpCommunication(): Promise<void> {
    // In a real implementation, this would set up HTTP endpoints
    console.log(chalk.gray('   HTTP communication channel initialized'));
  }

  private async setupWebSocketCommunication(): Promise<void> {
    // In a real implementation, this would set up WebSocket connections
    console.log(chalk.gray('   WebSocket communication channel initialized'));
  }

  private async setupMessageQueueCommunication(): Promise<void> {
    // In a real implementation, this would set up message queue connections
    console.log(chalk.gray('   Message queue communication channel initialized'));
  }

  private async discoverMetaAgents(): Promise<void> {
    console.log(chalk.blue('🔍 Discovering meta-agents...'));
    
    // Check for meta-agents in the project structure
    const projectRoot = this.config.projectRoot || process.cwd();
    const metaAgentsDir = path.join(projectRoot, 'src', 'meta-agents');
    
    if (await fs.pathExists(metaAgentsDir)) {
      const agentDirs = await fs.readdir(metaAgentsDir, { withFileTypes: true });
      
      for (const dirent of agentDirs) {
        if (dirent.isDirectory()) {
          await this.discoverMetaAgentInDirectory(path.join(metaAgentsDir, dirent.name), dirent.name);
        }
      }
    }
    
    // Additional discovery mechanisms would go here
    // - Network discovery
    // - Service registry lookup
    // - Configuration-based discovery
  }

  private async discoverMetaAgentInDirectory(agentPath: string, agentDirName: string): Promise<void> {
    try {
      // Check if package.json exists to identify the agent
      const packageJsonPath = path.join(agentPath, 'package.json');
      
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);
        
        // Extract agent information from package.json
        const agentInfo: MetaAgentInfo = {
          agentId: packageJson.name?.replace('@meta-agents/', '') || agentDirName,
          agentType: this.inferAgentType(packageJson.description || ''),
          agentName: this.formatAgentName(packageJson.description || agentDirName),
          version: packageJson.version || '1.0.0',
          capabilities: packageJson.keywords?.filter((k: string) => k !== 'meta-agent') || [],
          status: 'offline', // Will be updated when agent comes online
          lastSeen: new Date(),
          metadata: {
            description: packageJson.description,
            path: agentPath,
            discoveryMethod: 'filesystem'
          }
        };

        // Register discovered agent
        this.registeredAgents.set(agentInfo.agentId, agentInfo);
        
        console.log(chalk.gray(`   Discovered: ${agentInfo.agentName}`));
      }
    } catch (error: any) {
      console.warn(chalk.yellow(`⚠️  Failed to discover agent in ${agentPath}: ${error.message}`));
    }
  }

  private inferAgentType(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('parser')) return 'parser';
    if (desc.includes('generator') || desc.includes('scaffold')) return 'generator';
    if (desc.includes('template') || desc.includes('factory')) return 'factory';
    if (desc.includes('integration') || desc.includes('builder')) return 'integration-builder';
    if (desc.includes('orchestrator') || desc.includes('infrastructure')) return 'orchestrator';
    if (desc.includes('architecture')) return 'architecture-builder';
    if (desc.includes('rule') || desc.includes('validation')) return 'validator';
    if (desc.includes('framework')) return 'framework';
    
    return 'utility';
  }

  private formatAgentName(description: string): string {
    // Extract agent name from description
    const patterns = [
      /^([^-]+Agent)/i,
      /^The ([^-]+) for/i,
      /^([^:]+):/,
      /^(.+?) -/
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return description.split(' ').slice(0, 3).join(' ');
  }

  private async attemptAgentConnection(agentName: string): Promise<void> {
    console.log(chalk.gray(`   Attempting connection to: ${agentName}`));
    
    // In a real implementation, this would attempt actual connections
    // For now, we'll simulate discovery of known agents
    
    const agentId = agentName.toLowerCase().replace(/\s+/g, '-').replace('agent', '').trim() + '-agent';
    const existingAgent = this.registeredAgents.get(agentId);
    
    if (existingAgent) {
      // Simulate connection attempt
      const connected = Math.random() > 0.3; // 70% success rate
      
      if (connected) {
        existingAgent.status = 'online';
        existingAgent.lastSeen = new Date();
        console.log(chalk.green(`   ✅ Connected to: ${agentName}`));
        
        this.emit('agent:connected', {
          agentId,
          agentName,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(chalk.yellow(`   ⚠️  Failed to connect to: ${agentName}`));
      }
    }
  }

  private async setupCommunicationProtocols(): Promise<void> {
    // Set up standard communication protocols between agents
    const protocols = this.config.metaAgentCoordination?.communicationProtocols || ['event-emitter'];
    
    for (const protocol of protocols) {
      await this.initializeProtocol(protocol);
    }
  }

  private async initializeProtocol(protocol: string): Promise<void> {
    switch (protocol) {
      case 'event-emitter':
        // Already initialized in setupEventHandlers
        break;
      case 'http':
        await this.setupHttpProtocol();
        break;
      case 'websocket':
        await this.setupWebSocketProtocol();
        break;
      case 'message-queue':
        await this.setupMessageQueueProtocol();
        break;
      default:
        console.warn(chalk.yellow(`⚠️  Unknown protocol: ${protocol}`));
    }
  }

  private async setupHttpProtocol(): Promise<void> {
    // HTTP protocol setup implementation
    console.log(chalk.gray('   HTTP protocol initialized'));
  }

  private async setupWebSocketProtocol(): Promise<void> {
    // WebSocket protocol setup implementation
    console.log(chalk.gray('   WebSocket protocol initialized'));
  }

  private async setupMessageQueueProtocol(): Promise<void> {
    // Message queue protocol setup implementation
    console.log(chalk.gray('   Message queue protocol initialized'));
  }

  private setupHealthMonitoring(): void {
    // Set up periodic health checks for registered agents
    setInterval(async () => {
      await this.performHealthChecks();
    }, 60000); // Every minute
  }

  private async performHealthChecks(): Promise<void> {
    const now = new Date();
    
    for (const [agentId, agent] of this.registeredAgents) {
      if (agent.status === 'online') {
        const timeSinceLastSeen = now.getTime() - agent.lastSeen.getTime();
        
        // If no communication for 5 minutes, mark as potentially offline
        if (timeSinceLastSeen > 5 * 60 * 1000) {
          agent.status = 'offline';
          
          this.emit('agent:disconnected', {
            agentId,
            agentName: agent.agentName,
            lastSeen: agent.lastSeen,
            timestamp: now.toISOString()
          });
          
          console.log(chalk.yellow(`⚠️  Agent appears offline: ${agent.agentName}`));
        }
      }
    }
  }

  private initializeMetrics(): void {
    // Initialize overall coordination metrics
    this.coordinationMetrics.set('overall', {
      startTime: new Date(),
      totalAgentsDiscovered: 0,
      totalMessagesExchanged: 0,
      totalRequestsSent: 0,
      totalResponsesReceived: 0,
      totalNotificationsSent: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      uptimePercentage: 100
    });
  }

  private async sendMessage(message: CoordinationMessage): Promise<void> {
    // Store message in history
    const senderHistory = this.messageHistory.get(message.senderId) || [];
    const receiverHistory = this.messageHistory.get(message.receiverId) || [];
    
    senderHistory.push(message);
    receiverHistory.push(message);
    
    this.messageHistory.set(message.senderId, senderHistory);
    this.messageHistory.set(message.receiverId, receiverHistory);
    
    // Update metrics
    const senderMetrics = this.coordinationMetrics.get(message.senderId);
    if (senderMetrics) {
      senderMetrics.messagesExchanged++;
      if (message.messageType === 'request') {
        senderMetrics.requestsSent++;
      }
      senderMetrics.lastInteraction = new Date();
    }
    
    // In a real implementation, this would send the message via the appropriate protocol
    console.log(chalk.gray(`   📤 Message sent: ${message.messageType} to ${message.receiverId}`));
    
    // Simulate message delivery
    setTimeout(() => {
      this.simulateMessageDelivery(message);
    }, Math.random() * 100 + 10);
  }

  private simulateMessageDelivery(message: CoordinationMessage): void {
    // Simulate response for requests
    if (message.messageType === 'request') {
      const responseMessage: CoordinationMessage = {
        messageId: `response-${message.messageId}`,
        senderId: message.receiverId,
        receiverId: message.senderId,
        messageType: 'response',
        payload: {
          success: true,
          data: { message: 'Simulated response', requestId: message.payload.requestId },
          originalRequest: message.payload
        },
        timestamp: new Date(),
        priority: message.priority,
        replyTo: message.messageId
      };
      
      this.handleIncomingResponse(responseMessage);
    }
  }

  private async sendNotificationToAgent(targetAgentId: string, notificationType: string, data: Record<string, any>): Promise<void> {
    const message: CoordinationMessage = {
      messageId: `notif-${uuidv4().substring(0, 8)}`,
      senderId: 'parameter-flow-agent',
      receiverId: targetAgentId,
      messageType: 'notification',
      payload: {
        notificationType,
        data
      },
      timestamp: new Date(),
      priority: 'low'
    };

    await this.sendMessage(message);
  }

  private handleIncomingMessage(message: CoordinationMessage): void {
    console.log(chalk.gray(`   📥 Received message: ${message.messageType} from ${message.senderId}`));
    
    // Update metrics
    const receiverMetrics = this.coordinationMetrics.get(message.receiverId);
    if (receiverMetrics) {
      receiverMetrics.messagesExchanged++;
      receiverMetrics.lastInteraction = new Date();
    }
    
    // Process message based on type
    switch (message.messageType) {
      case 'request':
        this.handleIncomingRequest(message);
        break;
      case 'response':
        this.handleIncomingResponse(message);
        break;
      case 'notification':
        this.handleIncomingNotification(message);
        break;
      case 'event':
        this.handleIncomingEvent(message);
        break;
    }
  }

  private handleIncomingRequest(message: CoordinationMessage): void {
    // Handle incoming requests from other meta-agents
    const { requestType, parameters } = message.payload;
    
    console.log(chalk.blue(`📥 Processing request: ${requestType} from ${message.senderId}`));
    
    // Process request and send response
    // In a real implementation, this would route to appropriate handlers
    
    this.emit('coordination:request', {
      requestType,
      parameters,
      senderId: message.senderId,
      messageId: message.messageId
    });
  }

  private handleIncomingResponse(message: CoordinationMessage): void {
    const { originalRequest, success, data, error } = message.payload;
    const requestId = originalRequest?.requestId;
    
    if (requestId) {
      const pendingRequest = this.pendingRequests.get(requestId);
      
      if (pendingRequest && pendingRequest.callback) {
        // Update metrics
        const metrics = this.coordinationMetrics.get(message.senderId);
        if (metrics) {
          metrics.responsesReceived++;
          if (!success) {
            metrics.errorCount++;
          }
        }
        
        // Call the response callback
        pendingRequest.callback({ success, data, error });
      }
    }
  }

  private handleIncomingNotification(message: CoordinationMessage): void {
    const { notificationType, data } = message.payload;
    
    console.log(chalk.blue(`📢 Received notification: ${notificationType} from ${message.senderId}`));
    
    this.emit('coordination:notification', {
      notificationType,
      data,
      senderId: message.senderId,
      timestamp: message.timestamp
    });
  }

  private handleIncomingEvent(message: CoordinationMessage): void {
    const { eventType, eventData } = message.payload;
    
    console.log(chalk.blue(`📡 Received event: ${eventType} from ${message.senderId}`));
    
    this.emit('coordination:event', {
      eventType,
      eventData,
      senderId: message.senderId,
      timestamp: message.timestamp
    });
  }

  private summarizeAssistanceResults(results: any[]): string {
    if (results.length === 0) {
      return 'No assistance responses received';
    }
    
    const summary = results.map(result => 
      `${result.sourceAgent}: ${result.assistanceType} - ${result.response.success ? 'Success' : 'Failed'}`
    ).join('; ');
    
    return `Received ${results.length} assistance response(s): ${summary}`;
  }
}

export default MetaAgentCoordinator;