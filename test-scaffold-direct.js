#!/usr/bin/env node

// Test scaffold generator with TaskMaster data directly
import { readFile } from 'fs/promises';
import { ScaffoldGeneratorAgent } from './src/meta-agents/scaffold-generator/main.js';

async function testScaffoldDirect() {
  try {
    // Read TaskMaster data
    const tasksData = JSON.parse(await readFile('.taskmaster/tasks/tasks.json', 'utf-8'));
    
    // Convert to scaffold format
    const scaffoldInput = {
      tasks: tasksData.master.tasks,
      metadata: {
        projectName: "test-app",
        description: "Task management application from PRD",
        version: "1.0.0"
      }
    };
    
    console.log('📊 Input format:', JSON.stringify(scaffoldInput, null, 2).substring(0, 500) + '...');
    
    // Create scaffold generator
    const generator = new ScaffoldGeneratorAgent({
      outputDir: './generated',
      logLevel: 'verbose'
    });
    
    await generator.initialize();
    
    // Process with correct format
    const result = await generator.process(scaffoldInput);
    
    console.log('✅ Result:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testScaffoldDirect();