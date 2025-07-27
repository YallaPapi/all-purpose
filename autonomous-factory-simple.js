#!/usr/bin/env node

/**
 * Autonomous Factory - Simple Working Version
 * PRD → TaskMaster → Scaffold Generator → Complete Project
 */

import { readFile, writeFile } from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import { ScaffoldGeneratorAgent } from './src/meta-agents/scaffold-generator/main.js';

async function findSpecificPRD() {
  try {
    const { readdir, access } = await import('fs/promises');
    const docsDir = './docs';
    
    // Check if specific PRD file provided as argument
    const args = process.argv.slice(2);
    const prdArg = args.find(arg => arg.startsWith('--prd='));
    
    if (!prdArg) {
      // List available PRDs and require user to specify
      console.log('❌ No PRD specified. Please specify which PRD to build.');
      console.log('');
      console.log('📋 Available PRDs:');
      
      const files = await readdir(docsDir);
      const prdFiles = files.filter(f => f.startsWith('prd_') && f.endsWith('.md'));
      
      if (prdFiles.length === 0) {
        throw new Error('No PRD files found in docs/ folder. Create a file named prd_project-name.md');
      }
      
      prdFiles.forEach((file, index) => {
        const projectName = file.replace('prd_', '').replace('.md', '');
        console.log(`   ${index + 1}. ${projectName} (${file})`);
      });
      
      console.log('');
      console.log('Usage:');
      console.log('   node autonomous-factory-simple.js --prd=monitoring-dashboard.md');
      console.log('   node autonomous-factory-simple.js --prd=lead-generation-factory.md');
      console.log('   node autonomous-factory-simple.js --prd=project-name.md');
      process.exit(1);
    }
    
    const specifiedPRD = prdArg.replace('--prd=', '');
    const fullPath = specifiedPRD.startsWith('prd_') ? specifiedPRD : `prd_${specifiedPRD}`;
    
    // Verify the PRD file exists
    try {
      await access(`${docsDir}/${fullPath}`);
      console.log(`📋 Using specified PRD: ${fullPath}`);
      return fullPath;
    } catch (error) {
      throw new Error(`PRD file not found: ${docsDir}/${fullPath}. Check the filename and try again.`);
    }
    
  } catch (error) {
    console.error('❌ Error finding PRD:', error.message);
    process.exit(1);
  }
}

async function parseProject(prdFile) {
  console.log('🔧 Parsing PRD with TaskMaster...');
  
  try {
    const projectName = prdFile.replace('prd_', '').replace('.md', '');
    
    // Parse PRD with TaskMaster
    execSync(`task-master parse-prd docs/${prdFile} --force`, { stdio: 'inherit' });
    console.log('✅ PRD parsed successfully');
    
    return projectName;
    
  } catch (error) {
    console.error('❌ PRD parsing failed:', error.message);
    process.exit(1);
  }
}

function toKebabCase(str) {
  if (typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function buildProject(projectName) {
  console.log('🏗️ Building project with Scaffold Generator...');
  
  try {
    // Read TaskMaster data
    const tasksData = JSON.parse(await readFile('.taskmaster/tasks/tasks.json', 'utf-8'));
    
    // Convert to scaffold format
    const scaffoldInput = {
      tasks: tasksData.master.tasks,
      metadata: {
        projectName: projectName,
        description: "Task management application from PRD",
        version: "1.0.0"
      }
    };
    
    console.log(`📊 Loaded ${scaffoldInput.tasks.length} tasks from TaskMaster`);
    
    // Create scaffold generator
    const generator = new ScaffoldGeneratorAgent({
      outputDir: './generated',
      logLevel: 'info',
      overwrite: true  // Allow overwriting existing directories
    });
    
    await generator.initialize();
    
    // Process with correct format
    const result = await generator.process(scaffoldInput);
    
    console.log('✅ Project built successfully');
    
    // Return the normalized project name that was actually generated
    const normalizedProjectName = toKebabCase(projectName);
    console.log(`✅ Successfully generated agent: ${normalizedProjectName}`);
    console.log(`📁 Output directory: generated\\${normalizedProjectName}`);
    
    return `generated/${normalizedProjectName}`;
    
  } catch (error) {
    console.error('❌ Project build failed:', error.message);
    throw error;
  }
}

async function validateProject(projectPath) {
  console.log(`🧪 Validating generated project at ${projectPath}...`);
  
  try {
    const { access } = await import('fs/promises');
    
    // Check if project directory exists
    await access(projectPath);
    
    // Check for package.json
    await access(path.join(projectPath, 'package.json'));
    
    console.log('✅ Project validation passed');
    return true;
    
  } catch (error) {
    console.log('❌ Project validation failed:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🎯 AUTONOMOUS FACTORY - PRD TO WORKING PROJECT');
    console.log('='.repeat(50));
    
    // Step 1: Find specific PRD
    const prdFile = await findSpecificPRD();
    
    // Step 2: Parse PRD into tasks
    const projectName = await parseProject(prdFile);
    
    // Step 3: Build complete project
    const projectPath = await buildProject(projectName);
    
    // Step 4: Validate results
    const isValid = await validateProject(projectPath);
    
    if (isValid) {
      console.log('🎉 SUCCESS! Project generated successfully');
      console.log(`📁 Location: ${projectPath}`);
      console.log(`🚀 Next steps:`);
      console.log(`   cd ${projectPath}`);
      console.log(`   npm install`);
      console.log(`   npm start`);
    } else {
      console.log('❌ Project generation failed validation');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🏭 Autonomous Factory - Usage

Creates a complete working project from a PRD file automatically.

Usage:
  node autonomous-factory-simple.js

Requirements:
  1. Create a PRD file in docs/ folder named: prd_project-name.md
  2. Describe what you want built in plain English
  3. Run this command
  4. Get a complete working project

The factory will automatically:
  - Parse your requirements with TaskMaster
  - Generate project structure with Scaffold Generator
  - Create working code files
  - Provide a complete project ready to run
`);
  process.exit(0);
}

main();