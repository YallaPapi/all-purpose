/**
 * Observability System Setup Script
 * 
 * This script demonstrates how to integrate the observability system
 * with your existing MetaAgentCoordinator and start collecting data.
 * 
 * Usage: node setup-observability.js
 */

const path = require('path');

// Import the coordination system
const { createMetaAgentCoordinator } = require('./rag-system/src/coordination/metaAgentCoordinator.ts');
const { createObservabilityCollector } = require('./rag-system/src/observability/ObservabilityCollector.ts');

async function setupObservabilitySystem() {
  try {
    console.log('🚀 Setting up Meta-Agent Observability System...\n');

    // Step 1: Create MetaAgentCoordinator
    console.log('📋 Step 1: Creating MetaAgentCoordinator...');
    const coordinator = createMetaAgentCoordinator({
      coordinatorId: 'main-coordinator',
      enableAutoCoordination: true,
      maxConcurrentTasks: 10,
      heartbeatIntervalMs: 30000
    });

    await coordinator.start();
    console.log('✅ MetaAgentCoordinator started successfully\n');

    // Step 2: Create ObservabilityCollector
    console.log('👁️  Step 2: Creating ObservabilityCollector...');
    const observabilityCollector = createObservabilityCollector();

    // Step 3: Start collecting observability data
    console.log('📊 Step 3: Starting observability collection...');
    await observabilityCollector.startCollecting(coordinator);
    console.log('✅ Observability collection started successfully\n');

    // Step 4: Register some example agents to demonstrate
    console.log('🤖 Step 4: Registering example meta-agents...');
    
    const agents = [
      {
        agentId: 'all-purpose-pattern-001',
        agentName: 'All-Purpose Pattern Agent',
        agentType: 'all-purpose-pattern',
        capabilities: ['pattern-detection', 'code-analysis', 'anti-pattern-removal'],
        status: 'idle',
        metadata: {
          version: '1.0.0',
          location: './src/meta-agents/all-purpose-pattern',
          dependencies: ['typescript', 'ast-parser']
        }
      },
      {
        agentId: 'template-engine-001',
        agentName: 'Template Engine Factory',
        agentType: 'template-engine',
        capabilities: ['template-generation', 'code-scaffolding', 'dynamic-content'],
        status: 'idle',
        metadata: {
          version: '1.0.0',
          location: './src/meta-agents/template-engine-factory',
          dependencies: ['handlebars', 'mustache']
        }
      },
      {
        agentId: 'parameter-flow-001',
        agentName: 'Parameter Flow Agent',
        agentType: 'parameter-flow',
        capabilities: ['integration-mapping', 'data-transformation', 'flow-validation'],
        status: 'idle',
        metadata: {
          version: '1.0.0',
          location: './src/meta-agents/parameter-flow',
          dependencies: ['typescript', 'schema-validation']
        }
      }
    ];

    for (const agent of agents) {
      await coordinator.registerAgent(agent);
      console.log(`   ✅ Registered: ${agent.agentName}`);
    }

    console.log('\n🎯 Step 5: Creating example coordination tasks...');
    
    // Create some example tasks to demonstrate coordination
    const tasks = [
      {
        requestingAgentId: 'all-purpose-pattern-001',
        taskType: 'generation',
        description: 'Generate templates for anti-pattern fixes',
        requirements: ['template-generation', 'code-scaffolding'],
        dependencies: [],
        priority: 'high'
      },
      {
        requestingAgentId: 'template-engine-001',
        taskType: 'validation',
        description: 'Validate integration flow for generated templates',
        requirements: ['integration-mapping', 'flow-validation'],
        dependencies: [],
        priority: 'medium'
      }
    ];

    for (const task of tasks) {
      const taskId = await coordinator.createTask(task);
      console.log(`   ✅ Created task: ${task.description} (ID: ${taskId})`);
    }

    console.log('\n🧠 Step 6: Sharing example knowledge...');
    
    // Share some knowledge between agents
    await coordinator.shareKnowledge({
      sourceAgentId: 'all-purpose-pattern-001',
      knowledgeType: 'pattern',
      title: 'Common Anti-Patterns in React Components',
      content: JSON.stringify({
        patterns: [
          'Hardcoded prop drilling',
          'Direct DOM manipulation in components',
          'Inline styles without theme system'
        ],
        solutions: [
          'Use context or state management',
          'Use refs appropriately',
          'Implement consistent design system'
        ]
      }),
      tags: ['react', 'patterns', 'best-practices'],
      relevantAgents: ['template-engine-001', 'parameter-flow-001'],
      confidence: 0.95,
      metadata: {
        source: 'pattern-detection-engine',
        codebase: 'react-app-analysis'
      }
    });

    console.log('   ✅ Knowledge shared: React Anti-Patterns\n');

    // Step 7: Display access information
    console.log('🎉 OBSERVABILITY SYSTEM READY!\n');
    console.log('📱 Access your dashboard at:');
    console.log('   http://localhost:3000/admin/observability\n');
    
    console.log('📊 Available data:');
    console.log('   • Real-time agent coordination events');
    console.log('   • Task creation, assignment, and completion tracking');
    console.log('   • Knowledge sharing between agents');
    console.log('   • System health and performance metrics');
    console.log('   • Agent network visualization\n');

    console.log('🔍 Current system status:');
    const stats = coordinator.getCoordinationStats();
    console.log(`   • Active agents: ${stats.agents.online}`);
    console.log(`   • Total tasks: ${stats.tasks.total}`);
    console.log(`   • Shared knowledge: ${stats.knowledge.total}`);
    console.log(`   • System health: ${getSystemHealth(stats)}\n`);

    console.log('💡 Next steps:');
    console.log('   1. Open the dashboard to see real-time coordination');
    console.log('   2. Register your actual meta-agents using coordinator.registerAgent()');
    console.log('   3. Start your agent processes to see live activity');
    console.log('   4. Create tasks and share knowledge to see coordination in action\n');

    console.log('⚡ The system will continue running and collecting data...');
    console.log('   Press Ctrl+C to stop the observability collector\n');

    // Keep the process running to collect data
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down observability system...');
      await observabilityCollector.stopCollecting();
      await coordinator.stop();
      console.log('✅ Observability system stopped cleanly');
      process.exit(0);
    });

    // Demonstrate ongoing activity with periodic status updates
    setInterval(async () => {
      const currentStats = coordinator.getCoordinationStats();
      console.log(`📊 [${new Date().toLocaleTimeString()}] Status: ${currentStats.agents.online} agents, ${currentStats.tasks.total} tasks, ${currentStats.knowledge.total} knowledge`);
    }, 30000);

  } catch (error) {
    console.error('❌ Failed to setup observability system:', error);
    process.exit(1);
  }
}

function getSystemHealth(stats) {
  const offlineAgents = stats.agents.total - stats.agents.online;
  const failedTasks = stats.tasks.failed;
  const totalTasks = stats.tasks.total;
  
  if (offlineAgents / stats.agents.total > 0.5 || 
      (totalTasks > 0 && failedTasks / totalTasks > 0.3)) {
    return '🔴 CRITICAL';
  }
  
  if (offlineAgents / stats.agents.total > 0.25 ||
      (totalTasks > 0 && failedTasks / totalTasks > 0.15)) {
    return '🟡 DEGRADED';
  }
  
  return '🟢 HEALTHY';
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupObservabilitySystem().catch(console.error);
}

module.exports = { setupObservabilitySystem };