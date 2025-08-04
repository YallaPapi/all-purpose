#!/usr/bin/env node

/**
 * Test NATS Task Dispatch for UAT
 * Sends tasks directly to domain agents via NATS to test complete workflow
 */

import { connect, StringCodec, JSONCodec } from 'nats';

const sc = StringCodec();
const jc = JSONCodec();

async function testNATSTaskDispatch() {
  console.log('🔌 Connecting to NATS...');
  
  try {
    const nc = await connect({ servers: 'nats://localhost:4222' });
    console.log('✅ Connected to NATS');
    
    // Define complex e-commerce tasks for UAT
    const tasks = [
      {
        id: 'task-001',
        type: 'backend',
        title: 'User Authentication Service',
        description: 'Implement JWT-based user authentication with registration, login, logout, and token refresh',
        requirements: [
          'User registration endpoint with email validation',
          'Login endpoint with JWT token generation', 
          'Password hashing with bcrypt',
          'JWT token validation middleware',
          'User profile management endpoints',
          'Password reset functionality'
        ],
        technologies: ['Node.js', 'Express', 'JWT', 'bcrypt', 'MongoDB'],
        priority: 'high',
        estimatedHours: 12
      },
      {
        id: 'task-002', 
        type: 'frontend',
        title: 'React E-Commerce Interface',
        description: 'Build responsive React frontend with product catalog, shopping cart, and user dashboard',
        requirements: [
          'Product catalog with search and filtering',
          'Shopping cart with add/remove functionality',
          'User registration and login forms',
          'User dashboard with order history',
          'Responsive design for mobile and desktop',
          'State management with Redux/Context'
        ],
        technologies: ['React', 'React Router', 'Axios', 'Material-UI', 'Redux'],
        priority: 'high',
        estimatedHours: 16
      },
      {
        id: 'task-003',
        type: 'devops', 
        title: 'Docker Containerization & CI/CD',
        description: 'Containerize application and set up automated deployment pipeline',
        requirements: [
          'Multi-stage Dockerfile for backend and frontend',
          'Docker Compose for local development',
          'GitHub Actions CI/CD pipeline',
          'Health check endpoints',
          'Environment configuration management',
          'Production deployment scripts'
        ],
        technologies: ['Docker', 'Docker Compose', 'GitHub Actions', 'Nginx'],
        priority: 'medium',
        estimatedHours: 8
      },
      {
        id: 'task-004',
        type: 'qa',
        title: 'Comprehensive Testing Suite',
        description: 'Implement unit, integration, and E2E testing with >90% coverage',
        requirements: [
          'Unit tests for all API endpoints',
          'Frontend component testing with React Testing Library',
          'Integration tests for database operations',
          'E2E testing with Cypress',
          'Performance testing with load simulation',
          'Security testing for authentication flows'
        ],
        technologies: ['Jest', 'React Testing Library', 'Cypress', 'Supertest'],
        priority: 'high',
        estimatedHours: 10
      },
      {
        id: 'task-005',
        type: 'documentation',
        title: 'API Documentation & User Guides',
        description: 'Create comprehensive documentation for API and user interfaces',
        requirements: [
          'OpenAPI/Swagger specification for all endpoints',
          'Interactive API documentation',
          'User guide with screenshots',
          'Developer setup instructions', 
          'Architecture diagrams',
          'Deployment documentation'
        ],
        technologies: ['Swagger', 'OpenAPI', 'Postman', 'Markdown'],
        priority: 'medium',
        estimatedHours: 6
      }
    ];
    
    console.log(`🚀 Dispatching ${tasks.length} complex tasks for UAT...`);
    
    // Dispatch tasks to domain agents
    for (const task of tasks) {
      const subject = `tasks.${task.type}.new`;
      console.log(`📤 Sending ${task.type} task: ${task.title}`);
      
      await nc.publish(subject, jc.encode({
        taskId: task.id,
        projectName: 'complex-ecommerce-platform',
        task: task,
        timestamp: new Date().toISOString(),
        source: 'uat-test-dispatch'
      }));
      
      console.log(`✅ Task ${task.id} dispatched to ${subject}`);
    }
    
    console.log('🏁 All UAT tasks dispatched successfully');
    console.log('🔍 Check domain agent logs for task processing...');
    
    // Wait a bit for processing
    console.log('⏳ Waiting 30 seconds for task processing...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    await nc.close();
    console.log('🔌 NATS connection closed');
    
  } catch (error) {
    console.error('❌ NATS task dispatch failed:', error);
    process.exit(1);
  }
}

testNATSTaskDispatch();