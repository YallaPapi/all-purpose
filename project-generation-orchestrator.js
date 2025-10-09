#!/usr/bin/env node

/**
 * Project Generation Orchestrator
 * 
 * Handles sequential meta-agent execution for complete project generation
 * Usage: node project-generation-orchestrator.js --project=prospector-agent
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

// ES modules don't have __dirname, so we need to create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProjectGenerationOrchestrator {
  constructor(projectName, config = {}) {
    this.projectName = projectName;
    this.config = {
      projectRoot: config.projectRoot || path.join(__dirname, 'generated'),
      logLevel: config.logLevel || 'info',
      ...config
    };
    
    // Sequential agent pipeline
    this.agentPipeline = [
      {
        name: 'PRD-Parser',
        path: 'src/meta-agents/prd-parser',
        command: 'node main.js',
        input: 'prospector-agent-tasks.json',
        output: 'parsed-tasks.json'
      },
      {
        name: 'Scaffold-Generator', 
        path: 'src/meta-agents/scaffold-generator',
        command: 'node main.js generate',
        input: 'parsed-tasks.json',
        output: 'basic-structure'
      },
      {
        name: 'Template-Engine-Factory',
        path: 'src/meta-agents/template-engine-factory',
        command: 'node dist/main.js generate implementation-system --description "Generated implementation from basic structure" --project-root ../../../generated --output-dir ./generated-template-systems --engine handlebars --language typescript --format esm',
        input: 'basic-structure',
        output: 'implementation-code'
      },
      {
        name: 'All-Purpose-Pattern',
        path: 'src/meta-agents/all-purpose-pattern', 
        command: 'node dist/main.js',
        input: 'implementation-code',
        output: 'pattern-applied'
      },
      {
        name: 'Parameter-Flow',
        path: 'src/meta-agents/parameter-flow',
        command: 'node dist/main.js build-architecture --name "Data Flow Configuration" --description "Configure parameter flow for generated project" --components \'[{"componentId":"pattern-applied-project","name":"Pattern Applied Project","type":"processing-unit","version":"1.0.0","interface":{"inputParameters":[],"outputParameters":[],"events":[],"methods":[],"protocols":["file-system"]},"capabilities":{"supportedDataTypes":["json","typescript"],"supportedOperations":["read","transform"],"supportedProtocols":["file-system"],"scalingCapabilities":["horizontal"],"reliabilityLevel":"high"},"configuration":{},"health":{}}]\'',
        input: 'pattern-applied',
        output: 'data-flow-configured'
      },
      {
        name: 'Infrastructure-Orchestrator',
        path: 'src/meta-agents/infra-orchestrator',
        command: 'npm run build && node dist/main.js orchestrate --project-root ../../../generated --enable-investigation --project-name {PROJECT_NAME}',
        input: 'data-flow-configured',
        output: 'orchestrated-infrastructure'
      },
      {
        name: 'Vercel-Native-Architecture',
        path: 'src/meta-agents/vercel-native-architecture',
        command: 'node dist/main.js',
        input: 'orchestrated-infrastructure', 
        output: 'deployment-ready'
      },
      {
        name: 'Five-Document-Framework',
        path: 'src/meta-agents/five-document-framework',
        command: 'node dist/main.js',
        input: 'deployment-ready',
        output: 'documented'
      },
      {
        name: 'Thirty-Minute-Rule',
        path: 'src/meta-agents/thirty-minute-rule',
        command: 'node dist/main.js status',
        input: 'documented',
        output: 'validated'
      },
      // Domain Agents - Complete software development
      {
        name: 'Backend-Agent',
        path: '.',
        command: 'node -e "import(\'./generated/backend-agent/dist/core/BackendAgent.js\').then(async ({BackendAgent}) => { const agent = new BackendAgent({enableUEP: true, outputDir: \'./generated/{PROJECT_NAME}/src/backend\', projectRoot: \'./generated/{PROJECT_NAME}\'}); await agent.initialize(); const result = await agent.processTask(\'Design API backend\', {type: \'design-api\'}); console.log(\'✅ Backend Agent completed:\', result.success); await agent.shutdown(); })"',
        input: 'validated',
        output: 'backend-complete'
      },
      {
        name: 'Frontend-Agent', 
        path: '.',
        command: 'node -e "import(\'./generated/frontend-agent/dist/core/FrontendAgent.js\').then(async ({FrontendAgent}) => { const agent = new FrontendAgent({enableUEP: true, outputDir: \'./generated/{PROJECT_NAME}/src/frontend\', projectRoot: \'./generated/{PROJECT_NAME}\'}); await agent.initialize(); const result = await agent.processTask(\'Generate UI components\', {type: \'generate-component\'}); console.log(\'✅ Frontend Agent completed:\', result.success); await agent.shutdown(); })"',
        input: 'backend-complete',
        output: 'frontend-complete'
      },
      {
        name: 'DevOps-Agent',
        path: '.',
        command: 'node -e "import(\'./generated/devops-agent/dist/core/DevOpsAgent.js\').then(async ({DevOpsAgent}) => { const agent = new DevOpsAgent({enableUEP: true, outputDir: \'./generated/{PROJECT_NAME}/devops\', projectRoot: \'./generated/{PROJECT_NAME}\'}); await agent.initialize(); const result = await agent.processTask(\'Configure deployment\', {type: \'configure-deployment\'}); console.log(\'✅ DevOps Agent completed:\', result.success); await agent.shutdown(); })"',
        input: 'frontend-complete', 
        output: 'deployment-configured'
      },
      {
        name: 'QA-Agent',
        path: '.',
        command: 'node -e "import(\'./generated/qa-agent/dist/core/QAAgent.js\').then(async ({QAAgent}) => { const agent = new QAAgent({enableUEP: true, outputDir: \'./generated/{PROJECT_NAME}/tests\', projectRoot: \'./generated/{PROJECT_NAME}\'}); await agent.initialize(); const result = await agent.processTask(\'Generate test plan\', {type: \'generate-test-plan\'}); console.log(\'✅ QA Agent completed:\', result.success); await agent.shutdown(); })"',
        input: 'deployment-configured',
        output: 'testing-complete'
      },
      {
        name: 'Post-Creation-Investigator',
        path: 'src/meta-agents/post-creation-investigator',
        command: 'npm run start-simple investigate -p ../../../generated/{PROJECT_NAME} -t generic -f text',
        input: 'testing-complete',
        output: 'investigation-complete'
      }
    ];
    
    this.executionState = {
      currentAgent: null,
      currentStep: 0,
      completedAgents: [],
      failedAgents: [],
      startTime: null,
      totalAgents: this.agentPipeline.length
    };
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...data };
    
    if (level === 'error') {
      console.error(`❌ [${timestamp}] ${message}`, data);
    } else if (level === 'info') {
      console.log(`ℹ️  [${timestamp}] ${message}`, data);
    } else if (level === 'success') {
      console.log(`✅ [${timestamp}] ${message}`, data);
    }
  }

  async executeAgent(agent, inputData) {
    this.log('info', `Starting ${agent.name}...`, { agent: agent.name, step: this.executionState.currentStep + 1 });
    
    const agentPath = path.join(__dirname, agent.path);
    const outputPath = path.join(this.config.projectRoot, this.projectName);
    
    // Prepare agent command with proper arguments
    // Replace project name placeholder
    const commandWithProjectName = agent.command.replace(/{PROJECT_NAME}/g, this.projectName);
    const commandParts = commandWithProjectName.split(' ');
    const command = commandParts[0];
    
    // Only add arguments for agents that support them
    const supportsProjectArg = ['PRD-Parser', 'Scaffold-Generator'].includes(agent.name);
    
    const args = [
      ...commandParts.slice(1)
    ];
    
    // Add project-specific arguments only for compatible agents
    if (supportsProjectArg) {
      args.push('--project', this.projectName);
      args.push('--input', inputData || agent.input);
      args.push('--output', outputPath);
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: agentPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        this.log('info', `[${agent.name}] ${data.toString().trim()}`);
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        this.log('error', `[${agent.name}] ${data.toString().trim()}`);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          this.log('success', `${agent.name} completed successfully`);
          resolve({
            success: true,
            agent: agent.name,
            output: stdout,
            outputPath: path.join(outputPath, agent.output)
          });
        } else {
          this.log('error', `${agent.name} failed with exit code ${code}`, { stderr });
          reject(new Error(`${agent.name} failed: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        this.log('error', `Failed to start ${agent.name}`, { error: error.message });
        reject(error);
      });
    });
  }

  async runSequentialGeneration() {
    this.executionState.startTime = Date.now();
    this.log('info', `🚀 Starting project generation for: ${this.projectName}`);
    
    // Ensure output directory exists
    await fs.ensureDir(path.join(this.config.projectRoot, this.projectName));
    
    let previousOutput = null;
    
    for (let i = 0; i < this.agentPipeline.length; i++) {
      const agent = this.agentPipeline[i];
      this.executionState.currentAgent = agent.name;
      this.executionState.currentStep = i;
      
      try {
        // Execute agent with output from previous agent
        const result = await this.executeAgent(agent, previousOutput);
        
        // Store result for next agent
        previousOutput = result.outputPath;
        this.executionState.completedAgents.push({
          name: agent.name,
          result,
          completedAt: Date.now()
        });
        
        this.log('success', `✅ Agent ${i + 1}/${this.agentPipeline.length} completed: ${agent.name}`);
        
        // Wait between agents to prevent resource conflicts
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        this.log('error', `❌ Agent failed: ${agent.name}`, { error: error.message });
        this.executionState.failedAgents.push({
          name: agent.name,
          error: error.message,
          failedAt: Date.now()
        });
        
        // Decide whether to continue or stop
        const shouldContinue = await this.handleAgentFailure(agent, error);
        if (!shouldContinue) {
          throw new Error(`Pipeline stopped due to ${agent.name} failure`);
        }
      }
    }
    
    const duration = Date.now() - this.executionState.startTime;
    this.log('success', `🎉 Project generation completed!`, {
      project: this.projectName,
      duration: `${Math.round(duration / 1000)}s`,
      completedAgents: this.executionState.completedAgents.length,
      failedAgents: this.executionState.failedAgents.length
    });
    
    return {
      success: true,
      project: this.projectName,
      duration,
      outputPath: path.join(this.config.projectRoot, this.projectName),
      completedAgents: this.executionState.completedAgents,
      failedAgents: this.executionState.failedAgents
    };
  }

  async handleAgentFailure(agent, error) {
    this.log('info', `🤔 Handling failure for ${agent.name}...`);
    
    // For now, continue with next agent even if one fails
    // Later we can add retry logic or conditional stops
    return true;
  }

  getStatus() {
    return {
      project: this.projectName,
      currentAgent: this.executionState.currentAgent,
      progress: Math.round((this.executionState.currentStep / this.executionState.totalAgents) * 100),
      completedAgents: this.executionState.completedAgents.length,
      failedAgents: this.executionState.failedAgents.length,
      isRunning: this.executionState.currentAgent !== null
    };
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const projectArg = args.find(arg => arg.startsWith('--project='));
  
  if (!projectArg) {
    console.error('❌ Usage: node project-generation-orchestrator.js --project=<project-name>');
    process.exit(1);
  }
  
  const projectName = projectArg.split('=')[1];
  const orchestrator = new ProjectGenerationOrchestrator(projectName);
  
  try {
    const result = await orchestrator.runSequentialGeneration();
    console.log('🎉 Project Generation Result:', result);
  } catch (error) {
    console.error('❌ Project generation failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly  
if (__filename === process.argv[1] || process.argv[1].endsWith('project-generation-orchestrator.js')) {
  main().catch(console.error);
}

export { ProjectGenerationOrchestrator };