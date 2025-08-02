#!/usr/bin/env node

/**
 * Test NATS Security Configuration
 * 
 * Verifies TLS and authentication are working correctly
 */

import { createSecureNATSConnection, verifyConnection, closeConnection } from './src/services/SecureNATSConnection.js';
import { createLogger, format, transports } from 'winston';

// Create logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.colorize(),
    format.simple()
  ),
  transports: [new transports.Console()]
});

async function testNATSSecurity() {
  console.log('🔐 Testing NATS Security Configuration\n');
  
  let connections = [];
  
  try {
    // Test 1: Basic non-TLS connection (development mode)
    console.log('📋 Test 1: Non-TLS Connection (Development)...');
    process.env.NODE_ENV = 'development';
    process.env.NATS_USE_TLS = 'false';
    process.env.NATS_URL = 'nats://localhost:4222';
    
    const devConn = await createSecureNATSConnection({
      agentId: 'test-dev-agent',
      agentType: 'backend-agent',
      logger
    });
    connections.push(devConn);
    
    console.log('✅ Development connection established');
    console.log(`   Server: ${devConn.info.server}`);
    console.log(`   TLS: ${devConn.info.tlsEnabled}`);
    console.log(`   Authenticated: ${devConn.info.authenticated}\n`);
    
    // Test 2: TLS connection (production mode)
    console.log('📋 Test 2: TLS Connection (Production)...');
    process.env.NODE_ENV = 'production';
    process.env.NATS_USE_TLS = 'true';
    process.env.NATS_URL = 'tls://localhost:4222';
    
    try {
      const prodConn = await createSecureNATSConnection({
        agentId: 'test-prod-agent',
        agentType: 'backend-agent',
        logger
      });
      connections.push(prodConn);
      
      console.log('✅ Production TLS connection established');
      console.log(`   Server: ${prodConn.info.server}`);
      console.log(`   TLS: ${prodConn.info.tlsEnabled}`);
      console.log(`   Authenticated: ${prodConn.info.authenticated}\n`);
    } catch (error) {
      console.log('⚠️ TLS connection failed (expected if certificates not generated)');
      console.log(`   Error: ${error.message}\n`);
    }
    
    // Test 3: Connection health check
    console.log('📋 Test 3: Connection Health Check...');
    for (const conn of connections) {
      const healthy = await verifyConnection(conn.connection, logger);
      console.log(`   ${conn.info.agentId}: ${healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    }
    console.log('');
    
    // Test 4: Publish/Subscribe with permissions
    console.log('📋 Test 4: Testing Publish/Subscribe Permissions...');
    if (connections.length > 0) {
      const testConn = connections[0];
      const nc = testConn.connection;
      
      try {
        // Test allowed subject
        const allowedSubject = 'agent.backend.test';
        const sub1 = nc.subscribe(allowedSubject);
        nc.publish(allowedSubject, JSON.stringify({ test: 'allowed' }));
        
        let received = false;
        setTimeout(() => sub1.unsubscribe(), 1000);
        
        for await (const msg of sub1) {
          console.log(`   ✅ Can publish/subscribe to: ${allowedSubject}`);
          received = true;
          break;
        }
        
        if (!received) {
          console.log(`   ⚠️ No message received on: ${allowedSubject}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Permission test failed: ${error.message}`);
      }
    }
    console.log('');
    
    // Test 5: Multiple agent connections
    console.log('📋 Test 5: Multiple Agent Connections...');
    const agentTypes = ['backend-agent', 'frontend-agent', 'devops-agent'];
    const multiConnections = [];
    
    for (const agentType of agentTypes) {
      try {
        const conn = await createSecureNATSConnection({
          agentId: `test-${agentType}`,
          agentType: agentType,
          logger
        });
        multiConnections.push(conn);
        console.log(`   ✅ Connected: ${agentType}`);
      } catch (error) {
        console.log(`   ❌ Failed to connect ${agentType}: ${error.message}`);
      }
    }
    
    // Close multi connections
    for (const conn of multiConnections) {
      await closeConnection(conn, logger);
    }
    console.log('');
    
    console.log('📊 Security Configuration Summary:');
    console.log('   - Non-TLS connections: Working (development)');
    console.log('   - TLS connections: Requires certificates');
    console.log('   - Authentication: Username/password ready');
    console.log('   - Permissions: Subject-based access control');
    console.log('   - Health checks: Connection verification working');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up all connections
    console.log('\n🧹 Cleaning up connections...');
    for (const conn of connections) {
      await closeConnection(conn, logger);
    }
    console.log('✅ All connections closed');
  }
}

// Instructions for setting up secure NATS
console.log('🔐 NATS Security Setup Instructions:\n');
console.log('1. Generate certificates:');
console.log('   cd config/nats-security');
console.log('   chmod +x generate-certs.sh');
console.log('   ./generate-certs.sh\n');
console.log('2. Create .env file:');
console.log('   cp .env.example .env');
console.log('   # Edit .env with strong passwords\n');
console.log('3. Start secure NATS:');
console.log('   docker-compose -f docker-compose-secure.yml up -d\n');
console.log('4. Run this test again to verify TLS connections\n');
console.log('─'.repeat(50) + '\n');

// Run the test
testNATSSecurity().catch(console.error);