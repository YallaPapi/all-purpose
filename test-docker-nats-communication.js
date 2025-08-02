/**
 * Test NATS Communication Between Docker Containers
 * 
 * This script verifies that containers can communicate via NATS
 */

import { connect } from 'nats';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testNATSConnection() {
  console.log('🧪 Testing NATS Connection from Host to Docker Container\n');

  try {
    // Connect to NATS running in Docker
    console.log('📡 Connecting to NATS at localhost:4222...');
    const nc = await connect({
      servers: ['nats://localhost:4222'],
      user: 'factory',
      pass: 'factory-secret',
      timeout: 5000
    });

    console.log('✅ Connected to NATS successfully!');
    console.log(`📊 Server: ${nc.getServer()}`);

    // Test publishing a message
    console.log('\n📤 Publishing test message...');
    await nc.publish('test.docker.communication', JSON.stringify({
      source: 'host',
      timestamp: new Date(),
      message: 'Hello from host machine!'
    }));
    console.log('✅ Message published');

    // Test request/reply pattern
    console.log('\n🔄 Testing request/reply pattern...');
    
    // Set up responder
    const sub = nc.subscribe('test.echo');
    (async () => {
      for await (const msg of sub) {
        const data = JSON.parse(msg.data);
        console.log('📥 Received echo request:', data);
        msg.respond(JSON.stringify({
          echo: data,
          respondedAt: new Date()
        }));
      }
    })();

    // Send request
    const response = await nc.request('test.echo', JSON.stringify({
      test: 'echo test',
      requestedAt: new Date()
    }), { timeout: 2000 });

    console.log('📨 Echo response:', JSON.parse(response.data));

    // Test JetStream
    console.log('\n🌊 Testing JetStream...');
    const js = nc.jetstream();
    const jsm = await nc.jetstreamManager();

    // List existing streams
    const streams = await jsm.streams.list().next();
    console.log('📋 Existing streams:', streams.length);
    
    if (streams.length > 0) {
      for (const stream of streams) {
        console.log(`   - ${stream.config.name}: ${stream.state.messages} messages`);
      }
    }

    // Create a test stream
    try {
      await jsm.streams.add({
        name: 'DOCKER_TEST',
        subjects: ['docker.test.*'],
        retention: 'limits',
        max_msgs: 1000,
        max_age: 60 * 60 * 1000000000 // 1 hour in nanoseconds
      });
      console.log('✅ Created DOCKER_TEST stream');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️  DOCKER_TEST stream already exists');
      } else {
        throw err;
      }
    }

    // Publish to JetStream
    const ack = await js.publish('docker.test.message', JSON.stringify({
      test: 'JetStream from host',
      timestamp: new Date()
    }));
    console.log('✅ Published to JetStream, seq:', ack.seq);

    // Test cluster info
    console.log('\n🔍 Server Info:');
    const server = nc.protocol.servers.getCurrentServer();
    console.log(`   - URL: ${server.url.href}`);
    console.log(`   - TLS: ${server.tls ? 'enabled' : 'disabled'}`);

    // Clean up
    sub.unsubscribe();
    await nc.drain();
    console.log('\n✅ All tests passed! Docker NATS communication is working.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'CONNECTION_REFUSED') {
      console.error('\n💡 Make sure NATS container is running:');
      console.error('   docker ps | grep nats');
      console.error('   docker logs meta-agent-nats-broker');
    }
    process.exit(1);
  }
}

// Run the test
testNATSConnection().catch(console.error);