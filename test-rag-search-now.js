const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/"/g, '');
    }
  });
}

const { ContextAPI } = require('./packages/rag-system/dist/api/contextAPI.js');

async function testRAGSearch() {
  const contextAPI = new ContextAPI();
  
  console.log('🔍 Testing RAG Search with Current Index...');
  
  // Get current vector count
  try {
    const vectorInfo = await contextAPI.vectorDb.info();
    console.log(`📊 Current vectors in database: ${vectorInfo.totalVectorCount}`);
  } catch (error) {
    console.log('📊 Unable to fetch vector count');
  }
  
  const testQueries = [
    'meta-agent factory implementation',
    'All-Purpose Pattern methodology', 
    'TaskMaster integration',
    'Upstash Vector database',
    'RAG system embedding',
    'observability dashboard',
    'TypeScript interface',
    'React component',
    'commenting guidelines',
    'path references'
  ];
  
  console.log('\n🧪 Testing search queries...\n');
  
  for (const query of testQueries) {
    try {
      const results = await contextAPI.searchContext({
        prompt: query,
        maxResults: 3
      });
      console.log(`🔎 "${query}"`);
      console.log(`   Found ${results.length} results`);
      
      if (results.length > 0) {
        results.forEach((result, i) => {
          const metadata = result.metadata;
          const score = result.relevanceScore.toFixed(3);
          const preview = result.content.substring(0, 100).replace(/\n/g, ' ') + '...';
          console.log(`   ${i+1}. ${metadata.fileName} (${score}) - ${preview}`);
        });
      } else {
        console.log('   ❌ No results found');
      }
      console.log('');
      
    } catch (error) {
      console.error(`❌ Search failed for "${query}":`, error.message);
    }
  }
  
  // Test context enhancement
  try {
    console.log('🚀 Testing context enhancement...');
    const enhanced = await contextAPI.enhancePrompt({
      prompt: "How do I use the Meta-Agent Factory system?",
      maxResults: 2
    });
    
    console.log('Enhanced prompt preview:');
    console.log(enhanced.enhancedPrompt.substring(0, 300) + '...');
    console.log('');
    
  } catch (error) {
    console.error('❌ Context enhancement failed:', error.message);
  }
  
  console.log('✅ RAG Search Testing Complete!');
}

testRAGSearch().catch(console.error);