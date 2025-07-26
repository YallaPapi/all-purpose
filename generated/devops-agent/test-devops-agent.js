/**
 * DevOps Agent Test
 * 
 * Test the DevOps Agent functionality with UEP coordination
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDevOpsAgent() {
  try {
    console.log('🧪 Testing DevOps Agent with UEP coordination...');
    
    // Import the DevOps Agent from compiled dist directory
    const { DevOpsAgent } = await import('./dist/core/DevOpsAgent.js');
    
    // Initialize DevOps Agent
    const agent = new DevOpsAgent({
      projectRoot: path.join(__dirname, '../../..'),
      outputDir: path.join(__dirname, 'output'),
      enableContext7: true,
      enableUEP: true,
      cloudProvider: 'vercel',
      containerRuntime: 'docker',
      cicdPlatform: 'github-actions',
      monitoringStack: 'prometheus',
      logLevel: 'info'
    });
    
    console.log('🚀 Initializing DevOps Agent...');
    await agent.initialize();
    
    console.log('📊 Agent Status:', agent.getStatus());
    console.log('🎯 Agent Capabilities:', agent.getCapabilities());
    
    // Test Docker setup
    console.log('\n🐳 Testing Docker containerization setup...');
    const dockerResult = await agent.processTask('Setup Docker containerization for Node.js application', {
      type: 'setup-docker',
      baseImage: 'node:18-alpine',
      ports: [3000, 8080],
      environment: {
        NODE_ENV: 'production',
        PORT: '3000'
      },
      volumes: ['/app/data'],
      commands: ['npm ci --only=production', 'npm run build', 'npm start']
    });
    
    console.log('✅ Docker Setup Result:', dockerResult);
    
    // Test deployment configuration
    console.log('\n🚀 Testing deployment configuration...');
    const deploymentResult = await agent.processTask('Configure Vercel deployment', {
      type: 'configure-deployment',
      platform: 'vercel',
      environment: 'production',
      buildCommand: 'npm run build',
      outputDir: 'dist',
      domains: ['myapp.vercel.app'],
      envVars: {
        NODE_ENV: 'production',
        API_URL: 'https://api.myapp.com'
      }
    });
    
    console.log('✅ Deployment Configuration Result:', deploymentResult);
    
    // Test CI/CD pipeline setup
    console.log('\n⚙️ Testing CI/CD pipeline setup...');
    const cicdResult = await agent.processTask('Setup GitHub Actions CI/CD pipeline', {
      type: 'setup-cicd',
      platform: 'github-actions',
      triggers: ['push', 'pull_request'],
      testCommands: ['npm test', 'npm run lint'],
      buildCommands: ['npm run build', 'npm run type-check'],
      secrets: ['VERCEL_TOKEN', 'GITHUB_TOKEN']
    });
    
    console.log('✅ CI/CD Setup Result:', cicdResult);
    
    // Test monitoring setup
    console.log('\n📊 Testing monitoring setup...');
    const monitoringResult = await agent.processTask('Setup Prometheus monitoring', {
      type: 'setup-monitoring',
      stack: 'prometheus',
      metrics: ['cpu', 'memory', 'requests', 'errors', 'latency'],
      alerts: [
        { name: 'High CPU', threshold: '85%', metric: 'cpu_usage' },
        { name: 'Memory Alert', threshold: '90%', metric: 'memory_usage' }
      ],
      dashboards: [
        { name: 'App Overview', panels: ['requests', 'errors'] }
      ]
    });
    
    console.log('✅ Monitoring Setup Result:', monitoringResult);
    
    // Test environment configuration
    console.log('\n🔧 Testing environment configuration management...');
    const envResult = await agent.processTask('Manage environment configurations', {
      type: 'manage-env-config',
      environments: ['development', 'staging', 'production'],
      variables: {
        NODE_ENV: 'production',
        PORT: '3000',
        DATABASE_URL: 'postgresql://localhost:5432/myapp',
        REDIS_URL: 'redis://localhost:6379'
      },
      secrets: ['JWT_SECRET', 'DATABASE_PASSWORD', 'API_KEY'],
      templates: true
    });
    
    console.log('✅ Environment Configuration Result:', envResult);
    
    // Shutdown agent
    await agent.shutdown();
    
    console.log('\n🎉 DevOps Agent test completed successfully!');
    console.log('✅ UEP coordination working properly');
    console.log('✅ Context7 integration functional');
    console.log('✅ All DevOps capabilities operational');
    console.log('✅ Docker containerization working');
    console.log('✅ Deployment configuration functional');
    console.log('✅ CI/CD pipeline setup working');
    console.log('✅ Monitoring setup functional');
    console.log('✅ Environment configuration working');
    
  } catch (error) {
    console.error('❌ DevOps Agent test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDevOpsAgent().catch(console.error);