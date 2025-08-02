#!/usr/bin/env node

/**
 * NATS-Enabled PRD Parser Agent
 * 
 * Extends the base PRD parser with NATS communication capabilities
 * for distributed task processing and workflow integration
 */

import { NATSAgentWrapper } from '../../services/NATSAgentWrapper.js';
import PRDParser from './parser.js';
import fs from 'fs/promises';
import path from 'path';

export class NATSPRDParserAgent extends NATSAgentWrapper {
  constructor(config = {}) {
    const prdParser = new PRDParser(config.parserConfig || {});
    
    const agentConfig = {
      id: config.id || `prd-parser-${Date.now()}`,
      type: 'prd-parser',
      name: 'PRD Parser Agent',
      capabilities: [
        'prd-parsing',
        'requirements-extraction',
        'tech-stack-detection',
        'task-generation'
      ],
      ...config
    };

    super(agentConfig, prdParser);
  }

  /**
   * Override executeWrappedAgent to handle PRD-specific tasks
   */
  async executeWrappedAgent(task) {
    const { type, payload } = task;
    
    switch (type) {
      case 'parse-prd':
        return await this.parsePRD(payload);
      
      case 'extract-requirements':
        return await this.extractRequirements(payload);
      
      case 'generate-tasks':
        return await this.generateTasks(payload);
      
      case 'analyze-complexity':
        return await this.analyzeComplexity(payload);
      
      default:
        // Fallback to base parser
        if (payload.content) {
          return await this.wrappedAgent.parse(payload.content, payload.options || {});
        } else if (payload.filePath) {
          const content = await fs.readFile(payload.filePath, 'utf-8');
          return await this.wrappedAgent.parse(content, { 
            ...payload.options, 
            filepath: payload.filePath 
          });
        }
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  async parsePRD(payload) {
    let content;
    
    // Handle different input types
    if (payload.content) {
      content = payload.content;
    } else if (payload.filePath) {
      content = await fs.readFile(payload.filePath, 'utf-8');
    } else if (payload.url) {
      // TODO: Implement URL fetching
      throw new Error('URL fetching not yet implemented');
    } else {
      throw new Error('No PRD content provided');
    }

    // Parse the PRD
    const parsed = await this.wrappedAgent.parse(content, payload.options || {});
    
    // Generate domain tasks if requested
    if (payload.generateTasks) {
      parsed.domainTasks = await this.generateDomainTasks(parsed);
    }

    // Publish parsed PRD event
    if (this.nc) {
      await this.nc.publish('prd.parsed', JSON.stringify({
        taskId: this.currentTask?.id,
        workflowId: this.currentTask?.workflowId,
        parsed,
        timestamp: new Date()
      }));
    }

    return parsed;
  }

  async extractRequirements(payload) {
    const { content, options = {} } = payload;
    const parsed = await this.wrappedAgent.parse(content, options);
    
    return {
      functional: parsed.requirements || [],
      technical: parsed.techStack || [],
      nonFunctional: this.extractNonFunctionalRequirements(content),
      userStories: this.extractUserStories(content),
      acceptanceCriteria: this.extractAcceptanceCriteria(content)
    };
  }

  async generateTasks(payload) {
    const { parsed, options = {} } = payload;
    const tasks = await this.generateDomainTasks(parsed, options);
    
    // Publish task generation event
    if (this.nc) {
      await this.nc.publish('prd.tasks.generated', JSON.stringify({
        workflowId: this.currentTask?.workflowId,
        taskCount: tasks.length,
        tasks: tasks.map(t => ({ id: t.id, type: t.type, agentType: t.agentType })),
        timestamp: new Date()
      }));
    }

    return tasks;
  }

  async analyzeComplexity(payload) {
    const { parsed, options = {} } = payload;
    
    const complexity = {
      score: 0,
      factors: {},
      estimatedDuration: 0,
      recommendedTeamSize: 1
    };

    // Analyze various complexity factors
    complexity.factors.requirements = parsed.requirements?.length || 0;
    complexity.factors.techStack = parsed.techStack?.length || 0;
    complexity.factors.integrations = this.countIntegrations(parsed);
    complexity.factors.userRoles = this.countUserRoles(parsed);
    
    // Calculate complexity score (0-10)
    complexity.score = Math.min(10, 
      (complexity.factors.requirements * 0.3) +
      (complexity.factors.techStack * 0.2) +
      (complexity.factors.integrations * 0.3) +
      (complexity.factors.userRoles * 0.2)
    );

    // Estimate duration in days
    complexity.estimatedDuration = Math.ceil(complexity.score * 10);
    
    // Recommend team size
    complexity.recommendedTeamSize = Math.ceil(complexity.score / 3);

    return complexity;
  }

  async generateDomainTasks(parsed, options = {}) {
    const tasks = [];
    const timestamp = Date.now();
    
    // Backend tasks
    if (this.requiresBackend(parsed)) {
      tasks.push({
        id: `backend-task-${timestamp}`,
        type: 'backend-development',
        agentType: 'backend',
        priority: 'high',
        requirements: this.filterBackendRequirements(parsed.requirements),
        techStack: this.filterBackendTech(parsed.techStack),
        description: 'Implement backend API and business logic',
        estimatedHours: this.estimateBackendHours(parsed)
      });
    }

    // Frontend tasks
    if (this.requiresFrontend(parsed)) {
      tasks.push({
        id: `frontend-task-${timestamp}`,
        type: 'frontend-development',
        agentType: 'frontend',
        priority: 'medium',
        requirements: this.filterFrontendRequirements(parsed.requirements),
        techStack: this.filterFrontendTech(parsed.techStack),
        description: 'Create user interface and client-side functionality',
        estimatedHours: this.estimateFrontendHours(parsed)
      });
    }

    // DevOps tasks
    tasks.push({
      id: `devops-task-${timestamp}`,
      type: 'infrastructure-setup',
      agentType: 'devops',
      priority: 'medium',
      requirements: this.filterInfraRequirements(parsed.requirements),
      description: 'Set up deployment pipeline and infrastructure',
      estimatedHours: 20
    });

    // QA tasks
    tasks.push({
      id: `qa-task-${timestamp}`,
      type: 'testing-strategy',
      agentType: 'qa',
      priority: 'high',
      requirements: parsed.requirements || [],
      description: 'Create comprehensive testing strategy and test suites',
      estimatedHours: this.estimateQAHours(parsed)
    });

    // Documentation tasks
    tasks.push({
      id: `docs-task-${timestamp}`,
      type: 'documentation',
      agentType: 'documentation',
      priority: 'low',
      requirements: parsed.requirements || [],
      description: 'Generate API documentation and user guides',
      estimatedHours: 15
    });

    return tasks;
  }

  // Helper methods
  extractNonFunctionalRequirements(content) {
    const nfrs = [];
    const patterns = [
      /performance|scalability|reliability|availability/i,
      /security|authentication|authorization/i,
      /usability|accessibility|responsive/i,
      /maintainability|extensibility|modularity/i
    ];
    
    const lines = content.split('\n');
    for (const line of lines) {
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          nfrs.push(line.trim());
          break;
        }
      }
    }
    
    return nfrs;
  }

  extractUserStories(content) {
    const stories = [];
    const pattern = /as a\s+(.+?),?\s+i want\s+(.+?)\s+so that\s+(.+)/i;
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        stories.push({
          role: match[1].trim(),
          want: match[2].trim(),
          benefit: match[3].trim()
        });
      }
    }
    
    return stories;
  }

  extractAcceptanceCriteria(content) {
    const criteria = [];
    const patterns = [
      /given\s+(.+?)\s+when\s+(.+?)\s+then\s+(.+)/i,
      /acceptance criteria:/i,
      /success criteria:/i
    ];
    
    // TODO: Implement more sophisticated extraction
    return criteria;
  }

  countIntegrations(parsed) {
    const integrationKeywords = ['API', 'integration', 'webhook', 'third-party', 'external'];
    let count = 0;
    
    if (parsed.requirements) {
      for (const req of parsed.requirements) {
        if (integrationKeywords.some(keyword => req.toLowerCase().includes(keyword.toLowerCase()))) {
          count++;
        }
      }
    }
    
    return count;
  }

  countUserRoles(parsed) {
    const roleKeywords = ['admin', 'user', 'customer', 'manager', 'operator', 'viewer'];
    const roles = new Set();
    
    const content = JSON.stringify(parsed).toLowerCase();
    for (const role of roleKeywords) {
      if (content.includes(role)) {
        roles.add(role);
      }
    }
    
    return roles.size;
  }

  requiresBackend(parsed) {
    const backendIndicators = ['API', 'database', 'server', 'backend', 'REST', 'GraphQL'];
    const content = JSON.stringify(parsed).toLowerCase();
    
    return backendIndicators.some(indicator => content.includes(indicator.toLowerCase()));
  }

  requiresFrontend(parsed) {
    const frontendIndicators = ['UI', 'interface', 'frontend', 'client', 'web', 'mobile'];
    const content = JSON.stringify(parsed).toLowerCase();
    
    return frontendIndicators.some(indicator => content.includes(indicator.toLowerCase()));
  }

  filterBackendRequirements(requirements = []) {
    const backendKeywords = ['API', 'database', 'authentication', 'server', 'endpoint'];
    return requirements.filter(req => 
      backendKeywords.some(keyword => req.toLowerCase().includes(keyword.toLowerCase()))
    );
  }

  filterFrontendRequirements(requirements = []) {
    const frontendKeywords = ['UI', 'user interface', 'display', 'form', 'button', 'screen'];
    return requirements.filter(req => 
      frontendKeywords.some(keyword => req.toLowerCase().includes(keyword.toLowerCase()))
    );
  }

  filterInfraRequirements(requirements = []) {
    const infraKeywords = ['deploy', 'hosting', 'infrastructure', 'CI/CD', 'container'];
    return requirements.filter(req => 
      infraKeywords.some(keyword => req.toLowerCase().includes(keyword.toLowerCase()))
    );
  }

  filterBackendTech(techStack = []) {
    const backendTech = ['Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Python', 'Java', 'Go'];
    return techStack.filter(tech => backendTech.includes(tech));
  }

  filterFrontendTech(techStack = []) {
    const frontendTech = ['React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Svelte'];
    return techStack.filter(tech => frontendTech.includes(tech));
  }

  estimateBackendHours(parsed) {
    const base = 40;
    const perRequirement = 5;
    const perTech = 10;
    
    return base + 
           (parsed.requirements?.length || 0) * perRequirement +
           (parsed.techStack?.length || 0) * perTech;
  }

  estimateFrontendHours(parsed) {
    const base = 30;
    const perScreen = 8;
    const perComponent = 4;
    
    // Rough estimation based on requirements
    const screenCount = (parsed.requirements?.filter(r => r.includes('screen') || r.includes('page')).length || 3);
    
    return base + (screenCount * perScreen);
  }

  estimateQAHours(parsed) {
    const base = 20;
    const perRequirement = 2;
    
    return base + (parsed.requirements?.length || 0) * perRequirement;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new NATSPRDParserAgent({
    id: `prd-parser-${Date.now()}`,
    natsUrl: process.env.NATS_URL || 'nats://localhost:4222'
  });

  agent.connect()
    .then(() => {
      console.log('PRD Parser Agent started and connected to NATS');
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        await agent.shutdown();
        process.exit(0);
      });
    })
    .catch(error => {
      console.error('Failed to start PRD Parser Agent:', error);
      process.exit(1);
    });
}

export default NATSPRDParserAgent;