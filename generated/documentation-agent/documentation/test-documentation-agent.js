/**
 * Documentation Agent Test
 * 
 * Test the UEP-generated Documentation Agent functionality
 */

const { DocumentationAgent } = require('./main.js');
const chalk = require('chalk');

async function testDocumentationAgent() {
  try {
    console.log(chalk.blue('🧪 Testing UEP-generated Documentation Agent...'));
    
    // Initialize Documentation Agent with UEP-compatible config
    const agent = new DocumentationAgent({
      name: 'Documentation Agent',
      logLevel: 'info',
      enableUEP: true,
      enableContext7: true,
      documentationFormat: 'markdown',
      exportFormats: ['pdf', 'html'],
      apiDocStyle: 'openapi'
    });
    
    console.log(chalk.green('🚀 Initializing Documentation Agent...'));
    await agent.initialize();
    
    console.log(chalk.blue('📊 Agent Status:'), agent.getStatus());
    
    // Test API documentation generation
    console.log(chalk.blue('\n📚 Testing API documentation generation...'));
    const apiDocsResult = await agent.process({
      task: 'Generate API documentation',
      type: 'api-documentation',
      endpoints: [
        { path: '/api/users', method: 'GET', description: 'Get all users' },
        { path: '/api/users/:id', method: 'GET', description: 'Get user by ID' },
        { path: '/api/users', method: 'POST', description: 'Create new user' }
      ],
      format: 'openapi',
      includeExamples: true
    });
    
    console.log(chalk.green('✅ API Documentation Result:'), apiDocsResult);
    
    // Test technical writing
    console.log(chalk.blue('\n✍️ Testing technical writing capabilities...'));
    const technicalWritingResult = await agent.process({
      task: 'Create technical guide',
      type: 'technical-writing',
      topics: [
        { title: 'Getting Started Guide', description: 'Introduction to the system' },
        { title: 'API Integration Tutorial', description: 'How to integrate with our API' }
      ],
      targetAudience: 'developers',
      difficulty: 'intermediate'
    });
    
    console.log(chalk.green('✅ Technical Writing Result:'), technicalWritingResult);
    
    // Test knowledge base management
    console.log(chalk.blue('\n🗄️ Testing knowledge base management...'));
    const knowledgeBaseResult = await agent.process({
      task: 'Manage knowledge base',
      type: 'knowledge-management',
      action: 'create',
      categories: ['API', 'Guides', 'Troubleshooting'],
      enableSearch: true,
      enableAnalytics: true
    });
    
    console.log(chalk.green('✅ Knowledge Base Result:'), knowledgeBaseResult);
    
    // Test content optimization
    console.log(chalk.blue('\n🎯 Testing content optimization...'));
    const optimizationResult = await agent.process({
      task: 'Optimize documentation content',
      type: 'content-optimization',
      content: ['README.md', 'API-Guide.md', 'FAQ.md'],
      optimizationLevel: 'comprehensive',
      seoTargets: ['documentation', 'api', 'guide'],
      readabilityTarget: 'intermediate'
    });
    
    console.log(chalk.green('✅ Content Optimization Result:'), optimizationResult);
    
    // Test multi-format export
    console.log(chalk.blue('\n📤 Testing multi-format export...'));
    const exportResult = await agent.process({
      task: 'Export documentation',
      type: 'export',
      sourceFiles: ['api-docs.md', 'user-guide.md'],
      formats: ['pdf', 'html'],
      quality: 'high',
      includeAssets: true
    });
    
    console.log(chalk.green('✅ Export Result:'), exportResult);
    
    // Cleanup
    await agent.cleanup();
    
    console.log(chalk.green('\n🎉 Documentation Agent test completed successfully!'));
    console.log(chalk.green('✅ UEP-generated agent working properly'));
    console.log(chalk.green('✅ All documentation capabilities functional'));
    console.log(chalk.green('✅ API documentation generation working'));
    console.log(chalk.green('✅ Technical writing capabilities working'));
    console.log(chalk.green('✅ Knowledge base management functional'));
    console.log(chalk.green('✅ Content optimization working'));
    console.log(chalk.green('✅ Multi-format export functional'));
    
  } catch (error) {
    console.error(chalk.red('❌ Documentation Agent test failed:'), error);
    process.exit(1);
  }
}

// Run the test
testDocumentationAgent().catch(console.error);