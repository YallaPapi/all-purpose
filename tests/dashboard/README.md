# Test Dashboard - Real-Time Testing Monitoring

A comprehensive real-time test execution monitoring dashboard with WebSocket-based live updates, interactive visualizations, and multi-format reporting capabilities.

## Features

✅ **Real-time test execution monitoring** via WebSockets  
✅ **Interactive result visualization** using Chart.js  
✅ **Test metrics aggregation** with Redis time-series storage  
✅ **Multiple report formats** (JSON, HTML, JUnit XML, Markdown)  
✅ **CI/CD pipeline integration** with GitHub Actions, GitLab CI, Jenkins  
✅ **Test runner integration** for Jest, Mocha, Cypress  
✅ **Live console output** streaming  
✅ **Responsive dashboard** with Bootstrap UI  

## Architecture

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   Dashboard     │◄────────────────►│  Server         │
│   Frontend      │    Socket.IO     │  (Express +     │
│   (Chart.js)    │                  │   Socket.IO)    │
└─────────────────┘                  └─────────────────┘
                                              │
                                              │ Redis Pub/Sub
                                              ▼
┌─────────────────┐    Test Events   ┌─────────────────┐
│  Test Runners   │──────────────────►│  Redis          │
│  (Jest/Mocha/   │   (via Reporter)  │  Time Series    │
│   Cypress)      │                   │  Storage        │
└─────────────────┘                   └─────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
cd tests/dashboard
npm install
```

### 2. Start Redis Server

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
redis-server
```

### 3. Start Dashboard Server

```bash
npm start
```

The dashboard will be available at: http://localhost:3001

### 4. Run Tests with Dashboard Integration

```bash
# Jest with dashboard reporter
npx jest --reporters=./tests/dashboard/jest-dashboard-reporter.js

# Mocha with dashboard reporter
npx mocha --reporter ./tests/dashboard/mocha-dashboard-reporter.js

# Or use the built-in test execution
curl -X POST http://localhost:3001/api/tests/run \
  -H "Content-Type: application/json" \
  -d '{"testSuite": "jest", "options": {"coverage": true}}'
```

## Configuration

### Environment Variables

```bash
# Dashboard Server
DASHBOARD_PORT=3001
DASHBOARD_HOST=localhost
DASHBOARD_REDIS_URL=redis://localhost:6379

# CORS Configuration
CORS_ORIGIN=*

# Test Runners
TEST_RUN_ID=auto-generated-uuid
```

### Config File

Create `dashboard.config.js`:

```javascript
module.exports = {
  server: {
    port: 3001,
    host: 'localhost'
  },
  redis: {
    url: 'redis://localhost:6379',
    keyPrefix: 'test-dashboard:'
  },
  reports: {
    outputDir: './test-reports',
    formats: ['json', 'html', 'junit', 'markdown']
  }
};
```

## Dashboard Features

### Real-Time Metrics

- **Total Tests**: Running count of all executed tests
- **Passed/Failed/Skipped**: Live success/failure tracking
- **Success Rate**: Real-time pass percentage
- **Average Duration**: Performance metrics

### Interactive Charts

- **Test Results Over Time**: Line chart showing pass/fail trends
- **Test Distribution**: Pie chart of result breakdown
- **Duration Distribution**: Histogram of test execution times
- **Suite Performance**: Performance tracking by test suite

### Live Test Execution

- **Active Tests List**: Currently running tests with progress bars
- **Console Output**: Real-time streaming of test output
- **Progress Tracking**: Visual progress indicators
- **Test Control**: Start/stop test execution

## API Reference

### REST Endpoints

#### Health Check
```
GET /api/health
```

#### Test Metrics
```
GET /api/metrics?timeRange=1h&granularity=minute
```

#### Test History
```
GET /api/history?limit=100&offset=0
```

#### Start Test Execution
```
POST /api/tests/run
Content-Type: application/json

{
  "testSuite": "jest|mocha|cypress|chaos|integration|e2e",
  "options": {
    "pattern": "optional test pattern",
    "coverage": true,
    "watch": false
  }
}
```

#### Stop Test Execution
```
POST /api/tests/:testRunId/stop
```

#### Generate Report
```
POST /api/reports/generate
Content-Type: application/json

{
  "format": "json|html|junit|markdown",
  "testRunId": "optional-specific-run-id",
  "filters": {
    "limit": 100,
    "offset": 0
  }
}
```

### WebSocket Events

#### Client → Server
- `subscribe-test-runner`: Subscribe to specific test runner updates
- `subscribe-metrics`: Subscribe to metrics updates
- `request-chart-data`: Request chart data updates

#### Server → Client
- `dashboard-state`: Initial dashboard state
- `test-event`: General test events
- `test-started`: Test execution started
- `test-completed`: Test execution completed
- `test-failed`: Test execution failed
- `test-progress`: Test progress updates
- `test-output`: Live console output
- `metrics-update`: Real-time metrics updates
- `chart-data`: Chart data updates

## Test Runner Integration

### Jest Integration

Add to `jest.config.js`:

```javascript
module.exports = {
  reporters: [
    'default',
    ['./tests/dashboard/jest-dashboard-reporter.js', {}]
  ]
};
```

### Mocha Integration

```bash
npx mocha --reporter ./tests/dashboard/mocha-dashboard-reporter.js
```

### Cypress Integration

Add to `cypress.config.js`:

```javascript
module.exports = {
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    configFile: 'reporter-config.json'
  }
};
```

## Report Formats

### JSON Report
```json
{
  "testRunId": "uuid",
  "suiteName": "Jest Test Suite",
  "summary": {
    "total": 45,
    "passed": 42,
    "failed": 2,
    "skipped": 1,
    "successRate": "93.33"
  },
  "tests": [...]
}
```

### JUnit XML Report
```xml
<testsuites name="Jest Test Suite" tests="45" failures="2">
  <testsuite name="Jest Test Suite" tests="45" failures="2">
    <testcase name="should pass" classname="TestSuite" time="0.123"/>
    <testcase name="should fail" classname="TestSuite" time="0.456">
      <failure message="Assertion error">Test failed</failure>
    </testcase>
  </testsuite>
</testsuites>
```

### HTML Report
Interactive HTML report with:
- Summary metrics
- Test results table
- Charts and visualizations
- Downloadable format

### Markdown Report
GitHub-compatible markdown with:
- Summary table
- Test details
- Formatted for documentation

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests with Dashboard
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd tests/dashboard
          npm ci
      
      - name: Start Dashboard
        run: |
          cd tests/dashboard
          npm start &
          sleep 5
      
      - name: Run tests
        run: |
          npm test -- --reporters=./tests/dashboard/jest-dashboard-reporter.js
        env:
          TEST_RUN_ID: ${{ github.run_id }}
      
      - name: Generate reports
        run: |
          curl -X POST http://localhost:3001/api/reports/generate \
            -H "Content-Type: application/json" \
            -d '{"format": "junit"}'
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-reports/
```

### Jenkins Integration

```groovy
pipeline {
    agent any
    
    stages {
        stage('Test') {
            steps {
                sh 'cd tests/dashboard && npm start &'
                sh 'sleep 5'
                sh 'npm test -- --reporters=./tests/dashboard/jest-dashboard-reporter.js'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results.xml'
                }
            }
        }
    }
}
```

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts the server with `nodemon` for auto-restart on file changes.

### Running Tests

```bash
# Run dashboard tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Docker Setup

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  dashboard:
    build: .
    ports:
      - "3001:3001"
    depends_on:
      - redis
    environment:
      - DASHBOARD_REDIS_URL=redis://redis:6379
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   ```
   Error: Redis connection failed
   ```
   - Ensure Redis is running: `redis-cli ping`
   - Check connection URL in environment variables

2. **WebSocket Connection Failed**
   ```
   WebSocket connection failed
   ```
   - Check firewall settings
   - Verify CORS configuration
   - Ensure dashboard server is running

3. **Tests Not Appearing**
   ```
   No test events received
   ```
   - Verify test reporters are configured correctly
   - Check TEST_RUN_ID environment variable
   - Ensure Redis is accessible from test runner

### Debug Mode

Enable debug logging:

```bash
DEBUG=test-dashboard:* npm start
```

### Health Checks

```bash
# Check dashboard health
curl http://localhost:3001/api/health

# Check Redis connection
redis-cli ping

# Check WebSocket connection
curl -H "Upgrade: websocket" http://localhost:3001/socket.io/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Update documentation
5. Submit a pull request

## License

MIT License - see LICENSE file for details