/**
 * Quick test to verify Upstash Vector database connection
 */

const { Index } = require('@upstash/vector');
require('dotenv').config();

async function testVectorConnection() {
  console.log('🧪 Testing Upstash Vector connection...');
  
  try {
    // Create client
    const index = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN
    });

    // Test 1: Get index info
    console.log('📊 Getting index information...');
    const info = await index.info();
    console.log('✅ Index info:', {
      vectorCount: info.vectorCount,
      dimension: info.dimension,
      similarityFunction: info.similarityFunction
    });

    // Test 2: Insert a test vector (use actual DB dimension)
    console.log('📝 Inserting test vector...');
    const testVector = {
      id: 'test-connection-' + Date.now(),
      vector: Array(info.dimension).fill(0).map(() => Math.random() * 0.1), // Smaller values
      metadata: {
        test: true,
        content: 'This is a connection test',
        timestamp: new Date().toISOString()
      }
    };

    await index.upsert([testVector]);
    console.log('✅ Test vector inserted');

    // Wait a moment for indexing
    console.log('⏳ Waiting for indexing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Search for the vector
    console.log('🔍 Searching for test vector...');
    const searchResults = await index.query({
      vector: testVector.vector,
      topK: 5,
      includeMetadata: true
    });

    console.log('✅ Search results:', {
      found: searchResults.length,
      score: searchResults[0]?.score,
      metadata: searchResults[0]?.metadata
    });

    // Test 4: Clean up
    console.log('🧹 Cleaning up test vector...');
    await index.delete([testVector.id]);
    console.log('✅ Test vector deleted');

    console.log('🎉 All vector database tests passed!');
    
  } catch (error) {
    console.error('❌ Vector database test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('authentication')) {
      console.log('💡 Check your UPSTASH_VECTOR_REST_TOKEN');
    }
    
    if (error.message.includes('404') || error.message.includes('not found')) {
      console.log('💡 Check your UPSTASH_VECTOR_REST_URL');
    }
  }
}

// Run test
testVectorConnection();