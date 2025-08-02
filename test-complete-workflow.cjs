// Complete End-to-End Workflow Test
// PRD → Parser → Task Generation → Domain Agents → Working Software

const fetch = require('node-fetch');

async function testCompleteWorkflow() {
  console.log('🚀 TESTING COMPLETE PRD TO SOFTWARE WORKFLOW\n');
  
  // Step 1: Define a PRD
  const prd = `# Task Management API
  
## Overview
Build a RESTful API for task management

## Requirements
- Must have user authentication with JWT
- Must support CRUD operations for tasks
- Should have task categories
- Should support task assignment to users
- Could have task comments

## Technical Requirements
- Node.js with Express
- MongoDB for data storage
- JWT for authentication
- RESTful API design`;

  console.log('📄 PRD Defined:', prd.substring(0, 50) + '...\n');

  // Step 2: Parse PRD with factory-core
  console.log('🔍 Step 1: Parsing PRD...');
  try {
    // First, get existing parser or create new one
    const agentsResponse = await fetch('http://localhost:3005/api/factory/meta-agents');
    const agents = await agentsResponse.json();
    
    let parserId = agents.data?.find(a => a.type === 'prd-parser')?.id;
    
    if (!parserId) {
      console.log('Creating new PRD parser agent...');
      const createResponse = await fetch('http://localhost:3005/api/factory/meta-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType: 'prd-parser', config: {} })
      });
      const created = await createResponse.json();
      parserId = created.data.id;
    }
    
    // Execute parsing
    const parseResponse = await fetch(`http://localhost:3005/api/factory/meta-agents/${parserId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: { type: 'parse', content: prd } })
    });
    
    const parsed = await parseResponse.json();
    console.log(`✅ Parsed ${parsed.data.result.requirements.length} requirements`);
    
    // Step 3: Validate with UEP
    console.log('\n🔐 Step 2: Validating with UEP...');
    const uepResponse = await fetch('http://localhost:3002/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'task-generation',
        task: parsed.data.result
      })
    });
    
    const validation = await uepResponse.json();
    console.log('✅ UEP Validation:', validation.valid ? 'PASSED' : 'FAILED');
    
    // Step 4: Generate tasks for domain agents
    console.log('\n👷 Step 3: Executing with Domain Agents...');
    
    // Backend agent creates API
    const backendResponse = await fetch('http://localhost:3001/agents/backend-agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: {
          type: 'create-api',
          requirements: parsed.data.result.requirements.filter(r => r.priority === 'high')
        }
      })
    });
    
    const backendResult = await backendResponse.json();
    console.log('✅ Backend Agent:', backendResult.status);
    
    // Frontend agent creates UI components
    const frontendResponse = await fetch('http://localhost:3001/agents/frontend-agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: {
          type: 'create-ui',
          requirements: parsed.data.result.requirements
        }
      })
    });
    
    const frontendResult = await frontendResponse.json();
    console.log('✅ Frontend Agent:', frontendResult.status);
    
    // Step 5: Register results with UEP Registry
    console.log('\n📝 Step 4: Registering Results...');
    const registerResponse = await fetch('http://localhost:3003/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'task-management-api',
        endpoint: 'http://localhost:3010',
        metadata: {
          prdId: parsed.data.id,
          requirements: parsed.data.result.requirements.length,
          status: 'generated',
          timestamp: new Date()
        }
      })
    });
    
    const registered = await registerResponse.json();
    console.log('✅ Registered:', registered.success ? 'SUCCESS' : 'FAILED');
    
    // Step 6: Summary
    console.log('\n📊 WORKFLOW SUMMARY:');
    console.log('──────────────────────────────────');
    console.log(`📄 PRD: Task Management API`);
    console.log(`🔍 Requirements Parsed: ${parsed.data.result.requirements.length}`);
    console.log(`✅ UEP Validated: ${validation.valid}`);
    console.log(`👷 Agents Executed: 2 (backend, frontend)`);
    console.log(`📝 Service Registered: ${registered.success}`);
    console.log('──────────────────────────────────');
    
    // Show what SHOULD happen next (but isn't implemented)
    console.log('\n⚠️  MISSING COMPONENTS:');
    console.log('❌ Scaffold Generator - Broken (dependency issues)');
    console.log('❌ Actual Code Generation - Agents return mock responses');
    console.log('❌ File System Output - No actual files created');
    console.log('❌ TaskMaster Integration - Not connected to agents');
    console.log('❌ NATS Message Flow - Services not communicating');
    console.log('❌ Automated Orchestration - Manual API calls required');
    
    return {
      success: false,
      reason: 'Workflow incomplete - no actual software generated'
    };
    
  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testCompleteWorkflow()
  .then(result => {
    console.log('\n🏁 Final Result:', result);
    if (!result.success) {
      console.log('\n🚨 THE SYSTEM IS NOT READY FOR END-TO-END AUTOMATION');
    }
  })
  .catch(err => console.error('Fatal error:', err));