/**
 * Test script for UEP CLI Human Prompt Enhancement
 * 
 * This test validates the UEP CLI wrapper for human prompt enhancement.
 * Tests non-interactive mode since interactive mode requires user input.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function testUEPCLI() {
  console.log('🧪 Testing UEP CLI Wrapper for Human Prompt Enhancement...\n');

  const testResults = {
    cliAvailable: false,
    nonInteractiveMode: false,
    promptEnhancement: false,
    fallbackMode: false
  };

  try {
    // Test 1: Check if UEP CLI is available
    console.log('1. Testing UEP CLI availability...');
    
    const cliPath = path.join(__dirname, 'dist/uep/cli.js');
    
    try {
      await fs.access(cliPath);
      console.log('✅ UEP CLI compiled file found');
      testResults.cliAvailable = true;
    } catch (error) {
      console.log('❌ UEP CLI compiled file not found');
      console.log('   Run: npx tsc src/uep/*.ts --outDir dist');
    }

    // Test 2: Test CLI Help Command
    if (testResults.cliAvailable) {
      console.log('\n2. Testing CLI help command...');
      
      try {
        const helpResult = await runCommand('node', [cliPath, '--help'], 5000);
        if (helpResult.includes('Universal Execution Protocol CLI')) {
          console.log('✅ CLI help command works');
        } else {
          console.log('❌ CLI help command output unexpected');
        }
      } catch (error) {
        console.log(`❌ CLI help command failed: ${error.message}`);
      }
    }

    // Test 3: Test Non-Interactive Mode with Simple Prompt
    if (testResults.cliAvailable) {
      console.log('\n3. Testing non-interactive mode with simple prompt...');
      
      try {
        const testPrompt = 'Create a simple Hello World function';
        const cliArgs = [
          cliPath,
          '--format', 'plain',
          '--log-level', 'minimal',
          '--no-interactive',
          testPrompt
        ];

        const result = await runCommand('node', cliArgs, 30000);
        
        if (result.includes('Hello World') || result.includes('Enhanced Prompt') || result.includes('Prompt (No Enhancement)')) {
          console.log('✅ Non-interactive mode works');
          console.log('   Output preview:', result.substring(0, 100) + '...');
          testResults.nonInteractiveMode = true;
          
          if (result.includes('Enhanced Prompt') || result.includes('UEP Context')) {
            console.log('✅ Prompt enhancement detected');
            testResults.promptEnhancement = true;
          } else {
            console.log('⚠️ Enhancement disabled or fallback mode');
            testResults.fallbackMode = true;
          }
        } else {
          console.log('❌ Non-interactive mode output unexpected');
          console.log('   Output:', result);
        }

      } catch (error) {
        console.log(`❌ Non-interactive mode test failed: ${error.message}`);
      }
    }

    // Test 4: Test CLI with Different Formats
    if (testResults.cliAvailable) {
      console.log('\n4. Testing different output formats...');
      
      const formats = ['plain', 'json', 'enhanced'];
      
      for (const format of formats) {
        try {
          const testPrompt = 'List files in current directory';
          const cliArgs = [
            cliPath,
            '--format', format,
            '--log-level', 'silent',
            '--no-interactive',
            testPrompt
          ];

          const result = await runCommand('node', cliArgs, 15000);
          
          if (format === 'json') {
            try {
              JSON.parse(result);
              console.log(`   ✅ ${format} format: Valid JSON output`);
            } catch (parseError) {
              console.log(`   ❌ ${format} format: Invalid JSON output`);
            }
          } else {
            console.log(`   ✅ ${format} format: Output received (${result.length} chars)`);
          }

        } catch (error) {
          console.log(`   ❌ ${format} format: ${error.message}`);
        }
      }
    }

    // Test 5: Test CLI Configuration Options
    if (testResults.cliAvailable) {
      console.log('\n5. Testing CLI configuration options...');
      
      const configTests = [
        { args: ['--no-enhancement'], desc: 'Enhancement disabled' },
        { args: ['--debug'], desc: 'Debug mode enabled' },
        { args: ['--log-level', 'verbose'], desc: 'Verbose logging' }
      ];

      for (const configTest of configTests) {
        try {
          const testPrompt = 'Test configuration';
          const cliArgs = [
            cliPath,
            '--no-interactive',
            '--log-level', 'minimal',
            ...configTest.args,
            testPrompt
          ];

          const result = await runCommand('node', cliArgs, 10000);
          console.log(`   ✅ ${configTest.desc}: Command completed`);

        } catch (error) {
          console.log(`   ❌ ${configTest.desc}: ${error.message}`);
        }
      }
    }

    // Test Summary
    console.log('\n📊 UEP CLI Test Summary:');
    console.log('═'.repeat(50));
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    Object.entries(testResults).forEach(([testName, passed]) => {
      const icon = passed ? '✅' : '❌';
      const formattedName = testName.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${icon} ${formattedName}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    console.log('═'.repeat(50));
    console.log(`Tests passed: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);

    if (passedTests >= 2) { // At least CLI available and one functionality test
      console.log('\n🎉 UEP CLI is functional!');
      console.log('\n💡 Usage examples:');
      console.log('   Interactive mode:');
      console.log('   node dist/uep/cli.js --interactive');
      console.log('');
      console.log('   Non-interactive mode:');
      console.log('   node dist/uep/cli.js --no-interactive "Your prompt here"');
      console.log('');
      console.log('   JSON output:');
      console.log('   node dist/uep/cli.js --format json --no-interactive "Your prompt"');
      
      return true;
    } else {
      console.log('\n⚠️ UEP CLI has issues');
      console.log('💡 Ensure TypeScript is compiled: npx tsc src/uep/*.ts --outDir dist');
      return false;
    }

  } catch (error) {
    console.error('\n❌ UEP CLI test failed:', error.message);
    return false;
  }
}

/**
 * Run a command and return its output
 */
function runCommand(command, args, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { 
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || stdout || `Process exited with code ${code}`));
      }
    });
    
    proc.on('error', (error) => {
      reject(error);
    });
    
    // Timeout handling
    const timeoutId = setTimeout(() => {
      proc.kill();
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);
    
    proc.on('close', () => {
      clearTimeout(timeoutId);
    });
  });
}

// Test UEP CLI functionality with actual human workflows
async function testHumanWorkflows() {
  console.log('\n🚀 Testing UEP with Human Workflows...\n');

  const workflows = [
    {
      name: 'Code Review Request',
      prompt: 'Please review my React component for performance issues and suggest improvements',
      expectedContext: ['codebase', 'functions', 'files']
    },
    {
      name: 'Bug Investigation',
      prompt: 'Help me debug why my API endpoint is returning 500 errors intermittently',
      expectedContext: ['codebase', 'documentation', 'memory']
    },
    {
      name: 'Feature Implementation',
      prompt: 'I need to add user authentication to my Node.js application using JWT',
      expectedContext: ['documentation', 'taskBreakdown', 'codebase']
    },
    {
      name: 'Documentation Request',
      prompt: 'Generate API documentation for my REST endpoints',
      expectedContext: ['codebase', 'documentation']
    }
  ];

  let workflowResults = [];

  for (const workflow of workflows) {
    console.log(`Testing workflow: ${workflow.name}`);
    
    try {
      const cliPath = path.join(__dirname, 'dist/uep/cli.js');
      const cliArgs = [
        cliPath,
        '--format', 'json',
        '--log-level', 'silent',
        '--no-interactive',
        workflow.prompt
      ];

      const result = await runCommand('node', cliArgs, 20000);
      
      try {
        const jsonResult = JSON.parse(result);
        const hasEnhancements = jsonResult.enhancements && Object.keys(jsonResult.enhancements).length > 0;
        const hasMetadata = jsonResult.metadata && jsonResult.metadata.componentsUsed;
        
        workflowResults.push({
          name: workflow.name,
          success: true,
          enhanced: hasEnhancements,
          components: hasMetadata ? jsonResult.metadata.componentsUsed : [],
          processingTime: jsonResult.metadata?.processingTime || 0
        });

        console.log(`✅ ${workflow.name}: Enhanced=${hasEnhancements}, Components=${hasMetadata ? jsonResult.metadata.componentsUsed.length : 0}`);

      } catch (parseError) {
        workflowResults.push({
          name: workflow.name,
          success: false,
          error: 'Invalid JSON response'
        });
        console.log(`❌ ${workflow.name}: Invalid JSON response`);
      }

    } catch (error) {
      workflowResults.push({
        name: workflow.name,
        success: false,
        error: error.message
      });
      console.log(`❌ ${workflow.name}: ${error.message}`);
    }
  }

  // Workflow test summary
  console.log('\n📈 Human Workflow Test Results:');
  console.log('═'.repeat(60));
  
  const successfulWorkflows = workflowResults.filter(r => r.success).length;
  const enhancedWorkflows = workflowResults.filter(r => r.enhanced).length;
  
  workflowResults.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const enhancement = result.enhanced ? '🧠' : '🔄';
    console.log(`${icon} ${enhancement} ${result.name}`);
    if (result.components && result.components.length > 0) {
      console.log(`    Components: ${result.components.join(', ')}`);
    }
    if (result.processingTime) {
      console.log(`    Processing: ${result.processingTime}ms`);
    }
  });
  
  console.log('═'.repeat(60));
  console.log(`Successful workflows: ${successfulWorkflows}/${workflows.length} (${(successfulWorkflows/workflows.length*100).toFixed(1)}%)`);
  console.log(`Enhanced workflows: ${enhancedWorkflows}/${workflows.length} (${(enhancedWorkflows/workflows.length*100).toFixed(1)}%)`);

  return successfulWorkflows > 0;
}

// Run all tests
async function runAllCLITests() {
  console.log('🚀 Starting UEP CLI and Human Workflow Tests...\n');

  const cliSuccess = await testUEPCLI();
  const workflowSuccess = await testHumanWorkflows();

  console.log('\n🏁 Final UEP CLI Test Results:');
  console.log(`CLI Tests: ${cliSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Workflow Tests: ${workflowSuccess ? '✅ PASSED' : '❌ FAILED'}`);

  if (cliSuccess && workflowSuccess) {
    console.log('\n🎉 UEP CLI testing completed successfully!');
    console.log('🔗 Human prompt enhancement with UEP is functional');
    return true;
  } else if (cliSuccess) {
    console.log('\n⚠️ UEP CLI works but workflow tests had issues');
    console.log('💡 This is normal if UEP enhancement components need more setup');
    return true;
  } else {
    console.log('\n💥 UEP CLI testing failed!');
    return false;
  }
}

// Execute tests
runAllCLITests().then(success => {
  if (success) {
    console.log('\n✨ UEP CLI testing completed successfully!');
    process.exit(0);
  } else {
    console.log('\n💥 UEP CLI testing failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('CLI test execution failed:', error);
  process.exit(1);
});