/**
 * Single file RAG test
 * Use context7: Test with just one small file to identify memory issues
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');

async function testSingleFile() {
  console.log('🧪 Testing single file processing...');
  
  try {
    // Test just the embedding and vector operations
    console.log('🔮 Testing embedding generation...');
    
    const { createEmbeddingAdapter } = require('./dist/embeddings/embeddingAdapter');
    const embedder = createEmbeddingAdapter();
    
    // Test with small text
    const testText = 'This is a test of the all-purpose pattern methodology for building unlimited scalable systems.';
    console.log('📝 Processing text:', testText.substring(0, 50) + '...');
    
    const embeddingResult = await embedder.generateEmbedding(testText);
    console.log('✅ Embedding generated:', {
      dimensions: embeddingResult.embedding.length,
      tokens: embeddingResult.tokens
    });
    
    // Test vector storage
    console.log('💾 Testing vector storage...');
    const { createUpstashVectorClient } = require('./dist/vectordb/upstashVectorClient');
    const vectorClient = createUpstashVectorClient();
    
    const testVector = {
      id: `test-single-${Date.now()}`,
      vector: embeddingResult.embedding,
      metadata: {
        content: testText,
        test: true
      }
    };
    
    const storeSuccess = await vectorClient.upsertVectors([testVector]);
    console.log('✅ Vector stored:', storeSuccess);
    
    // Test search
    console.log('🔍 Testing search...');
    const searchResults = await vectorClient.searchVectors(embeddingResult.embedding, {
      topK: 1,
      includeMetadata: true
    });
    
    console.log('✅ Search completed:', {
      found: searchResults.length,
      score: searchResults[0]?.score
    });
    
    // Clean up
    await vectorClient.deleteVectors([testVector.id]);
    console.log('🧹 Cleaned up test vector');
    
    console.log('🎉 Single file test completed successfully!');
    
  } catch (error) {
    console.error('❌ Single file test failed:', error.message);
  }
}

// Run test with memory monitoring
console.log('Memory usage at start:', process.memoryUsage());
testSingleFile().then(() => {
  console.log('Memory usage at end:', process.memoryUsage());
});