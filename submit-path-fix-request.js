#!/usr/bin/env node

/**
 * Submit Path Reference Fix Request to Meta-Agent Factory
 * This will trigger the visual ASCII art progress dashboard
 */

const request = {
  type: 'fix-patterns',
  description: 'Fix all path references in documentation after project reorganization. Update all references from old paths (/src/meta-agents/, /app/, /lib/, /rag-system/) to new paths (/packages/meta-agents/, /apps/lead-generation/app/, /packages/shared-lib/, /packages/rag-system/).',
  requirements: {
    codeBase: 'all-purpose',
    targetDirectory: 'docs/',
    documentationTypes: ['markdown', 'json', 'js', 'ts']
  },
  priority: 'high'
};

async function submitRequest() {
  try {
    console.log('🤖 Submitting path reference fix request to Meta-Agent Factory...');
    
    const response = await fetch('http://localhost:3006/api/meta-agent-factory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Request failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('✅ Request submitted successfully!');
    console.log('📊 Request ID:', result.requestId);
    console.log('🤖 Assigned Agents:', result.assignedAgents?.join(', '));
    console.log('⏱️ Estimated Completion:', result.estimatedCompletion);
    
    console.log('\n🎬 Watch the real-time ASCII art progress at:');
    console.log(`   http://localhost:3006/dashboard`);
    console.log('\n🤖 Meta-Agent Factory interface:');
    console.log(`   http://localhost:3006/meta-agent-factory`);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to submit request:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  submitRequest();
}

module.exports = { submitRequest };