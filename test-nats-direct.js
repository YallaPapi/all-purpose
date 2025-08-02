#!/usr/bin/env node

import { connect, JSONCodec } from 'nats';

async function testNATS() {
  try {
    const nc = await connect({ servers: 'localhost:4222' });
    console.log('✅ Connected to NATS successfully');
    
    const js = nc.jetstream();
    console.log('✅ Got JetStream context');
    
    // Try to list streams
    try {
      const streams = await js.streams.list().next();
      console.log('✅ JetStream is working, streams:', streams);
    } catch (err) {
      console.error('❌ JetStream error:', err.message);
    }
    
    await nc.close();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testNATS();