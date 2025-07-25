#!/usr/bin/env node

/**
 * Debug Redis Serialization Issue
 */

const { Redis } = require('@upstash/redis');
require('dotenv').config();

async function debugRedis() {
  console.log('🔍 Debugging Redis serialization...');
  
  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
    automaticDeserialization: false,
  });

  try {
    // Test 1: Basic ping
    console.log('Test 1: Basic ping');
    const ping = await redis.ping();
    console.log('Ping result:', ping);

    // Test 2: Simple string
    console.log('\nTest 2: Simple string');
    await redis.setex('test:string', 10, 'hello world');
    const retrievedString = await redis.get('test:string');
    console.log('String test result:', retrievedString);

    // Test 3: Manual JSON serialization
    console.log('\nTest 3: Manual JSON serialization');
    const testData = { test: true, number: 42, date: new Date().toISOString() };
    const jsonString = JSON.stringify(testData);
    console.log('JSON string being stored:', jsonString);
    
    await redis.setex('test:json', 10, jsonString);
    const retrievedJson = await redis.get('test:json');
    console.log('Retrieved JSON:', retrievedJson);
    
    if (retrievedJson) {
      const parsed = JSON.parse(retrievedJson);
      console.log('Parsed object:', parsed);
    }

    // Test 4: Check what happens when we pass an object directly
    console.log('\nTest 4: Object directly (should fail)');
    try {
      await redis.setex('test:object', 10, testData);
      console.log('❌ This should have failed but didn\'t');
    } catch (error) {
      console.log('✅ Expected error:', error.message);
    }

    // Cleanup
    await redis.del('test:string');
    await redis.del('test:json');
    await redis.del('test:object');

    console.log('\n✅ Debug complete');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

if (require.main === module) {
  debugRedis().catch(console.error);
}