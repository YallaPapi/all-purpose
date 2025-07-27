
#!/usr/bin/env node

import { readFile, mkdir } from 'fs/promises';
import path from 'path';
import { createUEPMetaAgentFactory } from './src/meta-agents/UEPMetaAgentFactory.js';
import { FactoryIntegrationAdapter } from './src/integration/AgentIntegrationAdapter.js';

async function buildProject() {
  console.log('🏭 Starting UEP Meta-Agent Factory for test-app...');
  
  try {
    // Ensure output directory exists
    const outputDir = './generated/test-app';
    await mkdir(outputDir, { recursive: true });
    
    // Create factory instance
    const originalFactory = await createUEPMetaAgentFactory({
      enableUEP: true,
      enableValidation: true,
      logLevel: 'verbose',
      workingDirectory: process.cwd(),
      outputDirectory: outputDir
    });

    // Wrap with integration adapter
    const factory = new FactoryIntegrationAdapter(originalFactory);
    console.log('✅ Factory created with integration adapter');

    // Create Scaffold Generator agent
    const scaffoldGenerator = await factory.createAgent('scaffold-generator', 'scaffold-gen-001', {
      templatesDir: './src/meta-agents/scaffold-generator/templates',
      enableBestPractices: true,
      projectType: 'real-estate-crm'
    });

    console.log('🏗️ Scaffold Generator agent created');

    // Convert TaskMaster data to scaffold format
    const tasksPath = './taskmaster/tasks/tasks.json';
    const tasksContent = await readFile(tasksPath, 'utf-8');
    const tasksData = JSON.parse(tasksContent);
    
    const scaffoldInput = {
      tasks: tasksData.master.tasks,
      metadata: {
        projectName: "test-app",
        description: "Task management application from PRD",
        version: "1.0.0"
      }
    };

    // Generate project scaffold with TaskMaster data
    const scaffoldResult = await scaffoldGenerator.process(scaffoldInput);

    console.log('🎉 Project build completed!');
    console.log('📁 Output directory:', scaffoldResult.outputDirectory);
    console.log('📊 Generated files:', scaffoldResult.generatedFiles?.length || 0);

  } catch (error) {
    console.error('❌ Factory build failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

buildProject().catch(error => {
  console.error('❌ Build process failed:', error);
  process.exit(1);
});
