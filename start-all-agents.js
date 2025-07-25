#!/usr/bin/env node

/**
 * Meta-Agent Process Orchestration Script
 * 
 * Starts all 9 meta-agents with coordination and observability
 * 
 * Usage: node start-all-agents.js
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            process.env[key.trim()] = value;
          }
        }
      }
      console.log('✅ Environment variables loaded from .env.local');
    } else {
      console.warn('⚠️  .env.local not found, using existing environment variables');
    }
  } catch (error) {
    console.error('❌ Failed to load .env.local:', error.message);
  }
}

// Load environment variables
loadEnvFile();

// Meta-agent configurations - All agents now include working memory integration
const META_AGENTS = [
  {
    name: 'All-Purpose Pattern Agent',
    id: 'all-purpose-pattern-001',
    path: 'src/meta-agents/all-purpose-pattern',
    type: 'typescript',
    buildRequired: true,
    startCommand: 'npm start',
    memoryEnabled: true
  },
  {
    name: 'PRD Parser Agent', 
    id: 'prd-parser-001',
    path: 'src/meta-agents/prd-parser',
    type: 'javascript',
    buildRequired: false,
    startCommand: 'npm start',
    memoryEnabled: true
  },
  {
    name: 'Scaffold Generator Agent',
    id: 'scaffold-generator-001', 
    path: 'src/meta-agents/scaffold-generator',
    type: 'typescript',
    buildRequired: true,
    startCommand: 'npm start',
    memoryEnabled: true
  },
  {
    name: 'Five Document Framework Agent',
    id: 'five-document-framework-001',
    path: 'src/meta-agents/five-document-framework', 
    type: 'typescript',
    buildRequired: true,
    startCommand: 'npm start',
    memoryEnabled: true
  },
  {
    name: 'Template Engine Factory Agent',
    id: 'template-engine-001',
    path: 'src/meta-agents/template-engine-factory',
    type: 'typescript', 
    buildRequired: true,
    startCommand: 'npm start',
    memoryEnabled: true
  },
  {
    name: 'Parameter Flow Agent',
    id: 'parameter-flow-001',
    path: 'src/meta-agents/parameter-flow',
    type: 'typescript',
    buildRequired: true, 
    startCommand: 'npm start',
    memoryEnabled: true
  },
  {
    name: 'Thirty Minute Rule Agent',
    id: 'thirty-minute-rule-001',
    path: 'src/meta-agents/thirty-minute-rule',
    type: 'typescript',
    buildRequired: true,
    startCommand: 'npm start',
    memoryEnabled: true
  },
  {
    name: 'Vercel Native Architecture Agent',
    id: 'vercel-native-001',
    path: 'src/meta-agents/vercel-native-architecture', 
    type: 'typescript',
    buildRequired: true,
    startCommand: 'npm start',
    memoryEnabled: true
  },
  {
    name: 'Infrastructure Orchestrator Agent',
    id: 'infra-orchestrator-001',
    path: 'src/meta-agents/infra-orchestrator',
    type: 'typescript',
    buildRequired: true,
    startCommand: 'npm start',
    memoryEnabled: true
  }
];

// Process tracking
const processes = [];
let coordinatorProcess = null;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down all meta-agents...');
  
  // Stop all agent processes
  for (const proc of processes) {
    if (proc && !proc.killed) {
      proc.kill('SIGINT');
    }
  }
  
  // Stop coordinator
  if (coordinatorProcess && !coordinatorProcess.killed) {
    coordinatorProcess.kill('SIGINT');
  }
  
  console.log('✅ All processes stopped');
  process.exit(0);
});

// Utility functions
function runCommand(command, args, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: true,
      env: { ...process.env, ...options.env }
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    proc.on('error', reject);
  });
}

function startProcess(command, args, cwd, name) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting ${name}...`);
    
    const proc = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: process.env
    });
    
    // Add colored output
    proc.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[${name}] ${output}`);
      }
    });
    
    proc.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[${name}] ⚠️  ${output}`);
      }
    });
    
    proc.on('close', (code) => {
      console.log(`❌ ${name} stopped with code ${code}`);
    });
    
    proc.on('error', (error) => {
      console.error(`❌ ${name} error:`, error.message);
    });
    
    // Consider started after a brief delay
    setTimeout(() => {
      if (!proc.killed) {
        console.log(`✅ ${name} started successfully`);
        resolve(proc);
      } else {
        reject(new Error(`${name} failed to start`));
      }
    }, 2000);
    
    return proc;
  });
}

async function buildAgent(agent) {
  console.log(`🔨 Building ${agent.name}...`);
  
  const agentPath = path.join(__dirname, agent.path);
  
  try {
    // Install dependencies if needed
    if (!fs.existsSync(path.join(agentPath, 'node_modules'))) {
      console.log(`📦 Installing dependencies for ${agent.name}...`);
      await runCommand('npm', ['install'], agentPath, { silent: true });
    }
    
    // Build TypeScript agents if dist doesn't exist or build is required
    if (agent.buildRequired) {
      const distPath = path.join(agentPath, 'dist');
      if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'main.js'))) {
        console.log(`📦 Compiling TypeScript for ${agent.name}...`);
        await runCommand('npm', ['run', 'build'], agentPath, { silent: true });
      } else {
        console.log(`✅ ${agent.name} already built (dist/main.js exists)`);
      }
    }
    
    console.log(`✅ ${agent.name} ready`);
  } catch (error) {
    console.error(`❌ Failed to build ${agent.name}:`, error.message);
    console.log(`⚠️  Attempting to continue with existing build...`);
    // Don't throw error, try to continue with existing build
  }
}

async function startCoordinator() {
  console.log('🚀 Starting Meta-Agent Coordinator with Observability...');
  
  try {
    const proc = startProcess('node', ['setup-observability.js'], __dirname, 'Coordinator');
    coordinatorProcess = await proc;
    
    // Give coordinator time to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return coordinatorProcess;
  } catch (error) {
    console.error('❌ Failed to start coordinator:', error.message);
    throw error;
  }
}

async function startAgent(agent) {
  const agentPath = path.join(__dirname, agent.path);
  
  try {
    const [command, ...args] = agent.startCommand.split(' ');
    const proc = await startProcess(command, args, agentPath, agent.name);
    processes.push(proc);
    
    return proc;
  } catch (error) {
    console.error(`❌ Failed to start ${agent.name}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🎯 Meta-Agent Factory Startup Sequence\n');
  
  try {
    // Step 1: Build all agents that require building
    console.log('📋 Phase 1: Building Meta-Agents...\n');
    for (const agent of META_AGENTS) {
      if (agent.buildRequired) {
        await buildAgent(agent);
      }
    }
    
    // Step 2: Start coordinator with observability
    console.log('\n📋 Phase 2: Starting Coordination System...\n');
    await startCoordinator();
    
    // Step 3: Start all meta-agents
    console.log('\n📋 Phase 3: Starting Meta-Agents...\n');
    for (const agent of META_AGENTS) {
      await startAgent(agent);
      // Stagger startup to avoid overwhelming the coordinator
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL!\n');
    console.log('📱 Dashboard: http://localhost:3000/admin/observability');
    console.log('🔍 API Test: http://localhost:3000/admin/test-api');
    console.log('📊 Working Dashboard: http://localhost:3000/admin/observability/working');
    console.log('\n⚡ Real meta-agent coordination is now active!');
    console.log('   Press Ctrl+C to stop all agents\n');
    
    // Keep the process alive
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Startup failed:', error.message);
    process.exit(1);
  }
}

// Run the startup sequence
main().catch(console.error);