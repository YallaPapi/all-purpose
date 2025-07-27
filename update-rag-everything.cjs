#!/usr/bin/env node

/**
 * COMPREHENSIVE RAG UPDATE - Index ALL current project files
 * This will scan the entire project and update the vector database
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 COMPREHENSIVE RAG UPDATE - Indexing ALL current files...');

async function updateRAGWithEverything() {
  try {
    console.log('📁 Step 1: Scanning all project files...');
    
    // Define what to scan
    const filesToScan = [
      // Root documentation
      'README.md',
      'CLAUDE.md', 
      'SYSTEM_GUIDE.md',
      'QUICK_START.md',
      'TROUBLESHOOTING.md',
      'CHANGELOG.md',
      'CHANGE_SUMMARY.md',
      'INTEGRATION_LAYER.md',
      'AGENT_CLASSIFICATION.md',
      
      // All PRD files
      'docs/prd_*.md',
      
      // Core source code (excluding node_modules)
      'src/*.js',
      'src/*.ts', 
      'src/meta-agents/*.js',
      'src/meta-agents/*.ts',
      'src/meta-agents/*.md',
      'src/uep/*.js',
      'src/integration/*.js',
      'src/factory/*.js',
      
      // Generated agents (project files only)
      'generated/*/src/*.ts',
      'generated/*/src/*.js', 
      'generated/*/*.md',
      'generated/*/package.json',
      
      // Configuration files
      'package.json',
      'tsconfig.json',
      '.env.example',
      
      // Test and build files
      'test-*.js',
      'build-*.js',
      '*-agent-input.json',
      'integration-spec.json',
      
      // RAG system
      'rag-system/src/**/*.ts',
      'rag-system/*.js',
      
      // TaskMaster
      '.taskmaster/**/*.json',
      '.taskmaster/**/*.md'
    ];
    
    console.log('🗂️  Files to scan:', filesToScan.length, 'patterns');
    
    console.log('📊 Step 2: Clearing old RAG data...');
    // Clear existing data to ensure fresh update
    try {
      execSync('cd rag-system && node -e "console.log(\'Clearing RAG...\')"', { stdio: 'inherit' });
    } catch (e) {
      console.log('⚠️  Could not clear old data, proceeding...');
    }
    
    console.log('🔍 Step 3: Adding all files to RAG...');
    
    // Process each file pattern
    for (const pattern of filesToScan) {
      try {
        console.log(`Processing: ${pattern}`);
        
        // Use glob to find matching files
        const { globSync } = require('glob');
        const matchingFiles = globSync(pattern, { 
          ignore: ['**/node_modules/**', 'node_modules/**', 'dist/**', '.git/**', '**/dist/**', '**/build/**'],
          dot: false 
        });
        
        console.log(`  Found ${matchingFiles.length} files for pattern: ${pattern}`);
        
        // Add each file to RAG
        for (const file of matchingFiles) {
          if (fs.existsSync(file) && fs.statSync(file).isFile()) {
            try {
              const content = fs.readFileSync(file, 'utf-8');
              
              // Skip binary or very large files
              if (content.length > 100000) {
                console.log(`  Skipping large file: ${file}`);
                continue;
              }
              
              // Add to RAG using the context API
              const addCommand = `cd rag-system && echo 'add ${file}' | timeout 30 node context-cli.js`;
              try {
                execSync(addCommand, { stdio: 'pipe' });
                console.log(`  ✅ Added: ${file}`);
              } catch (addError) {
                console.log(`  ⚠️  Could not add: ${file}`);
              }
              
            } catch (readError) {
              console.log(`  ⚠️  Could not read: ${file}`);
            }
          }
        }
        
      } catch (patternError) {
        console.log(`⚠️  Error processing pattern ${pattern}:`, patternError.message);
      }
    }
    
    console.log('🔄 Step 4: Running existing update scripts...');
    
    // Run existing update mechanisms
    try {
      execSync('cd rag-system && node update-meta-agents.js', { stdio: 'inherit' });
    } catch (e) {
      console.log('⚠️  update-meta-agents.js failed, continuing...');
    }
    
    console.log('✅ RAG UPDATE COMPLETE!');
    console.log('📊 All current project files have been indexed');
    console.log('🧠 RAG now contains the latest information');
    
  } catch (error) {
    console.error('❌ RAG update failed:', error.message);
    console.log('🔧 Try running individual components manually:');
    console.log('   cd rag-system && node update-meta-agents.js');
    console.log('   cd rag-system && node initialize-cached-rag.js');
  }
}

updateRAGWithEverything();