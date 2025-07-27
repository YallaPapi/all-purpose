
#!/usr/bin/env node

import { readFile, mkdir } from 'fs/promises';
import path from 'path';
import { createUEPMetaAgentFactory } from './src/meta-agents/UEPMetaAgentFactory.js';
import { FactoryIntegrationAdapter } from './src/integration/AgentIntegrationAdapter.js';

async function buildProject() {
  console.log('🏭 Starting UEP Meta-Agent Factory for real-test-project...');
  
  try {
    // Ensure output directory exists
    const outputDir = './generated/real-test-project';
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

    // Generate project scaffold with real estate CRM structure
    const scaffoldResult = await scaffoldGenerator.generate({
      projectName: 'real-test-project',
      projectType: 'real-estate-crm',
      requirements: {
        tasks: [
          { id: 1, title: "Next.js Setup", description: "Initialize Next.js with TypeScript and Tailwind" },
          { id: 2, title: "Authentication", description: "Implement NextAuth.js for agent/manager/admin roles" },
          { id: 3, title: "Database", description: "Set up Prisma with lead and property models" },
          { id: 4, title: "Lead Management", description: "Build lead tracking and assignment system" },
          { id: 5, title: "Property Management", description: "Create property listing and management features" }
        ],
        metadata: {
          projectName: "real-test-project",
          description: "Real Estate CRM System",
          version: "1.0.0"
        }
      },
      outputDirectory: outputDir
    });

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
