#!/usr/bin/env node

/**
 * Fixed Meta-Agent Process Orchestration Script
 * 
 * Starts all meta-agents using the agent wrapper to avoid EPIPE errors
 */

import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Meta-agent configurations
const META_AGENTS = [
  {
    name: 'All-Purpose Pattern Agent',
    id: 'all-purpose-pattern-001',
    type: 'all-purpose-pattern'
  },
  {
    name: 'PRD Parser Agent', 
    id: 'prd-parser-001',
    type: 'prd-parser'
  },
  {
    name: 'Scaffold Generator Agent',
    id: 'scaffold-generator-001',
    type: 'scaffold-generator'
  },
  {
    name: 'Template Engine Factory Agent',
    id: 'template-engine-001',
    type: 'template-engine'
  },
  {
    name: 'Parameter Flow Agent',
    id: 'parameter-flow-001',
    type: 'parameter-flow'
  }
];

// Process tracking
const processes = [];
let coordinatorProcess = null;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down all agents...');
  
  for (const proc of processes) {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  }
  
  if (coordinatorProcess && !coordinatorProcess.killed) {
    coordinatorProcess.kill('SIGTERM');
  }
  
  setTimeout(() => {
    console.log('✅ All processes stopped');
    process.exit(0);
  }, 1000);
});

function startProcess(command, args, name, color) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting ${name}...`);
    
    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: process.env
    });
    
    // Color codes for different agents
    const colors = {
      'coordinator': '\x1b[36m',     // Cyan
      'all-purpose': '\x1b[33m',     // Yellow
      'prd-parser': '\x1b[32m',      // Green
      'scaffold': '\x1b[35m',        // Magenta
      'template': '\x1b[34m',        // Blue
      'parameter': '\x1b[31m',       // Red
      'default': '\x1b[37m'          // White
    };
    
    const agentColor = colors[color] || colors.default;
    const reset = '\x1b[0m';
    
    proc.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => {
        if (line) console.log(`${agentColor}[${name}]${reset} ${line}`);
      });
    });
    
    proc.stderr.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => {
        if (line) console.log(`${agentColor}[${name}] ⚠️${reset} ${line}`);
      });
    });
    
    proc.on('error', (error) => {
      console.error(`❌ ${name} error:`, error.message);
      reject(error);
    });
    
    proc.on('close', (code) => {
      if (code !== 0) {
        console.log(`❌ ${name} exited with code ${code}`);
      }
    });
    
    // Consider started after a brief delay
    setTimeout(() => {
      if (!proc.killed) {
        console.log(`✅ ${name} started`);
        resolve(proc);
      }
    }, 1000);
  });
}

async function startCoordinator() {
  console.log('🎯 Starting Agent Coordinator...');
  
  try {
    const coordinatorPath = './test-agent-coordinator.js';
    const proc = await startProcess('node', [coordinatorPath], 'Coordinator', 'coordinator');
    coordinatorProcess = proc;
    
    // Give coordinator time to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return proc;
  } catch (error) {
    console.error('❌ Failed to start coordinator:', error.message);
    throw error;
  }
}

async function startAgent(agent) {
  const wrapperPath = './src/meta-agents/agent-wrapper.js';
  
  try {
    const proc = await startProcess(
      'node', 
      [wrapperPath, agent.type, agent.id], 
      agent.name,
      agent.type.split('-')[0]
    );
    
    processes.push(proc);
    return proc;
  } catch (error) {
    console.error(`❌ Failed to start ${agent.name}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🏭 Meta-Agent Factory Startup (Fixed)\n');
  
  try {
    // Step 1: Start coordinator
    console.log('📋 Phase 1: Starting Coordination System...\n');
    await startCoordinator();
    
    // Step 2: Start all agents
    console.log('\n📋 Phase 2: Starting Meta-Agents...\n');
    for (const agent of META_AGENTS) {
      await startAgent(agent);
      // Stagger startup
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log('\n🎉 All agents started successfully!\n');
    console.log('📊 Agents are now coordinating via NATS');
    console.log('   Press Ctrl+C to stop all agents\n');
    
    // Keep process alive
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Startup failed:', error.message);
    
    // Cleanup any started processes
    for (const proc of processes) {
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
      }
    }
    
    if (coordinatorProcess && !coordinatorProcess.killed) {
      coordinatorProcess.kill('SIGTERM');
    }
    
    process.exit(1);
  }
}

// Run
main().catch(console.error);