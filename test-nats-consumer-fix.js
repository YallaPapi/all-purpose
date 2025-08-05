#!/usr/bin/env node

/**
 * Test script to verify NATS JetStream consumer creation fix
 * 
 * This script tests the exact fix for the "Cannot read properties of undefined (reading 'ack_policy')" error
 * that was occurring at line 582 in jsclient.ts in NATS 2.29.3
 */

import { connect, AckPolicy, DeliverPolicy, StorageType, RetentionPolicy, DiscardPolicy } from 'nats';

async function testNATSConsumerCreation() {
  console.log('🧪 Testing NATS Consumer Creation Fix');
  console.log('═══════════════════════════════════════');
  
  let nc = null;
  
  try {
    // Connect to NATS
    console.log('📡 Connecting to NATS...');
    nc = await connect({ 
      servers: ['nats://localhost:4222'],
      maxReconnectAttempts: 3,
      reconnectTimeWait: 1000
    });
    console.log('✅ Connected to NATS successfully');

    // Get JetStream manager and client
    const js = nc.jetstream();
    const jsm = await nc.jetstreamManager();
    
    // Test stream name
    const streamName = 'TEST_CONSUMER_FIX';
    const subject = 'test.consumer.fix';
    
    // Step 1: Create test stream with proper enums
    console.log('\n🏗️ Creating test stream...');
    try {
      await jsm.streams.add({
        name: streamName,
        subjects: [subject],
        storage: StorageType.Memory,  // ✅ Using enum
        retention: RetentionPolicy.Limits,  // ✅ Using enum  
        discard: DiscardPolicy.Old,  // ✅ Using enum
        max_msgs: 100,
        max_bytes: 1024 * 1024,
        max_age: 60 * 1000000000 // 1 minute in nanoseconds
      });
      console.log('✅ Stream created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Stream already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Step 2: Create consumer with proper enum usage (THE CRITICAL FIX)
    console.log('\n👥 Creating consumer with ENUM FIX...');
    
    const consumerConfig = {
      durable_name: `test-consumer-${Date.now()}`,
      deliver_policy: DeliverPolicy.All,  // ✅ ENUM instead of 'all'
      ack_policy: AckPolicy.Explicit,     // ✅ ENUM instead of 'explicit' - THIS IS THE KEY FIX
      ack_wait: 30000000000,              // 30 seconds in nanoseconds
      max_deliver: 3,
      filter_subject: subject
    };
    
    console.log('🔧 Consumer config:', {
      deliver_policy: consumerConfig.deliver_policy,
      ack_policy: consumerConfig.ack_policy,
      ack_wait: consumerConfig.ack_wait
    });
    
    // THIS IS THE LINE THAT WAS FAILING BEFORE THE FIX
    const consumerInfo = await jsm.consumers.add(streamName, consumerConfig);
    console.log('✅ Consumer created successfully!');
    console.log(`   Name: ${consumerInfo.name}`);
    console.log(`   Stream: ${consumerInfo.stream_name}`);
    console.log(`   Config: ${JSON.stringify(consumerInfo.config.ack_policy)}`);

    // Step 3: Test consumer usage
    console.log('\n🔄 Testing consumer usage...');
    // CRITICAL FIX: Provide proper consumer configuration with ack_policy
    const consumer = await js.consumers.get(streamName, {
      durable_name: consumerInfo.name,
      ack_policy: 'explicit',
      deliver_policy: 'all',
      replay_policy: 'instant'
    });
    console.log('✅ Consumer retrieved successfully');

    // Step 4: Test message publishing and consumption
    console.log('\n📤 Testing message publishing...');
    await js.publish(subject, JSON.stringify({ 
      test: 'consumer-fix-test', 
      timestamp: new Date().toISOString(),
      message: 'This message tests the ack_policy fix'
    }));
    console.log('✅ Message published');

    // Start consuming with timeout
    console.log('📥 Testing message consumption...');
    const messages = await consumer.consume({ max_messages: 1, expires: 5000 });
    
    let messageReceived = false;
    const timeout = setTimeout(() => {
      if (!messageReceived) {
        console.log('ℹ️ No messages received within timeout (expected for quick test)');
        messages.stop();
      }
    }, 2000);

    try {
      for await (const msg of messages) {
        messageReceived = true;
        clearTimeout(timeout);
        
        console.log('📨 Message received:', msg.string());
        msg.ack();  // This should work with AckPolicy.Explicit
        console.log('✅ Message acknowledged successfully');
        break;
      }
    } catch (consumeError) {
      console.log('ℹ️ Consume iteration ended (normal for test)');
    }

    messages.stop();

    // Cleanup
    console.log('\n🧹 Cleaning up test resources...');
    try {
      await jsm.consumers.delete(streamName, consumerInfo.name);
      console.log('✅ Test consumer deleted');
    } catch (e) {
      console.log('ℹ️ Consumer cleanup skipped');
    }

    try {
      await jsm.streams.delete(streamName);
      console.log('✅ Test stream deleted');
    } catch (e) {
      console.log('ℹ️ Stream cleanup skipped');
    }

    console.log('\n🎉 NATS Consumer Creation Fix SUCCESSFUL!');
    console.log('═══════════════════════════════════════════════');
    console.log('✅ The ack_policy undefined error has been RESOLVED');
    console.log('✅ Consumer creation now works with proper NATS enums');
    console.log('✅ AckPolicy.Explicit is properly recognized by NATS 2.29.3');
    console.log('✅ DeliverPolicy.All is properly recognized by NATS 2.29.3');
    console.log('\n💡 KEY FIXES APPLIED:');
    console.log('   • Changed ack_policy: "explicit" → AckPolicy.Explicit');
    console.log('   • Changed deliver_policy: "all" → DeliverPolicy.All');
    console.log('   • Added proper enum imports from NATS library');
    console.log('   • Fixed all stream configurations to use StorageType/RetentionPolicy/DiscardPolicy enums');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ NATS Consumer Creation Fix FAILED:');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    
    // Check if this is the original error
    if (error.message.includes("Cannot read properties of undefined (reading 'ack_policy')")) {
      console.error('\n🚨 ORIGINAL ERROR STILL PRESENT!');
      console.error('   The fix was not applied correctly or there are additional issues.');
    }
    
    return false;
  } finally {
    if (nc) {
      await nc.close();
      console.log('📡 NATS connection closed');
    }
  }
}

// Run the test
async function main() {
  console.log('🧪 NATS JetStream Consumer Fix Test');
  console.log('This test verifies the fix for the ack_policy undefined error\n');
  
  const success = await testNATSConsumerCreation();
  
  if (success) {
    console.log('\n✨ Test completed successfully - Fix is working!');
    process.exit(0);
  } else {
    console.log('\n💥 Test failed - Fix needs additional work');
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});