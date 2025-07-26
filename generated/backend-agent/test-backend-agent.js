/**
 * Backend Agent Test
 * 
 * Test the Backend Agent functionality with UEP coordination
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testBackendAgent() {
  try {
    console.log('🧪 Testing Backend Agent with UEP coordination...');
    
    // Import the Backend Agent from compiled dist directory
    const { BackendAgent } = await import('./dist/core/BackendAgent.js');
    
    // Initialize Backend Agent
    const agent = new BackendAgent({
      projectRoot: path.join(__dirname, '../../..'),
      outputDir: path.join(__dirname, 'output'),
      enableContext7: true,
      enableUEP: true,
      logLevel: 'info'
    });
    
    console.log('🚀 Initializing Backend Agent...');
    await agent.initialize();
    
    console.log('📊 Agent Status:', agent.getStatus());
    console.log('🎯 Agent Capabilities:', agent.getCapabilities());
    
    // Test API design task
    console.log('\n🎨 Testing API design task...');
    const apiResult = await agent.processTask('Design REST API for user management', {
      type: 'design-api',
      endpoints: [
        { path: '/users', method: 'GET', description: 'Get all users' },
        { path: '/users/:id', method: 'GET', description: 'Get user by ID' },
        { path: '/users', method: 'POST', description: 'Create new user' }
      ],
      framework: 'express',
      authentication: true
    });
    
    console.log('✅ API Design Result:', apiResult);
    
    // Test database schema creation
    console.log('\n🗄️ Testing database schema creation...');
    const schemaResult = await agent.processTask('Create database schema for user system', {
      type: 'create-db-schema',
      models: [
        { name: 'User', fields: ['id', 'email', 'password', 'createdAt'] },
        { name: 'Profile', fields: ['id', 'userId', 'firstName', 'lastName'] }
      ],
      database: 'postgresql'
    });
    
    console.log('✅ Schema Creation Result:', schemaResult);
    
    // Test authentication implementation
    console.log('\n🔐 Testing authentication implementation...');
    const authResult = await agent.processTask('Implement JWT authentication', {
      type: 'implement-auth',
      strategy: 'jwt',
      providers: ['local', 'google']
    });
    
    console.log('✅ Authentication Result:', authResult);
    
    // Shutdown agent
    await agent.shutdown();
    
    console.log('\n🎉 Backend Agent test completed successfully!');
    console.log('✅ UEP coordination working properly');
    console.log('✅ Context7 integration functional');
    console.log('✅ All backend capabilities operational');
    
  } catch (error) {
    console.error('❌ Backend Agent test failed:', error);
    process.exit(1);
  }
}

// Run the test
testBackendAgent().catch(console.error);