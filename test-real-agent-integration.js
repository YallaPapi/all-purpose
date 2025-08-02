#!/usr/bin/env node

/**
 * Real Agent Integration Test
 * 
 * This test attempts to connect to real agent implementations if they exist,
 * falling back to the simulated agents if not available.
 */

import { connect } from 'nats';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RealAgentDiscovery extends EventEmitter {
  constructor() {
    super();
    this.nc = null;
    this.discoveredAgents = new Map();
    this.discoveryTimeout = 10000; // 10 seconds
  }

  async connect() {
    console.log('[Discovery] 🔌 Connecting to NATS for agent discovery...');
    
    this.nc = await connect({
      servers: ['nats://localhost:4222'],
      user: 'factory',
      pass: 'factory-secret'
    });

    console.log('[Discovery] ✅ Connected to NATS');
  }

  async discoverExistingAgents() {
    console.log('[Discovery] 🔍 Scanning for existing agents...');
    
    return new Promise((resolve) => {
      const discovered = new Set();
      
      // Listen for agent registrations and heartbeats
      const regSub = this.nc.subscribe('agent.register');
      const hbSub = this.nc.subscribe('agent.heartbeat');
      
      (async () => {
        for await (const msg of regSub) {
          try {
            const agent = JSON.parse(msg.data);
            discovered.add(agent.id);
            this.discoveredAgents.set(agent.id, agent);
            console.log(`[Discovery] 🤖 Found existing agent: ${agent.id} (${agent.type})`);
          } catch (error) {
            // Invalid message, ignore
          }
        }
      })();
      
      (async () => {
        for await (const msg of hbSub) {
          try {
            const hb = JSON.parse(msg.data);
            if (hb.agentId && !discovered.has(hb.agentId)) {
              discovered.add(hb.agentId);
              this.discoveredAgents.set(hb.agentId, {
                id: hb.agentId,
                type: hb.type,
                status: hb.status,
                lastSeen: new Date()
              });
              console.log(`[Discovery] 💓 Found active agent via heartbeat: ${hb.agentId} (${hb.type})`);
            }
          } catch (error) {
            // Invalid message, ignore
          }
        }
      })();
      
      // Send discovery ping
      this.nc.publish('agent.discovery.ping', JSON.stringify({
        requestId: Date.now(),
        timestamp: new Date()
      }));
      
      // Wait for discovery timeout
      setTimeout(() => {
        regSub.unsubscribe();
        hbSub.unsubscribe();
        
        console.log(`[Discovery] 📊 Discovery complete: found ${discovered.size} existing agents`);
        resolve(Array.from(discovered));
      }, this.discoveryTimeout);
    });
  }

  async checkAgentImplementations() {
    console.log('[Discovery] 📁 Checking for real agent implementations...');
    
    const agentPaths = [
      'src/meta-agents/enhanced-prd-parser.js',
      'containers/factory-core/src/meta-agents/enhanced-prd-parser.js',
      'generated/backend-agent',
      'generated/frontend-agent',
      'generated/devops-agent',
      'generated/qa-agent',
      'generated/documentation-agent'
    ];
    
    const found = [];
    
    for (const agentPath of agentPaths) {
      try {
        const fullPath = path.join(__dirname, agentPath);
        const stats = await fs.stat(fullPath);
        
        if (stats.isFile() || stats.isDirectory()) {
          found.push(agentPath);
          console.log(`[Discovery] 📄 Found agent implementation: ${agentPath}`);
        }
      } catch (error) {
        // File doesn't exist, which is fine
      }
    }
    
    return found;
  }

  async testRealPRDParser() {
    try {
      console.log('[Discovery] 🧪 Testing real PRD parser integration...');
      
      // Try to import the enhanced PRD parser
      const { default: EnhancedPRDParser } = await import('./src/meta-agents/enhanced-prd-parser.js');
      
      // Create a test instance
      const parser = new EnhancedPRDParser({
        uepEnabled: false, // Disable UEP for simpler testing
        memoryEnabled: true
      });
      
      // Test basic functionality
      const status = parser.getStatus();
      console.log('[Discovery] ✅ Real PRD parser available:', status);
      
      return { available: true, implementation: 'enhanced-prd-parser.js', status };
    } catch (error) {
      console.log('[Discovery] ⚠️ Real PRD parser not available:', error.message);
      return { available: false, error: error.message };
    }
  }

  async testAgentCoordinator() {
    try {
      console.log('[Discovery] 🧪 Testing AgentCoordinator integration...');
      
      // Try to import the AgentCoordinator
      const { AgentCoordinator } = await import('./src/services/AgentCoordinator.js');
      
      // Create a test instance
      const coordinator = new AgentCoordinator({
        nats: {
          servers: ['nats://localhost:4222'],
          user: 'factory',
          pass: 'factory-secret'
        }
      });
      
      console.log('[Discovery] ✅ Real AgentCoordinator available');
      
      return { available: true, implementation: 'AgentCoordinator.js' };
    } catch (error) {
      console.log('[Discovery] ⚠️ Real AgentCoordinator not available:', error.message);
      return { available: false, error: error.message };
    }
  }

  async testNATSAgentWrapper() {
    try {
      console.log('[Discovery] 🧪 Testing NATSAgentWrapper integration...');
      
      // Try to import the NATSAgentWrapper
      const { NATSAgentWrapper } = await import('./src/services/NATSAgentWrapper.js');
      
      console.log('[Discovery] ✅ Real NATSAgentWrapper available');
      
      return { available: true, implementation: 'NATSAgentWrapper.js' };
    } catch (error) {
      console.log('[Discovery] ⚠️ Real NATSAgentWrapper not available:', error.message);
      return { available: false, error: error.message };
    }
  }

  getDiscoveredAgents() {
    return Array.from(this.discoveredAgents.values());
  }

  async shutdown() {
    if (this.nc) {
      await this.nc.drain();
    }
  }
}

class IntegrationTest {
  constructor() {
    this.discovery = new RealAgentDiscovery();
    this.results = {
      existingAgents: [],
      agentImplementations: [],
      prdParser: null,
      coordinator: null,
      natsWrapper: null
    };
  }

  async run() {
    console.log('🔬 Real Agent Integration Test\n');
    
    try {
      // Connect to NATS
      await this.discovery.connect();
      
      // Discover existing agents
      this.results.existingAgents = await this.discovery.discoverExistingAgents();
      
      // Check for agent implementations  
      this.results.agentImplementations = await this.discovery.checkAgentImplementations();
      
      // Test specific components
      this.results.prdParser = await this.discovery.testRealPRDParser();
      this.results.coordinator = await this.discovery.testAgentCoordinator();
      this.results.natsWrapper = await this.discovery.testNATSAgentWrapper();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Integration test failed:', error);
    } finally {
      await this.discovery.shutdown();
    }
  }

  generateReport() {
    console.log('\n📊 Integration Test Report\n');
    
    // Existing Agents
    console.log('🤖 Existing Agents:');
    if (this.results.existingAgents.length > 0) {
      const agents = this.discovery.getDiscoveredAgents();
      agents.forEach(agent => {
        console.log(`   ✅ ${agent.id} (${agent.type || 'unknown'}) - ${agent.status || 'active'}`);
      });
    } else {
      console.log('   ❌ No existing agents discovered');
    }
    
    // Agent Implementations
    console.log('\n📁 Agent Implementations:');
    if (this.results.agentImplementations.length > 0) {
      this.results.agentImplementations.forEach(impl => {
        console.log(`   ✅ ${impl}`);
      });
    } else {
      console.log('   ❌ No agent implementation files found');
    }
    
    // Component Tests
    console.log('\n🧪 Component Tests:');
    
    console.log(`   PRD Parser: ${this.results.prdParser.available ? '✅' : '❌'} ${this.results.prdParser.available ? this.results.prdParser.implementation : this.results.prdParser.error}`);
    
    console.log(`   Coordinator: ${this.results.coordinator.available ? '✅' : '❌'} ${this.results.coordinator.available ? this.results.coordinator.implementation : this.results.coordinator.error}`);
    
    console.log(`   NATS Wrapper: ${this.results.natsWrapper.available ? '✅' : '❌'} ${this.results.natsWrapper.available ? this.results.natsWrapper.implementation : this.results.natsWrapper.error}`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (this.results.existingAgents.length > 0) {
      console.log('   ✅ Use existing agents for real workflow testing');
    } else {
      console.log('   ⚠️ Use simulated agents from test-complete-prd-workflow-nats.js');
    }
    
    if (this.results.prdParser.available) {
      console.log('   ✅ Integrate real PRD parser for production workflows');
    } else {
      console.log('   ⚠️ Use simulated PRD parser for testing');
    }
    
    if (this.results.coordinator.available) {
      console.log('   ✅ Use real AgentCoordinator for production orchestration');
    } else {
      console.log('   ⚠️ Use simulated coordinator for testing');
    }
    
    // Next Steps
    console.log('\n🚀 Next Steps:');
    
    if (this.results.existingAgents.length === 0 && this.results.agentImplementations.length > 0) {
      console.log('   1. Start real agents using found implementations');
      console.log('   2. Re-run this test to discover active agents');
      console.log('   3. Run comprehensive workflow test with real agents');
    } else if (this.results.existingAgents.length > 0) {
      console.log('   1. Run comprehensive workflow test with existing agents');
      console.log('   2. Test real PRD processing with actual requirements');
      console.log('   3. Validate end-to-end integration');
    } else {
      console.log('   1. Use simulated agents for initial testing');
      console.log('   2. Implement real agent integration based on test results');
      console.log('   3. Gradually replace simulated components with real implementations');
    }
  }
}

// Run the integration test
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new IntegrationTest();
  test.run().catch(console.error);
}

export { RealAgentDiscovery, IntegrationTest };