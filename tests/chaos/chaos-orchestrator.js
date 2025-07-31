/**
 * Automated Chaos Test Orchestration
 * 
 * Based on TaskMaster research insights:
 * - Integrates chaos experiments into CI/CD pipelines
 * - Implements kill switches for rapid recovery
 * - Schedules regular chaos tests
 * - Minimizes blast radius
 * - Tracks business and technical KPIs
 */

const Redis = require('ioredis');
const { EventEmitter } = require('events');
const schedule = require('node-schedule');
const { v4: uuidv4 } = require('uuid');
const AgentFailureChaosTests = require('./agent-failure-scenarios');
const NetworkPartitionChaosTests = require('./network-partition-scenarios');

// Configuration
const ORCHESTRATOR_CONFIG = {
  redis: {
    url: process.env.CHAOS_REDIS_URL || 'redis://localhost:6379'
  },
  schedule: {
    // Run chaos tests at specific times
    daily: '0 2 * * *', // 2 AM daily
    weekly: '0 3 * * 0', // 3 AM Sunday
    continuous: process.env.CONTINUOUS_CHAOS === 'true'
  },
  safety: {
    killSwitch: true,
    maxBlastRadius: 0.3, // Max 30% of system affected
    minSystemHealth: 0.7, // Min 70% health required
    businessHourProtection: true,
    alertThreshold: 0.5
  },
  monitoring: {
    metricsInterval: 5000, // 5s
    healthCheckInterval: 10000, // 10s
    reportingInterval: 60000 // 1m
  },
  scenarios: {
    agent_failures: {
      enabled: true,
      weight: 0.3,
      minInterval: 3600000 // 1 hour
    },
    network_partitions: {
      enabled: true,
      weight: 0.3,
      minInterval: 7200000 // 2 hours
    },
    resource_exhaustion: {
      enabled: true,
      weight: 0.2,
      minInterval: 14400000 // 4 hours
    },
    time_travel: {
      enabled: true,
      weight: 0.2,
      minInterval: 28800000 // 8 hours
    }
  }
};

class ChaosOrchestrator extends EventEmitter {
  constructor() {
    super();
    
    this.redis = new Redis(ORCHESTRATOR_CONFIG.redis.url);
    this.isRunning = false;
    this.currentExperiment = null;
    this.killSwitchActivated = false;
    this.scheduledJobs = [];
    this.metrics = {
      experimentsRun: 0,
      experimentsAborted: 0,
      killSwitchActivations: 0,
      totalDowntime: 0,
      businessImpact: 0
    };
    
    // Track KPIs
    this.kpis = {
      technical: {
        availability: 1.0,
        latency: 0,
        errorRate: 0,
        throughput: 0
      },
      business: {
        orderProcessingRate: 1.0,
        userSatisfaction: 1.0,
        revenueImpact: 0
      }
    };
    
    // Initialize chaos test instances
    this.chaosTests = {
      agentFailures: new AgentFailureChaosTests(),
      networkPartitions: new NetworkPartitionChaosTests()
    };
  }
  
  async start() {
    console.log('🚀 Starting Chaos Orchestrator...');
    
    this.isRunning = true;
    
    // Initialize kill switch listener
    await this.initializeKillSwitch();
    
    // Start monitoring
    await this.startMonitoring();
    
    // Schedule chaos experiments
    await this.scheduleExperiments();
    
    // Start continuous chaos if enabled
    if (ORCHESTRATOR_CONFIG.schedule.continuous) {
      await this.startContinuousChaos();
    }
    
    console.log('✅ Chaos Orchestrator started');
    this.emit('started');
  }
  
  async stop() {
    console.log('🛑 Stopping Chaos Orchestrator...');
    
    this.isRunning = false;
    
    // Cancel all scheduled jobs
    this.scheduledJobs.forEach(job => job.cancel());
    this.scheduledJobs = [];
    
    // Stop current experiment if running
    if (this.currentExperiment) {
      await this.abortExperiment('orchestrator_shutdown');
    }
    
    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    // Close Redis connection
    this.redis.disconnect();
    
    console.log('✅ Chaos Orchestrator stopped');
    this.emit('stopped');
  }
  
  async initializeKillSwitch() {
    // Subscribe to kill switch channel
    const killSwitchRedis = new Redis(ORCHESTRATOR_CONFIG.redis.url);
    
    await killSwitchRedis.subscribe('chaos:kill-switch');
    
    killSwitchRedis.on('message', async (channel, message) => {
      if (channel === 'chaos:kill-switch') {
        console.log('🚨 KILL SWITCH ACTIVATED!');
        this.killSwitchActivated = true;
        this.metrics.killSwitchActivations++;
        
        // Immediately abort current experiment
        if (this.currentExperiment) {
          await this.abortExperiment('kill_switch');
        }
        
        // Pause all chaos activities
        await this.pauseChaos();
        
        // Emit alert
        this.emit('kill-switch-activated', { reason: message });
      }
    });
    
    // HTTP endpoint for kill switch
    this.killSwitchEndpoint = '/chaos/kill-switch';
  }
  
  async startMonitoring() {
    // Monitor system health
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.checkSystemHealth();
      
      if (health.score < ORCHESTRATOR_CONFIG.safety.minSystemHealth) {
        console.log(`⚠️  System health below threshold: ${health.score}`);
        
        if (this.currentExperiment) {
          await this.abortExperiment('low_system_health');
        }
      }
      
      // Update KPIs
      await this.updateKPIs(health);
      
    }, ORCHESTRATOR_CONFIG.monitoring.healthCheckInterval);
    
    // Monitor metrics
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, ORCHESTRATOR_CONFIG.monitoring.metricsInterval);
    
    // Generate reports
    this.reportingInterval = setInterval(async () => {
      await this.generateReport();
    }, ORCHESTRATOR_CONFIG.monitoring.reportingInterval);
  }
  
  async scheduleExperiments() {
    // Daily lightweight chaos
    if (ORCHESTRATOR_CONFIG.schedule.daily) {
      const dailyJob = schedule.scheduleJob(ORCHESTRATOR_CONFIG.schedule.daily, async () => {
        await this.runScheduledChaos('daily');
      });
      this.scheduledJobs.push(dailyJob);
    }
    
    // Weekly comprehensive chaos
    if (ORCHESTRATOR_CONFIG.schedule.weekly) {
      const weeklyJob = schedule.scheduleJob(ORCHESTRATOR_CONFIG.schedule.weekly, async () => {
        await this.runScheduledChaos('weekly');
      });
      this.scheduledJobs.push(weeklyJob);
    }
  }
  
  async startContinuousChaos() {
    console.log('🔄 Starting continuous chaos mode...');
    
    while (this.isRunning && !this.killSwitchActivated) {
      // Check if it's safe to run chaos
      if (await this.isSafeToRunChaos()) {
        // Select random scenario
        const scenario = await this.selectChaosScenario();
        
        if (scenario) {
          await this.runChaosExperiment(scenario);
        }
      }
      
      // Wait between experiments
      await this.delay(300000); // 5 minutes
    }
  }
  
  async isSafeToRunChaos() {
    // Check business hours protection
    if (ORCHESTRATOR_CONFIG.safety.businessHourProtection) {
      const now = new Date();
      const hour = now.getHours();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      
      if (!isWeekend && hour >= 9 && hour < 17) {
        console.log('⏰ Business hours protection active');
        return false;
      }
    }
    
    // Check system health
    const health = await this.checkSystemHealth();
    if (health.score < ORCHESTRATOR_CONFIG.safety.minSystemHealth) {
      console.log(`❌ System health too low: ${health.score}`);
      return false;
    }
    
    // Check blast radius
    const currentImpact = await this.calculateCurrentImpact();
    if (currentImpact > ORCHESTRATOR_CONFIG.safety.maxBlastRadius) {
      console.log(`❌ Blast radius too large: ${currentImpact}`);
      return false;
    }
    
    // Check kill switch
    if (this.killSwitchActivated) {
      console.log('❌ Kill switch is active');
      return false;
    }
    
    return true;
  }
  
  async selectChaosScenario() {
    const availableScenarios = [];
    const now = Date.now();
    
    // Check which scenarios are available based on min interval
    for (const [name, config] of Object.entries(ORCHESTRATOR_CONFIG.scenarios)) {
      if (!config.enabled) continue;
      
      const lastRun = await this.redis.get(`chaos:last-run:${name}`);
      const timeSinceLastRun = lastRun ? now - parseInt(lastRun) : Infinity;
      
      if (timeSinceLastRun >= config.minInterval) {
        availableScenarios.push({ name, weight: config.weight });
      }
    }
    
    if (availableScenarios.length === 0) {
      return null;
    }
    
    // Weighted random selection
    const totalWeight = availableScenarios.reduce((sum, s) => sum + s.weight, 0);
    const random = Math.random() * totalWeight;
    
    let cumWeight = 0;
    for (const scenario of availableScenarios) {
      cumWeight += scenario.weight;
      if (random <= cumWeight) {
        return scenario.name;
      }
    }
    
    return availableScenarios[0].name;
  }
  
  async runChaosExperiment(scenarioName) {
    console.log(`\n🎲 Running chaos experiment: ${scenarioName}`);
    
    const experimentId = uuidv4();
    this.currentExperiment = {
      id: experimentId,
      scenario: scenarioName,
      startTime: Date.now(),
      status: 'running'
    };
    
    // Record experiment start
    await this.recordExperimentStart(experimentId, scenarioName);
    
    // Emit experiment start event
    this.emit('experiment-started', this.currentExperiment);
    
    try {
      // Take pre-experiment snapshot
      const preSnapshot = await this.takeSystemSnapshot();
      
      // Run the chaos scenario
      let result;
      switch (scenarioName) {
        case 'agent_failures':
          result = await this.runAgentFailureScenario();
          break;
        case 'network_partitions':
          result = await this.runNetworkPartitionScenario();
          break;
        case 'resource_exhaustion':
          result = await this.runResourceExhaustionScenario();
          break;
        case 'time_travel':
          result = await this.runTimeTravelScenario();
          break;
        default:
          throw new Error(`Unknown scenario: ${scenarioName}`);
      }
      
      // Take post-experiment snapshot
      const postSnapshot = await this.takeSystemSnapshot();
      
      // Analyze impact
      const impact = await this.analyzeExperimentImpact(preSnapshot, postSnapshot, result);
      
      // Record experiment completion
      await this.recordExperimentEnd(experimentId, 'completed', result, impact);
      
      // Update last run time
      await this.redis.set(`chaos:last-run:${scenarioName}`, Date.now());
      
      this.metrics.experimentsRun++;
      
      // Emit experiment completed event
      this.emit('experiment-completed', {
        ...this.currentExperiment,
        status: 'completed',
        result,
        impact
      });
      
    } catch (error) {
      console.error(`❌ Chaos experiment failed: ${error.message}`);
      
      // Record failure
      await this.recordExperimentEnd(experimentId, 'failed', null, { error: error.message });
      
      // Emit experiment failed event
      this.emit('experiment-failed', {
        ...this.currentExperiment,
        status: 'failed',
        error: error.message
      });
      
    } finally {
      this.currentExperiment = null;
    }
  }
  
  async runAgentFailureScenario() {
    // Select specific agent failure test
    const tests = [
      'testRandomAgentFailures',
      'testCascadingFailures',
      'testSlowAgentDegradation',
      'testMemoryLeakResilience',
      'testByzantineAgents'
    ];
    
    const selectedTest = tests[Math.floor(Math.random() * tests.length)];
    console.log(`Running agent failure test: ${selectedTest}`);
    
    await this.chaosTests.agentFailures.setup();
    const result = await this.chaosTests.agentFailures[selectedTest]();
    await this.chaosTests.agentFailures.teardown();
    
    return result;
  }
  
  async runNetworkPartitionScenario() {
    // Select specific network test
    const tests = [
      'testBasicNetworkPartition',
      'testMultiZonePartition',
      'testNetworkDelayAndJitter',
      'testPacketLoss',
      'testBandwidthThrottling'
    ];
    
    const selectedTest = tests[Math.floor(Math.random() * tests.length)];
    console.log(`Running network partition test: ${selectedTest}`);
    
    await this.chaosTests.networkPartitions.setup();
    const result = await this.chaosTests.networkPartitions[selectedTest]();
    await this.chaosTests.networkPartitions.teardown();
    
    return result;
  }
  
  async runResourceExhaustionScenario() {
    console.log('Running resource exhaustion scenario...');
    
    // Simulate CPU spike
    const cpuSpike = setInterval(() => {
      // Intensive computation
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += Math.sqrt(i);
      }
    }, 10);
    
    // Monitor impact
    const startTime = Date.now();
    const observations = [];
    
    while (Date.now() - startTime < 30000) { // 30s test
      const metrics = await this.collectResourceMetrics();
      observations.push(metrics);
      await this.delay(5000);
    }
    
    clearInterval(cpuSpike);
    
    return {
      scenario: 'Resource Exhaustion',
      passed: observations.every(o => o.availability > 0.9),
      metrics: {
        avgCpuUsage: observations.reduce((sum, o) => sum + o.cpu, 0) / observations.length,
        maxMemoryUsage: Math.max(...observations.map(o => o.memory)),
        impactDuration: 30000
      }
    };
  }
  
  async runTimeTravelScenario() {
    console.log('Running time travel scenario...');
    
    // Simulate clock skew
    const originalDateNow = Date.now;
    const timeShift = 3600000; // 1 hour forward
    
    Date.now = () => originalDateNow() + timeShift;
    
    // Test system behavior with time shift
    const observations = [];
    
    for (let i = 0; i < 5; i++) {
      const health = await this.checkSystemHealth();
      observations.push({
        health,
        timestamp: new Date().toISOString()
      });
      await this.delay(2000);
    }
    
    // Restore time
    Date.now = originalDateNow;
    
    return {
      scenario: 'Time Travel',
      passed: observations.every(o => o.health.score > 0.8),
      metrics: {
        timeShift,
        systemStability: observations.filter(o => o.health.score > 0.9).length / observations.length
      }
    };
  }
  
  async abortExperiment(reason) {
    if (!this.currentExperiment) return;
    
    console.log(`🛑 Aborting experiment: ${reason}`);
    
    const experimentId = this.currentExperiment.id;
    
    // Try to gracefully stop the experiment
    // This would depend on the specific scenario
    
    // Record abortion
    await this.recordExperimentEnd(experimentId, 'aborted', null, { reason });
    
    this.metrics.experimentsAborted++;
    
    // Emit abort event
    this.emit('experiment-aborted', {
      ...this.currentExperiment,
      status: 'aborted',
      reason
    });
    
    this.currentExperiment = null;
  }
  
  async pauseChaos() {
    console.log('⏸️  Pausing all chaos activities...');
    
    // Cancel scheduled jobs temporarily
    this.scheduledJobs.forEach(job => job.cancel());
    
    // Wait for recovery
    await this.delay(300000); // 5 minutes
    
    // Re-enable if kill switch is deactivated
    if (!this.killSwitchActivated) {
      await this.scheduleExperiments();
    }
  }
  
  async checkSystemHealth() {
    const health = {
      agents: await this.checkAgentHealth(),
      services: await this.checkServiceHealth(),
      resources: await this.checkResourceHealth(),
      network: await this.checkNetworkHealth()
    };
    
    // Calculate overall health score (0-1)
    health.score = (
      health.agents.score * 0.3 +
      health.services.score * 0.3 +
      health.resources.score * 0.2 +
      health.network.score * 0.2
    );
    
    return health;
  }
  
  async updateKPIs(health) {
    // Update technical KPIs
    this.kpis.technical.availability = health.score;
    this.kpis.technical.errorRate = 1 - health.services.score;
    
    // Update business KPIs based on system health
    this.kpis.business.orderProcessingRate = Math.max(0.5, health.score);
    this.kpis.business.userSatisfaction = Math.max(0.6, health.score * 1.1);
    
    // Calculate revenue impact
    if (health.score < 0.9) {
      this.kpis.business.revenueImpact += (1 - health.score) * 1000; // $1000 per point below 90%
    }
    
    // Store KPIs
    await this.redis.hset('chaos:kpis', 'technical', JSON.stringify(this.kpis.technical));
    await this.redis.hset('chaos:kpis', 'business', JSON.stringify(this.kpis.business));
  }
  
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      orchestratorStatus: {
        running: this.isRunning,
        killSwitch: this.killSwitchActivated,
        currentExperiment: this.currentExperiment
      },
      metrics: this.metrics,
      kpis: this.kpis,
      recentExperiments: await this.getRecentExperiments(),
      recommendations: await this.generateRecommendations()
    };
    
    // Store report
    await this.redis.lpush('chaos:reports', JSON.stringify(report));
    await this.redis.ltrim('chaos:reports', 0, 100); // Keep last 100 reports
    
    // Emit report event
    this.emit('report-generated', report);
    
    return report;
  }
  
  async generateRecommendations() {
    const recommendations = [];
    
    // Check if too many experiments are failing
    if (this.metrics.experimentsAborted / this.metrics.experimentsRun > 0.3) {
      recommendations.push({
        severity: 'high',
        message: 'High abort rate detected. Consider reducing chaos intensity.',
        action: 'Review system stability before continuing chaos tests'
      });
    }
    
    // Check business impact
    if (this.kpis.business.revenueImpact > 10000) {
      recommendations.push({
        severity: 'critical',
        message: 'Significant revenue impact detected from chaos experiments.',
        action: 'Reduce chaos frequency or scope'
      });
    }
    
    // Check system resilience
    if (this.kpis.technical.availability < 0.95) {
      recommendations.push({
        severity: 'medium',
        message: 'System availability below target during chaos tests.',
        action: 'Improve system resilience before increasing chaos intensity'
      });
    }
    
    return recommendations;
  }
  
  // Helper methods
  async recordExperimentStart(id, scenario) {
    await this.redis.hset(`chaos:experiment:${id}`, {
      id,
      scenario,
      startTime: Date.now(),
      status: 'running'
    });
  }
  
  async recordExperimentEnd(id, status, result, impact) {
    await this.redis.hset(`chaos:experiment:${id}`, {
      endTime: Date.now(),
      status,
      result: JSON.stringify(result),
      impact: JSON.stringify(impact)
    });
  }
  
  async takeSystemSnapshot() {
    return {
      timestamp: Date.now(),
      health: await this.checkSystemHealth(),
      activeAgents: await this.redis.scard('agents:active'),
      errorRate: await this.getCurrentErrorRate(),
      throughput: await this.getCurrentThroughput()
    };
  }
  
  async analyzeExperimentImpact(preSnapshot, postSnapshot, result) {
    return {
      healthImpact: postSnapshot.health.score - preSnapshot.health.score,
      availabilityImpact: (postSnapshot.activeAgents - preSnapshot.activeAgents) / preSnapshot.activeAgents,
      errorRateIncrease: postSnapshot.errorRate - preSnapshot.errorRate,
      throughputImpact: (postSnapshot.throughput - preSnapshot.throughput) / preSnapshot.throughput,
      duration: postSnapshot.timestamp - preSnapshot.timestamp,
      recovered: postSnapshot.health.score >= preSnapshot.health.score * 0.95
    };
  }
  
  async calculateCurrentImpact() {
    const activeExperiments = await this.redis.keys('chaos:experiment:*');
    return activeExperiments.length * 0.1; // Each experiment adds 10% impact
  }
  
  async getRecentExperiments() {
    const experiments = [];
    const keys = await this.redis.keys('chaos:experiment:*');
    
    for (const key of keys.slice(-10)) { // Last 10 experiments
      const data = await this.redis.hgetall(key);
      experiments.push(data);
    }
    
    return experiments;
  }
  
  // Stub health check methods
  async checkAgentHealth() { return { score: Math.random() * 0.2 + 0.8 }; }
  async checkServiceHealth() { return { score: Math.random() * 0.2 + 0.8 }; }
  async checkResourceHealth() { return { score: Math.random() * 0.2 + 0.8 }; }
  async checkNetworkHealth() { return { score: Math.random() * 0.2 + 0.8 }; }
  async getCurrentErrorRate() { return Math.random() * 0.05; }
  async getCurrentThroughput() { return Math.random() * 1000 + 500; }
  async collectResourceMetrics() { 
    return { 
      cpu: Math.random() * 100, 
      memory: Math.random() * 4096,
      availability: Math.random() * 0.2 + 0.8
    }; 
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async collectMetrics() {
    // Collect and store current metrics
    const metrics = {
      timestamp: Date.now(),
      experiments: this.metrics,
      kpis: this.kpis,
      systemHealth: await this.checkSystemHealth()
    };
    
    await this.redis.lpush('chaos:metrics', JSON.stringify(metrics));
    await this.redis.ltrim('chaos:metrics', 0, 1000); // Keep last 1000 metrics
  }
  
  async runScheduledChaos(scheduleType) {
    console.log(`\n📅 Running scheduled ${scheduleType} chaos tests...`);
    
    const scenarios = scheduleType === 'daily' 
      ? ['agent_failures'] 
      : ['agent_failures', 'network_partitions', 'resource_exhaustion'];
    
    for (const scenario of scenarios) {
      if (await this.isSafeToRunChaos()) {
        await this.runChaosExperiment(scenario);
        await this.delay(60000); // 1 minute between tests
      }
    }
  }
}

// Export for use
module.exports = ChaosOrchestrator;

// CLI interface
if (require.main === module) {
  const orchestrator = new ChaosOrchestrator();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await orchestrator.stop();
    process.exit(0);
  });
  
  // Start orchestrator
  orchestrator.start()
    .then(() => {
      console.log('Chaos Orchestrator is running. Press Ctrl+C to stop.');
    })
    .catch(error => {
      console.error('Failed to start Chaos Orchestrator:', error);
      process.exit(1);
    });
  
  // Expose kill switch endpoint
  const http = require('http');
  const server = http.createServer((req, res) => {
    if (req.url === '/chaos/kill-switch' && req.method === 'POST') {
      orchestrator.redis.publish('chaos:kill-switch', 'HTTP request');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'kill switch activated' }));
    } else if (req.url === '/chaos/status' && req.method === 'GET') {
      orchestrator.generateReport().then(report => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  
  server.listen(8089, () => {
    console.log('Kill switch endpoint available at http://localhost:8089/chaos/kill-switch');
    console.log('Status endpoint available at http://localhost:8089/chaos/status');
  });
}