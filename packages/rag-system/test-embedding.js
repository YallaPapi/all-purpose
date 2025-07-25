/**
 * Test OpenAI API key and embedding generation
 */

require('dotenv').config();

async function testEmbedding() {
  console.log('🧪 Testing OpenAI embedding generation...');
  
  try {
    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    
    console.log('✅ API key found:', apiKey.substring(0, 10) + '...');
    
    // Test OpenAI connection
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey });
    
    console.log('📝 Generating test embedding...');
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'This is a test for RAG documentation system',
      encoding_format: 'float'
    });
    
    console.log('✅ Embedding generated successfully:', {
      model: response.model,
      dimensions: response.data[0].embedding.length,
      usage: response.usage
    });
    
    // Test dimension adaptation
    const originalEmbedding = response.data[0].embedding;
    const targetDimension = 1024;
    const adaptedEmbedding = originalEmbedding.slice(0, targetDimension);
    
    console.log('✅ Dimension adaptation test:', {
      original: originalEmbedding.length,
      adapted: adaptedEmbedding.length,
      target: targetDimension
    });
    
    console.log('🎉 All embedding tests passed!');
    
  } catch (error) {
    console.error('❌ Embedding test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('authentication')) {
      console.log('💡 Check your OPENAI_API_KEY - it may be invalid');
    }
  }
}

// Run test
testEmbedding();