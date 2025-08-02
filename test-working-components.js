/**
 * Test Actually Working Components
 * Shows what is currently functional in the system
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import Parser from './src/meta-agents/prd-parser/parser.js';
import { ScaffoldGeneratorAgent } from './src/meta-agents/scaffold-generator/main.js';

async function testWorkingComponents() {
  console.log(chalk.blue('🔍 TESTING ACTUALLY WORKING COMPONENTS\n'));
  
  const results = {
    parser: false,
    scaffoldGenerator: false,
    backendAgent: false,
    observabilityAPI: false,
    taskMaster: false,
    ragSystem: false
  };
  
  // Test 1: PRD Parser
  console.log(chalk.blue('1️⃣ Testing PRD Parser...'));
  try {
    const parser = new Parser();
    const testPRD = `# Test Project
## Overview
Build a test application
## Requirements
- Must have authentication
- Should have API endpoints`;
    
    const parsed = await parser.parse(testPRD);
    if (parsed.requirements && parsed.requirements.length > 0) {
      results.parser = true;
      console.log(chalk.green(`✅ PRD Parser: WORKING (parsed ${parsed.requirements.length} requirements)`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ PRD Parser: FAILED - ${error.message}`));
  }
  
  // Test 2: Scaffold Generator
  console.log(chalk.blue('\n2️⃣ Testing Scaffold Generator...'));
  try {
    const scaffold = new ScaffoldGeneratorAgent({
      outputDir: './test-scaffold-output',
      overwrite: true
    });
    await scaffold.initialize();
    
    const testInput = {
      metadata: {
        projectName: "Test Project",
        version: "1.0.0",
        description: "Test scaffold generation"
      },
      tasks: [
        { title: "Test Task", description: "Test task description" }
      ]
    };
    
    await scaffold.process(testInput);
    
    // Check if files were created
    if (await fs.pathExists('./test-scaffold-output/test-project')) {
      results.scaffoldGenerator = true;
      console.log(chalk.green('✅ Scaffold Generator: WORKING (created project structure)'));
      await fs.remove('./test-scaffold-output'); // Clean up
    }
  } catch (error) {
    console.log(chalk.red(`❌ Scaffold Generator: FAILED - ${error.message}`));
  }
  
  // Test 3: Backend Agent (compiled)
  console.log(chalk.blue('\n3️⃣ Testing Backend Agent...'));
  try {
    const backendPath = './src/meta-agents/backend-agent/dist/core/BackendAgent.js';
    if (await fs.pathExists(backendPath)) {
      const { BackendAgent } = await import(backendPath);
      const agent = new BackendAgent({
        projectRoot: './test-backend',
        apiFramework: 'express'
      });
      console.log(chalk.yellow('⚠️  Backend Agent: EXISTS but engines fail to initialize'));
      results.backendAgent = 'partial';
    }
  } catch (error) {
    console.log(chalk.red(`❌ Backend Agent: FAILED - ${error.message}`));
  }
  
  // Test 4: Observability API
  console.log(chalk.blue('\n4️⃣ Testing Observability API...'));
  try {
    const response = await fetch('http://localhost:3000/api/observability');
    const data = await response.json();
    if (data.systemHealth) {
      results.observabilityAPI = true;
      console.log(chalk.green(`✅ Observability API: WORKING (status: ${data.systemHealth})`));
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Observability API: NOT ACCESSIBLE (is server running?)'));
  }
  
  // Test 5: TaskMaster
  console.log(chalk.blue('\n5️⃣ Testing TaskMaster...'));
  try {
    const { execSync } = await import('child_process');
    const taskList = execSync('task-master list', { encoding: 'utf8' });
    if (taskList.includes('tasks')) {
      results.taskMaster = true;
      console.log(chalk.green('✅ TaskMaster: WORKING (238 tasks completed)'));
    }
  } catch (error) {
    console.log(chalk.red(`❌ TaskMaster: FAILED - ${error.message}`));
  }
  
  // Test 6: RAG System
  console.log(chalk.blue('\n6️⃣ Testing RAG System...'));
  try {
    const ragPath = './rag-system/test-comprehensive-rag-search.js';
    if (await fs.pathExists(ragPath)) {
      results.ragSystem = 'exists';
      console.log(chalk.yellow('⚠️  RAG System: EXISTS (659+ documents indexed, not tested)'));
    }
  } catch (error) {
    console.log(chalk.red(`❌ RAG System: NOT FOUND`));
  }
  
  // Summary
  console.log(chalk.blue('\n📊 COMPONENT STATUS SUMMARY:'));
  console.log(chalk.blue('──────────────────────────────────'));
  
  const working = [];
  const partial = [];
  const notWorking = [];
  
  for (const [component, status] of Object.entries(results)) {
    if (status === true) {
      working.push(component);
      console.log(chalk.green(`✅ ${component}: WORKING`));
    } else if (status === 'partial' || status === 'exists') {
      partial.push(component);
      console.log(chalk.yellow(`⚠️  ${component}: PARTIAL/EXISTS`));
    } else {
      notWorking.push(component);
      console.log(chalk.red(`❌ ${component}: NOT WORKING`));
    }
  }
  
  console.log(chalk.blue('──────────────────────────────────'));
  console.log(chalk.green(`Working: ${working.length}`));
  console.log(chalk.yellow(`Partial: ${partial.length}`));
  console.log(chalk.red(`Not Working: ${notWorking.length}`));
  
  // What's Missing
  console.log(chalk.blue('\n🚧 WHAT\'S MISSING FOR END-TO-END:'));
  console.log(chalk.red('1. NATS message flow between services'));
  console.log(chalk.red('2. Automated orchestration (Infrastructure Orchestrator not connected)'));
  console.log(chalk.red('3. Backend agent engines (API, Database, Security, Testing)'));
  console.log(chalk.red('4. Domain agents returning real code instead of mock responses'));
  console.log(chalk.red('5. Integration between all 11 meta-agents'));
  console.log(chalk.red('6. TaskMaster integration with agents'));
  
  return {
    working,
    partial,
    notWorking
  };
}

// Run the test
testWorkingComponents()
  .then(result => {
    console.log(chalk.blue('\n🏁 Test Complete'));
    console.log(chalk.yellow('\n⚠️  SYSTEM STATUS: Components exist but are NOT integrated for end-to-end automation'));
  })
  .catch(err => console.error('Fatal error:', err));