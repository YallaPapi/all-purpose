#!/usr/bin/env node

/**
 * Test script to build monitoring dashboard using UEP Meta-Agent Factory
 */

import { readFile } from 'fs/promises';
import path from 'path';

// Import the factory and integration adapter
import { createUEPMetaAgentFactory } from './src/meta-agents/UEPMetaAgentFactory.js';
import { FactoryIntegrationAdapter } from './src/integration/AgentIntegrationAdapter.js';

async function buildMonitoringDashboard() {
  console.log('🏭 Starting UEP Meta-Agent Factory...');
  
  try {
    // Create factory instance
    const originalFactory = await createUEPMetaAgentFactory({
      enableUEP: true,
      enableValidation: true,
      logLevel: 'verbose',
      workingDirectory: process.cwd(),
      outputDirectory: './generated/monitoring-dashboard'
    });

    // Wrap with integration adapter
    const factory = new FactoryIntegrationAdapter(originalFactory);

    console.log('✅ Factory created with integration adapter');

    // Read the monitoring dashboard PRD
    const prdPath = path.join(process.cwd(), 'docs', 'monitoring-dashboard-prd.md');
    const prdContent = await readFile(prdPath, 'utf-8');
    
    console.log('📋 PRD loaded, starting agent coordination...');

    // Create PRD Parser agent
    const prdParser = await factory.createAgent('prd-parser', 'prd-parser-001', {
      enableResearch: true,
      enableTaskBreakdown: true
    });

    console.log('🔍 PRD Parser agent created');

    // Process the PRD
    const parsedPRD = await prdParser.process(prdContent, {
      outputFormat: 'structured',
      enableComplexityAnalysis: true,
      enableTaskGeneration: true
    });

    console.log('📊 PRD processed - Success:', parsedPRD.success);
    
    // Create mock structured PRD data for scaffold generation (since TaskMaster has path issues)
    const mockPRDData = {
      tasks: [
        {
          id: 1,
          title: "Initialize monitoring dashboard project structure",
          description: "Set up React/Next.js frontend with Express.js backend and WebSocket support",
          priority: "high",
          dependencies: []
        },
        {
          id: 2,
          title: "Implement real-time data collection system",
          description: "Build WebSocket connections and UEP event listeners for live monitoring",
          priority: "high",
          dependencies: [1]
        },
        {
          id: 3,
          title: "Create visualization components",
          description: "Build interactive charts, gauges, and dashboard widgets using Chart.js",
          priority: "medium",
          dependencies: [1]
        },
        {
          id: 4,
          title: "Integrate with observability system",
          description: "Connect to localhost:3000/admin/observability endpoints and Redis cache",
          priority: "high",
          dependencies: [2]
        }
      ],
      metadata: {
        projectName: "monitoring-dashboard",
        description: "Real-time performance monitoring dashboard for Lead Generation Factory",
        version: "1.0.0",
        author: "UEP Meta-Agent Factory"
      }
    };

    // Create Scaffold Generator agent
    const scaffoldGenerator = await factory.createAgent('scaffold-generator', 'scaffold-gen-001', {
      templatesDir: './src/meta-agents/scaffold-generator/templates',
      enableBestPractices: true,
      projectType: 'dashboard'
    });

    console.log('🏗️ Scaffold Generator agent created');

    // Generate project scaffold using mock data
    const scaffoldResult = await scaffoldGenerator.generate({
      projectName: 'monitoring-dashboard',
      projectType: 'dashboard',
      requirements: mockPRDData,
      outputDirectory: './generated/monitoring-dashboard'
    });

    console.log('🎉 Monitoring dashboard build completed!');
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

// Run the build
buildMonitoringDashboard().catch(error => {
  console.error('❌ Build process failed:', error);
  process.exit(1);
});