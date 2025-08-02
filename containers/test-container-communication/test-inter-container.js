/**
 * Test Inter-Container Communication
 * 
 * Verifies all containers can communicate with each other
 */

import { connect } from 'nats';
import { Etcd3 } from 'etcd3';
import { Redis } from '@upstash/redis';
import { execSync } from 'child_process';

// Service endpoints within Docker network
const SERVICES = {
  nats: 'meta-agent-nats-broker:4222',
  redis: 'meta-agent-redis:6379',
  etcd: 'meta-agent-etcd:2379',
  factoryCore: 'meta-agent-factory-core:3000',
  domainAgents: 'meta-agent-domain-agents:3001',
  uepService: 'meta-agent-uep-service:3002',
  uepRegistry: 'meta-agent-uep-registry:3003',
  apiGateway: 'meta-agent-api-gateway:8080'
};

async function testConnectivity() {
  console.log('🧪 Testing Inter-Container Communication\n');
  
  const results = {
    connectivity: {},
    nats: { connected: false, features: [] },
    redis: { connected: false, operations: [] },
    etcd: { connected: false, operations: [] },
    services: {}
  };

  // Test basic connectivity
  console.log('📡 Testing network connectivity...\n');
  for (const [name, endpoint] of Object.entries(SERVICES)) {
    const [host, port] = endpoint.split(':');
    try {
      execSync(`nc -zv ${host} ${port}`, { encoding: 'utf8' });
      results.connectivity[name] = '✅ Reachable';
      console.log(`✅ ${name}: ${endpoint} - Reachable`);
    } catch (error) {
      results.connectivity[name] = '❌ Unreachable';
      console.log(`❌ ${name}: ${endpoint} - Unreachable`);
    }
  }

  // Test NATS
  console.log('\n🔌 Testing NATS...');
  try {
    const nc = await connect({
      servers: [`nats://${SERVICES.nats}`],
      user: 'factory',
      pass: 'factory-secret',
      timeout: 5000
    });

    results.nats.connected = true;
    console.log('✅ Connected to NATS');

    // Test pub/sub
    const sub = nc.subscribe('container.test');
    setTimeout(async () => {
      await nc.publish('container.test', JSON.stringify({ 
        test: 'inter-container', 
        timestamp: new Date() 
      }));
    }, 100);

    const msg = await sub.next();
    if (msg) {
      results.nats.features.push('pub/sub');
      console.log('✅ Pub/Sub working');
    }

    // Test JetStream
    try {
      const js = nc.jetstream();
      const jsm = await nc.jetstreamManager();
      
      // Try to get stream info
      const streams = await jsm.streams.list().next();
      results.nats.features.push('jetstream');
      console.log(`✅ JetStream working (${streams.length} streams)`);
    } catch (err) {
      console.log('⚠️  JetStream not available');
    }

    await nc.drain();
  } catch (error) {
    console.log(`❌ NATS error: ${error.message}`);
  }

  // Test Redis (using Redis client, not Upstash)
  console.log('\n🗄️  Testing Redis...');
  try {
    // Use netcat to test Redis PING command
    const redisPing = execSync(
      `echo -e "PING\r\n" | nc ${SERVICES.redis.split(':')[0]} ${SERVICES.redis.split(':')[1]} | head -1`,
      { encoding: 'utf8' }
    ).trim();
    
    if (redisPing.includes('PONG')) {
      results.redis.connected = true;
      results.redis.operations.push('ping');
      console.log('✅ Redis PING successful');
    }
  } catch (error) {
    console.log(`❌ Redis error: ${error.message}`);
  }

  // Test etcd
  console.log('\n🔑 Testing etcd...');
  try {
    const etcd = new Etcd3({
      hosts: `http://${SERVICES.etcd}`
    });

    await etcd.put('container-test').value('test-value');
    results.etcd.operations.push('put');
    console.log('✅ etcd PUT successful');

    const value = await etcd.get('container-test').string();
    if (value === 'test-value') {
      results.etcd.operations.push('get');
      console.log('✅ etcd GET successful');
    }

    await etcd.delete().key('container-test');
    results.etcd.operations.push('delete');
    results.etcd.connected = true;
  } catch (error) {
    console.log(`❌ etcd error: ${error.message}`);
  }

  // Test HTTP services
  console.log('\n🌐 Testing HTTP services...');
  const httpServices = {
    factoryCore: `http://${SERVICES.factoryCore}/health`,
    domainAgents: `http://${SERVICES.domainAgents}/health`,
    uepService: `http://${SERVICES.uepService}/health`,
    uepRegistry: `http://${SERVICES.uepRegistry}/health`,
    apiGateway: `http://${SERVICES.apiGateway}/health`
  };

  for (const [name, url] of Object.entries(httpServices)) {
    try {
      execSync(`curl -s -f ${url}`, { encoding: 'utf8' });
      results.services[name] = '✅ Healthy';
      console.log(`✅ ${name}: Healthy`);
    } catch (error) {
      results.services[name] = '❌ Unhealthy';
      console.log(`❌ ${name}: Unhealthy`);
    }
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const totalTests = Object.keys(results.connectivity).length + 
                    (results.nats.connected ? 1 : 0) +
                    (results.redis.connected ? 1 : 0) +
                    (results.etcd.connected ? 1 : 0) +
                    Object.keys(results.services).length;
                    
  const passedTests = Object.values(results.connectivity).filter(v => v.includes('✅')).length +
                     (results.nats.connected ? 1 : 0) +
                     (results.redis.connected ? 1 : 0) +
                     (results.etcd.connected ? 1 : 0) +
                     Object.values(results.services).filter(v => v.includes('✅')).length;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n✅ All container communication tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check container logs for details.');
    process.exit(1);
  }
}

// Run tests
testConnectivity().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});