#!/usr/bin/env node

import { connect, JSONCodec, StringCodec, StorageType, RetentionPolicy, DiscardPolicy, DeliverPolicy, AckPolicy, ReplayPolicy } from 'nats';
import fs from 'fs';
import path from 'path';

const jc = JSONCodec();
const sc = StringCodec();

// Convert string literals to NATS enums
function convertToNATSEnums(config) {
  const storageMap = { 'file': StorageType.File, 'memory': StorageType.Memory };
  const retentionMap = { 'limits': RetentionPolicy.Limits, 'interest': RetentionPolicy.Interest, 'workqueue': RetentionPolicy.Workqueue };
  const discardMap = { 'old': DiscardPolicy.Old, 'new': DiscardPolicy.New };
  const deliverMap = { 'all': DeliverPolicy.All, 'new': DeliverPolicy.New, 'last': DeliverPolicy.Last, 'last_per_subject': DeliverPolicy.LastPerSubject };
  const ackMap = { 'explicit': AckPolicy.Explicit, 'none': AckPolicy.None, 'all': AckPolicy.All };
  const replayMap = { 'instant': ReplayPolicy.Instant, 'original': ReplayPolicy.Original };

  return {
    ...config,
    storage: storageMap[config.storage] || config.storage,
    retention: retentionMap[config.retention] || config.retention,
    discard: discardMap[config.discard] || config.discard,
    deliver_policy: deliverMap[config.deliver_policy] || config.deliver_policy,
    ack_policy: ackMap[config.ack_policy] || config.ack_policy,
    replay_policy: replayMap[config.replay_policy] || config.replay_policy
  };
}

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
        
        const convertedStreamConfig = convertToNATSEnums(streamConfig);
        await jsm.streams.add({
          name: convertedStreamConfig.name,
          description: convertedStreamConfig.description,
          subjects: convertedStreamConfig.subjects,
          retention: convertedStreamConfig.retention,
          max_consumers: convertedStreamConfig.max_consumers,
          max_msgs: convertedStreamConfig.max_msgs,
          max_bytes: convertedStreamConfig.max_bytes,
          max_age: convertedStreamConfig.max_age,
          storage: convertedStreamConfig.storage,
          replicas: convertedStreamConfig.replicas,
          discard: convertedStreamConfig.discard
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
        
        const convertedConsumerConfig = convertToNATSEnums(consumerConfig);
        await jsm.consumers.add(consumerConfig.stream_name, {
          name: convertedConsumerConfig.name,
          description: convertedConsumerConfig.description,
          durable_name: convertedConsumerConfig.durable_name,
          deliver_policy: convertedConsumerConfig.deliver_policy,
          ack_policy: convertedConsumerConfig.ack_policy,
          ack_wait: convertedConsumerConfig.ack_wait,
          max_deliver: convertedConsumerConfig.max_deliver,
          filter_subject: convertedConsumerConfig.filter_subject,
          replay_policy: convertedConsumerConfig.replay_policy
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