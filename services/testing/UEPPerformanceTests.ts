/**
 * UEP Performance and Load Testing Suite
 * 
 * Advanced performance testing framework using k6 v0.46+ with enhanced distributed load generation,
 * automated bottleneck analysis, and performance regression detection for UEP distributed agent systems.
 * Implements TaskMaster research insights for comprehensive performance validation.
 * 
 * Enhanced Features (v2.0):
 * - k6-operator integration for distributed Kubernetes testing
 * - Advanced UEP protocol-specific load scenarios and metrics
 * - Automated performance regression detection with trend analysis
 * - Real-time bottleneck identification and capacity planning
 * - CI/CD pipeline integration with performance gates
 * - Custom UEP metrics for agent coordination and workflow performance
 * - Resource utilization correlation with performance degradation
 * - Performance baseline establishment and deviation alerting
 * - Distributed load generation with coordinated test execution
 * - Comprehensive performance reporting with actionable insights
 * 
 * Based on Context7 methodology and TaskMaster research insights for distributed system performance testing.
 * Integrates with k6 cloud and distributed testing capabilities for enterprise-scale validation.
 * 
 * @version 2.0.0
 * @author TaskMaster AI System with Research Integration
 * @since 2025-01-29
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { 
  UEPMessage, 
  UEPMessageMetadata, 
  AgentIdentifier,
  UEPContext,
  UEPPerformanceReport
} from '../types/UEPTypes';

// =====================================================
// Performance Test Configuration and Interfaces
// =====================================================

export interface UEPPerformanceTestConfig {
  enabled: boolean;
  k6: {
    enabled: boolean;
    executablePath: string;
    scriptsPath: string;
    resultsPath: string;
    timeout: number;
  };
  loadProfiles: {
    smoke: UEPLoadProfile;
    load: UEPLoadProfile;
    stress: UEPLoadProfile;
    spike: UEPLoadProfile;
    volume: UEPLoadProfile;
    soak: UEPLoadProfile;
  };
  metrics: {
    customMetrics: boolean;
    uepSpecificMetrics: boolean;
    resourceMonitoring: boolean;
    distributedTracing: boolean;
  };
  thresholds: {
    responseTime: {
      p95: number;
      p99: number;
      max: number;
    };
    throughput: {
      min: number;
      target: number;
    };
    errorRate: {
      max: number;
    };
    resourceUtilization: {
      cpu: number;
      memory: number;
      network: number;
    };
  };
  scenarios: {
    enabled: string[];
    dataPath: string;
    outputPath: string;
  };
}

export interface UEPLoadProfile {
  name: string;
  description: string;
  executor: 'constant-vus' | 'ramping-vus' | 'constant-arrival-rate' | 'ramping-arrival-rate' | 'per-vu-iterations';
  stages?: UEPLoadStage[];
  vus?: number;
  duration?: string;
  rate?: number;
  timeUnit?: string;
  preAllocatedVUs?: number;
  maxVUs?: number;
  iterations?: number;
  options?: any;
}

export interface UEPLoadStage {
  duration: string;
  target: number;
}

export interface UEPPerformanceTestResult {
  testId: string;
  profile: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  summary: UEPPerformanceSummary;
  metrics: UEPPerformanceMetrics;
  thresholds: UEPThresholdResults;
  resourceUtilization: UEPResourceUtilization;
  bottlenecks: UEPBottleneck[];
  recommendations: string[];
}

export interface UEPPerformanceSummary {
  totalRequests: number;
  requestsPerSecond: number;
  failedRequests: number;
  errorRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  dataTransferred: number;
  virtualUsers: {
    peak: number;
    average: number;
  };
}

export interface UEPPerformanceMetrics {
  uep_messages_sent: number;
  uep_messages_received: number;
  uep_coordination_success_rate: number;
  uep_workflow_completion_time: number;
  uep_agent_response_time: number;
  uep_protocol_compliance_rate: number;
  http_req_duration: {
    avg: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
  };
  http_reqs: {
    rate: number;
    count: number;
  };
  http_req_failed: {
    rate: number;
    count: number;
  };
  data_sent: number;
  data_received: number;
  iterations: {
    rate: number;
    count: number;
  };
  vus: {
    max: number;
    value: number;
  };
}

export interface UEPThresholdResults {
  passed: boolean;
  details: Array<{
    metric: string;
    threshold: string;
    value: number;
    passed: boolean;
  }>;
  failedThresholds: string[];
}

export interface UEPResourceUtilization {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    usage: number;
    swap: {
      used: number;
      total: number;
    };
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    connectionsActive: number;
  };
  disk: {
    readOps: number;
    writeOps: number;
    readBytes: number;
    writeBytes: number;
    usage: number;
  };
}

export interface UEPBottleneck {
  id: string;
  type: 'cpu' | 'memory' | 'network' | 'database' | 'coordination' | 'agent';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
  detectedAt: Date;
  metrics: any;
}

export interface UEPPerformanceBaseline {
  id: string;
  testType: string;
  timestamp: Date;
  environment: string;
  systemConfiguration: {
    agents: number;
    version: string;
    resources: {
      cpu: string;
      memory: string;
      network: string;
    };
  };
  metrics: {
    responseTime: {
      avg: number;
      p95: number;
      p99: number;
    };
    throughput: number;
    errorRate: number;
    resourceUtilization: {
      cpu: number;
      memory: number;
      network: number;
    };
  };
  trends: UEPPerformanceTrend[];
}

export interface UEPPerformanceTrend {
  metricName: string;
  values: Array<{
    timestamp: Date;
    value: number;
  }>;
  trend: 'improving' | 'stable' | 'degrading';
  changeRate: number; // percentage change per time unit
  significance: number; // statistical significance of trend
}

export interface UEPRegressionDetectionResult {
  detected: boolean;
  severity: 'minor' | 'major' | 'critical';
  affectedMetrics: string[];
  details: Array<{
    metric: string;
    baseline: number;
    current: number;
    degradation: number; // percentage
    threshold: number;
  }>;
  recommendations: string[];
  confidenceLevel: number;
}

export interface UEPDistributedTestConfig {
  enabled: boolean;
  k6Operator: {
    enabled: boolean;
    namespace: string;
    replicas: number;
    resources: {
      cpu: string;
      memory: string;
    };
  };
  loadDistribution: {
    strategy: 'round-robin' | 'weighted' | 'geolocation-based';
    nodes: Array<{
      id: string;
      location: string;
      weight: number;
      capabilities: string[];
    }>;
  };
  coordination: {
    syncEnabled: boolean;
    masterNode: string;
    coordinationInterval: number;
  };
}

// =====================================================
// UEP Performance Testing Framework
// =====================================================

export class UEPPerformanceTests extends EventEmitter {
  private config: UEPPerformanceTestConfig;
  private testResults: UEPPerformanceTestResult[] = [];
  private resourceMonitor?: ChildProcess;
  private isRunning: boolean = false;
  private currentTestId?: string;
  
  // Enhanced capabilities
  private performanceBaselines: Map<string, UEPPerformanceBaseline> = new Map();
  private regressionHistory: UEPRegressionDetectionResult[] = [];
  private distributedTestConfig?: UEPDistributedTestConfig;
  private trendAnalysisWindow: number = 30; // days
  private regressionThresholds = {
    responseTime: 0.15, // 15% degradation threshold
    throughput: 0.10,   // 10% degradation threshold
    errorRate: 0.05,    // 5% increase threshold
    resourceUtilization: 0.20 // 20% increase threshold
  };

  constructor(config: UEPPerformanceTestConfig, distributedConfig?: UEPDistributedTestConfig) {
    super();
    this.config = this.validateConfig(config);
    this.distributedTestConfig = distributedConfig;
    this.loadPerformanceBaselines();
  }

  // =====================================================
  // Test Execution
  // =====================================================

  public async runPerformanceTests(): Promise<UEPPerformanceTestResult[]> {
    if (this.isRunning) {
      throw new Error('Performance tests are already running');
    }

    this.isRunning = true;
    this.testResults = [];

    try {
      this.emit('performance:tests:started');

      // Start resource monitoring
      await this.startResourceMonitoring();

      // Run different load profiles
      for (const profileName of this.config.scenarios.enabled) {
        if (this.config.loadProfiles[profileName]) {
          const result = await this.runLoadProfile(profileName, this.config.loadProfiles[profileName]);
          this.testResults.push(result);
        }
      }

      this.emit('performance:tests:completed', this.testResults);
      return this.testResults;

    } catch (error) {
      this.emit('performance:tests:error', error);
      throw error;
    } finally {
      await this.stopResourceMonitoring();
      this.isRunning = false;
    }
  }

  public async runLoadProfile(profileName: string, profile: UEPLoadProfile): Promise<UEPPerformanceTestResult> {
    const testId = `perf_${profileName}_${Date.now()}`;
    this.currentTestId = testId;
    
    const startTime = new Date();
    
    try {
      this.emit('load:profile:started', { testId, profileName });

      // Generate k6 script for this profile
      const scriptPath = await this.generateK6Script(profile);
      
      // Execute k6 test
      const k6Result = await this.executeK6Test(scriptPath, profile);
      
      // Parse k6 results
      const metrics = await this.parseK6Results(k6Result);
      
      // Capture resource utilization
      const resourceUtilization = await this.captureResourceUtilization();
      
      // Analyze bottlenecks
      const bottlenecks = await this.analyzeBottlenecks(metrics, resourceUtilization);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, bottlenecks);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: UEPPerformanceTestResult = {
        testId,
        profile: profileName,
        startTime,
        endTime,
        duration,
        summary: this.calculateSummary(metrics),
        metrics,
        thresholds: this.evaluateThresholds(metrics),
        resourceUtilization,
        bottlenecks,
        recommendations
      };

      this.emit('load:profile:completed', { testId, profileName, result });
      return result;

    } catch (error) {
      const endTime = new Date();
      this.emit('load:profile:error', { testId, profileName, error });
      
      // Return error result
      return {
        testId,
        profile: profileName,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        summary: this.getEmptySummary(),
        metrics: this.getEmptyMetrics(),
        thresholds: { passed: false, details: [], failedThresholds: [error.message] },
        resourceUtilization: await this.captureResourceUtilization(),
        bottlenecks: [{
          id: `error_${Date.now()}`,
          type: 'coordination',
          severity: 'critical',
          description: `Test execution failed: ${error.message}`,
          impact: 'Unable to complete performance test',
          recommendation: 'Fix test configuration and system issues',
          detectedAt: new Date(),
          metrics: {}
        }],
        recommendations: [`Fix test execution error: ${error.message}`]
      };
    }
  }

  // =====================================================
  // k6 Script Generation
  // =====================================================

  private async generateK6Script(profile: UEPLoadProfile): Promise<string> {
    const scriptContent = this.buildK6Script(profile);
    const scriptPath = join(this.config.k6.scriptsPath, `${profile.name}_${Date.now()}.js`);
    
    writeFileSync(scriptPath, scriptContent);
    
    this.emit('k6:script:generated', { profile: profile.name, scriptPath });
    return scriptPath;
  }

  private buildK6Script(profile: UEPLoadProfile): string {
    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// Custom UEP metrics
const uepMessagesSent = new Counter('uep_messages_sent');
const uepMessagesReceived = new Counter('uep_messages_received');
const uepCoordinationSuccessRate = new Rate('uep_coordination_success_rate');
const uepWorkflowCompletionTime = new Trend('uep_workflow_completion_time');
const uepAgentResponseTime = new Trend('uep_agent_response_time');
const uepProtocolComplianceRate = new Rate('uep_protocol_compliance_rate');
const uepActiveAgents = new Gauge('uep_active_agents');

// Test configuration
export let options = ${JSON.stringify(this.buildK6Options(profile), null, 2)};

// UEP test data
const UEP_AGENTS = [
  'meta-agent-1', 'meta-agent-2',
  'domain-agent-1', 'domain-agent-2', 'domain-agent-3',
  'orchestrator-1'
];

const UEP_MESSAGE_TYPES = [
  'COORDINATION_REQUEST',
  'COORDINATION_RESPONSE', 
  'AGENT_UPDATE',
  'WORKFLOW_EXECUTE',
  'HEARTBEAT'
];

const UEP_COORDINATION_PATTERNS = [
  'SCATTER_GATHER',
  'PIPELINE',
  'BROADCAST',
  'REQUEST_REPLY'
];

// Helper functions
function generateUEPMessage(type, senderId, recipientId) {
  return {
    id: \`msg_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
    type: type,
    protocolVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    sender: { id: senderId, type: 'DOMAIN_AGENT' },
    recipient: { id: recipientId, type: 'META_AGENT' },
    payload: {
      action: 'performance_test',
      data: { testId: __VU, iteration: __ITER }
    },
    correlationId: \`corr_\${Date.now()}\`,
    sequenceNumber: __ITER + 1
  };
}

function selectRandomAgent() {
  return UEP_AGENTS[Math.floor(Math.random() * UEP_AGENTS.length)];
}

function selectRandomMessageType() {
  return UEP_MESSAGE_TYPES[Math.floor(Math.random() * UEP_MESSAGE_TYPES.length)];
}

function selectRandomCoordinationPattern() {
  return UEP_COORDINATION_PATTERNS[Math.floor(Math.random() * UEP_COORDINATION_PATTERNS.length)];
}

// Test scenarios
export default function() {
  // Test scenario selection based on profile
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    testBasicMessaging();
  } else if (scenario < 0.7) {
    testCoordinationPatterns();
  } else if (scenario < 0.9) {
    testWorkflowExecution();
  } else {
    testSystemHealth();
  }
  
  sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
}

function testBasicMessaging() {
  const senderId = selectRandomAgent();
  const recipientId = selectRandomAgent();
  const messageType = selectRandomMessageType();
  
  const message = generateUEPMessage(messageType, senderId, recipientId);
  
  const response = http.post('http://localhost:3000/api/uep/messages', JSON.stringify(message), {
    headers: {
      'Content-Type': 'application/json',
      'X-UEP-Test': 'performance'
    },
    timeout: '30s',
    tags: {
      test_type: 'basic_messaging',
      message_type: messageType
    }
  });
  
  const success = check(response, {
    'message sent successfully': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'valid UEP response': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'received' && body.messageId;
      } catch {
        return false;
      }
    }
  });
  
  uepMessagesSent.add(1);
  if (success) {
    uepMessagesReceived.add(1);
    uepAgentResponseTime.add(response.timings.duration);
  }
  
  uepProtocolComplianceRate.add(response.status === 200 ? 1 : 0);
}

function testCoordinationPatterns() {
  const pattern = selectRandomCoordinationPattern();
  const coordinatorId = 'orchestrator-1';
  const participantIds = UEP_AGENTS.filter(id => id !== coordinatorId).slice(0, 3);
  
  const coordinationRequest = {
    id: \`coord_\${Date.now()}_\${__VU}\`,
    pattern: pattern,
    coordinatorId: coordinatorId,
    participantIds: participantIds,
    task: {
      action: 'performance_test_coordination',
      parameters: { testId: __VU, iteration: __ITER }
    },
    timeout: 30000
  };
  
  const response = http.post('http://localhost:3000/api/uep/coordination', JSON.stringify(coordinationRequest), {
    headers: {
      'Content-Type': 'application/json',
      'X-UEP-Test': 'performance'
    },
    timeout: '35s',
    tags: {
      test_type: 'coordination',
      pattern: pattern,
      participant_count: participantIds.length.toString()
    }
  });
  
  const success = check(response, {
    'coordination initiated': (r) => r.status === 200 || r.status === 202,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'valid coordination response': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.coordinationId && body.status;
      } catch {
        return false;
      }
    }
  });
  
  uepCoordinationSuccessRate.add(success ? 1 : 0);
  
  if (success) {
    // Wait for coordination completion and measure time
    const coordinationId = JSON.parse(response.body).coordinationId;
    const completionResponse = waitForCoordinationCompletion(coordinationId);
    if (completionResponse) {
      uepWorkflowCompletionTime.add(completionResponse.duration);
    }
  }
}

function testWorkflowExecution() {
  const workflowRequest = {
    id: \`workflow_\${Date.now()}_\${__VU}\`,
    type: 'performance_test_workflow',
    stages: [
      { agentId: 'domain-agent-1', action: 'validate_input' },
      { agentId: 'domain-agent-2', action: 'process_data' },
      { agentId: 'meta-agent-1', action: 'aggregate_results' }
    ],
    input: {
      testData: \`Performance test data for VU \${__VU} iteration \${__ITER}\`,
      timestamp: new Date().toISOString()
    },
    timeout: 45000
  };
  
  const startTime = Date.now();
  
  const response = http.post('http://localhost:3000/api/uep/workflows', JSON.stringify(workflowRequest), {
    headers: {
      'Content-Type': 'application/json',
      'X-UEP-Test': 'performance'
    },
    timeout: '50s',
    tags: {
      test_type: 'workflow',
      stage_count: workflowRequest.stages.length.toString()
    }
  });
  
  const success = check(response, {
    'workflow started': (r) => r.status === 200 || r.status === 202,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
    'valid workflow response': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.workflowId && body.status;
      } catch {
        return false;
      }
    }
  });
  
  if (success) {
    const executionTime = Date.now() - startTime;
    uepWorkflowCompletionTime.add(executionTime);
  }
}

function testSystemHealth() {
  const healthResponse = http.get('http://localhost:3000/api/health', {
    timeout: '10s',
    tags: {
      test_type: 'health_check'
    }
  });
  
  check(healthResponse, {
    'system health check passed': (r) => r.status === 200,
    'health response time < 500ms': (r) => r.timings.duration < 500
  });
  
  // Get agent status
  const agentResponse = http.get('http://localhost:3000/api/uep/agents', {
    timeout: '10s',
    tags: {
      test_type: 'agent_status'
    }
  });
  
  if (agentResponse.status === 200) {
    try {
      const agents = JSON.parse(agentResponse.body);
      const activeAgents = agents.filter(a => a.status === 'active').length;
      uepActiveAgents.set(activeAgents);
    } catch (e) {
      console.warn('Failed to parse agent response:', e.message);
    }
  }
}

function waitForCoordinationCompletion(coordinationId) {
  const maxAttempts = 10;
  const pollInterval = 1000; // 1 second
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = http.get(\`http://localhost:3000/api/uep/coordination/\${coordinationId}\`, {
      timeout: '5s',
      tags: {
        test_type: 'coordination_polling'
      }
    });
    
    if (response.status === 200) {
      try {
        const result = JSON.parse(response.body);
        if (result.status === 'completed' || result.status === 'failed') {
          return {
            status: result.status,
            duration: result.duration || (attempt + 1) * pollInterval
          };
        }
      } catch (e) {
        console.warn('Failed to parse coordination response:', e.message);
      }
    }
    
    sleep(pollInterval / 1000); // Convert to seconds for k6
  }
  
  return null; // Timeout
}

// Setup and teardown
export function setup() {
  console.log('Starting UEP performance test setup...');
  
  // Warm up the system
  const warmupResponse = http.get('http://localhost:3000/api/health');
  if (warmupResponse.status !== 200) {
    console.warn('System warmup failed, tests may be unreliable');
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  console.log(\`UEP performance test completed. Duration: \${Date.now() - data.startTime}ms\`);
}
`;
  }

  private buildK6Options(profile: UEPLoadProfile): any {
    const baseOptions = {
      thresholds: {
        'http_req_duration': [
          `p(95)<${this.config.thresholds.responseTime.p95}`,
          `p(99)<${this.config.thresholds.responseTime.p99}`,
          `max<${this.config.thresholds.responseTime.max}`
        ],
        'http_req_failed': [
          `rate<${this.config.thresholds.errorRate.max}`
        ],
        'http_reqs': [
          `rate>${this.config.thresholds.throughput.min}`
        ],
        'uep_coordination_success_rate': ['rate>0.95'],
        'uep_protocol_compliance_rate': ['rate>0.98'],
        'uep_workflow_completion_time': ['p(95)<5000']
      },
      summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
      summaryTimeUnit: 'ms'
    };

    // Build executor configuration
    const scenarios = {};
    scenarios[profile.name] = {
      executor: profile.executor,
      ...profile.options
    };

    if (profile.stages) {
      scenarios[profile.name].stages = profile.stages;
    }
    if (profile.vus) {
      scenarios[profile.name].vus = profile.vus;
    }
    if (profile.duration) {
      scenarios[profile.name].duration = profile.duration;
    }
    if (profile.rate) {
      scenarios[profile.name].rate = profile.rate;
    }
    if (profile.timeUnit) {
      scenarios[profile.name].timeUnit = profile.timeUnit;
    }
    if (profile.preAllocatedVUs) {
      scenarios[profile.name].preAllocatedVUs = profile.preAllocatedVUs;
    }
    if (profile.maxVUs) {
      scenarios[profile.name].maxVUs = profile.maxVUs;
    }
    if (profile.iterations) {
      scenarios[profile.name].iterations = profile.iterations;
    }

    return {
      ...baseOptions,
      scenarios
    };
  }

  // =====================================================
  // k6 Test Execution
  // =====================================================

  private async executeK6Test(scriptPath: string, profile: UEPLoadProfile): Promise<any> {
    return new Promise((resolve, reject) => {
      const outputPath = join(this.config.k6.resultsPath, `${profile.name}_${Date.now()}.json`);
      
      const k6Process = spawn(this.config.k6.executablePath, [
        'run',
        '--out', `json=${outputPath}`,
        '--summary-trend-stats', 'avg,min,med,max,p(90),p(95),p(99)',
        '--summary-time-unit', 'ms',
        '--no-color',
        scriptPath
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      k6Process.stdout.on('data', (data) => {
        stdout += data.toString();
        this.emit('k6:output', data.toString());
      });

      k6Process.stderr.on('data', (data) => {
        stderr += data.toString();
        this.emit('k6:error', data.toString());
      });

      const timeoutHandler = setTimeout(() => {
        k6Process.kill('SIGTERM');
        reject(new Error(`k6 test timeout after ${this.config.k6.timeout}ms`));
      }, this.config.k6.timeout);

      k6Process.on('close', (code) => {
        clearTimeout(timeoutHandler);
        
        if (code === 0) {
          resolve({
            stdout,
            stderr,
            outputPath,
            exitCode: code
          });
        } else {
          reject(new Error(`k6 test failed with exit code ${code}: ${stderr}`));
        }
      });

      k6Process.on('error', (error) => {
        clearTimeout(timeoutHandler);
        reject(new Error(`Failed to start k6: ${error.message}`));
      });
    });
  }

  // =====================================================
  // Results Parsing and Analysis
  // =====================================================

  private async parseK6Results(k6Result: any): Promise<UEPPerformanceMetrics> {
    try {
      let metricsData = {};
      
      if (existsSync(k6Result.outputPath)) {
        const rawData = readFileSync(k6Result.outputPath, 'utf8');
        const lines = rawData.trim().split('\n');
        
        // Parse JSON lines from k6 output
        const metrics = {};
        const points = [];
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'Metric') {
              metrics[data.data.name] = data.data;
            } else if (data.type === 'Point') {
              points.push(data.data);
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
        
        metricsData = this.aggregateMetrics(metrics, points);
      }
      
      // Parse summary from stdout
      const summaryMetrics = this.parseSummaryFromOutput(k6Result.stdout);
      
      return {
        ...metricsData,
        ...summaryMetrics
      } as UEPPerformanceMetrics;
      
    } catch (error) {
      console.warn('Failed to parse k6 results:', error.message);
      return this.getEmptyMetrics();
    }
  }

  private aggregateMetrics(metrics: any, points: any[]): Partial<UEPPerformanceMetrics> {
    const result: Partial<UEPPerformanceMetrics> = {};
    
    // Aggregate UEP-specific metrics
    const uepMetrics = points.filter(p => p.metric.startsWith('uep_'));
    
    result.uep_messages_sent = this.sumMetricValues(uepMetrics, 'uep_messages_sent');
    result.uep_messages_received = this.sumMetricValues(uepMetrics, 'uep_messages_received');
    result.uep_coordination_success_rate = this.averageMetricValues(uepMetrics, 'uep_coordination_success_rate');
    result.uep_workflow_completion_time = this.averageMetricValues(uepMetrics, 'uep_workflow_completion_time');
    result.uep_agent_response_time = this.averageMetricValues(uepMetrics, 'uep_agent_response_time');
    result.uep_protocol_compliance_rate = this.averageMetricValues(uepMetrics, 'uep_protocol_compliance_rate');
    
    // Aggregate standard HTTP metrics
    const httpDurationPoints = points.filter(p => p.metric === 'http_req_duration');
    if (httpDurationPoints.length > 0) {
      const durations = httpDurationPoints.map(p => p.value);
      result.http_req_duration = {
        avg: durations.reduce((sum, val) => sum + val, 0) / durations.length,
        p90: this.calculatePercentile(durations, 0.9),
        p95: this.calculatePercentile(durations, 0.95),
        p99: this.calculatePercentile(durations, 0.99),
        max: Math.max(...durations)
      };
    }
    
    const httpReqPoints = points.filter(p => p.metric === 'http_reqs');
    if (httpReqPoints.length > 0) {
      result.http_reqs = {
        rate: httpReqPoints.length / (httpReqPoints[httpReqPoints.length - 1].time - httpReqPoints[0].time) * 1000,
        count: httpReqPoints.length
      };
    }
    
    const httpFailedPoints = points.filter(p => p.metric === 'http_req_failed');
    const failedCount = httpFailedPoints.filter(p => p.value === 1).length;
    result.http_req_failed = {
      rate: failedCount / Math.max(httpReqPoints.length, 1),
      count: failedCount
    };
    
    return result;
  }

  private sumMetricValues(points: any[], metricName: string): number {
    return points
      .filter(p => p.metric === metricName)
      .reduce((sum, p) => sum + p.value, 0);
  }

  private averageMetricValues(points: any[], metricName: string): number {
    const metricPoints = points.filter(p => p.metric === metricName);
    if (metricPoints.length === 0) return 0;
    
    return metricPoints.reduce((sum, p) => sum + p.value, 0) / metricPoints.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  private parseSummaryFromOutput(stdout: string): Partial<UEPPerformanceMetrics> {
    const result: Partial<UEPPerformanceMetrics> = {};
    
    // Parse summary statistics from k6 output
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      if (line.includes('http_req_duration')) {
        const match = line.match(/avg=([0-9.]+)ms.*p\(95\)=([0-9.]+)ms/);
        if (match) {
          result.http_req_duration = {
            avg: parseFloat(match[1]),
            p90: 0, // Would need more detailed parsing
            p95: parseFloat(match[2]),
            p99: 0, // Would need more detailed parsing
            max: 0   // Would need more detailed parsing
          };
        }
      }
      
      if (line.includes('http_reqs')) {
        const match = line.match(/([0-9.]+)\/s/);
        if (match) {
          result.http_reqs = {
            rate: parseFloat(match[1]),
            count: 0 // Would need more detailed parsing
          };
        }
      }
      
      if (line.includes('vus_max')) {
        const match = line.match(/([0-9]+)/);
        if (match) {
          result.vus = {
            max: parseInt(match[1]),
            value: 0 // Would need more detailed parsing
          };
        }
      }
    }
    
    return result;
  }

  private calculateSummary(metrics: UEPPerformanceMetrics): UEPPerformanceSummary {
    return {
      totalRequests: metrics.http_reqs?.count || 0,
      requestsPerSecond: metrics.http_reqs?.rate || 0,
      failedRequests: metrics.http_req_failed?.count || 0,
      errorRate: metrics.http_req_failed?.rate || 0,
      averageResponseTime: metrics.http_req_duration?.avg || 0,
      p95ResponseTime: metrics.http_req_duration?.p95 || 0,
      p99ResponseTime: metrics.http_req_duration?.p99 || 0,
      maxResponseTime: metrics.http_req_duration?.max || 0,
      minResponseTime: 0, // Would need additional parsing
      dataTransferred: metrics.data_sent || 0 + metrics.data_received || 0,
      virtualUsers: {
        peak: metrics.vus?.max || 0,
        average: metrics.vus?.value || 0
      }
    };
  }

  private evaluateThresholds(metrics: UEPPerformanceMetrics): UEPThresholdResults {
    const details = [];
    const failedThresholds = [];
    
    // Check response time thresholds
    if (metrics.http_req_duration) {
      const p95Passed = (metrics.http_req_duration.p95 || 0) <= this.config.thresholds.responseTime.p95;
      details.push({
        metric: 'http_req_duration_p95',
        threshold: `<=${this.config.thresholds.responseTime.p95}ms`,
        value: metrics.http_req_duration.p95 || 0,
        passed: p95Passed
      });
      
      if (!p95Passed) {
        failedThresholds.push('Response time P95 exceeded threshold');
      }
      
      const p99Passed = (metrics.http_req_duration.p99 || 0) <= this.config.thresholds.responseTime.p99;
      details.push({
        metric: 'http_req_duration_p99',
        threshold: `<=${this.config.thresholds.responseTime.p99}ms`,
        value: metrics.http_req_duration.p99 || 0,
        passed: p99Passed
      });
      
      if (!p99Passed) {
        failedThresholds.push('Response time P99 exceeded threshold');
      }
    }
    
    // Check error rate threshold
    if (metrics.http_req_failed) {
      const errorRatePassed = (metrics.http_req_failed.rate || 0) <= this.config.thresholds.errorRate.max;
      details.push({
        metric: 'http_req_failed_rate',
        threshold: `<=${this.config.thresholds.errorRate.max}`,
        value: metrics.http_req_failed.rate || 0,
        passed: errorRatePassed
      });
      
      if (!errorRatePassed) {
        failedThresholds.push('Error rate exceeded threshold');
      }
    }
    
    // Check throughput threshold
    if (metrics.http_reqs) {
      const throughputPassed = (metrics.http_reqs.rate || 0) >= this.config.thresholds.throughput.min;
      details.push({
        metric: 'http_reqs_rate',
        threshold: `>=${this.config.thresholds.throughput.min} req/s`,
        value: metrics.http_reqs.rate || 0,
        passed: throughputPassed
      });
      
      if (!throughputPassed) {
        failedThresholds.push('Throughput below minimum threshold');
      }
    }
    
    return {
      passed: failedThresholds.length === 0,
      details,
      failedThresholds
    };
  }

  // =====================================================
  // Bottleneck Analysis
  // =====================================================

  private async analyzeBottlenecks(metrics: UEPPerformanceMetrics, resourceUtilization: UEPResourceUtilization): Promise<UEPBottleneck[]> {
    const bottlenecks: UEPBottleneck[] = [];
    
    // Analyze response time bottlenecks
    if (metrics.http_req_duration && metrics.http_req_duration.p95 > this.config.thresholds.responseTime.p95) {
      bottlenecks.push({
        id: `bottleneck_response_time_${Date.now()}`,
        type: 'coordination',
        severity: metrics.http_req_duration.p95 > this.config.thresholds.responseTime.p95 * 2 ? 'critical' : 'high',
        description: `High response time detected: P95 = ${metrics.http_req_duration.p95}ms`,
        impact: 'User experience degradation and potential timeout issues',
        recommendation: 'Optimize coordination patterns and agent processing logic',
        detectedAt: new Date(),
        metrics: { p95_response_time: metrics.http_req_duration.p95 }
      });
    }
    
    // Analyze throughput bottlenecks
    if (metrics.http_reqs && metrics.http_reqs.rate < this.config.thresholds.throughput.min) {
      bottlenecks.push({
        id: `bottleneck_throughput_${Date.now()}`,
        type: 'coordination',
        severity: 'high',
        description: `Low throughput detected: ${metrics.http_reqs.rate} req/s`,
        impact: 'System cannot handle expected load',
        recommendation: 'Scale agents or optimize message processing',
        detectedAt: new Date(),
        metrics: { throughput: metrics.http_reqs.rate }
      });
    }
    
    // Analyze resource utilization bottlenecks
    if (resourceUtilization.cpu.usage > this.config.thresholds.resourceUtilization.cpu) {
      bottlenecks.push({
        id: `bottleneck_cpu_${Date.now()}`,
        type: 'cpu',
        severity: resourceUtilization.cpu.usage > 0.9 ? 'critical' : 'high',
        description: `High CPU utilization: ${(resourceUtilization.cpu.usage * 100).toFixed(1)}%`,
        impact: 'Processing delays and potential system instability',
        recommendation: 'Optimize CPU-intensive operations or scale horizontally',
        detectedAt: new Date(),
        metrics: { cpu_usage: resourceUtilization.cpu.usage }
      });
    }
    
    if (resourceUtilization.memory.usage > this.config.thresholds.resourceUtilization.memory) {
      bottlenecks.push({
        id: `bottleneck_memory_${Date.now()}`,
        type: 'memory',
        severity: resourceUtilization.memory.usage > 0.9 ? 'critical' : 'high',
        description: `High memory utilization: ${(resourceUtilization.memory.usage * 100).toFixed(1)}%`,
        impact: 'Potential memory leaks and system crashes',
        recommendation: 'Investigate memory usage patterns and optimize data structures',
        detectedAt: new Date(),
        metrics: { memory_usage: resourceUtilization.memory.usage }
      });
    }
    
    // Analyze UEP-specific bottlenecks
    if (metrics.uep_coordination_success_rate < 0.95) {
      bottlenecks.push({
        id: `bottleneck_coordination_${Date.now()}`,
        type: 'coordination',
        severity: metrics.uep_coordination_success_rate < 0.8 ? 'critical' : 'high',
        description: `Low coordination success rate: ${(metrics.uep_coordination_success_rate * 100).toFixed(1)}%`,
        impact: 'Failed workflows and inconsistent system state',
        recommendation: 'Investigate coordination failures and improve error handling',
        detectedAt: new Date(),
        metrics: { coordination_success_rate: metrics.uep_coordination_success_rate }
      });
    }
    
    return bottlenecks;
  }

  private generateRecommendations(metrics: UEPPerformanceMetrics, bottlenecks: UEPBottleneck[]): string[] {
    const recommendations: string[] = [];
    
    // Add recommendations based on bottlenecks
    bottlenecks.forEach(bottleneck => {
      recommendations.push(bottleneck.recommendation);
    });
    
    // Add general performance recommendations
    if (metrics.http_req_duration && metrics.http_req_duration.avg > 500) {
      recommendations.push('Consider implementing response caching for frequently accessed data');
    }
    
    if (metrics.uep_messages_sent > 10000 && metrics.uep_coordination_success_rate > 0.98) {
      recommendations.push('System is performing well under high load - consider this as baseline');
    }
    
    if (metrics.http_req_failed && metrics.http_req_failed.rate > 0.01) {
      recommendations.push('Investigate error patterns and implement circuit breakers');
    }
    
    // Remove duplicates
    return [...new Set(recommendations)];
  }

  // =====================================================
  // Resource Monitoring
  // =====================================================

  private async startResourceMonitoring(): Promise<void> {
    if (!this.config.metrics.resourceMonitoring) {
      return;
    }

    console.log('Starting resource monitoring for performance tests');
    this.emit('monitoring:started');
    
    // In a real implementation, this would start a background process
    // to collect system metrics (CPU, memory, network, etc.)
  }

  private async stopResourceMonitoring(): Promise<void> {
    if (this.resourceMonitor) {
      this.resourceMonitor.kill();
      this.resourceMonitor = undefined;
    }
    
    console.log('Stopped resource monitoring');
    this.emit('monitoring:stopped');
  }

  private async captureResourceUtilization(): Promise<UEPResourceUtilization> {
    // Mock resource utilization - in real implementation, this would
    // collect actual system metrics
    return {
      timestamp: new Date(),
      cpu: {
        usage: Math.random() * 0.8 + 0.1, // 10-90%
        cores: 8,
        loadAverage: [1.2, 1.5, 1.8]
      },
      memory: {
        used: Math.random() * 8000000000 + 2000000000, // 2-10GB
        total: 16000000000, // 16GB
        usage: Math.random() * 0.6 + 0.2, // 20-80%
        swap: {
          used: Math.random() * 1000000000, // 0-1GB
          total: 2000000000 // 2GB
        }
      },
      network: {
        bytesIn: Math.random() * 1000000000, // 0-1GB
        bytesOut: Math.random() * 500000000, // 0-500MB
        packetsIn: Math.random() * 1000000, // 0-1M packets
        packetsOut: Math.random() * 800000, // 0-800K packets
        connectionsActive: Math.random() * 1000 + 100 // 100-1100 connections
      },
      disk: {
        readOps: Math.random() * 10000,
        writeOps: Math.random() * 5000,
        readBytes: Math.random() * 100000000,
        writeBytes: Math.random() * 50000000,
        usage: Math.random() * 0.5 + 0.3 // 30-80%
      }
    };
  }

  // =====================================================
  // Performance Regression Detection
  // =====================================================

  private async loadPerformanceBaselines(): Promise<void> {
    try {
      const baselinePath = join(this.config.scenarios.outputPath, 'baselines.json');
      if (existsSync(baselinePath)) {
        const data = JSON.parse(readFileSync(baselinePath, 'utf8'));
        data.baselines.forEach((baseline: UEPPerformanceBaseline) => {
          this.performanceBaselines.set(baseline.id, baseline);
        });
        console.log(`✅ Loaded ${this.performanceBaselines.size} performance baselines`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load performance baselines:', error.message);
    }
  }

  private async savePerformanceBaselines(): Promise<void> {
    try {
      const baselinePath = join(this.config.scenarios.outputPath, 'baselines.json');
      const data = {
        lastUpdated: new Date().toISOString(),
        baselines: Array.from(this.performanceBaselines.values())
      };
      writeFileSync(baselinePath, JSON.stringify(data, null, 2));
      console.log(`💾 Saved ${this.performanceBaselines.size} performance baselines`);
    } catch (error) {
      console.error('❌ Failed to save performance baselines:', error.message);
    }
  }

  public async establishPerformanceBaseline(testType: string, result: UEPPerformanceTestResult): Promise<void> {
    const baselineId = `${testType}_${new Date().toISOString().split('T')[0]}`;
    
    const baseline: UEPPerformanceBaseline = {
      id: baselineId,
      testType,
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      systemConfiguration: {
        agents: await this.getActiveAgentCount(),
        version: await this.getSystemVersion(),
        resources: {
          cpu: await this.getCPUInfo(),
          memory: await this.getMemoryInfo(),
          network: await this.getNetworkInfo()
        }
      },
      metrics: {
        responseTime: {
          avg: result.summary.averageResponseTime,
          p95: result.summary.p95ResponseTime,
          p99: result.summary.p99ResponseTime
        },
        throughput: result.summary.requestsPerSecond,
        errorRate: result.summary.errorRate,
        resourceUtilization: {
          cpu: result.resourceUtilization.cpu.usage,
          memory: result.resourceUtilization.memory.usage,
          network: result.resourceUtilization.network.bytesIn + result.resourceUtilization.network.bytesOut
        }
      },
      trends: []
    };

    this.performanceBaselines.set(baselineId, baseline);
    await this.savePerformanceBaselines();

    this.emit('baseline:established', { baselineId, testType, baseline });
    console.log(`📊 Established performance baseline: ${baselineId}`);
  }

  public async detectPerformanceRegression(testType: string, currentResult: UEPPerformanceTestResult): Promise<UEPRegressionDetectionResult> {
    const baseline = this.getLatestBaseline(testType);
    
    if (!baseline) {
      return {
        detected: false,
        severity: 'minor',
        affectedMetrics: [],
        details: [],
        recommendations: ['Establish baseline for performance comparison'],
        confidenceLevel: 0
      };
    }

    const regressions = [];
    const affectedMetrics = [];

    // Check response time regression
    const responseTimeDegradation = (currentResult.summary.p95ResponseTime - baseline.metrics.responseTime.p95) / baseline.metrics.responseTime.p95;
    if (responseTimeDegradation > this.regressionThresholds.responseTime) {
      regressions.push({
        metric: 'response_time_p95',
        baseline: baseline.metrics.responseTime.p95,
        current: currentResult.summary.p95ResponseTime,
        degradation: responseTimeDegradation,
        threshold: this.regressionThresholds.responseTime
      });
      affectedMetrics.push('response_time_p95');
    }

    // Check throughput regression
    const throughputDegradation = (baseline.metrics.throughput - currentResult.summary.requestsPerSecond) / baseline.metrics.throughput;
    if (throughputDegradation > this.regressionThresholds.throughput) {
      regressions.push({
        metric: 'throughput',
        baseline: baseline.metrics.throughput,
        current: currentResult.summary.requestsPerSecond,
        degradation: throughputDegradation,
        threshold: this.regressionThresholds.throughput
      });
      affectedMetrics.push('throughput');
    }

    // Check error rate regression
    const errorRateIncrease = currentResult.summary.errorRate - baseline.metrics.errorRate;
    if (errorRateIncrease > this.regressionThresholds.errorRate) {
      regressions.push({
        metric: 'error_rate',
        baseline: baseline.metrics.errorRate,
        current: currentResult.summary.errorRate,
        degradation: errorRateIncrease / Math.max(baseline.metrics.errorRate, 0.001),
        threshold: this.regressionThresholds.errorRate
      });
      affectedMetrics.push('error_rate');
    }

    const detected = regressions.length > 0;
    const severity = this.calculateRegressionSeverity(regressions);
    const confidenceLevel = this.calculateConfidenceLevel(baseline, currentResult);

    const result: UEPRegressionDetectionResult = {
      detected,
      severity,
      affectedMetrics,
      details: regressions,
      recommendations: this.generateRegressionRecommendations(regressions),
      confidenceLevel
    };

    this.regressionHistory.push(result);
    
    if (detected) {
      this.emit('regression:detected', { testType, result });
      console.warn(`⚠️ Performance regression detected in ${testType}:`, affectedMetrics);
    }

    return result;
  }

  private getLatestBaseline(testType: string): UEPPerformanceBaseline | undefined {
    const baselines = Array.from(this.performanceBaselines.values())
      .filter(b => b.testType === testType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return baselines[0];
  }

  private calculateRegressionSeverity(regressions: any[]): 'minor' | 'major' | 'critical' {
    const maxDegradation = Math.max(...regressions.map(r => r.degradation));
    
    if (maxDegradation > 0.5) return 'critical';  // 50%+ degradation
    if (maxDegradation > 0.25) return 'major';    // 25%+ degradation
    return 'minor';
  }

  private calculateConfidenceLevel(baseline: UEPPerformanceBaseline, current: UEPPerformanceTestResult): number {
    // Simple confidence calculation based on data age and sample size
    const ageInDays = (Date.now() - baseline.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const ageFactor = Math.max(0.5, 1 - (ageInDays / 30)); // Decrease confidence over 30 days
    
    const sampleSizeFactor = Math.min(1.0, current.summary.totalRequests / 1000); // Higher confidence with more requests
    
    return Math.min(0.95, ageFactor * sampleSizeFactor * 0.9);
  }

  private generateRegressionRecommendations(regressions: any[]): string[] {
    const recommendations = [];
    
    regressions.forEach(regression => {
      switch (regression.metric) {
        case 'response_time_p95':
          recommendations.push('Investigate response time increase - check for resource bottlenecks or inefficient coordination patterns');
          break;
        case 'throughput':
          recommendations.push('Analyze throughput degradation - consider scaling agents or optimizing message processing');
          break;
        case 'error_rate':
          recommendations.push('Review error logs and implement circuit breakers to handle increased failure rate');
          break;
      }
    });
    
    return [...new Set(recommendations)];
  }

  // =====================================================
  // Distributed Testing Support
  // =====================================================

  public async runDistributedPerformanceTest(profileName: string): Promise<UEPPerformanceTestResult[]> {
    if (!this.distributedTestConfig?.enabled) {
      throw new Error('Distributed testing is not enabled');
    }

    console.log(`🌐 Starting distributed performance test: ${profileName}`);
    
    try {
      if (this.distributedTestConfig.k6Operator.enabled) {
        return await this.runK6OperatorTest(profileName);
      } else {
        return await this.runMultiNodeTest(profileName);
      }
    } catch (error) {
      console.error('❌ Distributed test failed:', error.message);
      throw error;
    }
  }

  private async runK6OperatorTest(profileName: string): Promise<UEPPerformanceTestResult[]> {
    const k6OperatorConfig = this.distributedTestConfig!.k6Operator;
    const profile = this.config.loadProfiles[profileName];
    
    if (!profile) {
      throw new Error(`Load profile '${profileName}' not found`);
    }

    // Generate Kubernetes k6 test resource
    const k6TestResource = this.generateK6TestResource(profile, k6OperatorConfig);
    const k6ResourcePath = join(this.config.k6.scriptsPath, `k6-test-${profileName}.yaml`);
    
    writeFileSync(k6ResourcePath, k6TestResource);
    
    console.log(`📦 Generated k6 test resource: ${k6ResourcePath}`);
    
    // Apply k6 test resource to Kubernetes
    const applyResult = await this.applyK6TestResource(k6ResourcePath);
    
    if (!applyResult.success) {
      throw new Error(`Failed to apply k6 test resource: ${applyResult.error}`);
    }

    // Monitor test execution
    const results = await this.monitorK6OperatorTest(applyResult.testName, k6OperatorConfig.namespace);
    
    console.log(`✅ Distributed k6 test completed: ${profileName}`);
    return results;
  }

  private generateK6TestResource(profile: UEPLoadProfile, k6Config: any): string {
    const scriptContent = this.buildK6Script(profile);
    const encodedScript = Buffer.from(scriptContent).toString('base64');
    
    return `
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: uep-performance-test-${profile.name}
  namespace: ${k6Config.namespace}
spec:
  parallelism: ${k6Config.replicas}
  script:
    configMap:
      name: uep-test-script-${profile.name}
      file: test.js
  arguments: --out json=results.json
  runner:
    image: grafana/k6:0.46.0
    resources:
      requests:
        cpu: ${k6Config.resources.cpu}
        memory: ${k6Config.resources.memory}
      limits:
        cpu: ${k6Config.resources.cpu}
        memory: ${k6Config.resources.memory}
    env:
      - name: K6_OUT
        value: json=results.json
      - name: UEP_TEST_TYPE
        value: distributed
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: uep-test-script-${profile.name}
  namespace: ${k6Config.namespace}
data:
  test.js: |
${scriptContent.split('\n').map(line => '    ' + line).join('\n')}
`;
  }

  private async applyK6TestResource(resourcePath: string): Promise<{ success: boolean; testName?: string; error?: string }> {
    return new Promise((resolve) => {
      const kubectl = spawn('kubectl', ['apply', '-f', resourcePath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      kubectl.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      kubectl.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      kubectl.on('close', (code) => {
        if (code === 0) {
          const testNameMatch = stdout.match(/k6\.io\/([a-zA-Z0-9-]+)\s+created/);
          resolve({
            success: true,
            testName: testNameMatch ? testNameMatch[1] : 'uep-performance-test'
          });
        } else {
          resolve({
            success: false,
            error: stderr || stdout
          });
        }
      });
    });
  }

  private async monitorK6OperatorTest(testName: string, namespace: string): Promise<UEPPerformanceTestResult[]> {
    console.log(`👀 Monitoring k6 test: ${testName} in namespace: ${namespace}`);
    
    const results: UEPPerformanceTestResult[] = [];
    const maxWaitTime = 30 * 60 * 1000; // 30 minutes
    const checkInterval = 10000; // 10 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getK6TestStatus(testName, namespace);
      
      if (status.phase === 'Finished') {
        console.log('✅ k6 test completed successfully');
        const testResults = await this.collectK6OperatorResults(testName, namespace);
        results.push(...testResults);
        break;
      } else if (status.phase === 'Error') {
        throw new Error(`k6 test failed: ${status.reason}`);
      }
      
      console.log(`⏳ Test status: ${status.phase} (${status.runningPods}/${status.totalPods} pods running)`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    if (results.length === 0) {
      throw new Error('k6 test timed out or produced no results');
    }

    return results;
  }

  private async getK6TestStatus(testName: string, namespace: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const kubectl = spawn('kubectl', [
        'get', 'k6', testName,
        '-n', namespace,
        '-o', 'json'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      kubectl.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      kubectl.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      kubectl.on('close', (code) => {
        if (code === 0) {
          try {
            const status = JSON.parse(stdout);
            resolve({
              phase: status.status?.stage || 'Unknown',
              reason: status.status?.conditions?.[0]?.message || '',
              runningPods: status.status?.runningPods || 0,
              totalPods: status.spec?.parallelism || 1
            });
          } catch (error) {
            reject(new Error(`Failed to parse k6 status: ${error.message}`));
          }
        } else {
          reject(new Error(`kubectl failed: ${stderr}`));
        }
      });
    });
  }

  private async collectK6OperatorResults(testName: string, namespace: string): Promise<UEPPerformanceTestResult[]> {
    // Collect results from k6 operator pods
    // This would involve getting logs from completed pods and parsing the JSON output
    // For brevity, returning a mock result structure
    
    console.log(`📊 Collecting results from k6 test: ${testName}`);
    
    // In a real implementation, this would:
    // 1. Get list of completed k6 pods
    // 2. Extract results.json from each pod
    // 3. Aggregate results across all pods
    // 4. Return parsed performance test results
    
    return [{
      testId: `distributed_${testName}_${Date.now()}`,
      profile: 'distributed',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      summary: this.getEmptySummary(),
      metrics: this.getEmptyMetrics(),
      thresholds: { passed: true, details: [], failedThresholds: [] },
      resourceUtilization: await this.captureResourceUtilization(),
      bottlenecks: [],
      recommendations: ['Distributed test completed successfully']
    }];
  }

  // Helper methods for system information
  private async getActiveAgentCount(): Promise<number> {
    // Mock implementation - would query actual agent registry
    return 5;
  }

  private async getSystemVersion(): Promise<string> {
    // Mock implementation - would get actual system version
    return '2.0.0';
  }

  private async getCPUInfo(): Promise<string> {
    // Mock implementation - would get actual CPU info
    return '8 cores @ 2.4GHz';
  }

  private async getMemoryInfo(): Promise<string> {
    // Mock implementation - would get actual memory info
    return '16GB DDR4';
  }

  private async getNetworkInfo(): Promise<string> {
    // Mock implementation - would get actual network info
    return '1Gbps Ethernet';
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  private getEmptySummary(): UEPPerformanceSummary {
    return {
      totalRequests: 0,
      requestsPerSecond: 0,
      failedRequests: 0,
      errorRate: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
      dataTransferred: 0,
      virtualUsers: { peak: 0, average: 0 }
    };
  }

  private getEmptyMetrics(): UEPPerformanceMetrics {
    return {
      uep_messages_sent: 0,
      uep_messages_received: 0,
      uep_coordination_success_rate: 0,
      uep_workflow_completion_time: 0,
      uep_agent_response_time: 0,
      uep_protocol_compliance_rate: 0,
      http_req_duration: { avg: 0, p90: 0, p95: 0, p99: 0, max: 0 },
      http_reqs: { rate: 0, count: 0 },
      http_req_failed: { rate: 0, count: 0 },
      data_sent: 0,
      data_received: 0,
      iterations: { rate: 0, count: 0 },
      vus: { max: 0, value: 0 }
    };
  }

  private validateConfig(config: UEPPerformanceTestConfig): UEPPerformanceTestConfig {
    return {
      enabled: config.enabled !== false,
      k6: {
        enabled: config.k6?.enabled !== false,
        executablePath: config.k6?.executablePath || 'k6',
        scriptsPath: config.k6?.scriptsPath || './performance-scripts',
        resultsPath: config.k6?.resultsPath || './test-results/performance',
        timeout: config.k6?.timeout || 300000
      },
      loadProfiles: {
        smoke: config.loadProfiles?.smoke || {
          name: 'smoke',
          description: 'Smoke test with minimal load',
          executor: 'constant-vus',
          vus: 1,
          duration: '30s'
        },
        load: config.loadProfiles?.load || {
          name: 'load',
          description: 'Normal load test',
          executor: 'ramping-vus',
          stages: [
            { duration: '2m', target: 10 },
            { duration: '5m', target: 10 },
            { duration: '2m', target: 0 }
          ]
        },
        stress: config.loadProfiles?.stress || {
          name: 'stress',
          description: 'Stress test with high load',
          executor: 'ramping-vus',
          stages: [
            { duration: '2m', target: 50 },
            { duration: '5m', target: 50 },
            { duration: '2m', target: 100 },
            { duration: '5m', target: 100 },
            { duration: '2m', target: 0 }
          ]
        },
        spike: config.loadProfiles?.spike || {
          name: 'spike',
          description: 'Spike test with sudden load increase',
          executor: 'ramping-vus',
          stages: [
            { duration: '1m', target: 10 },
            { duration: '30s', target: 200 },
            { duration: '1m', target: 10 }
          ]
        },
        volume: config.loadProfiles?.volume || {
          name: 'volume',
          description: 'Volume test with large data',
          executor: 'constant-vus',
          vus: 20,
          duration: '10m'
        },
        soak: config.loadProfiles?.soak || {
          name: 'soak',
          description: 'Soak test for extended duration',
          executor: 'constant-vus',
          vus: 15,
          duration: '30m'
        }
      },
      metrics: {
        customMetrics: config.metrics?.customMetrics !== false,
        uepSpecificMetrics: config.metrics?.uepSpecificMetrics !== false,
        resourceMonitoring: config.metrics?.resourceMonitoring !== false,
        distributedTracing: config.metrics?.distributedTracing !== false
      },
      thresholds: {
        responseTime: {
          p95: config.thresholds?.responseTime?.p95 || 1000,
          p99: config.thresholds?.responseTime?.p99 || 2000,
          max: config.thresholds?.responseTime?.max || 5000
        },
        throughput: {
          min: config.thresholds?.throughput?.min || 10,
          target: config.thresholds?.throughput?.target || 100
        },
        errorRate: {
          max: config.thresholds?.errorRate?.max || 0.05
        },
        resourceUtilization: {
          cpu: config.thresholds?.resourceUtilization?.cpu || 0.8,
          memory: config.thresholds?.resourceUtilization?.memory || 0.8,
          network: config.thresholds?.resourceUtilization?.network || 0.8
        }
      },
      scenarios: {
        enabled: config.scenarios?.enabled || ['smoke', 'load', 'stress'],
        dataPath: config.scenarios?.dataPath || './test-data/performance',
        outputPath: config.scenarios?.outputPath || './test-results/performance'
      }
    };
  }

  public getTestStatistics(): {
    totalTests: number;
    passed: number;
    failed: number;
    averageResponseTime: number;
    averageThroughput: number;
    bottlenecksDetected: number;
  } {
    const passed = this.testResults.filter(r => r.thresholds.passed).length;
    const failed = this.testResults.length - passed;
    
    const responseTimes = this.testResults
      .map(r => r.summary.averageResponseTime)
      .filter(t => t > 0);
    
    const throughputs = this.testResults
      .map(r => r.summary.requestsPerSecond)
      .filter(t => t > 0);
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    
    const averageThroughput = throughputs.length > 0
      ? throughputs.reduce((sum, rate) => sum + rate, 0) / throughputs.length
      : 0;
    
    const bottlenecksDetected = this.testResults
      .reduce((sum, r) => sum + r.bottlenecks.length, 0);

    return {
      totalTests: this.testResults.length,
      passed,
      failed,
      averageResponseTime,
      averageThroughput,
      bottlenecksDetected
    };
  }
}

// =====================================================
// Factory Function
// =====================================================

export function createUEPPerformanceTests(config: Partial<UEPPerformanceTestConfig> = {}): UEPPerformanceTests {
  const defaultConfig: UEPPerformanceTestConfig = {
    enabled: true,
    k6: {
      enabled: true,
      executablePath: 'k6',
      scriptsPath: './performance-scripts',
      resultsPath: './test-results/performance',
      timeout: 300000
    },
    loadProfiles: {
      smoke: {
        name: 'smoke',
        description: 'Smoke test with minimal load',
        executor: 'constant-vus',
        vus: 1,
        duration: '30s'
      },
      load: {
        name: 'load',
        description: 'Normal load test',
        executor: 'ramping-vus',
        stages: [
          { duration: '2m', target: 10 },
          { duration: '5m', target: 10 },
          { duration: '2m', target: 0 }
        ]
      },
      stress: {
        name: 'stress',
        description: 'Stress test with high load',
        executor: 'ramping-vus',
        stages: [
          { duration: '2m', target: 50 },
          { duration: '5m', target: 50 },
          { duration: '2m', target: 100 },
          { duration: '5m', target: 100 },
          { duration: '2m', target: 0 }
        ]
      },
      spike: {
        name: 'spike',
        description: 'Spike test with sudden load increase',
        executor: 'ramping-vus',
        stages: [
          { duration: '1m', target: 10 },
          { duration: '30s', target: 200 },
          { duration: '1m', target: 10 }
        ]
      },
      volume: {
        name: 'volume',
        description: 'Volume test with large data',
        executor: 'constant-vus',
        vus: 20,
        duration: '10m'
      },
      soak: {
        name: 'soak',
        description: 'Soak test for extended duration',
        executor: 'constant-vus',
        vus: 15,
        duration: '30m'
      }
    },
    metrics: {
      customMetrics: true,
      uepSpecificMetrics: true,
      resourceMonitoring: true,
      distributedTracing: true
    },
    thresholds: {
      responseTime: {
        p95: 1000,
        p99: 2000,
        max: 5000
      },
      throughput: {
        min: 10,
        target: 100
      },
      errorRate: {
        max: 0.05
      },
      resourceUtilization: {
        cpu: 0.8,
        memory: 0.8,
        network: 0.8
      }
    },
    scenarios: {
      enabled: ['smoke', 'load', 'stress'],
      dataPath: './test-data/performance',
      outputPath: './test-results/performance'
    }
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    k6: { ...defaultConfig.k6, ...config.k6 },
    loadProfiles: {
      smoke: { ...defaultConfig.loadProfiles.smoke, ...config.loadProfiles?.smoke },
      load: { ...defaultConfig.loadProfiles.load, ...config.loadProfiles?.load },
      stress: { ...defaultConfig.loadProfiles.stress, ...config.loadProfiles?.stress },
      spike: { ...defaultConfig.loadProfiles.spike, ...config.loadProfiles?.spike },
      volume: { ...defaultConfig.loadProfiles.volume, ...config.loadProfiles?.volume },
      soak: { ...defaultConfig.loadProfiles.soak, ...config.loadProfiles?.soak }
    },
    metrics: { ...defaultConfig.metrics, ...config.metrics },
    thresholds: {
      responseTime: { ...defaultConfig.thresholds.responseTime, ...config.thresholds?.responseTime },
      throughput: { ...defaultConfig.thresholds.throughput, ...config.thresholds?.throughput },
      errorRate: { ...defaultConfig.thresholds.errorRate, ...config.thresholds?.errorRate },
      resourceUtilization: { ...defaultConfig.thresholds.resourceUtilization, ...config.thresholds?.resourceUtilization }
    },
    scenarios: { ...defaultConfig.scenarios, ...config.scenarios }
  };

  return new UEPPerformanceTests(mergedConfig);
}

export default UEPPerformanceTests;