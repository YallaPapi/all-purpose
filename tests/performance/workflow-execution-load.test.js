/**
 * Workflow Execution Load Test Scenarios
 * 
 * Performance tests for complex workflow execution,
 * concurrent coordination requests, and workflow throughput
 */

const k6 = require('k6');
const http = require('k6/http');
const { check, sleep, group } = require('k6');
const { Rate, Trend, Counter, Gauge } = require('k6/metrics');
const { randomString, randomItem } = require('https://jslib.k6.io/k6-utils/1.4.0/index.js');

// Custom metrics
const workflowCreationTime = new Trend('workflow_creation_time');
const workflowExecutionTime = new Trend('workflow_execution_time');
const workflowCompletionRate = new Rate('workflow_completion_rate');
const concurrentWorkflows = new Gauge('concurrent_workflows');
const stepsPerSecond = new Counter('steps_per_second');
const workflowErrors = new Rate('workflow_errors');

// Test configuration
export const options = {
  scenarios: {
    // Simple workflow throughput test
    simple_workflows: {
      executor: 'constant-arrival-rate',
      rate: 10, // 10 workflows per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      tags: { scenario: 'simple_workflows' }
    },
    
    // Complex workflow stress test
    complex_workflows: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '2m', target: 5 },   // Ramp to 5 workflows/sec
        { duration: '3m', target: 10 },  // Ramp to 10 workflows/sec
        { duration: '2m', target: 20 },  // Ramp to 20 workflows/sec
        { duration: '1m', target: 5 },   // Scale down
      ],
      startTime: '5m',
      tags: { scenario: 'complex_workflows' }
    },
    
    // Parallel execution test
    parallel_execution: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 1000,
      maxDuration: '10m',
      startTime: '13m',
      tags: { scenario: 'parallel_execution' }
    },
    
    // Long-running workflow test
    long_running: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 5,
      maxDuration: '20m',
      startTime: '23m',
      tags: { scenario: 'long_running' }
    }
  },
  
  thresholds: {
    // Workflow performance thresholds
    'workflow_creation_time': ['p(95)<1000'], // 95% under 1s
    'workflow_execution_time': ['p(95)<30000'], // 95% under 30s
    'workflow_completion_rate': ['rate>0.95'], // 95% success rate
    'workflow_errors': ['rate<0.05'], // Less than 5% errors
    
    // HTTP thresholds
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
    'http_req_failed': ['rate<0.1'], // Less than 10% HTTP errors
    
    // Throughput thresholds
    'steps_per_second': ['count>50'] // At least 50 steps/sec
  }
};

// Base configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const headers = {
  'Content-Type': 'application/json',
  'X-Test-Type': 'performance'
};

// Workflow templates
const WORKFLOW_TEMPLATES = {
  simple: {
    name: 'Simple Sequential Workflow',
    steps: [
      {
        id: 'validate',
        type: 'task',
        capabilities: ['validation'],
        timeout: 5000
      },
      {
        id: 'process',
        type: 'task',
        capabilities: ['data-processing'],
        timeout: 10000
      },
      {
        id: 'store',
        type: 'task',
        capabilities: ['storage'],
        timeout: 5000
      }
    ]
  },
  
  parallel: {
    name: 'Parallel Processing Workflow',
    steps: [
      {
        id: 'fetch',
        type: 'task',
        capabilities: ['data-processing']
      },
      {
        id: 'parallel-processing',
        type: 'parallel',
        steps: [
          {
            id: 'analyze-1',
            type: 'task',
            capabilities: ['analysis']
          },
          {
            id: 'analyze-2',
            type: 'task',
            capabilities: ['machine-learning']
          },
          {
            id: 'analyze-3',
            type: 'task',
            capabilities: ['validation']
          }
        ]
      },
      {
        id: 'aggregate',
        type: 'task',
        capabilities: ['transformation'],
        waitFor: ['analyze-1', 'analyze-2', 'analyze-3']
      }
    ]
  },
  
  complex: {
    name: 'Complex Conditional Workflow',
    steps: [
      {
        id: 'input-validation',
        type: 'task',
        capabilities: ['validation']
      },
      {
        id: 'risk-assessment',
        type: 'task',
        capabilities: ['analysis', 'machine-learning']
      },
      {
        id: 'conditional-branch',
        type: 'conditional',
        condition: {
          field: 'risk-assessment.output.riskLevel',
          operator: 'lessThan',
          value: 0.7
        },
        then: [
          {
            id: 'auto-approve',
            type: 'task',
            capabilities: ['processing']
          },
          {
            id: 'execute-action',
            type: 'task',
            capabilities: ['execution']
          }
        ],
        else: [
          {
            id: 'manual-review',
            type: 'task',
            capabilities: ['notification']
          },
          {
            id: 'escalate',
            type: 'task',
            capabilities: ['coordination']
          }
        ]
      },
      {
        id: 'audit-log',
        type: 'task',
        capabilities: ['storage'],
        alwaysRun: true
      }
    ]
  },
  
  longRunning: {
    name: 'Long Running Batch Workflow',
    persistent: true,
    steps: [
      {
        id: 'batch-init',
        type: 'task',
        capabilities: ['processing']
      },
      {
        id: 'batch-process',
        type: 'loop',
        iterations: 10,
        steps: [
          {
            id: 'fetch-batch',
            type: 'task',
            capabilities: ['data-processing']
          },
          {
            id: 'transform-batch',
            type: 'task',
            capabilities: ['transformation']
          },
          {
            id: 'checkpoint',
            type: 'checkpoint'
          }
        ]
      },
      {
        id: 'finalize',
        type: 'task',
        capabilities: ['reporting']
      }
    ]
  }
};

// Main test function
export default function() {
  const scenario = __ENV.scenario || exec.scenario.name;
  
  switch (scenario) {
    case 'simple_workflows':
      testSimpleWorkflowThroughput();
      break;
    case 'complex_workflows':
      testComplexWorkflowExecution();
      break;
    case 'parallel_execution':
      testParallelWorkflowExecution();
      break;
    case 'long_running':
      testLongRunningWorkflows();
      break;
    default:
      testSimpleWorkflowThroughput();
  }
}

// Test simple workflow throughput
function testSimpleWorkflowThroughput() {
  group('Simple Workflow Throughput', () => {
    const workflow = {
      ...WORKFLOW_TEMPLATES.simple,
      name: `${WORKFLOW_TEMPLATES.simple.name} - ${randomString(6)}`,
      metadata: {
        test: true,
        scenario: 'throughput',
        vu: __VU,
        iter: __ITER
      }
    };
    
    // Create workflow
    const createStart = Date.now();
    const createResponse = http.post(
      `${BASE_URL}/api/workflows`,
      JSON.stringify(workflow),
      { headers, tags: { operation: 'create_workflow' } }
    );
    
    workflowCreationTime.add(Date.now() - createStart);
    
    const workflowCreated = check(createResponse, {
      'workflow created': (r) => r.status === 201,
      'has workflow ID': (r) => r.json('workflowId') !== null
    });
    
    if (!workflowCreated) {
      workflowErrors.add(1);
      return;
    }
    
    const workflowId = createResponse.json('workflowId');
    concurrentWorkflows.add(1);
    
    // Execute workflow
    const execStart = Date.now();
    const execResponse = http.post(
      `${BASE_URL}/api/workflows/${workflowId}/execute`,
      JSON.stringify({
        context: {
          testRun: true,
          timestamp: Date.now()
        }
      }),
      { headers, tags: { operation: 'execute_workflow' } }
    );
    
    check(execResponse, {
      'execution started': (r) => r.status === 202,
      'has execution ID': (r) => r.json('executionId') !== null
    });
    
    if (execResponse.status !== 202) {
      workflowErrors.add(1);
      concurrentWorkflows.add(-1);
      return;
    }
    
    const executionId = execResponse.json('executionId');
    
    // Poll for completion
    const completed = pollWorkflowCompletion(workflowId, executionId, 30000);
    workflowExecutionTime.add(Date.now() - execStart);
    
    if (completed) {
      workflowCompletionRate.add(1);
      stepsPerSecond.add(workflow.steps.length);
    } else {
      workflowCompletionRate.add(0);
      workflowErrors.add(1);
    }
    
    concurrentWorkflows.add(-1);
  });
}

// Test complex workflow execution
function testComplexWorkflowExecution() {
  group('Complex Workflow Execution', () => {
    const workflow = {
      ...WORKFLOW_TEMPLATES.complex,
      name: `${WORKFLOW_TEMPLATES.complex.name} - ${randomString(6)}`
    };
    
    // Create and execute workflow
    const createResponse = http.post(
      `${BASE_URL}/api/workflows`,
      JSON.stringify(workflow),
      { headers }
    );
    
    if (createResponse.status !== 201) {
      workflowErrors.add(1);
      return;
    }
    
    const workflowId = createResponse.json('workflowId');
    
    // Execute with different input data to test branches
    const riskLevel = Math.random();
    const execResponse = http.post(
      `${BASE_URL}/api/workflows/${workflowId}/execute`,
      JSON.stringify({
        context: {
          inputData: {
            value: randomString(20),
            type: randomItem(['standard', 'premium', 'enterprise'])
          },
          mockResponses: {
            'risk-assessment': {
              output: { riskLevel }
            }
          }
        }
      }),
      { headers }
    );
    
    if (execResponse.status === 202) {
      const executionId = execResponse.json('executionId');
      const completed = pollWorkflowCompletion(workflowId, executionId, 60000);
      
      if (completed) {
        // Verify correct branch was executed
        const statusResponse = http.get(
          `${BASE_URL}/api/workflows/${workflowId}/executions/${executionId}`,
          { headers }
        );
        
        check(statusResponse, {
          'correct branch executed': (r) => {
            const steps = r.json('steps');
            if (riskLevel < 0.7) {
              return steps['auto-approve'] && steps['execute-action'];
            } else {
              return steps['manual-review'] && steps['escalate'];
            }
          }
        });
      }
    }
  });
}

// Test parallel workflow execution
function testParallelWorkflowExecution() {
  group('Parallel Workflow Execution', () => {
    const workflow = {
      ...WORKFLOW_TEMPLATES.parallel,
      name: `${WORKFLOW_TEMPLATES.parallel.name} - ${randomString(6)}`
    };
    
    const createResponse = http.post(
      `${BASE_URL}/api/workflows`,
      JSON.stringify(workflow),
      { headers }
    );
    
    if (createResponse.status !== 201) return;
    
    const workflowId = createResponse.json('workflowId');
    
    // Execute workflow
    const execStart = Date.now();
    const execResponse = http.post(
      `${BASE_URL}/api/workflows/${workflowId}/execute`,
      JSON.stringify({
        context: {
          dataSize: randomItem(['small', 'medium', 'large'])
        }
      }),
      { headers }
    );
    
    if (execResponse.status === 202) {
      const executionId = execResponse.json('executionId');
      
      // Monitor parallel execution
      let parallelStarted = false;
      let parallelCompleted = false;
      const startTime = Date.now();
      
      while (Date.now() - startTime < 30000) {
        const statusResponse = http.get(
          `${BASE_URL}/api/workflows/${workflowId}/executions/${executionId}`,
          { headers }
        );
        
        if (statusResponse.status === 200) {
          const status = statusResponse.json();
          
          // Check if parallel steps are running
          if (!parallelStarted && 
              status.steps['analyze-1']?.status === 'running' &&
              status.steps['analyze-2']?.status === 'running' &&
              status.steps['analyze-3']?.status === 'running') {
            parallelStarted = true;
          }
          
          // Check if all completed
          if (status.status === 'completed') {
            parallelCompleted = true;
            break;
          }
        }
        
        sleep(0.5);
      }
      
      check({ parallelStarted, parallelCompleted }, {
        'parallel steps ran concurrently': (r) => r.parallelStarted,
        'workflow completed successfully': (r) => r.parallelCompleted
      });
      
      workflowExecutionTime.add(Date.now() - execStart);
    }
  });
}

// Test long-running workflows
function testLongRunningWorkflows() {
  group('Long Running Workflows', () => {
    const workflow = {
      ...WORKFLOW_TEMPLATES.longRunning,
      name: `${WORKFLOW_TEMPLATES.longRunning.name} - ${randomString(6)}`
    };
    
    const createResponse = http.post(
      `${BASE_URL}/api/workflows`,
      JSON.stringify(workflow),
      { headers }
    );
    
    if (createResponse.status !== 201) return;
    
    const workflowId = createResponse.json('workflowId');
    
    // Execute workflow
    const execResponse = http.post(
      `${BASE_URL}/api/workflows/${workflowId}/execute`,
      JSON.stringify({
        context: {
          batchSize: 1000,
          processingDelay: 500 // ms per batch
        }
      }),
      { headers }
    );
    
    if (execResponse.status === 202) {
      const executionId = execResponse.json('executionId');
      
      // Monitor checkpoints
      let checkpointCount = 0;
      let lastCheckpoint = null;
      const startTime = Date.now();
      
      while (Date.now() - startTime < 300000) { // 5 minute timeout
        const statusResponse = http.get(
          `${BASE_URL}/api/workflows/${workflowId}/executions/${executionId}`,
          { headers }
        );
        
        if (statusResponse.status === 200) {
          const status = statusResponse.json();
          
          // Count checkpoints
          const currentCheckpoint = status.lastCheckpoint;
          if (currentCheckpoint && currentCheckpoint !== lastCheckpoint) {
            checkpointCount++;
            lastCheckpoint = currentCheckpoint;
            
            // Simulate recovery from checkpoint
            if (checkpointCount === 5 && Math.random() < 0.3) {
              // Suspend workflow
              http.post(
                `${BASE_URL}/api/workflows/${workflowId}/executions/${executionId}/suspend`,
                null,
                { headers }
              );
              
              sleep(2);
              
              // Resume from checkpoint
              http.post(
                `${BASE_URL}/api/workflows/${workflowId}/executions/${executionId}/resume`,
                null,
                { headers }
              );
            }
          }
          
          if (status.status === 'completed') {
            check({ checkpointCount }, {
              'all checkpoints reached': (r) => r.checkpointCount === 10
            });
            break;
          }
        }
        
        sleep(1);
      }
    }
  });
}

// Helper function to poll for workflow completion
function pollWorkflowCompletion(workflowId, executionId, timeout) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const response = http.get(
      `${BASE_URL}/api/workflows/${workflowId}/executions/${executionId}`,
      { headers, tags: { operation: 'poll_status' } }
    );
    
    if (response.status === 200) {
      const status = response.json('status');
      if (status === 'completed') {
        return true;
      } else if (status === 'failed') {
        return false;
      }
    }
    
    sleep(0.5); // Poll every 500ms
  }
  
  return false; // Timeout
}

// Setup and teardown
export function setup() {
  console.log('Setting up workflow performance test...');
  
  // Ensure required agents are available
  const requiredCapabilities = [
    'validation',
    'data-processing',
    'storage',
    'analysis',
    'machine-learning',
    'transformation',
    'processing',
    'execution',
    'notification',
    'coordination',
    'reporting'
  ];
  
  for (const capability of requiredCapabilities) {
    const response = http.post(
      `${BASE_URL}/api/discovery/query`,
      JSON.stringify({ capabilities: [capability] }),
      { headers }
    );
    
    if (response.status !== 200 || response.json('agents').length === 0) {
      console.warn(`No agents found with capability: ${capability}`);
    }
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  console.log('Cleaning up workflow performance test...');
  console.log(`Test duration: ${(Date.now() - data.startTime) / 1000}s`);
  
  // Clean up test workflows
  // Note: In production, implement a cleanup endpoint for test data
}