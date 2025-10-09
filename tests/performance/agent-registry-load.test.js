/**
 * Agent Registry Load Test Scenarios
 * 
 * Performance tests for high-volume agent registration,
 * concurrent operations, and registry capacity limits
 */

const k6 = require('k6');
const http = require('k6/http');
const { check, sleep } = require('k6');
const { Rate, Trend, Counter, Gauge } = require('k6/metrics');
const { randomString, randomItem } = require('https://jslib.k6.io/k6-utils/1.4.0/index.js');

// Custom metrics
const registrationDuration = new Trend('registration_duration');
const registrationErrors = new Rate('registration_errors');
const activeAgents = new Gauge('active_agents');
const registrationsPerSecond = new Counter('registrations_per_second');

// Test configuration
export const options = {
  scenarios: {
    // Baseline load test - steady state
    baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      gracefulStop: '30s',
      startTime: '0s',
      tags: { scenario: 'baseline' }
    },
    
    // Spike test - sudden traffic surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },    // Warm up
        { duration: '10s', target: 100 },  // Spike to 100 VUs
        { duration: '1m', target: 100 },   // Stay at 100
        { duration: '10s', target: 5 },    // Scale down
        { duration: '30s', target: 0 },    // Cool down
      ],
      gracefulRampDown: '30s',
      startTime: '5m',
      tags: { scenario: 'spike' }
    },
    
    // Stress test - find breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '2m', target: 500 },
      ],
      gracefulRampDown: '1m',
      startTime: '8m',
      tags: { scenario: 'stress' }
    },
    
    // Soak test - prolonged load
    soak: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30m',
      gracefulStop: '1m',
      startTime: '20m',
      tags: { scenario: 'soak' }
    }
  },
  
  thresholds: {
    // Response time thresholds
    'http_req_duration': [
      { threshold: 'p(95)<500', abortOnFail: false }, // 95% of requests under 500ms
      { threshold: 'p(99)<1000', abortOnFail: true }  // 99% under 1s, abort if exceeded
    ],
    
    // Error rate thresholds
    'http_req_failed': ['rate<0.05'], // Less than 5% errors
    'registration_errors': ['rate<0.01'], // Less than 1% registration errors
    
    // Custom thresholds
    'registration_duration': ['p(95)<300'], // 95% of registrations under 300ms
    'registrations_per_second': ['count>10'] // At least 10 registrations/sec
  },
  
  // Tags for filtering results
  tags: {
    test_type: 'performance',
    target: 'agent-registry'
  }
};

// Test data generators
function generateAgentData() {
  const agentTypes = ['processor', 'analyzer', 'monitor', 'coordinator', 'executor'];
  const capabilities = [
    ['data-processing', 'transformation'],
    ['machine-learning', 'prediction'],
    ['monitoring', 'alerting'],
    ['coordination', 'orchestration'],
    ['execution', 'validation']
  ];
  
  return {
    agentId: `perf-agent-${randomString(8)}-${Date.now()}`,
    agentName: `Performance Test Agent ${randomString(4)}`,
    agentType: randomItem(agentTypes),
    capabilities: randomItem(capabilities),
    version: '1.0.0',
    endpoint: `http://agent-${randomString(8)}.local:8080`,
    healthCheckEndpoint: '/health',
    metadata: {
      test: true,
      scenario: __ENV.scenario || 'unknown',
      vu: __VU,
      iter: __ITER
    }
  };
}

// Base URL configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const headers = {
  'Content-Type': 'application/json',
  'X-Test-Type': 'performance'
};

// Main test function
export default function() {
  const scenario = __ENV.scenario || 'baseline';
  
  switch (scenario) {
    case 'registration_load':
      testAgentRegistrationLoad();
      break;
    case 'concurrent_operations':
      testConcurrentOperations();
      break;
    case 'registry_capacity':
      testRegistryCapacity();
      break;
    default:
      testAgentRegistrationLoad();
  }
}

// Test scenario: High-volume agent registration
function testAgentRegistrationLoad() {
  const agentData = generateAgentData();
  const startTime = Date.now();
  
  // Register agent
  const registerResponse = http.post(
    `${BASE_URL}/api/registry/agents`,
    JSON.stringify(agentData),
    { headers, tags: { operation: 'register' } }
  );
  
  const registrationTime = Date.now() - startTime;
  registrationDuration.add(registrationTime);
  
  // Check registration success
  const registered = check(registerResponse, {
    'registration successful': (r) => r.status === 201,
    'has agent ID': (r) => r.json('agentId') !== null,
    'response time OK': (r) => r.timings.duration < 500
  });
  
  if (!registered) {
    registrationErrors.add(1);
  } else {
    registrationsPerSecond.add(1);
    activeAgents.add(1);
    
    // Store agent ID for cleanup
    const agentId = registerResponse.json('agentId');
    
    // Simulate agent activity
    sleep(randomIntBetween(1, 5));
    
    // Update health status
    const healthResponse = http.post(
      `${BASE_URL}/api/registry/agents/${agentId}/health`,
      JSON.stringify({
        status: 'healthy',
        metrics: {
          cpu: Math.random() * 100,
          memory: Math.random() * 1024,
          uptime: Date.now()
        }
      }),
      { headers, tags: { operation: 'health_update' } }
    );
    
    check(healthResponse, {
      'health update successful': (r) => r.status === 200
    });
    
    // Random chance to deregister
    if (Math.random() < 0.3) {
      sleep(randomIntBetween(1, 3));
      
      const deregisterResponse = http.del(
        `${BASE_URL}/api/registry/agents/${agentId}`,
        null,
        { headers, tags: { operation: 'deregister' } }
      );
      
      check(deregisterResponse, {
        'deregistration successful': (r) => r.status === 200
      });
      
      activeAgents.add(-1);
    }
  }
  
  sleep(0.1); // Small delay between iterations
}

// Test scenario: Concurrent read/write operations
function testConcurrentOperations() {
  const operations = [
    { weight: 0.4, fn: performRegistration },
    { weight: 0.3, fn: performDiscovery },
    { weight: 0.2, fn: performHealthUpdate },
    { weight: 0.1, fn: performDeregistration }
  ];
  
  // Select operation based on weights
  const rand = Math.random();
  let cumWeight = 0;
  
  for (const op of operations) {
    cumWeight += op.weight;
    if (rand <= cumWeight) {
      op.fn();
      break;
    }
  }
}

function performRegistration() {
  const agentData = generateAgentData();
  
  const response = http.post(
    `${BASE_URL}/api/registry/agents`,
    JSON.stringify(agentData),
    { headers, tags: { operation: 'register' } }
  );
  
  check(response, {
    'registration successful': (r) => [201, 409].includes(r.status) // 409 for duplicates
  });
}

function performDiscovery() {
  const queries = [
    { type: 'processor' },
    { capabilities: 'data-processing' },
    { status: 'healthy' },
    { limit: 10, offset: 0 }
  ];
  
  const query = randomItem(queries);
  const queryString = Object.entries(query)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  
  const response = http.get(
    `${BASE_URL}/api/registry/agents?${queryString}`,
    { headers, tags: { operation: 'discovery' } }
  );
  
  check(response, {
    'discovery successful': (r) => r.status === 200,
    'has agents array': (r) => Array.isArray(r.json('agents'))
  });
}

function performHealthUpdate() {
  // Get a random agent to update
  const listResponse = http.get(
    `${BASE_URL}/api/registry/agents?limit=1`,
    { headers }
  );
  
  if (listResponse.status === 200 && listResponse.json('agents').length > 0) {
    const agent = listResponse.json('agents')[0];
    
    const healthResponse = http.post(
      `${BASE_URL}/api/registry/agents/${agent.agentId}/health`,
      JSON.stringify({
        status: randomItem(['healthy', 'degraded', 'critical']),
        metrics: {
          cpu: Math.random() * 100,
          memory: Math.random() * 1024
        }
      }),
      { headers, tags: { operation: 'health_update' } }
    );
    
    check(healthResponse, {
      'health update successful': (r) => r.status === 200
    });
  }
}

function performDeregistration() {
  // Get a random agent to deregister
  const listResponse = http.get(
    `${BASE_URL}/api/registry/agents?limit=1`,
    { headers }
  );
  
  if (listResponse.status === 200 && listResponse.json('agents').length > 0) {
    const agent = listResponse.json('agents')[0];
    
    const deregisterResponse = http.del(
      `${BASE_URL}/api/registry/agents/${agent.agentId}`,
      null,
      { headers, tags: { operation: 'deregister' } }
    );
    
    check(deregisterResponse, {
      'deregistration successful': (r) => [200, 404].includes(r.status)
    });
  }
}

// Test scenario: Registry capacity limits
function testRegistryCapacity() {
  const batchSize = 100;
  const agents = [];
  
  // Register agents in batches
  console.log(`Registering ${batchSize} agents in batch...`);
  
  for (let i = 0; i < batchSize; i++) {
    const agentData = generateAgentData();
    agents.push(agentData);
    
    const response = http.post(
      `${BASE_URL}/api/registry/agents`,
      JSON.stringify(agentData),
      { headers, tags: { operation: 'batch_register' } }
    );
    
    if (response.status !== 201) {
      console.error(`Failed to register agent ${i}: ${response.status}`);
      break;
    }
  }
  
  // Query all agents
  const queryResponse = http.get(
    `${BASE_URL}/api/registry/agents?limit=1000`,
    { headers, tags: { operation: 'list_all' } }
  );
  
  check(queryResponse, {
    'can retrieve all agents': (r) => r.status === 200,
    'correct agent count': (r) => r.json('agents').length >= agents.length
  });
  
  // Cleanup - deregister all test agents
  for (const agent of agents) {
    http.del(
      `${BASE_URL}/api/registry/agents/${agent.agentId}`,
      null,
      { headers, tags: { operation: 'cleanup' } }
    );
  }
}

// Lifecycle hooks
export function setup() {
  console.log('Setting up performance test...');
  
  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API health check failed: ${healthCheck.status}`);
  }
  
  return {
    startTime: Date.now(),
    testId: randomString(8)
  };
}

export function teardown(data) {
  console.log('Cleaning up performance test...');
  console.log(`Test duration: ${Date.now() - data.startTime}ms`);
  
  // Clean up any remaining test agents
  const response = http.get(
    `${BASE_URL}/api/registry/agents?metadata.test=true`,
    { headers }
  );
  
  if (response.status === 200) {
    const testAgents = response.json('agents');
    console.log(`Cleaning up ${testAgents.length} test agents...`);
    
    for (const agent of testAgents) {
      http.del(
        `${BASE_URL}/api/registry/agents/${agent.agentId}`,
        null,
        { headers }
      );
    }
  }
}

// Utility functions
function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}