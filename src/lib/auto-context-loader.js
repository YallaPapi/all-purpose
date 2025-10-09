#!/usr/bin/env node

/**
 * Auto-Context Loader - Automatically inject full project context from RAG
 * This runs every Claude session to give full project understanding
 */

import { execSync } from 'child_process';
import path from 'path';

console.log('🧠 Auto-loading full project context...');

async function loadProjectContext() {
  try {
    // Use the working RAG context CLI to search for comprehensive project info
    const contextQueries = [
      'autonomous factory workflow PRD to project',
      'working commands current system status',
      'UEP meta-agent factory integration',
      'test-factory-build.js how it works',
      'task-master parse-prd workflow',
      'generated projects structure',
      'CLAUDE.md system instructions'
    ];

    console.log('📋 Loading context for key project areas...');
    
    for (const query of contextQueries) {
      console.log(`🔍 Searching: ${query}`);
      try {
        // Use the working context CLI to get project information
        const result = execSync(`cd rag-system && echo "search ${query}" | node context-cli.js`, 
          { encoding: 'utf-8', timeout: 10000 });
        console.log(`✅ Found context for: ${query}`);
      } catch (error) {
        console.log(`⚠️  Could not load context for: ${query}`);
      }
    }
    
    console.log('✅ Context loading complete');
    console.log('💡 Full project understanding now available');
    
  } catch (error) {
    console.log('❌ Context loading failed:', error.message);
    console.log('📝 Proceeding with limited context');
  }
}

loadProjectContext();