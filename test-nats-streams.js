#!/usr/bin/env node

import { connect } from 'nats';

async function checkStreams() {
  try {
    const nc = await connect({ servers: 'localhost:4222' });
    console.log('✅ Connected to NATS');
    
    const jsm = await nc.jetstreamManager();
    console.log('✅ Got JetStream Manager\n');
    
    // List all streams
    const streams = await jsm.streams.list().next();
    console.log('Streams found:', streams.length);
    
    // Get info for each stream
    for await (const stream of jsm.streams.list()) {
      console.log(`\n=== Stream: ${stream.config.name} ===`);
      console.log('Subjects:', stream.config.subjects);
      console.log('Messages:', stream.state.messages);
      console.log('Storage:', stream.config.storage);
      console.log('Retention:', stream.config.retention);
    }
    
    await nc.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkStreams();