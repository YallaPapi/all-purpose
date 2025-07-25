#!/usr/bin/env node

/**
 * Debug OpenAI Embedding API Issue
 * Test with simple content to isolate the problem
 */

require('dotenv').config({ path: '../../.env.local' });

const OpenAI = require('openai');

async function debugEmbeddingIssue() {
  console.log('🔍 Debugging OpenAI Embedding API issue...');
  
  // Check environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
  
  const client = new OpenAI({ apiKey });
  
  // Test 1: Simple text
  console.log('\n📝 Test 1: Simple text');
  try {
    const response1 = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: ['Hello world'],
      encoding_format: 'float'
    });
    console.log('✅ Simple text works:', response1.data[0].embedding.length, 'dimensions');
  } catch (error) {
    console.error('❌ Simple text failed:', error.message);
  }
  
  // Test 2: Empty array
  console.log('\n📝 Test 2: Empty array');
  try {
    const response2 = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: [],
      encoding_format: 'float'
    });
    console.log('✅ Empty array works');
  } catch (error) {
    console.error('❌ Empty array failed:', error.message);
  }
  
  // Test 3: Array with empty string
  console.log('\n📝 Test 3: Array with empty string');
  try {
    const response3 = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: [''],
      encoding_format: 'float'
    });
    console.log('✅ Empty string works');
  } catch (error) {
    console.error('❌ Empty string failed:', error.message);
  }
  
  // Test 4: Array with null/undefined
  console.log('\n📝 Test 4: Array with null');
  try {
    const response4 = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: [null],
      encoding_format: 'float'
    });
    console.log('✅ Null works');
  } catch (error) {
    console.error('❌ Null failed:', error.message);
  }
  
  // Test 5: Non-array input
  console.log('\n📝 Test 5: String instead of array');
  try {
    const response5 = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'Hello world',
      encoding_format: 'float'
    });
    console.log('✅ String input works');
  } catch (error) {
    console.error('❌ String input failed:', error.message);
  }
}

debugEmbeddingIssue().catch(console.error);