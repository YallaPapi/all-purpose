#!/usr/bin/env node

import { connect, JSONCodec, StringCodec } from 'nats';
import fs from 'fs';
import path from 'path';

const jc = JSONCodec();
const sc = StringCodec();

async function setupJetStreamStreams() {
  console.log('🚀 Setting up NATS JetStream streams...');

  try {
    // Connect to NATS server
    const nc = await connect({
      servers: ['nats://localhost:4222'],
      user: 'factory',
      pass: 'factory-secret'
    });

    console.log('✅ Connected to NATS server');

    // Get JetStream manager
    const jsm = await nc.jetstreamManager();
    const js = nc.jetstream();

    // Load stream configuration
    const configPath = path.join(process.cwd(), 'jetstream-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Create streams
    for (const streamConfig of config.streams) {
      try {
        console.log(`📋 Creating stream: ${streamConfig.name}`);
        
        await jsm.streams.add({
          name: streamConfig.name,
          description: streamConfig.description,
          subjects: streamConfig.subjects,
          retention: streamConfig.retention,
          max_consumers: streamConfig.max_consumers,
          max_msgs: streamConfig.max_msgs,
          max_bytes: streamConfig.max_bytes,
          max_age: streamConfig.max_age,
          storage: streamConfig.storage,
          replicas: streamConfig.replicas,
          discard: streamConfig.discard
        });

        console.log(`✅ Stream created: ${streamConfig.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Stream already exists: ${streamConfig.name}`);
        } else {
          console.error(`❌ Error creating stream ${streamConfig.name}:`, error.message);
        }
      }
    }

    // Create consumers
    for (const consumerConfig of config.consumers) {
      try {
        console.log(`👥 Creating consumer: ${consumerConfig.name} on ${consumerConfig.stream_name}`);
        
        await jsm.consumers.add(consumerConfig.stream_name, {
          name: consumerConfig.name,
          description: consumerConfig.description,
          durable_name: consumerConfig.durable_name,
          deliver_policy: consumerConfig.deliver_policy,
          ack_policy: consumerConfig.ack_policy,
          ack_wait: consumerConfig.ack_wait,
          max_deliver: consumerConfig.max_deliver,
          filter_subject: consumerConfig.filter_subject,
          replay_policy: consumerConfig.replay_policy
        });

        console.log(`✅ Consumer created: ${consumerConfig.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Consumer already exists: ${consumerConfig.name}`);
        } else {
          console.error(`❌ Error creating consumer ${consumerConfig.name}:`, error.message);
        }
      }
    }

    // Test message publishing
    console.log('🧪 Testing message publishing...');
    
    await js.publish('meta.agent.created', jc.encode({
      agentId: 'test-agent-001',
      type: 'all-purpose-pattern',
      timestamp: new Date().toISOString(),
      status: 'created'
    }));

    await js.publish('factory.task.assigned', jc.encode({
      taskId: 'test-task-001', 
      agentId: 'test-agent-001',
      assignedAt: new Date().toISOString()
    }));

    console.log('✅ Test messages published successfully');

    // List streams and consumers
    console.log('\n📊 JetStream Status:');
    const streams = await jsm.streams.list().next();
    for (const stream of streams) {
      console.log(`📋 Stream: ${stream.config.name} (${stream.state.messages} messages)`);
      
      const consumers = await jsm.consumers.list(stream.config.name).next();
      for (const consumer of consumers) {
        console.log(`  👥 Consumer: ${consumer.name} (${consumer.num_pending} pending)`);
      }
    }

    await nc.close();
    console.log('\n🎉 JetStream setup completed successfully!');

  } catch (error) {
    console.error('❌ JetStream setup failed:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupJetStreamStreams();
}

export { setupJetStreamStreams };