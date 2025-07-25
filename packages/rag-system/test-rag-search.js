#!/usr/bin/env node

/**
 * RAG System Search Test
 * Tests the fixed search functionality with real queries
 */

require('dotenv').config({ path: '../../.env.local' });
const { ContextAPI } = require('./dist/api/contextAPI');

async function testRAGSearch() {
  console.log('🔍 Testing RAG System Search...');
  
  const contextAPI = new ContextAPI({ 
    maxContextLength: 4000,
    autoEnhancement: true 
  });
  
  const testQueries = [
    'What meta-agents are available?',
    'How do I write JSDoc comments?', 
    'What is the All-Purpose Pattern?',
    'How does the Vercel Native Architecture Agent work?',
    'What are the commenting guidelines?'
  ];
  
  let successCount = 0;
  
  for (const query of testQueries) {
    try {
      console.log(`\n📝 Query: "${query}"`);
      const results = await contextAPI.searchContext({ 
        prompt: query, 
        maxResults: 2,
        scoreThreshold: 0.5 
      });
      
      console.log(`✅ Found ${results.length} results`);
      if (results.length > 0) {
        console.log(`   📄 Top result: ${results[0].metadata.fileName}`);
        console.log(`   📊 Relevance: ${results[0].relevanceScore.toFixed(3)}`);
        console.log(`   📖 Snippet: ${results[0].snippet.substring(0, 100)}...`);
        successCount++;
      } else {
        console.log('   ⚠️  No relevant results found');
      }
    } catch (error) {
      console.error(`❌ Search failed: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Test Summary:`);
  console.log(`   ✅ Successful searches: ${successCount}/${testQueries.length}`);
  console.log(`   📈 Success rate: ${((successCount/testQueries.length)*100).toFixed(1)}%`);
  
  if (successCount === testQueries.length) {
    console.log(`🎉 RAG System is fully functional!`);
  } else if (successCount > 0) {
    console.log(`⚠️  RAG System is partially working`);
  } else {
    console.log(`❌ RAG System has issues`);
  }
}

testRAGSearch().catch(console.error);