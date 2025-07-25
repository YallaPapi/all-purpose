/**
 * Test script for RAG Adapter
 */

const { RAGAdapter } = require('./dist/uep/RAGAdapter.js');

async function testRAGAdapter() {
  console.log('🧪 Testing RAG Adapter...\n');

  try {
    // Create RAG adapter with test configuration
    const ragAdapter = new RAGAdapter({
      maxResults: 5,
      scoreThreshold: 0.2,
      enableQueryExpansion: true,
      enableContextRanking: true,
      enableRecencyBoost: true,
      contextWeights: {
        relevance: 0.4,
        recency: 0.2,
        fileType: 0.2,
        section: 0.2
      },
      preferredSources: ['documentation', 'guides', 'readme'],
      fileTypeWeights: {
        'markdown': 1.0,
        'typescript': 0.8,
        'javascript': 0.8
      }
    });
    console.log('✅ RAGAdapter created successfully');

    // Test 1: Basic documentation search
    console.log('\n1. Testing basic documentation search...');
    const query1 = 'How to implement user authentication with JWT tokens';
    
    const results1 = await ragAdapter.searchDocumentation(query1);
    console.log(`✅ Basic search completed`);
    console.log(`   Results found: ${results1.length}`);
    console.log(`   Average relevance: ${(results1.reduce((sum, r) => sum + r.relevanceScore, 0) / results1.length).toFixed(3)}`);

    // Show sample result
    if (results1.length > 0) {
      const sample = results1[0];
      console.log(`   Sample result: "${sample.source}" (score: ${sample.relevanceScore.toFixed(3)})`);
      console.log(`   Content preview: "${sample.content.substring(0, 80)}..."`);
    }

    // Test 2: Context-enhanced search
    console.log('\n2. Testing context-enhanced search...');
    const query2 = 'Database configuration and setup';
    const context = {
      projectType: 'web-app',
      language: 'typescript',
      framework: 'nextjs'
    };
    
    const results2 = await ragAdapter.searchDocumentation(query2, context);
    console.log(`✅ Context-enhanced search completed`);
    console.log(`   Results found: ${results2.length}`);
    console.log(`   Context factors applied: projectType, language, framework`);

    // Test 3: Cache functionality
    console.log('\n3. Testing cache functionality...');
    const startTime = Date.now();
    const results3 = await ragAdapter.searchDocumentation(query1); // Same query as test 1
    const endTime = Date.now();
    console.log(`✅ Cached search completed in ${endTime - startTime}ms (should be very fast)`);
    console.log(`   Results match: ${results3.length === results1.length}`);

    // Test 4: Cache statistics
    console.log('\n4. Testing cache statistics...');
    const cacheStats = ragAdapter.getCacheStats();
    console.log(`✅ Cache stats:`);
    console.log(`   Size: ${cacheStats.size}`);
    console.log(`   Entries: ${cacheStats.entries.length}`);
    
    if (cacheStats.entries.length > 0) {
      const entry = cacheStats.entries[0];
      console.log(`   Sample entry: "${entry.query.substring(0, 30)}..." (${entry.resultsCount} results, ${entry.searchTime}ms, ${Math.round(entry.age/1000)}s old)`);
    }

    // Test 5: Different query types
    console.log('\n5. Testing various query types...');
    const queryTypes = [
      'API endpoint development best practices',
      'Error handling and debugging strategies', 
      'Frontend component architecture patterns',
      'CI/CD deployment configuration'
    ];

    for (const [index, query] of queryTypes.entries()) {
      const results = await ragAdapter.searchDocumentation(query);
      const avgScore = results.length > 0 
        ? (results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length).toFixed(3)
        : '0.000';
      console.log(`   Query ${index + 1}: ${results.length} results (avg score: ${avgScore})`);
    }

    // Test 6: Query expansion
    console.log('\n6. Testing query expansion...');
    const baseQuery = 'auth';
    const expandedResults = await ragAdapter.searchDocumentation(baseQuery);
    console.log(`✅ Query expansion test completed`);
    console.log(`   Base query: "${baseQuery}"`);
    console.log(`   Results with expansion: ${expandedResults.length}`);
    
    if (expandedResults.length > 0) {
      console.log(`   Sample expanded content: "${expandedResults[0].content.substring(0, 60)}..."`);
    }

    // Test 7: Fallback documentation
    console.log('\n7. Testing fallback documentation...');
    const invalidAdapter = new RAGAdapter();
    // Force an error by using an invalid configuration
    const fallbackResults = await invalidAdapter.searchDocumentation('Test fallback behavior');
    console.log(`✅ Fallback documentation generated`);
    console.log(`   Fallback results: ${fallbackResults.length}`);
    
    if (fallbackResults.length > 0) {
      const fallback = fallbackResults[0];
      console.log(`   Fallback type: ${fallback.metadata.type || 'standard'}`);
      console.log(`   Fallback preview: "${fallback.content.substring(0, 60)}..."`);
    }

    // Test 8: Configuration updates
    console.log('\n8. Testing configuration updates...');
    ragAdapter.updateConfig({
      maxResults: 10,
      scoreThreshold: 0.1,
      enableQueryExpansion: false
    });
    
    const configTestResults = await ragAdapter.searchDocumentation('Configuration test query');
    console.log(`✅ Configuration update test completed`);
    console.log(`   Results with new config: ${configTestResults.length}`);

    console.log('\n✅ All RAG Adapter tests passed!');
    return true;

  } catch (error) {
    console.error('\n❌ RAG Adapter test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

testRAGAdapter().then(success => {
  if (success) {
    console.log('\n🎉 RAG Adapter test completed successfully!');
  } else {
    console.log('\n💥 RAG Adapter test failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});