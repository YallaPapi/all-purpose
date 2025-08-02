#!/usr/bin/env node

/**
 * Test NATS Monitoring Setup
 * 
 * Verifies that monitoring endpoints are accessible and metrics are being collected
 */

import fetch from 'node-fetch';

async function checkEndpoint(name, url, expectedStatus = 200) {
  try {
    const response = await fetch(url);
    if (response.status === expectedStatus) {
      console.log(`✅ ${name}: ${url} (Status: ${response.status})`);
      return true;
    } else {
      console.log(`❌ ${name}: ${url} (Status: ${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${url} (Error: ${error.message})`);
    return false;
  }
}

async function checkNATSMetrics() {
  try {
    const response = await fetch('http://localhost:8222/varz');
    const data = await response.json();
    
    console.log('\n📊 NATS Server Metrics:');
    console.log(`   Version: ${data.version}`);
    console.log(`   Uptime: ${data.uptime}`);
    console.log(`   Connections: ${data.connections}`);
    console.log(`   Subscriptions: ${data.subscriptions}`);
    console.log(`   Messages In: ${data.in_msgs}`);
    console.log(`   Messages Out: ${data.out_msgs}`);
    console.log(`   CPU: ${data.cpu}%`);
    console.log(`   Memory: ${(data.mem / 1024 / 1024).toFixed(2)}MB`);
    
    return true;
  } catch (error) {
    console.log('❌ Failed to fetch NATS metrics:', error.message);
    return false;
  }
}

async function checkPrometheusTargets() {
  try {
    const response = await fetch('http://localhost:9091/api/v1/targets');
    const data = await response.json();
    
    console.log('\n🎯 Prometheus Targets:');
    data.data.activeTargets.forEach(target => {
      const health = target.health === 'up' ? '✅' : '❌';
      console.log(`   ${health} ${target.labels.job}: ${target.labels.instance}`);
    });
    
    return true;
  } catch (error) {
    console.log('❌ Failed to fetch Prometheus targets:', error.message);
    return false;
  }
}

async function testMonitoringStack() {
  console.log('🔍 Testing NATS Monitoring Stack\n');
  
  // Check all endpoints
  console.log('📋 Checking Monitoring Endpoints:');
  const endpoints = [
    { name: 'NATS Monitoring', url: 'http://localhost:8222/varz' },
    { name: 'Prometheus', url: 'http://localhost:9091/-/ready' },
    { name: 'Grafana', url: 'http://localhost:3006/api/health' },
    { name: 'NATS Exporter', url: 'http://localhost:7777/metrics' },
    { name: 'NATS Surveyor', url: 'http://localhost:7778/metrics' },
    { name: 'OTel Collector Health', url: 'http://localhost:13133/ready' },
    { name: 'Tempo', url: 'http://localhost:3200/ready' }
  ];
  
  let allHealthy = true;
  for (const endpoint of endpoints) {
    const healthy = await checkEndpoint(endpoint.name, endpoint.url);
    if (!healthy) allHealthy = false;
  }
  
  // Check NATS metrics
  await checkNATSMetrics();
  
  // Check Prometheus targets
  await checkPrometheusTargets();
  
  // Summary
  console.log('\n📊 Monitoring Stack Status:');
  if (allHealthy) {
    console.log('✅ All monitoring components are healthy!');
    console.log('\n🚀 Next steps:');
    console.log('1. Access Grafana at http://localhost:3006 (admin/admin123)');
    console.log('2. View NATS Server Dashboard');
    console.log('3. View Meta-Agent Dashboard');
    console.log('4. Configure alerts in Grafana');
  } else {
    console.log('⚠️ Some components are not accessible.');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure Docker containers are running:');
    console.log('   docker-compose -f monitoring/nats/docker-compose-monitoring.yml ps');
    console.log('2. Check container logs:');
    console.log('   docker-compose -f monitoring/nats/docker-compose-monitoring.yml logs');
    console.log('3. Verify NATS server is running on port 4222');
  }
}

// Test monitoring instructions
console.log('📚 NATS Monitoring Setup Instructions:\n');
console.log('1. Start the monitoring stack:');
console.log('   cd monitoring/nats');
console.log('   docker-compose -f docker-compose-monitoring.yml up -d\n');
console.log('2. Wait for all services to start (about 30 seconds)\n');
console.log('3. Run this test again to verify all components\n');
console.log('─'.repeat(50) + '\n');

// Run the test
testMonitoringStack().catch(console.error);