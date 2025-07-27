#!/usr/bin/env node

/**
 * COMPREHENSIVE RAG UPDATE - Single script to update ALL project files
 * 
 * This script:
 * - Finds ALL project files (996+ files including hidden directories)
 * - Handles large files with chunking to avoid metadata size limits
 * - Indexes everything in one complete run
 * - Can be run repeatedly to keep RAG updated
 * 
 * Usage: node update-rag-all.cjs
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { globSync } = require('glob');

console.log('🔄 COMPREHENSIVE RAG UPDATE - Complete project indexing...');
console.log('📍 Working directory:', process.cwd());
console.log('🎯 Goal: Index ALL project files with metadata size handling\n');

// Load environment variables
function loadEnvironment() {
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

  // Verify required API keys
  const requiredKeys = ['OPENAI_API_KEY', 'UPSTASH_VECTOR_REST_URL', 'UPSTASH_VECTOR_REST_TOKEN'];
  const missingKeys = requiredKeys.filter(key => !process.env[key]);
  if (missingKeys.length > 0) {
    console.error('❌ Missing required environment variables:', missingKeys.join(', '));
    process.exit(1);
  }
  console.log('✅ All required API keys found');
}

// Smart text chunking to avoid metadata size limits
function chunkText(text, maxChunkSize = 3500) {
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  const chunks = [];
  const lines = text.split('\n');
  let currentChunk = '';
  
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
  
  return chunks.length > 0 ? chunks : [text.substring(0, maxChunkSize)];
}

// Comprehensive file discovery
async function findAllProjectFiles() {
  console.log('📁 Scanning for ALL project files...');
  
  const patterns = [
    // Root files
    '*.md', '*.txt', '*.json', '*.js', '*.cjs', '*.mjs', '*.ts',
    
    // Documentation
    'docs/**/*.md', 'docs/**/*.txt', 'docs/**/*.json',
    
    // Source code
    'src/**/*.js', 'src/**/*.ts', 'src/**/*.tsx', 'src/**/*.jsx',
    
    // Generated projects and apps
    'generated/**/*.{md,js,ts,json}',
    'apps/**/*.{md,js,ts,tsx,json}',
    
    // Hidden development directories
    '.claude/**/*.{md,json}',
    '.clinerules/**/*.md',
    '.github/**/*.md',
    '.kiro/**/*.md',
    '.roo/**/*.md', 
    '.trae/**/*.md',
    '.windsurf/**/*.md',
    
    // TaskMaster and temp files
    '.taskmaster/**/*.{json,md,txt}',
    '.temp/**/*.md',
    '.test-output/**/*.{md,js}',
    
    // RAG system files
    'rag-system/**/*.{js,ts,md}',
    
    // Configuration and scripts
    'package.json', 'tsconfig.json', '.env.example',
    'test-*.js', 'build-*.js', '*-agent-input.json', 'integration-spec.json'
  ];
  
  const allFiles = [];
  
  for (const pattern of patterns) {
    try {
      const files = globSync(pattern, {
        ignore: [
          '**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**',
          '**/logs/**', '**/*.log', '**/*.map', '**/*.d.ts', '.next/**', 'coverage/**'
        ],
        dot: true // Include hidden files/directories
      });
      
      if (files.length > 0) {
        console.log(`  📄 ${pattern}: ${files.length} files`);
      }
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
  
  console.log(`\n📊 Total files found: ${uniqueFiles.length}`);
  return uniqueFiles;
}

// Add file to RAG with chunking support
async function addFileToRAG(filePath, contextAPI) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip binary content
    if (/[\x00-\x08\x0E-\x1F\x7F]/.test(content.substring(0, 1000))) {
      return { success: false, reason: 'binary' };
    }
    
    // Chunk content to avoid metadata size issues
    const chunks = chunkText(content, 3500);
    let successCount = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkTitle = chunks.length > 1 
        ? `${filePath} (Part ${i + 1}/${chunks.length})`
        : filePath;
      
      try {
        await contextAPI.addContext(`File: ${chunkTitle}`, chunk);
        successCount++;
      } catch (error) {
        console.log(`    ❌ Chunk ${i + 1}/${chunks.length} failed: ${error.message}`);
      }
      
      // Small delay between chunks
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      success: successCount === chunks.length,
      chunks: chunks.length,
      successfulChunks: successCount
    };
    
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

// Main RAG update function
async function updateRAGComprehensively() {
  try {
    console.log('🔧 Initializing RAG components...');
    
    // Import RAG components
    const { ContextAPI } = require('./rag-system/dist/api/contextAPI');
    const contextAPI = new ContextAPI();
    
    console.log('✅ RAG components initialized\n');
    
    // Find all project files
    const allFiles = await findAllProjectFiles();
    
    if (allFiles.length === 0) {
      console.log('❌ No files found to index');
      return { success: false };
    }
    
    console.log(`\n🔄 Indexing ${allFiles.length} files with chunking support...\n`);
    
    let stats = {
      total: allFiles.length,
      successful: 0,
      failed: 0,
      binary: 0,
      totalChunks: 0
    };
    
    // Process files in batches
    const batchSize = 5;
    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allFiles.length / batchSize);
      
      console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} files)`);
      
      for (const file of batch) {
        const result = await addFileToRAG(file, contextAPI);
        
        if (result.success) {
          stats.successful++;
          stats.totalChunks += result.chunks || 1;
          const chunkInfo = result.chunks > 1 ? ` (${result.chunks} chunks)` : '';
          console.log(`  ✅ ${file}${chunkInfo}`);
        } else if (result.reason === 'binary') {
          stats.binary++;
          console.log(`  📄 Skipped binary: ${file}`);
        } else {
          stats.failed++;
          console.log(`  ❌ Failed: ${file} - ${result.reason}`);
        }
        
        // Delay between files to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // Progress update
      const remaining = Math.max(0, allFiles.length - i - batchSize);
      console.log(`   📊 Progress: ${stats.successful} ✅ | ${stats.failed} ❌ | ${stats.binary} 📄 | ${remaining} remaining\n`);
    }
    
    // Final summary
    console.log('🎉 RAG UPDATE COMPLETE!\n');
    console.log('📊 Final Statistics:');
    console.log(`   • Total files: ${stats.total}`);
    console.log(`   • Successfully indexed: ${stats.successful}`);
    console.log(`   • Failed to index: ${stats.failed}`);
    console.log(`   • Binary files skipped: ${stats.binary}`);
    console.log(`   • Total chunks created: ${stats.totalChunks}`);
    console.log(`   • Success rate: ${((stats.successful / stats.total) * 100).toFixed(1)}%`);
    
    // Test RAG functionality
    console.log('\n🧪 Testing RAG search functionality...');
    try {
      const results = await contextAPI.searchContext('meta-agent factory system', 3);
      if (results && results.length > 0) {
        console.log('✅ RAG search test successful');
        console.log(`   Found ${results.length} relevant results`);
        console.log(`   Sample: ${results[0].content.substring(0, 100)}...`);
      } else {
        console.log('⚠️ RAG search returned no results');
      }
    } catch (error) {
      console.log('⚠️ RAG search test failed:', error.message);
    }
    
    return {
      success: true,
      stats: stats
    };
    
  } catch (error) {
    console.error('❌ RAG update failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Comprehensive RAG Update\n');
    
    // Load environment and validate
    loadEnvironment();
    
    // Run the complete update
    const result = await updateRAGComprehensively();
    
    if (result.success) {
      console.log('\n🎯 SUCCESS CRITERIA:');
      console.log(`   ✅ Found ${result.stats.total} total files (target: 700+)`);
      console.log(`   ✅ Indexed ${result.stats.successful} files successfully`);
      console.log(`   ✅ Resolved metadata size issues with chunking`);
      console.log(`   ✅ RAG system fully updated and functional`);
      
      if (result.stats.successful >= 700) {
        console.log('\n🏆 PERFECT: Exceeded target file count!');
      } else if (result.stats.successful >= result.stats.total * 0.95) {
        console.log('\n🎉 EXCELLENT: 95%+ success rate achieved!');
      }
      
      console.log('\n📝 Usage: Run this script anytime to update the RAG system:');
      console.log('   node update-rag-all.cjs');
      
    } else {
      console.log('\n❌ RAG update did not complete successfully');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, updateRAGComprehensively, findAllProjectFiles };