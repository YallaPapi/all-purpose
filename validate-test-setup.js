#!/usr/bin/env node

/**
 * Test Setup Validation Script
 * 
 * Validates that all prerequisites are met for running the PRD workflow test
 */

import { connect } from 'nats';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SetupValidator {
  constructor() {
    this.checks = [];
    this.passed = 0;
    this.failed = 0;
  }

  addCheck(name, checkFn) {
    this.checks.push({ name, checkFn });
  }

  async runCheck(check) {
    try {
      console.log(`🔍 ${check.name}...`);
      const result = await check.checkFn();
      if (result.success) {
        console.log(`✅ ${check.name}: ${result.message || 'OK'}`);
        this.passed++;
        return true;
      } else {
        console.log(`❌ ${check.name}: ${result.message || 'Failed'}`);
        this.failed++;
        return false;
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
      this.failed++;
      return false;
    }
  }

  async validate() {
    console.log('🧪 PRD Workflow Test Setup Validation\n');
    
    // Add all validation checks
    this.addCheck('Node.js Dependencies', async () => {
      try {
        await import('nats');
        await import('uuid');
        return { success: true, message: 'nats and uuid packages available' };
      } catch (error) {
        return { success: false, message: 'Missing dependencies. Run: npm install nats uuid' };
      }
    });

    this.addCheck('Test Files Exist', async () => {
      const requiredFiles = [
        'test-complete-prd-workflow-nats.js',
        'run-prd-workflow-test.js', 
        'prd-for-test.md',
        'docker-compose.test.yml',
        'nats-test.conf'
      ];
      
      const missing = [];
      for (const file of requiredFiles) {
        try {
          await fs.access(path.join(__dirname, file));
        } catch {
          missing.push(file);
        }
      }
      
      if (missing.length === 0) {
        return { success: true, message: `All ${requiredFiles.length} test files present` };
      } else {
        return { success: false, message: `Missing files: ${missing.join(', ')}` };
      }
    });

    this.addCheck('PRD Sample File Content', async () => {
      try {
        const prdPath = path.join(__dirname, 'prd-for-test.md');
        const content = await fs.readFile(prdPath, 'utf8');
        
        const hasRequirements = content.includes('REQ-');
        const hasTechSpecs = content.includes('Framework:') && content.includes('Database:');
        
        if (hasRequirements && hasTechSpecs) {
          return { success: true, message: 'PRD file has proper structure with requirements and tech specs' };
        } else {
          return { success: false, message: 'PRD file missing requirements or tech specs' };
        }
      } catch (error) {
        return { success: false, message: `Cannot read PRD file: ${error.message}` };
      }
    });

    this.addCheck('NATS Server Availability', async () => {
      try {
        const nc = await connect({
          servers: ['nats://localhost:4222'],
          user: 'factory',
          pass: 'factory-secret',
          timeout: 3000
        });
        
        await nc.close();
        return { success: true, message: 'NATS server accessible at localhost:4222' };
      } catch (error) {
        return { 
          success: false, 
          message: `NATS server not available. Start with: docker-compose -f docker-compose.test.yml up -d nats-test` 
        };
      }
    });

    this.addCheck('NATS Monitoring Endpoint', async () => {
      try {
        const response = await fetch('http://localhost:8222/varz');
        if (response.ok) {
          const data = await response.json();
          return { 
            success: true, 
            message: `NATS monitoring active - Server: ${data.server_name || 'unknown'}` 
          };
        } else {
          return { success: false, message: 'NATS monitoring endpoint not responding' };
        }
      } catch (error) {
        return { success: false, message: 'NATS monitoring endpoint not accessible' };
      }
    });

    this.addCheck('Test Script Permissions', async () => {
      try {
        const testScript = path.join(__dirname, 'test-complete-prd-workflow-nats.js');
        const stats = await fs.stat(testScript);
        
        // On Windows, just check if file exists and is readable
        if (process.platform === 'win32') {
          return { success: true, message: 'Test script accessible on Windows' };
        }
        
        // On Unix-like systems, check execute permissions
        const hasExecute = (stats.mode & parseInt('111', 8)) !== 0;
        if (hasExecute) {
          return { success: true, message: 'Test script has execute permissions' };
        } else {
          return { success: false, message: 'Test script missing execute permissions. Run: chmod +x test-complete-prd-workflow-nats.js' };
        }
      } catch (error) {
        return { success: false, message: `Cannot check test script: ${error.message}` };
      }
    });

    this.addCheck('Memory and Resources', async () => {
      const memUsage = process.memoryUsage();
      const freeMem = memUsage.heapTotal - memUsage.heapUsed;
      
      // Check if we have at least 100MB free heap
      if (freeMem > 100 * 1024 * 1024) {
        return { 
          success: true, 
          message: `Sufficient memory available (${Math.round(freeMem / 1024 / 1024)}MB free heap)` 
        };
      } else {
        return { 
          success: false, 
          message: `Low memory warning (${Math.round(freeMem / 1024 / 1024)}MB free heap)` 
        };
      }
    });

    // Run all checks
    console.log('Running validation checks...\n');
    
    for (const check of this.checks) {
      await this.runCheck(check);
      console.log(''); // Empty line for readability
    }

    // Summary
    console.log('📊 Validation Summary:');
    console.log(`   ✅ Passed: ${this.passed}`);
    console.log(`   ❌ Failed: ${this.failed}`);
    console.log(`   📋 Total: ${this.checks.length}`);
    
    if (this.failed === 0) {
      console.log('\n🎉 All validation checks passed! You can run the test with:');
      console.log('   node run-prd-workflow-test.js');
      console.log('\nOr manually:');
      console.log('   node test-complete-prd-workflow-nats.js');
      return true;
    } else {
      console.log(`\n⚠️ ${this.failed} validation check(s) failed. Please address the issues above before running the test.`);
      
      if (this.failed === 1 && this.checks.find(c => c.name === 'NATS Server Availability')) {
        console.log('\n💡 Quick fix for NATS server:');
        console.log('   docker-compose -f docker-compose.test.yml up -d nats-test');
        console.log('   # Wait 10 seconds, then re-run validation');
      }
      
      return false;
    }
  }
}

// Quick setup helper
async function quickSetup() {
  console.log('🚀 Quick Setup Helper\n');
  
  console.log('1. Install dependencies:');
  console.log('   npm install nats uuid\n');
  
  console.log('2. Start NATS server:');
  console.log('   docker-compose -f docker-compose.test.yml up -d nats-test\n');
  
  console.log('3. Wait for NATS to start (10 seconds)...\n');
  
  console.log('4. Run validation:');
  console.log('   node validate-test-setup.js\n');
  
  console.log('5. Run test:');
  console.log('   node run-prd-workflow-test.js\n');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('PRD Workflow Test Setup Validator\n');
    console.log('Usage:');
    console.log('  node validate-test-setup.js         # Run validation checks');
    console.log('  node validate-test-setup.js --setup # Show quick setup guide');
    console.log('  node validate-test-setup.js --help  # Show this help');
    process.exit(0);
  }
  
  if (args.includes('--setup')) {
    await quickSetup();
    process.exit(0);
  }
  
  const validator = new SetupValidator();
  const success = await validator.validate();
  process.exit(success ? 0 : 1);
}

export default SetupValidator;