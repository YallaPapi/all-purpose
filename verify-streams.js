#!/usr/bin/env node

/**
 * Verify JetStream streams exist
 */

import { connect } from 'nats';

async function verifyStreams() {
  console.log('🔍 Verifying JetStream Streams');
  
  try {
    const nc = await connect({
      servers: ['nats://localhost:4222'],
      user: 'factory',
      pass: 'factory-secret'
    });
    
    const jsm = await nc.jetstreamManager();
    
    const expectedStreams = [
      'META_AGENT_EVENTS',
      'DOMAIN_AGENT_EVENTS', 
      'FACTORY_COORDINATION',
      'SYSTEM_METRICS'
    ];
    
    console.log('📋 Checking for expected streams:');
    
    for (const streamName of expectedStreams) {
      try {
        const streamInfo = await jsm.streams.info(streamName);
        console.log(`✅ ${streamName}: ${streamInfo.config.subjects.join(', ')} (${streamInfo.state.messages} messages)`);
      } catch (error) {
        console.log(`❌ ${streamName}: Not found`);
      }
    }
    
    console.log('📊 Listing all streams:');
    const streams = await jsm.streams.list().next();
    if (streams.length === 0) {
      console.log('❌ No streams found');
    } else {
      streams.forEach(stream => {
        console.log(`📁 ${stream.config.name}: ${stream.config.subjects.join(', ')}`);
      });
    }
    
    await nc.close();
    console.log('✅ Verification complete');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyStreams().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});