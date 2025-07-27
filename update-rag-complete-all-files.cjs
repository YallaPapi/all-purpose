#!/usr/bin/env node

/**
 * COMPLETE RAG UPDATE - Index ALL project files including hidden directories
 * Fixes metadata size issue with chunking for large files
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { globSync } = require('glob');

console.log('🔄 COMPLETE RAG UPDATE - Indexing ALL project files (including hidden dirs)...');
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

// Text chunking function for large content
function chunkText(text, maxChunkSize = 4000) {
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  const chunks = [];
  let currentChunk = '';
  const lines = text.split('\n');
  
  for (const line of lines) {
    // If adding this line would exceed chunk size, save current chunk and start new one
    if (currentChunk.length + line.length + 1 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk += (currentChunk.length > 0 ? '\n' : '') + line;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

async function findAllProjectFiles() {
  console.log('📁 Scanning for ALL project files (including hidden directories)...');
  
  const patterns = [
    // Root documentation files
    '*.md',
    '*.txt',
    '*.json',
    '*.js',
    '*.cjs',
    '*.mjs',
    '*.ts',
    
    // Main documentation directories
    'docs/**/*.md',
    'docs/**/*.txt',
    'docs/**/*.json',
    
    // Source code
    'src/**/*.js',
    'src/**/*.ts',
    'src/**/*.tsx',
    'src/**/*.jsx',
    
    // Generated projects
    'generated/**/*.md',
    'generated/**/*.js',
    'generated/**/*.ts',
    'generated/**/*.json',
    
    // Apps directory
    'apps/**/*.md',
    'apps/**/*.js',
    'apps/**/*.ts',
    'apps/**/*.tsx',
    'apps/**/*.json',
    
    // Hidden directories (development tools)
    '.claude/**/*.md',
    '.claude/**/*.json',
    '.clinerules/**/*.md',
    '.github/**/*.md',
    '.kiro/**/*.md', 
    '.roo/**/*.md',
    '.trae/**/*.md',
    '.windsurf/**/*.md',
    
    // TaskMaster files
    '.taskmaster/**/*.json',
    '.taskmaster/**/*.md',
    '.taskmaster/**/*.txt',
    
    // Temporary and test files
    '.temp/**/*.md',
    '.test-output/**/*.md',
    '.test-output/**/*.js',
    
    // RAG system files
    'rag-system/**/*.js',
    'rag-system/**/*.ts',
    'rag-system/**/*.md',
    
    // Configuration files
    'package.json',
    'tsconfig.json',
    '.env.example',
    
    // Scripts and other project files
    'test-*.js',
    'build-*.js',
    '*-agent-input.json',
    'integration-spec.json'
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
          '**/*.d.ts',
          '.next/**',
          'coverage/**'
        ],
        dot: true // Enable matching hidden files and directories
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

async function addFileToRAGWithChunking(filePath, contextAPI) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip binary content
    if (/[\x00-\x08\x0E-\x1F\x7F]/.test(content.substring(0, 1000))) {
      console.log(`  📄 Skipping binary file: ${filePath}`);
      return false;
    }
    
    // For large files, chunk them to avoid metadata size issues
    const chunks = chunkText(content, 4000);
    let successCount = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkTitle = chunks.length > 1 
        ? `File: ${filePath} (Part ${i + 1}/${chunks.length})`
        : `File: ${filePath}`;
      
      try {
        await contextAPI.addContext(chunkTitle, chunk);
        successCount++;
      } catch (error) {
        console.log(`  ❌ Failed to add chunk ${i + 1}/${chunks.length} of ${filePath}:`, error.message);
      }
    }
    
    return successCount === chunks.length;
  } catch (error) {
    console.log(`  ❌ Failed to read ${filePath}:`, error.message);
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
    
    // Find all files including hidden directories
    const allFiles = await findAllProjectFiles();
    
    if (allFiles.length === 0) {
      console.log('❌ No files found to index');
      return;
    }
    
    console.log(`🔄 Adding ${allFiles.length} files to RAG with chunking support...`);
    
    let successCount = 0;
    let errorCount = 0;
    let totalChunks = 0;
    
    // Process files in small batches to avoid overwhelming the system
    const batchSize = 5; // Smaller batches due to chunking
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allFiles.length/batchSize)} (${batch.length} files)`);
      
      for (const file of batch) {
        const success = await addFileToRAGWithChunking(file, contextAPI);
        if (success) {
          successCount++;
          console.log(`  ✅ Added: ${file}`);
        } else {
          errorCount++;
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Progress update
      const remaining = Math.max(0, allFiles.length - i - batchSize);
      console.log(`📊 Progress: ${successCount} successful, ${errorCount} errors, ${remaining} remaining`);
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
    } else if (result.success >= result.total * 0.95) {
      console.log('✅ NEAR-COMPLETE SUCCESS: 95%+ files indexed');
    } else {
      console.log(`⚠️ Below target: Got ${result.success}, expected 500-700+ files`);
    }
    
    if (result.errors === 0) {
      console.log('🎯 PERFECT: No files failed to index!');
    } else {
      console.log(`📝 Note: ${result.errors} files had issues but chunking should have resolved metadata size problems`);
    }
  })
  .catch(error => {
    console.error('\n💥 RAG update failed:', error.message);
    process.exit(1);
  });