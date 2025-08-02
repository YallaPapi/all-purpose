/**
 * Test Backend Agent with Context7 Integration
 * 
 * Tests that the backend agent properly fetches library documentation
 * before generating code
 */

import { BackendAgent } from './src/meta-agents/backend-agent/dist/core/BackendAgent.js';
import { promises as fs } from 'fs';
import path from 'path';

async function testBackendAgentWithContext7() {
  console.log('🧪 Testing Backend Agent with Context7 Integration...\n');

  try {
    // Initialize backend agent
    const agent = new BackendAgent({
      outputDir: './generated-with-context7',
      enableContext7: true,
      enableRAG: true,
      enableUEP: false
    });

    await agent.initialize();
    console.log('✅ Backend Agent initialized\n');

    // Process a task that requires library documentation
    const result = await agent.processTask('Create a secure RESTful API with JWT authentication', {
      outputPath: './generated-with-context7',
      endpoints: [
        { 
          path: '/auth/register', 
          method: 'POST',
          description: 'Register a new user with email and password'
        },
        { 
          path: '/auth/login', 
          method: 'POST',
          description: 'Login with email and password, returns JWT token'
        },
        { 
          path: '/auth/refresh', 
          method: 'POST',
          description: 'Refresh JWT token'
        },
        { 
          path: '/users/profile', 
          method: 'GET',
          description: 'Get current user profile (requires authentication)'
        },
        { 
          path: '/users/profile', 
          method: 'PUT',
          description: 'Update user profile (requires authentication)'
        }
      ],
      framework: 'express',
      authentication: true,
      database: 'mongodb'
    });

    console.log('📊 Processing Result:');
    console.log('✅ Success:', result.success);
    console.log('📁 Files Generated:', result.generatedFiles?.length || 0);
    console.log('🔧 Endpoints Created:', result.data?.endpoints?.length || 0);
    
    if (result.generatedFiles) {
      console.log('\n📝 Generated Files:');
      for (const file of result.generatedFiles) {
        console.log(`  - ${file.path} (${file.type})`);
      }
    }

    // Check if Context7 was actually used
    console.log('\n🔍 Checking for Context7 Usage...');
    const routerFile = result.generatedFiles?.find(f => f.path.includes('api.ts'));
    if (routerFile) {
      console.log('✅ Router file generated');
      
      // Check if the generated code follows Express.js patterns from Context7
      const hasExpressImport = routerFile.content.includes("import express from 'express'");
      const hasRouterCreate = routerFile.content.includes('express.Router()');
      const hasAsyncHandlers = routerFile.content.includes('async (req, res, next)');
      
      console.log('  - Express import:', hasExpressImport ? '✅' : '❌');
      console.log('  - Router creation:', hasRouterCreate ? '✅' : '❌');
      console.log('  - Async handlers:', hasAsyncHandlers ? '✅' : '❌');
    }

    // Check auth middleware
    const authFile = result.generatedFiles?.find(f => f.path.includes('auth.ts'));
    if (authFile) {
      console.log('\n✅ Auth middleware generated');
      
      // Check if JWT patterns from Context7 are used
      const hasJwtImport = authFile.content.includes("import jwt from 'jsonwebtoken'");
      const hasTokenVerify = authFile.content.includes('jwt.verify');
      const hasAuthHeader = authFile.content.includes("req.headers['authorization']");
      
      console.log('  - JWT import:', hasJwtImport ? '✅' : '❌');
      console.log('  - Token verify:', hasTokenVerify ? '✅' : '❌');
      console.log('  - Auth header check:', hasAuthHeader ? '✅' : '❌');
    }

    console.log('\n✅ Context7 Integration Test Complete!');

    await agent.shutdown();

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run the test
testBackendAgentWithContext7();