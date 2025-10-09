#!/usr/bin/env node

/**
 * COMPLETE RAG UPDATE - Index ALL project files with proper error handling
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { globSync } = require('glob');

console.log('🔄 COMPLETE RAG UPDATE - Indexing ALL project files...');
console.log('📍 Working directory:', process.cwd());

// Load environment variables from .env
if (fs.existsSync('.env')) {
  const envFile = fs.readFileSync('.env', 'utf-8');
  envFile.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        const cleanValue = value.replace(/^"(.*)"$/, '$1');
        process.env[key] = cleanValue;
      }
    }
  });
  console.log('✅ Environment loaded from .env');
} else {
  console.log('⚠️ No .env file found');
}

// Verify API keys
const requiredKeys = ['OPENAI_API_KEY', 'UPSTASH_VECTOR_REST_URL', 'UPSTASH_VECTOR_REST_TOKEN'];
const missingKeys = requiredKeys.filter(key => !process.env[key]);
if (missingKeys.length > 0) {
  console.error('❌ Missing required environment variables:', missingKeys.join(', '));
  process.exit(1);
}
console.log('✅ Required API keys found');

async function findAllProjectFiles() {
  console.log('📁 Scanning for all project files...');
  
  const patterns = [
    // Root documentation
    '*.md',
    'docs/**/*.md',
    'docs/**/*.txt',
    
    // Source code (excluding node_modules)
    'src/**/*.js',
    'src/**/*.ts',
    'src/**/*.tsx',
    'src/**/*.jsx',
    
    // Generated projects
    'generated/**/*.md',
    'generated/**/*.js',
    'generated/**/*.ts',
    'generated/**/*.json',
    
    // Configuration files
    'package.json',
    'tsconfig.json',
    '.env.example',
    
    // Scripts
    '*.js',
    '*.cjs',
    '*.mjs',
    
    // TaskMaster files
    '.taskmaster/**/*.json',
    '.taskmaster/**/*.md',
    
    // RAG system
    'rag-system/**/*.js',
    'rag-system/**/*.ts',
    'rag-system/**/*.md'
  ];
  
  const allFiles = [];
  
  for (const pattern of patterns) {
    try {
      const files = globSync(pattern, {
        ignore: [
          '**/node_modules/**',
          '**/dist/**', 
          '**/build/**',
          '**/.git/**',
          '**/logs/**',
          '**/*.log',
          '**/*.map',
          '**/*.d.ts'
        ],
        dot: false
      });
      
      console.log(`  Pattern "${pattern}": ${files.length} files`);
      allFiles.push(...files);
    } catch (error) {
      console.log(`  ⚠️ Pattern "${pattern}" failed:`, error.message);
    }
  }
  
  // Remove duplicates and filter to existing files
  const uniqueFiles = [...new Set(allFiles)].filter(file => {
    try {
      return fs.existsSync(file) && fs.statSync(file).isFile();
    } catch {
      return false;
    }
  });
  
  console.log(`📊 Total unique files found: ${uniqueFiles.length}`);
  return uniqueFiles;
}

async function addFileToRAG(filePath, contextAPI) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip very large files or binary content
    if (content.length > 50000) {
      console.log(`  📄 Skipping large file: ${filePath} (${content.length} chars)`);
      return false;
    }
    
    // Skip if content appears to be binary
    if (/[\x00-\x08\x0E-\x1F\x7F]/.test(content.substring(0, 1000))) {
      console.log(`  📄 Skipping binary file: ${filePath}`);
      return false;
    }
    
    await contextAPI.addContext(`File: ${filePath}`, content);
    return true;
  } catch (error) {
    console.log(`  ❌ Failed to add ${filePath}:`, error.message);
    return false;
  }
}

async function updateRAGCompletely() {
  try {
    console.log('🔧 Initializing RAG components...');
    
    // Import the working RAG components
    const { ContextAPI } = require('./rag-system/dist/api/contextAPI');
    const contextAPI = new ContextAPI();
    
    console.log('✅ RAG components initialized');
    
    // Find all files
    const allFiles = await findAllProjectFiles();
    
    if (allFiles.length === 0) {
      console.log('❌ No files found to index');
      return;
    }
    
    console.log(`🔄 Adding ${allFiles.length} files to RAG...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process files in small batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allFiles.length/batchSize)} (${batch.length} files)`);
      
      for (const file of batch) {
        const success = await addFileToRAG(file, contextAPI);
        if (success) {
          successCount++;
          console.log(`  ✅ Added: ${file}`);
        } else {
          errorCount++;
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Progress update
      console.log(`📊 Progress: ${successCount} successful, ${errorCount} errors, ${allFiles.length - i - batchSize} remaining`);
    }
    
    console.log('✅ RAG UPDATE COMPLETE!');
    console.log(`📊 Final Results:`);
    console.log(`   • Files processed: ${allFiles.length}`);
    console.log(`   • Successfully added: ${successCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Success rate: ${((successCount/allFiles.length)*100).toFixed(1)}%`);
    
    // Test the RAG
    console.log('🧪 Testing RAG search functionality...');
    try {
      const results = await contextAPI.searchContext('meta-agent factory system', 3);
      if (results && results.length > 0) {
        console.log('✅ RAG search test successful');
        console.log(`   Found ${results.length} relevant results`);
        console.log(`   Sample result: ${results[0].content.substring(0, 100)}...`);
      } else {
        console.log('⚠️ RAG search returned no results');
      }
    } catch (error) {
      console.log('⚠️ RAG search test failed:', error.message);
    }
    
    return { total: allFiles.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    console.error('❌ Complete RAG update failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Run the complete update
updateRAGCompletely()
  .then(result => {
    console.log('\n🎉 RAG SYSTEM FULLY UPDATED!');
    console.log(`📈 Successfully indexed ${result.success}/${result.total} files`);
    
    if (result.success >= 500) {
      console.log('✅ SUCCESS CRITERIA MET: 500+ files indexed');
    } else {
      console.log(`⚠️ Below expected count: Got ${result.success}, expected 500-700+ files`);
    }
  })
  .catch(error => {
    console.error('\n💥 RAG update failed:', error.message);
    process.exit(1);
  });