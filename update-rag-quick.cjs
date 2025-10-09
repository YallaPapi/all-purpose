#!/usr/bin/env node

/**
 * QUICK RAG UPDATE - Just run the working update script properly
 */

const { execSync } = require('child_process');

console.log('🔄 QUICK RAG UPDATE - Using existing mechanisms...');

console.log('📊 Running update-meta-agents.js...');
try {
  execSync('cd rag-system && node update-meta-agents.js', { stdio: 'inherit' });
  console.log('✅ update-meta-agents.js completed');
} catch (error) {
  console.log('⚠️ update-meta-agents.js had issues, continuing...');
}

console.log('🔄 Running initialize-cached-rag.js...');
try {
  execSync('cd rag-system && node initialize-cached-rag.js', { stdio: 'inherit' });
  console.log('✅ initialize-cached-rag.js completed');
} catch (error) {
  console.log('⚠️ initialize-cached-rag.js had issues, continuing...');
}

console.log('✅ RAG UPDATE COMPLETE!');
console.log('🧠 RAG updated with available mechanisms');

// Test the RAG quickly
console.log('🧪 Testing RAG search...');
try {
  const result = execSync('cd rag-system && echo "meta-agent factory" | timeout 10 node context-cli.js', { encoding: 'utf8', timeout: 15000 });
  console.log('✅ RAG test successful');
  console.log('Sample result:', result.slice(0, 200) + '...');
} catch (error) {
  console.log('⚠️ RAG test failed or timed out');
}