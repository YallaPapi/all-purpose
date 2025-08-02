#!/usr/bin/env node

/**
 * PRD Workflow Test Runner
 * 
 * Helper script to start NATS server and run the comprehensive PRD workflow test
 */

import { spawn } from 'child_process';
import { connect } from 'nats';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestRunner {
  constructor() {
    this.natsProcess = null;
    this.testProcess = null;
  }

  async checkNATSAvailability() {
    try {
      console.log('🔍 Checking NATS server availability...');
      const nc = await connect({
        servers: ['nats://localhost:4222'],
        user: 'factory',
        pass: 'factory-secret',
        timeout: 3000
      });
      
      await nc.close();
      console.log('✅ NATS server is running and accessible');
      return true;
    } catch (error) {
      console.log('❌ NATS server not available:', error.message);
      return false;
    }
  }

  async startNATSServer() {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting NATS server...');
      
      // Try to start NATS server with configuration
      const natsConfigPath = path.join(__dirname, 'containers', 'nats-broker', 'nats-server.conf');
      
      this.natsProcess = spawn('nats-server', ['-c', natsConfigPath], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.natsProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[NATS] ${output.trim()}`);
        
        if (output.includes('Server is ready') || output.includes('Listening for client connections')) {
          setTimeout(() => resolve(), 2000); // Give it a moment to fully start
        }
      });

      this.natsProcess.stderr.on('data', (data) => {
        console.error(`[NATS Error] ${data.toString().trim()}`);
      });

      this.natsProcess.on('error', (error) => {
        console.error('❌ Failed to start NATS server:', error.message);
        reject(error);
      });

      this.natsProcess.on('exit', (code) => {
        if (code !== 0) {
          console.error(`❌ NATS server exited with code ${code}`);
          reject(new Error(`NATS server failed with exit code ${code}`));
        }
      });

      // Fallback timeout
      setTimeout(() => {
        if (this.natsProcess && !this.natsProcess.killed) {
          resolve(); // Assume it started even if we didn't see the message
        }
      }, 5000);
    });
  }

  async runTest() {
    return new Promise((resolve, reject) => {
      console.log('🧪 Starting PRD workflow test...');
      
      const testPath = path.join(__dirname, 'test-complete-prd-workflow-nats.js');
      
      this.testProcess = spawn('node', [testPath], {
        stdio: 'inherit'
      });

      this.testProcess.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ Test completed successfully');
          resolve();
        } else {
          console.error(`❌ Test failed with exit code ${code}`);
          reject(new Error(`Test failed with exit code ${code}`));
        }
      });

      this.testProcess.on('error', (error) => {
        console.error('❌ Failed to run test:', error.message);
        reject(error);
      });
    });
  }

  async cleanup() {
    console.log('🧹 Cleaning up...');
    
    if (this.testProcess && !this.testProcess.killed) {
      this.testProcess.kill('SIGTERM');
    }
    
    if (this.natsProcess && !this.natsProcess.killed) {
      console.log('🛑 Stopping NATS server...');
      this.natsProcess.kill('SIGTERM');
      
      // Give it time to shutdown gracefully
      setTimeout(() => {
        if (this.natsProcess && !this.natsProcess.killed) {
          this.natsProcess.kill('SIGKILL');
        }
      }, 3000);
    }
  }

  async run() {
    try {
      console.log('🚀 PRD Workflow Test Runner\n');
      
      // Check if NATS is already running
      const natsRunning = await this.checkNATSAvailability();
      
      if (!natsRunning) {
        // Try to start NATS server
        try {
          await this.startNATSServer();
          
          // Verify it's now accessible
          const retryCheck = await this.checkNATSAvailability();
          if (!retryCheck) {
            throw new Error('NATS server started but not accessible');
          }
        } catch (error) {
          console.log('⚠️ Could not start NATS server automatically.');
          console.log('Please ensure NATS server is running on localhost:4222 with credentials:');
          console.log('   Username: factory');
          console.log('   Password: factory-secret');
          console.log('\nYou can start it manually with:');
          console.log('   nats-server -c containers/nats-broker/nats-server.conf');
          console.log('\nOr using Docker:');
          console.log('   docker-compose up nats-broker');
          throw error;
        }
      }
      
      // Run the test
      await this.runTest();
      
    } catch (error) {
      console.error('❌ Test runner failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the test runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.run().catch(console.error);
}

export default TestRunner;