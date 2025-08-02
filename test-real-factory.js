// Test real factory execution
import fetch from 'node-fetch';

async function testRealFactory() {
    console.log('Testing Real Factory Core...\n');
    
    const baseUrl = 'http://localhost:3000';
    
    // Step 1: Create a PRD parser agent
    console.log('1. Creating PRD Parser agent...');
    const createResponse = await fetch(`${baseUrl}/api/factory/meta-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            agentType: 'prd-parser',
            config: {
                name: 'Test PRD Parser',
                description: 'Testing real agent execution'
            }
        })
    });
    
    const createResult = await createResponse.json();
    console.log('Agent created:', JSON.stringify(createResult, null, 2));
    
    if (!createResult.success) {
        console.error('Failed to create agent');
        return;
    }
    
    const agentId = createResult.data.id;
    
    // Step 2: Execute a task with the agent
    console.log('\n2. Executing PRD parsing task...');
    
    const testPRD = `# Test Project Requirements

## Overview
This is a test project to build a task management system.

## Requirements
- Must have user authentication
- Should support creating, reading, updating, and deleting tasks
- Must have a dashboard showing task statistics
- Should integrate with external calendar systems

## Technical Specifications
- Backend: Node.js with Express
- Database: PostgreSQL
- Frontend: React with TypeScript
- Authentication: JWT tokens`;
    
    const executeResponse = await fetch(`${baseUrl}/api/factory/meta-agents/${agentId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            task: {
                content: testPRD,
                agentName: 'Test PRD Parser'
            }
        })
    });
    
    const executeResult = await executeResponse.json();
    console.log('Execution result:', JSON.stringify(executeResult, null, 2));
    
    // Step 3: List all active agents
    console.log('\n3. Listing all active agents...');
    const listResponse = await fetch(`${baseUrl}/api/factory/meta-agents`);
    const listResult = await listResponse.json();
    console.log('Active agents:', JSON.stringify(listResult, null, 2));
}

// Run the test
testRealFactory().catch(console.error);