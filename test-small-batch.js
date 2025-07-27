const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Set required Upstash variables
process.env.UPSTASH_VECTOR_REST_URL = 'https://rapid-fox-24961-us1-vector.upstash.io';
process.env.UPSTASH_VECTOR_REST_TOKEN = 'ABMFMHJhcGlkLWZveC0yNDk2MS11czFhZG1pbk5tSmxNakJqTnpFdE9EWmxNUzAwTm1JNExUbGlNMkV0TXpFeU5qQXhNREF5WTJGbA==';

const { ContextAPI } = require('./packages/rag-system/dist/api/contextAPI.js');

async function testSmallBatch() {
  const contextAPI = new ContextAPI();
  
  console.log('🧪 Testing small batch - 3 files only');
  
  // Get current vector count
  try {
    const vectorInfo = await contextAPI.vectorDb.info();
    console.log(`📊 Current vectors: ${vectorInfo.totalVectorCount}`);
  } catch (error) {
    console.log('📊 Current vectors: Unable to fetch');
  }
  
  // Test with just 3 small files
  const testFiles = [
    'README.md',
    'package.json',
    'docs/README.md'
  ];
  
  console.log(`📁 Testing with ${testFiles.length} files`);
  
  let processed = 0;
  let errors = 0;
  
  for (const relativeFile of testFiles) {
    const filePath = path.join(__dirname, relativeFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping missing file: ${relativeFile}`);
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.trim().length < 10) {
        console.log(`⏭️  Skipping empty file: ${relativeFile}`);
        continue;
      }
      
      console.log(`📝 Processing: ${relativeFile} (${content.length} chars)`);
      
      await contextAPI.addContext(content, {
        fileName: relativeFile,
        contentType: path.extname(filePath).substring(1) || 'text',
        filePath: relativeFile,
        testBatch: true
      });
      
      processed++;
      console.log(`✅ Successfully processed: ${relativeFile}`);
      
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${relativeFile}:`, error.message);
    }
  }
  
  console.log(`\n🎯 Small batch test complete!`);
  console.log(`   ✅ Processed: ${processed} files`);
  console.log(`   ❌ Errors: ${errors} files`);
  
  if (processed > 0) {
    console.log('🔍 Testing search...');
    try {
      const results = await contextAPI.searchContext('README', { maxResults: 2 });
      console.log(`📊 Search test: Found ${results.length} results for "README"`);
      results.forEach((result, i) => {
        console.log(`   ${i+1}. ${result.metadata.fileName} - Score: ${result.score.toFixed(3)}`);
      });
    } catch (error) {
      console.error('❌ Search test failed:', error.message);
    }
  }
}

testSmallBatch().catch(console.error);