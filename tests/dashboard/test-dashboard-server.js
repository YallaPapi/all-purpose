/**
 * Real-Time Test Dashboard Server
 * 
 * Based on TaskMaster research and Context7 Socket.IO/Chart.js documentation:
 * - Real-time test execution monitoring via WebSockets
 * - Test metrics aggregation with Redis time-series
 * - Interactive result visualization
 * - Customizable reporting formats
 * - CI/CD pipeline integration
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

// Configuration based on TaskMaster research
const DASHBOARD_CONFIG = {
  server: {
    port: process.env.DASHBOARD_PORT || 3001,
    host: process.env.DASHBOARD_HOST || 'localhost'
  },
  redis: {
    url: process.env.DASHBOARD_REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'test-dashboard:'
  },
  socketio: {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 20000
  },
  storage: {
    retention: 7 * 24 * 60 * 60 * 1000, // 7 days
    aggregation: {
      realtime: 5000,  // 5s
      minute: 60000,   // 1m  
      hour: 3600000,   // 1h
      day: 86400000    // 24h
    }
  },
  reports: {
    outputDir: './test-reports',
    formats: ['json', 'html', 'junit', 'markdown'],
    templates: './dashboard/templates'
  }
};

class TestDashboardServer {
  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, DASHBOARD_CONFIG.socketio);
    this.redis = new Redis(DASHBOARD_CONFIG.redis.url);
    
    // Test execution tracking
    this.activeTests = new Map();
    this.testMetrics = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
    
    // Connected clients
    this.clients = new Set();
    
    // Test runners integration
    this.testRunners = new Map();
    
    this.initializeExpress();
    this.initializeSocketIO();
    this.initializeRedisSubscriptions();
  }
  
  initializeExpress() {
    // Serve static dashboard files
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());
    
    // API Routes
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        activeTests: this.activeTests.size,
        connectedClients: this.clients.size,
        metrics: this.testMetrics
      });
    });
    
    // Test metrics API
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const { timeRange = '1h', granularity = 'minute' } = req.query;
        const metrics = await this.getTestMetrics(timeRange, granularity);
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Test execution history
    this.app.get('/api/history', async (req, res) => {
      try {
        const { limit = 100, offset = 0 } = req.query;
        const history = await this.getTestHistory(limit, offset);
        res.json(history);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Test reports
    this.app.get('/api/reports', async (req, res) => {
      try {
        const reports = await this.getAvailableReports();
        res.json(reports);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Generate report
    this.app.post('/api/reports/generate', async (req, res) => {
      try {
        const { format, testRunId, filters } = req.body;
        const report = await this.generateReport(format, testRunId, filters);
        res.json(report);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Test execution control
    this.app.post('/api/tests/run', async (req, res) => {
      try {
        const { testSuite, options } = req.body;
        const testRun = await this.startTestExecution(testSuite, options);
        res.json(testRun);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Stop test execution
    this.app.post('/api/tests/:testRunId/stop', async (req, res) => {
      try {
        const { testRunId } = req.params;
        await this.stopTestExecution(testRunId);
        res.json({ status: 'stopped', testRunId });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
  
  initializeSocketIO() {
    // Based on Context7 Socket.IO documentation
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.clients.add(socket);
      
      // Send current dashboard state
      socket.emit('dashboard-state', {
        activeTests: Array.from(this.activeTests.values()),
        metrics: this.testMetrics,
        timestamp: new Date().toISOString()
      });
      
      // Client subscriptions
      socket.on('subscribe-test-runner', (testRunnerId) => {
        socket.join(`test-runner-${testRunnerId}`);
        console.log(`Client ${socket.id} subscribed to test runner: ${testRunnerId}`);
      });
      
      socket.on('subscribe-metrics', (metricsType) => {
        socket.join(`metrics-${metricsType}`);
        console.log(`Client ${socket.id} subscribed to metrics: ${metricsType}`);
      });
      
      // Real-time chart updates
      socket.on('request-chart-data', async (chartConfig) => {
        try {
          const chartData = await this.getChartData(chartConfig);
          socket.emit('chart-data', chartData);
        } catch (error) {
          socket.emit('chart-error', { error: error.message });
        }
      });
      
      // Client disconnect
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.clients.delete(socket);
      });
    });
  }
  
  initializeRedisSubscriptions() {
    // Subscribe to test execution events
    const subscriber = new Redis(DASHBOARD_CONFIG.redis.url);
    
    subscriber.subscribe(
      'test:started',
      'test:completed',
      'test:failed',
      'test:progress',
      'test:metrics',
      'suite:started',
      'suite:completed'
    );
    
    subscriber.on('message', async (channel, message) => {
      try {
        const data = JSON.parse(message);
        await this.handleTestEvent(channel, data);
      } catch (error) {
        console.error('Error handling Redis message:', error);
      }
    });
  }
  
  async handleTestEvent(eventType, data) {
    console.log(`Test event: ${eventType}`, data);
    
    switch (eventType) {
      case 'test:started':
        await this.handleTestStarted(data);
        break;
      case 'test:completed':
        await this.handleTestCompleted(data);
        break;
      case 'test:failed':
        await this.handleTestFailed(data);
        break;
      case 'test:progress':
        await this.handleTestProgress(data);
        break;
      case 'test:metrics':
        await this.handleTestMetrics(data);
        break;
      case 'suite:started':
        await this.handleSuiteStarted(data);
        break;
      case 'suite:completed':
        await this.handleSuiteCompleted(data);
        break;
    }
    
    // Broadcast to connected clients
    this.io.emit('test-event', { type: eventType, data });
  }
  
  async handleTestStarted(data) {
    const testRun = {
      id: data.testRunId,
      name: data.testName,
      suite: data.suiteName,
      startTime: new Date(),
      status: 'running',
      progress: 0,
      results: []
    };
    
    this.activeTests.set(data.testRunId, testRun);
    
    // Store in Redis
    await this.redis.hset(
      `${DASHBOARD_CONFIG.redis.keyPrefix}active:${data.testRunId}`,
      'data', JSON.stringify(testRun)
    );
    
    // Update metrics
    this.testMetrics.total++;
    
    // Broadcast real-time update
    this.io.emit('test-started', testRun);
  }
  
  async handleTestCompleted(data) {
    const testRun = this.activeTests.get(data.testRunId);
    if (!testRun) return;
    
    testRun.status = 'completed';
    testRun.endTime = new Date();
    testRun.duration = testRun.endTime - testRun.startTime;
    testRun.results = data.results;
    
    // Update metrics
    this.testMetrics.passed++;
    this.testMetrics.duration += testRun.duration;
    
    // Move to history
    await this.archiveTestRun(testRun);
    this.activeTests.delete(data.testRunId);
    
    // Broadcast update
    this.io.emit('test-completed', testRun);
    
    // Update aggregated metrics
    await this.updateAggregatedMetrics(testRun);
  }
  
  async handleTestFailed(data) {
    const testRun = this.activeTests.get(data.testRunId);
    if (!testRun) return;
    
    testRun.status = 'failed';
    testRun.endTime = new Date();
    testRun.duration = testRun.endTime - testRun.startTime;
    testRun.error = data.error;
    testRun.results = data.results;
    
    // Update metrics
    this.testMetrics.failed++;
    this.testMetrics.duration += testRun.duration;
    
    // Move to history
    await this.archiveTestRun(testRun);
    this.activeTests.delete(data.testRunId);
    
    // Broadcast update
    this.io.emit('test-failed', testRun);
    
    // Update aggregated metrics
    await this.updateAggregatedMetrics(testRun);
  }
  
  async handleTestProgress(data) {
    const testRun = this.activeTests.get(data.testRunId);
    if (!testRun) return;
    
    testRun.progress = data.progress;
    testRun.currentTest = data.currentTest;
    testRun.lastUpdate = new Date();
    
    // Broadcast progress update
    this.io.to(`test-runner-${data.testRunId}`).emit('test-progress', {
      testRunId: data.testRunId,
      progress: data.progress,
      currentTest: data.currentTest
    });
  }
  
  async handleTestMetrics(data) {
    // Store time-series metrics
    const timestamp = Date.now();
    const metricsKey = `${DASHBOARD_CONFIG.redis.keyPrefix}metrics:${data.type}`;
    
    await this.redis.zadd(metricsKey, timestamp, JSON.stringify({
      timestamp,
      ...data.metrics
    }));
    
    // Broadcast to metrics subscribers
    this.io.to(`metrics-${data.type}`).emit('metrics-update', {
      type: data.type,
      timestamp,
      metrics: data.metrics
    });
    
    // Cleanup old metrics
    await this.cleanupOldMetrics(metricsKey);
  }
  
  async getTestMetrics(timeRange, granularity) {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    const rangeMs = ranges[timeRange] || ranges['1h'];
    const startTime = now - rangeMs;
    
    // Get metrics from Redis time-series
    const metricsKey = `${DASHBOARD_CONFIG.redis.keyPrefix}metrics:execution`;
    const rawMetrics = await this.redis.zrangebyscore(
      metricsKey, startTime, now, 'WITHSCORES'
    );
    
    // Aggregate by granularity
    const aggregated = this.aggregateMetrics(rawMetrics, granularity);
    
    return {
      timeRange,
      granularity,
      startTime,
      endTime: now,
      data: aggregated
    };
  }
  
  async getChartData(chartConfig) {
    const { type, timeRange, granularity, filters } = chartConfig;
    
    switch (type) {
      case 'test-results-over-time':
        return await this.getTestResultsChart(timeRange, granularity);
      case 'test-duration-histogram':
        return await this.getTestDurationChart(timeRange);
      case 'suite-performance':
        return await this.getSuitePerformanceChart(timeRange);
      case 'real-time-execution':
        return await this.getRealTimeExecutionChart();
      default:
        throw new Error(`Unknown chart type: ${type}`);
    }
  }
  
  async getTestResultsChart(timeRange, granularity) {
    const metrics = await this.getTestMetrics(timeRange, granularity);
    
    // Format for Chart.js based on Context7 documentation
    return {
      type: 'line',
      data: {
        labels: metrics.data.map(m => new Date(m.timestamp).toLocaleTimeString()),
        datasets: [
          {
            label: 'Passed Tests',
            data: metrics.data.map(m => m.passed || 0),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          },
          {
            label: 'Failed Tests',
            data: metrics.data.map(m => m.failed || 0),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            stacked: true
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Test Results Over Time'
          },
          legend: {
            display: true
          }
        }
      }
    };
  }
  
  async getTestDurationChart(timeRange) {
    const history = await this.getTestHistory(1000, 0);
    
    // Create histogram buckets
    const buckets = [0, 1, 5, 10, 30, 60, 300, 600]; // seconds
    const bucketCounts = new Array(buckets.length + 1).fill(0);
    
    history.forEach(test => {
      if (test.duration) {
        const durationSeconds = test.duration / 1000;
        const bucketIndex = buckets.findIndex(bucket => durationSeconds <= bucket);
        bucketCounts[bucketIndex === -1 ? buckets.length : bucketIndex]++;
      }
    });
    
    return {
      type: 'bar',
      data: {
        labels: [
          '0-1s', '1-5s', '5-10s', '10-30s', 
          '30s-1m', '1-5m', '5-10m', '10m+'
        ],
        datasets: [{
          label: 'Test Count',
          data: bucketCounts,
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 0, 0, 0.6)',
            'rgba(139, 0, 0, 0.6)'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Test Duration Distribution'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };
  }
  
  async generateReport(format, testRunId, filters = {}) {
    const reportId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Get test data
    const testData = testRunId 
      ? await this.getTestRun(testRunId)
      : await this.getTestHistory(filters.limit || 100, filters.offset || 0);
    
    const reportData = {
      id: reportId,
      generatedAt: timestamp,
      format,
      filters,
      summary: await this.generateSummary(testData),
      data: testData
    };
    
    // Generate report based on format
    let reportContent;
    let fileName;
    
    switch (format) {
      case 'json':
        reportContent = JSON.stringify(reportData, null, 2);
        fileName = `test-report-${reportId}.json`;
        break;
      case 'html':
        reportContent = await this.generateHtmlReport(reportData);
        fileName = `test-report-${reportId}.html`;
        break;
      case 'junit':
        reportContent = await this.generateJunitReport(reportData);
        fileName = `test-report-${reportId}.xml`;
        break;
      case 'markdown':
        reportContent = await this.generateMarkdownReport(reportData);
        fileName = `test-report-${reportId}.md`;
        break;
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
    
    // Save report
    const reportPath = path.join(DASHBOARD_CONFIG.reports.outputDir, fileName);
    await fs.mkdir(DASHBOARD_CONFIG.reports.outputDir, { recursive: true });
    await fs.writeFile(reportPath, reportContent);
    
    // Store report metadata
    await this.redis.hset(
      `${DASHBOARD_CONFIG.redis.keyPrefix}reports:${reportId}`,
      {
        id: reportId,
        fileName,
        format,
        generatedAt: timestamp,
        path: reportPath,
        size: reportContent.length
      }
    );
    
    return {
      reportId,
      fileName,
      path: reportPath,
      format,
      size: reportContent.length,
      generatedAt: timestamp
    };
  }
  
  async generateHtmlReport(reportData) {
    // Based on TaskMaster research for customizable reporting
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Dashboard Report - ${reportData.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; text-align: center; }
        .metric .value { font-size: 2em; font-weight: bold; color: #2196F3; }
        .test-list { margin: 20px 0; }
        .test-item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
        .passed { border-left: 5px solid #4CAF50; }
        .failed { border-left: 5px solid #f44336; }
        .skipped { border-left: 5px solid #FF9800; }
        .chart-container { margin: 20px 0; height: 400px; background: #f9f9f9; border: 1px solid #ddd; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="header">
        <h1>Test Dashboard Report</h1>
        <p>Report ID: ${reportData.id}</p>
        <p>Generated: ${reportData.generatedAt}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <div class="value">${reportData.summary.total}</div>
            <div>Total Tests</div>
        </div>
        <div class="metric">
            <div class="value" style="color: #4CAF50">${reportData.summary.passed}</div>
            <div>Passed</div>
        </div>
        <div class="metric">
            <div class="value" style="color: #f44336">${reportData.summary.failed}</div>
            <div>Failed</div>
        </div>
        <div class="metric">
            <div class="value" style="color: #FF9800">${reportData.summary.skipped}</div>
            <div>Skipped</div>
        </div>
        <div class="metric">
            <div class="value">${((reportData.summary.passed / reportData.summary.total) * 100).toFixed(1)}%</div>
            <div>Success Rate</div>
        </div>
        <div class="metric">
            <div class="value">${(reportData.summary.avgDuration / 1000).toFixed(2)}s</div>
            <div>Avg Duration</div>
        </div>
    </div>
    
    <div class="chart-container">
        <canvas id="resultsChart"></canvas>
    </div>
    
    <div class="test-list">
        <h2>Test Details</h2>
        ${Array.isArray(reportData.data) ? reportData.data.map(test => `
            <div class="test-item ${test.status}">
                <h3>${test.name}</h3>
                <p><strong>Suite:</strong> ${test.suite}</p>
                <p><strong>Status:</strong> ${test.status}</p>
                <p><strong>Duration:</strong> ${test.duration ? (test.duration / 1000).toFixed(2) + 's' : 'N/A'}</p>
                ${test.error ? `<p><strong>Error:</strong> ${test.error}</p>` : ''}
            </div>
        `).join('') : '<p>No test data available</p>'}
    </div>
    
    <script>
        // Chart.js implementation based on Context7 documentation
        const ctx = document.getElementById('resultsChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed', 'Skipped'],
                datasets: [{
                    data: [${reportData.summary.passed}, ${reportData.summary.failed}, ${reportData.summary.skipped}],
                    backgroundColor: ['#4CAF50', '#f44336', '#FF9800']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Test Results Distribution'
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }
  
  async startTestExecution(testSuite, options = {}) {
    const testRunId = uuidv4();
    const testRun = {
      id: testRunId,
      suite: testSuite,
      options,
      startTime: new Date(),
      status: 'starting',
      pid: null
    };
    
    // Store test run
    this.testRunners.set(testRunId, testRun);
    
    // Broadcast start event
    this.io.emit('test-execution-starting', testRun);
    
    // Start the actual test execution
    this.executeTests(testRunId, testSuite, options);
    
    return testRun;
  }
  
  async executeTests(testRunId, testSuite, options) {
    try {
      // Publish test started event
      await this.redis.publish('test:started', JSON.stringify({
        testRunId,
        testName: testSuite,
        suiteName: testSuite,
        options
      }));
      
      // Execute test command based on suite type
      const testCommand = this.buildTestCommand(testSuite, options);
      const testProcess = spawn(testCommand.command, testCommand.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, TEST_RUN_ID: testRunId }
      });
      
      // Update test run with PID
      const testRun = this.testRunners.get(testRunId);
      testRun.pid = testProcess.pid;
      testRun.status = 'running';
      
      // Handle test output
      testProcess.stdout.on('data', (data) => {
        this.handleTestOutput(testRunId, 'stdout', data.toString());
      });
      
      testProcess.stderr.on('data', (data) => {
        this.handleTestOutput(testRunId, 'stderr', data.toString());
      });
      
      // Handle test completion
      testProcess.on('close', async (code) => {
        const results = await this.parseTestResults(testRunId, code);
        
        if (code === 0) {
          await this.redis.publish('test:completed', JSON.stringify({
            testRunId,
            results
          }));
        } else {
          await this.redis.publish('test:failed', JSON.stringify({
            testRunId,
            error: `Test process exited with code ${code}`,
            results
          }));
        }
        
        this.testRunners.delete(testRunId);
      });
      
    } catch (error) {
      await this.redis.publish('test:failed', JSON.stringify({
        testRunId,
        error: error.message
      }));
      
      this.testRunners.delete(testRunId);
    }
  }
  
  buildTestCommand(testSuite, options) {
    // Build command based on test suite type and options
    const commands = {
      'jest': { command: 'npx', args: ['jest'] },
      'mocha': { command: 'npx', args: ['mocha'] },
      'cypress': { command: 'npx', args: ['cypress', 'run'] },
      'chaos': { command: 'node', args: ['tests/chaos/run-all-chaos-tests.js'] },
      'integration': { command: 'npm', args: ['test', '--', '--selectProjects=integration'] },
      'e2e': { command: 'npm', args: ['test', '--', '--selectProjects=e2e'] }
    };
    
    const baseCommand = commands[testSuite] || commands['jest'];
    
    // Add options
    if (options.pattern) {
      baseCommand.args.push('--testNamePattern', options.pattern);
    }
    if (options.coverage) {
      baseCommand.args.push('--coverage');
    }
    if (options.watch) {
      baseCommand.args.push('--watch');
    }
    
    return baseCommand;
  }
  
  // Additional helper methods
  async archiveTestRun(testRun) {
    const key = `${DASHBOARD_CONFIG.redis.keyPrefix}history:${testRun.id}`;
    await this.redis.hset(key, 'data', JSON.stringify(testRun));
    await this.redis.expire(key, Math.floor(DASHBOARD_CONFIG.storage.retention / 1000));
  }
  
  async getTestHistory(limit, offset) {
    const keys = await this.redis.keys(`${DASHBOARD_CONFIG.redis.keyPrefix}history:*`);
    const history = [];
    
    for (const key of keys.slice(offset, offset + limit)) {
      const data = await this.redis.hget(key, 'data');
      if (data) {
        history.push(JSON.parse(data));
      }
    }
    
    return history.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }
  
  async start() {
    return new Promise((resolve) => {
      this.httpServer.listen(DASHBOARD_CONFIG.server.port, DASHBOARD_CONFIG.server.host, () => {
        console.log(`Test Dashboard Server running on http://${DASHBOARD_CONFIG.server.host}:${DASHBOARD_CONFIG.server.port}`);
        console.log(`WebSocket server ready for real-time updates`);
        resolve();
      });
    });
  }
  
  async stop() {
    console.log('Stopping Test Dashboard Server...');
    
    // Close all connections
    this.io.close();
    this.redis.disconnect();
    
    return new Promise((resolve) => {
      this.httpServer.close(() => {
        console.log('Test Dashboard Server stopped');
        resolve();
      });
    });
  }
  
  // Stub implementations for completeness
  aggregateMetrics(rawMetrics, granularity) {
    // Implement metrics aggregation logic
    return [];
  }
  
  async cleanupOldMetrics(metricsKey) {
    const cutoff = Date.now() - DASHBOARD_CONFIG.storage.retention;
    await this.redis.zremrangebyscore(metricsKey, 0, cutoff);
  }
  
  async updateAggregatedMetrics(testRun) {
    // Update time-series metrics
    const timestamp = Date.now();
    const metrics = {
      passed: testRun.status === 'completed' ? 1 : 0,
      failed: testRun.status === 'failed' ? 1 : 0,
      duration: testRun.duration || 0
    };
    
    await this.redis.publish('test:metrics', JSON.stringify({
      type: 'execution',
      metrics
    }));
  }
  
  async generateSummary(testData) {
    const total = Array.isArray(testData) ? testData.length : 1;
    const passed = Array.isArray(testData) 
      ? testData.filter(t => t.status === 'completed').length 
      : (testData.status === 'completed' ? 1 : 0);
    const failed = Array.isArray(testData) 
      ? testData.filter(t => t.status === 'failed').length 
      : (testData.status === 'failed' ? 1 : 0);
    const skipped = total - passed - failed;
    const avgDuration = Array.isArray(testData) 
      ? testData.reduce((sum, t) => sum + (t.duration || 0), 0) / total 
      : (testData.duration || 0);
    
    return { total, passed, failed, skipped, avgDuration };
  }
  
  handleTestOutput(testRunId, stream, data) {
    this.io.to(`test-runner-${testRunId}`).emit('test-output', {
      testRunId,
      stream,
      data
    });
  }
  
  async parseTestResults(testRunId, exitCode) {
    // Parse test results from output/files
    return {
      exitCode,
      passed: exitCode === 0,
      timestamp: new Date().toISOString()
    };
  }
}

// Export for use in other modules
module.exports = TestDashboardServer;

// CLI execution
if (require.main === module) {
  const dashboard = new TestDashboardServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await dashboard.stop();
    process.exit(0);
  });
  
  // Start the dashboard server
  dashboard.start()
    .then(() => {
      console.log('Test Dashboard Server is ready!');
      console.log(`Dashboard: http://${DASHBOARD_CONFIG.server.host}:${DASHBOARD_CONFIG.server.port}`);
      console.log(`Health Check: http://${DASHBOARD_CONFIG.server.host}:${DASHBOARD_CONFIG.server.port}/api/health`);
    })
    .catch(error => {
      console.error('Failed to start Test Dashboard Server:', error);
      process.exit(1);
    });
}