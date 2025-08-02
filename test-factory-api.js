#!/usr/bin/env node

async function testFactory() {
  console.log('🏭 Testing Meta-Agent Factory API\n');
  
  try {
    // Test 1: List agents
    console.log('📋 Test 1: List available agents');
    const listRes = await fetch('http://localhost:3000/api/factory/meta-agents');
    const agents = await listRes.json();
    console.log('Response:', agents);
    console.log();
    
    // Test 2: Create a simple agent (without PRD)
    console.log('📋 Test 2: Create scaffold-generator agent');
    const createRes = await fetch('http://localhost:3000/api/factory/meta-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentType: 'scaffold-generator',
        config: {
          projectName: 'test-api',
          features: ['express', 'postgres', 'jwt']
        }
      })
    });
    
    const created = await createRes.json();
    console.log('Response:', created);
    
    if (created.success && created.data) {
      console.log('\n✅ Agent created successfully!');
      console.log('Agent ID:', created.data.id);
      console.log('Type:', created.data.type);
      
      // Test 3: Execute a task
      console.log('\n📋 Test 3: Execute scaffold generation task');
      const executeRes = await fetch(`http://localhost:3000/api/factory/meta-agents/${created.data.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: {
            type: 'generate-scaffold',
            data: {
              projectName: 'test-api',
              features: ['express', 'postgres', 'jwt']
            }
          }
        })
      });
      
      const result = await executeRes.json();
      console.log('Response:', result);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testFactory();