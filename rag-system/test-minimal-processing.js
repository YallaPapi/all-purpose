/**
 * Minimal RAG processing test
 * Use context7: Process only key documentation files to avoid memory issues
 */

require('dotenv').config();
const path = require('path');

async function testMinimalProcessing() {
  console.log('🧪 Testing minimal RAG processing...');
  
  try {
    // Import modules after env vars are loaded
    const { createDocumentProcessor } = require('./dist/processing/documentProcessor');
    const { createEmbeddingAdapter } = require('./dist/embeddings/embeddingAdapter');
    const { createUpstashVectorClient } = require('./dist/vectordb/upstashVectorClient');
    
    console.log('✅ Modules imported successfully');
    
    // Create minimal processor for just key docs
    const processor = createDocumentProcessor({
      sourceDir: path.join(__dirname, '..'),
      filePatterns: [
        'docs-consolidated/README.md',
        'docs-consolidated/SYSTEM_OVERVIEW.md',
        'docs-consolidated/meta_agent_factory.md'
      ],
      chunkSize: 500,
      chunkOverlap: 50
    });
    
    console.log('📄 Processing key documentation files...');
    const result = await processor.processDocuments();
    
    console.log('✅ Document processing completed:', {
      processedFiles: result.processedFiles,
      totalChunks: result.chunks.length,
      errors: result.errors.length
    });
    
    if (result.chunks.length === 0) {
      console.log('⚠️ No chunks generated - check file patterns');
      return;
    }
    
    // Test embedding generation
    console.log('🔮 Generating embeddings for first 3 chunks...');
    const embedder = createEmbeddingAdapter();
    const testChunks = result.chunks.slice(0, 3);
    const texts = testChunks.map(chunk => chunk.content);
    
    const embeddingResult = await embedder.generateEmbeddings(texts);
    console.log('✅ Embeddings generated:', {
      chunks: embeddingResult.results.length,
      totalTokens: embeddingResult.totalTokens,
      estimatedCost: embeddingResult.totalCost
    });
    
    // Test vector storage
    console.log('💾 Storing embeddings in vector database...');
    const vectorClient = createUpstashVectorClient();
    
    const vectorPoints = embeddingResult.results.map((result, index) => ({
      id: `test-${Date.now()}-${index}`,
      vector: result.embedding,
      metadata: {
        content: result.text,
        fileName: testChunks[index].metadata.fileName,
        filePath: testChunks[index].metadata.filePath
      }
    }));
    
    const storeSuccess = await vectorClient.upsertVectors(vectorPoints);
    console.log('✅ Vector storage result:', storeSuccess);
    
    // Test search
    console.log('🔍 Testing semantic search...');
    const queryEmbedding = await embedder.generateEmbedding('all-purpose pattern methodology');
    const searchResults = await vectorClient.searchVectors(queryEmbedding.embedding, {
      topK: 2,
      includeMetadata: true
    });
    
    console.log('✅ Search results:', {
      found: searchResults.length,
      results: searchResults.map(r => ({
        id: r.id,
        score: r.score,
        fileName: r.metadata?.fileName
      }))
    });
    
    // Clean up test vectors
    console.log('🧹 Cleaning up test vectors...');
    const vectorIds = vectorPoints.map(vp => vp.id);
    await vectorClient.deleteVectors(vectorIds);
    
    console.log('🎉 Minimal RAG processing test completed successfully!');
    
  } catch (error) {
    console.error('❌ Minimal processing test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run test
testMinimalProcessing();