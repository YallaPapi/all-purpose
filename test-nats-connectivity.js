/**
 * Test NATS Server Connectivity
 * 
 * Simple test to verify NATS server is accessible
 */

import { connect } from 'nats';

async function testNATSConnection() {
  console.log('🧪 Testing NATS Server Connectivity\n');

  try {
    // Try to connect to NATS
    console.log('📡 Attempting to connect to NATS server at localhost:4222...');
    
    const nc = await connect({
      servers: ['nats://localhost:4222'],
      user: 'factory',
      pass: 'factory-secret',
      timeout: 5000,
    });

    console.log('✅ Successfully connected to NATS!');
    console.log(`   Server: ${nc.getServer()}`);
    console.log(`   Client ID: ${nc.info?.client_id}`);
    
    // Try to publish a test message
    console.log('\n📤 Publishing test message...');
    nc.publish('test.subject', 'Hello NATS!');
    console.log('✅ Message published successfully');

    // Try to subscribe
    console.log('\n📥 Testing subscription...');
    const sub = nc.subscribe('test.echo');
    (async () => {
      for await (const msg of sub) {
        console.log(`✅ Received: ${msg.data}`);
        break; // Exit after first message
      }
    })();

    // Send echo message
    nc.publish('test.echo', 'Echo test');
    
    // Wait a bit for message
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check JetStream
    console.log('\n🌊 Checking JetStream...');
    try {
      const jsm = await nc.jetstreamManager();
      const streams = await jsm.streams.list().next();
      console.log('✅ JetStream is enabled');
      if (streams.length > 0) {
        console.log(`   Found ${streams.length} streams`);
      }
    } catch (error) {
      console.log('❌ JetStream not available or not configured');
    }

    // Close connection
    await nc.drain();
    console.log('\n✅ NATS connectivity test passed!');
    
    return true;

  } catch (error) {
    console.error('\n❌ NATS connection failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure NATS server is running: docker-compose up nats-broker');
    console.log('2. Check if port 4222 is accessible');
    console.log('3. Verify credentials (factory/factory-secret)');
    console.log('4. Check docker-compose logs nats-broker for errors');
    
    return false;
  }
}

// Run the test
testNATSConnection().then(success => {
  process.exit(success ? 0 : 1);
});