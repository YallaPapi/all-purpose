/**
 * Update RAG system with Meta-Agent Factory documentation
 */

const fs = require('fs-extra');
const path = require('path');

// Load environment variables manually
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

// Debug environment variables
console.log('Environment check:');
console.log('UPSTASH_VECTOR_REST_URL:', process.env.UPSTASH_VECTOR_REST_URL ? 'Set' : 'Not set');
console.log('UPSTASH_VECTOR_REST_TOKEN:', process.env.UPSTASH_VECTOR_REST_TOKEN ? 'Set' : 'Not set');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');

const { ContextAPI } = require('./dist/api/contextAPI');

async function updateMetaAgentDocumentation() {
  console.log('🤖 Updating RAG system with Meta-Agent Factory documentation...');
  
  // Initialize Context API
  const contextAPI = new ContextAPI({
    maxContextLength: 4000,
    autoEnhancement: true
  });

  // Key meta-agent documentation files to embed
  const metaAgentDocs = [
    {
      path: '../../docs/guides/COMPREHENSIVE_PROJECT_STATUS.md',
      name: 'Project Status - Complete Meta-Agent Factory'
    },
    {
      path: '../meta-agents/vercel-native-architecture/README.md',
      name: 'Vercel-Native Architecture Agent - The PRODUCTION BUILDER'
    },
    {
      path: '../meta-agents/template-engine-factory/README.md',
      name: 'Template Engine Factory Agent - The CODE BUILDER'
    },
    {
      path: '../meta-agents/parameter-flow/README.md',
      name: 'Parameter Flow Agent - The INTEGRATION BUILDER'
    },
    {
      path: '../meta-agents/thirty-minute-rule/README.md',
      name: '30-Minute Rule Agent - The EFFICIENCY BUILDER'
    }
  ];

  let processed = 0;
  const errors = [];

  for (const doc of metaAgentDocs) {
    try {
      const fullPath = path.resolve(__dirname, doc.path);
      console.log(`📖 Processing: ${doc.name}`);
      
      if (await fs.pathExists(fullPath)) {
        const content = await fs.readFile(fullPath, 'utf-8');
        
        // Add to RAG system
        const result = await contextAPI.addContext(content, {
          fileName: doc.name,
          contentType: 'markdown'
        });
        
        console.log(`   ✅ Added: ${result.id} (${content.length} chars)`);
        processed++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } else {
        console.log(`   ⚠️  File not found: ${fullPath}`);
        errors.push(`File not found: ${doc.path}`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${doc.name}:`, error.message);
      errors.push(`${doc.name}: ${error.message}`);
    }
  }

  // Test the updated knowledge base
  console.log('\n🧪 Testing updated knowledge base...');
  
  const testQueries = [
    'What meta-agents are available in the factory?',
    'How do I use the Vercel-Native Architecture Agent?',
    'What is the Template Engine Factory Agent?',
    'How does meta-agent coordination work?'
  ];

  for (const query of testQueries) {
    try {
      const results = await contextAPI.searchContext(query, 2);
      console.log(`   🔍 "${query}" → ${results.length} results`);
      if (results.length > 0) {
        console.log(`      Best match: ${results[0].fileName} (${results[0].similarity.toFixed(3)})`);
      }
    } catch (error) {
      console.error(`   ❌ Search error for "${query}":`, error.message);
    }
  }

  console.log('\n📊 Update Summary:');
  console.log(`   ✅ Successfully processed: ${processed}/${metaAgentDocs.length} documents`);
  if (errors.length > 0) {
    console.log(`   ❌ Errors: ${errors.length}`);
    errors.forEach(error => console.log(`      - ${error}`));
  }
  
  console.log('\n🎉 Meta-Agent Factory documentation update complete!');
}

// Run the update
updateMetaAgentDocumentation().catch(console.error);