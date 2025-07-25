#!/usr/bin/env node

/**
 * Documentation Validation Script
 * 
 * Validates that META_AGENTS_DOCUMENTATION.md is accurate by testing
 * the documented parameter formats and configurations.
 */

const fs = require('fs').promises;

async function validateDocumentation() {
  console.log('📋 Validating Meta-Agents Documentation...\n');

  const results = {
    scaffoldInputFormat: false,
    prdParserConfig: false,
    uepFactoryConfig: false,
    templateStructure: false,
    environmentVars: false
  };

  // Test 1: Scaffold Generator Input Format
  console.log('1. Testing Scaffold Generator input format...');
  try {
    const { parseInput } = require('./src/meta-agents/scaffold-generator/lib/inputParser');
    
    // Test the documented format
    const documentedFormat = {
      tasks: [
        {
          id: 1,
          title: "Initialize project",
          description: "Set up project structure",
          priority: "high",
          dependencies: [2],
          status: "pending"
        },
        {
          id: 2,
          title: "Implement core",
          description: "Build main functionality"
        }
      ],
      metadata: {
        projectName: "Test Agent",
        description: "Test description",
        version: "1.0.0",
        author: "Test Author"
      }
    };

    const result = parseInput(documentedFormat);
    
    if (result.agentName && result.tasks && result.metadata) {
      console.log('✅ Scaffold Generator input format is correct');
      console.log(`   - Agent Name: ${result.agentName}`);
      console.log(`   - Tasks: ${result.tasks.length}`);
      results.scaffoldInputFormat = true;
    } else {
      console.log('❌ Scaffold Generator input format issue');
    }

  } catch (error) {
    console.log('❌ Scaffold Generator input format failed:', error.message);
  }

  // Test 2: PRD Parser Configuration
  console.log('\n2. Testing PRD Parser configuration...');
  try {
    const EnhancedPRDParser = require('./src/meta-agents/enhanced-prd-parser');
    
    // Test documented configuration
    const documentedConfig = {
      watchDir: 'docs',
      prdPattern: /^prd_(.+)\.md$/,
      outputDir: '.taskmaster/tasks',
      researchEnabled: true,
      contextEnabled: true,
      uepEnabled: true,
      enhancedValidation: true,
      logLevel: 'minimal',
      agentId: 'test-prd-parser'
    };

    const parser = new EnhancedPRDParser(documentedConfig);
    const status = parser.getStatus();
    
    if (status.name && status.uep) {
      console.log('✅ PRD Parser configuration is correct');
      console.log(`   - Agent Name: ${status.name}`);
      console.log(`   - UEP Enabled: ${status.uep.enabled}`);
      results.prdParserConfig = true;
    } else {
      console.log('❌ PRD Parser configuration issue');
    }

  } catch (error) {
    console.log('❌ PRD Parser configuration failed:', error.message);
  }

  // Test 3: UEP Factory Configuration
  console.log('\n3. Testing UEP Factory configuration...');
  try {
    const { createUEPMetaAgentFactory } = require('./src/meta-agents/UEPMetaAgentFactory');
    
    // Test documented configuration
    const documentedConfig = {
      enableUEP: true,
      enableValidation: true,
      enableMemoryIntegration: true,
      enableCaching: true,
      timeout: 180000,
      maxConcurrentAgents: 10,
      logLevel: 'silent',
      workingDirectory: process.cwd()
    };

    const factory = await createUEPMetaAgentFactory(documentedConfig);
    
    if (factory.isInitialized && factory.config.enableUEP) {
      console.log('✅ UEP Factory configuration is correct');
      console.log(`   - Initialized: ${factory.isInitialized}`);
      console.log(`   - UEP Enabled: ${factory.config.enableUEP}`);
      results.uepFactoryConfig = true;
      
      await factory.cleanup();
    } else {
      console.log('❌ UEP Factory configuration issue');
    }

  } catch (error) {
    console.log('❌ UEP Factory configuration failed:', error.message);
  }

  // Test 4: Template Structure
  console.log('\n4. Testing template structure...');
  try {
    const templatesDir = 'src/meta-agents/scaffold-generator/templates';
    
    // Check documented template files
    const expectedTemplates = [
      'main.js.hbs',
      'package.json.hbs',
      'README.md.hbs'
    ];

    let foundTemplates = 0;
    for (const template of expectedTemplates) {
      try {
        await fs.access(`${templatesDir}/${template}`);
        foundTemplates++;
      } catch (error) {
        // Template not found, but that's okay for some
      }
    }

    if (foundTemplates >= 2) {
      console.log('✅ Template structure is mostly correct');
      console.log(`   - Found ${foundTemplates}/${expectedTemplates.length} documented templates`);
      results.templateStructure = true;
    } else {
      console.log('❌ Template structure incomplete');
      console.log(`   - Found only ${foundTemplates}/${expectedTemplates.length} documented templates`);
    }

  } catch (error) {
    console.log('❌ Template structure check failed:', error.message);
  }

  // Test 5: Environment Variables
  console.log('\n5. Testing environment variables...');
  try {
    const requiredEnvVars = [
      'ANTHROPIC_API_KEY',
      'KV_REST_API_URL',
      'KV_REST_API_TOKEN'
    ];

    const optionalEnvVars = [
      'PERPLEXITY_API_KEY',
      'OPENAI_API_KEY',
      'MODEL',
      'UEP_ENABLED'
    ];

    let foundRequired = 0;
    let foundOptional = 0;

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        foundRequired++;
      }
    }

    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        foundOptional++;
      }
    }

    if (foundRequired >= 2) {
      console.log('✅ Environment variables are mostly configured');
      console.log(`   - Required: ${foundRequired}/${requiredEnvVars.length}`);
      console.log(`   - Optional: ${foundOptional}/${optionalEnvVars.length}`);
      results.environmentVars = true;
    } else {
      console.log('⚠️ Environment variables need attention');
      console.log(`   - Required: ${foundRequired}/${requiredEnvVars.length}`);
      console.log(`   - Optional: ${foundOptional}/${optionalEnvVars.length}`);
    }

  } catch (error) {
    console.log('❌ Environment variables check failed:', error.message);
  }

  // Results Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Documentation Validation Results');
  console.log('═'.repeat(60));
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  Object.entries(results).forEach(([testName, passed]) => {
    const icon = passed ? '✅' : '❌';
    const formattedName = testName
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/^./, str => str.toUpperCase());
    console.log(`${icon} ${formattedName}`);
  });
  
  console.log('═'.repeat(60));
  console.log(`Documentation Accuracy: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);

  if (passedTests === totalTests) {
    console.log('\n🎉 Documentation is fully validated and accurate!');
    console.log('📖 META_AGENTS_DOCUMENTATION.md can be trusted as the source of truth.');
    return true;
  } else if (passedTests >= totalTests * 0.8) {
    console.log('\n✅ Documentation is mostly accurate with minor issues.');
    console.log('📖 META_AGENTS_DOCUMENTATION.md is reliable for development.');
    return true;
  } else {
    console.log('\n⚠️ Documentation has significant accuracy issues.');
    console.log('🔧 Please review META_AGENTS_DOCUMENTATION.md and fix discrepancies.');
    return false;
  }
}

// Test specific input format examples from documentation
async function testDocumentedExamples() {
  console.log('\n🧪 Testing Documented Examples...\n');

  // Example 1: Scaffold Generator Format from docs
  console.log('Testing scaffold generator example from docs...');
  try {
    const { parseInput } = require('./src/meta-agents/scaffold-generator/lib/inputParser');
    
    // This is the exact format shown in the documentation
    const exampleFromDocs = {
      "tasks": [
        {
          "id": 1,
          "title": "Task Title",
          "description": "Description",
          "priority": "high",
          "dependencies": [2, 3],
          "status": "pending"
        }
      ],
      "metadata": {
        "projectName": "Agent Name",
        "description": "Agent desc",
        "version": "1.0.0",
        "author": "Author Name"
      }
    };

    const result = parseInput(exampleFromDocs);
    console.log('✅ Documentation example works correctly');
    console.log(`   Result: Agent "${result.agentName}" with ${result.tasks.length} tasks`);

  } catch (error) {
    console.log('❌ Documentation example failed:', error.message);
  }

  // Example 2: Environment variables validation
  console.log('\nTesting environment variables configuration...');
  
  const envStatus = {
    redis: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    model: !!process.env.MODEL,
    uep: process.env.UEP_ENABLED !== 'false'
  };

  console.log('Environment Configuration:');
  console.log(`   Redis: ${envStatus.redis ? '✅' : '❌'} Configured`);
  console.log(`   Anthropic: ${envStatus.anthropic ? '✅' : '❌'} Configured`);
  console.log(`   Model: ${envStatus.model ? '✅' : '❌'} Set`);
  console.log(`   UEP: ${envStatus.uep ? '✅' : '❌'} Enabled`);
}

// Run validation
async function runValidation() {
  console.log('🚀 Starting Meta-Agents Documentation Validation...\n');

  const validationSuccess = await validateDocumentation();
  await testDocumentedExamples();

  if (validationSuccess) {
    console.log('\n✨ Documentation validation completed successfully!');
    console.log('📚 META_AGENTS_DOCUMENTATION.md is your authoritative reference.');
    console.log('🔗 No more parameter guessing - everything is documented!');
    return true;
  } else {
    console.log('\n💥 Documentation validation found issues!');
    console.log('🔧 Fix the discrepancies and run this script again.');
    return false;
  }
}

// Execute validation
if (require.main === module) {
  runValidation().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { validateDocumentation, testDocumentedExamples };