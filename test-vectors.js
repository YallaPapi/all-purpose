const { ContextAPI } = require('./packages/rag-system/src/api/contextAPI.ts');
const contextAPI = new ContextAPI();

async function checkVectorStats() {
  try {
    const result = await contextAPI.vectorDb.info();
    console.log('Vector Database Stats:');
    console.log('Total vectors:', result.totalVectorCount);
    console.log('Dimension:', result.dimension);
    console.log('Similarity function:', result.similarityFunction);
    
    // Test search to see what kind of content we have
    const searchResults = await contextAPI.searchContext('meta-agent', { maxResults: 3 });
    console.log('\nSample indexed content (searching for "meta-agent"):');
    searchResults.forEach((result, i) => {
      console.log(`${i+1}. Score: ${result.score.toFixed(3)} - ${result.metadata.fileName || 'Unknown'}`);
      console.log(`   Content: ${result.content.substring(0, 100)}...`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkVectorStats();