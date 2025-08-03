/**
 * ZAD MANDATE STEP 3: TRUE END-TO-END TEST WITH REAL DATA
 * 
 * This test validates the entire critical path of the application:
 * 1. Sends POST request to factory-core API with real PRD
 * 2. Polls factory-core API for status until completion
 * 3. Verifies final output is correct
 * 
 * This is the ultimate gatekeeper test as per ZAD mandate
 */

import fetch from 'node-fetch';

const FACTORY_URL = 'http://localhost:3005';
const POLLING_INTERVAL = 2000; // 2 seconds
const MAX_WAIT_TIME = 300000; // 5 minutes

// Real PRD for testing
const REAL_PRD = {
    agentType: 'backend',
    taskData: {
        name: 'E-Commerce User Management API',
        description: 'Create a complete user management system for an e-commerce platform',
        requirements: [
            'User registration with email verification',
            'JWT-based authentication',
            'Password reset functionality', 
            'User profile management',
            'Admin user management',
            'Role-based access control',
            'Rate limiting and security'
        ],
        endpoints: [
            'POST /api/auth/register',
            'POST /api/auth/login',
            'POST /api/auth/logout',
            'POST /api/auth/refresh',
            'POST /api/auth/reset-password',
            'GET /api/users/profile',
            'PUT /api/users/profile',
            'GET /api/admin/users',
            'PUT /api/admin/users/:id/role'
        ],
        database: {
            type: 'MongoDB',
            collections: ['users', 'sessions', 'audit_logs']
        },
        security: {
            encryption: 'bcrypt',
            jwt: 'RS256',
            rateLimit: '100 requests per hour per IP'
        },
        testing: {
            unit: 'Jest',
            integration: 'Supertest',
            coverage: '90%+'
        }
    }
};

class E2ETestRunner {
    constructor() {
        this.startTime = Date.now();
        this.taskId = null;
    }

    async run() {
        console.log('\n🚨 === ZAD MANDATE STEP 3: E2E TEST STARTING === 🚨\n');
        
        try {
            // Step 1: Verify factory is running
            await this.checkFactoryHealth();
            
            // Step 2: Send POST request with real PRD
            await this.createTask();
            
            // Step 3: Poll for completion
            await this.pollForCompletion();
            
            // Step 4: Verify output
            await this.verifyOutput();
            
            console.log('\n🎉 === E2E TEST PASSED - CRITICAL PATH VALIDATED === 🎉\n');
            process.exit(0);
            
        } catch (error) {
            console.error('\n❌ === E2E TEST FAILED === ❌\n');
            console.error(`Error: ${error.message}`);
            console.error('\n🔧 Critical path is broken - fix before proceeding to Step 4');
            process.exit(1);
        }
    }

    async checkFactoryHealth() {
        console.log('🔍 Step 1: Checking factory health...');
        
        const response = await fetch(`${FACTORY_URL}/health`);
        if (!response.ok) {
            throw new Error(`Factory health check failed: ${response.status}`);
        }
        
        const health = await response.json();
        console.log(`✅ Factory is healthy: ${health.service} (uptime: ${Math.round(health.uptime)}s)`);
    }

    async createTask() {
        console.log('🚀 Step 2: Sending POST request with real PRD...');
        
        const response = await fetch(`${FACTORY_URL}/api/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(REAL_PRD)
        });

        if (!response.ok) {
            throw new Error(`Task creation failed: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(`Task creation failed: ${result.error}`);
        }

        this.taskId = result.data.id;
        console.log(`✅ Task created successfully: ${this.taskId}`);
        console.log(`📋 Task type: ${result.data.type}`);
        console.log(`📄 Description: ${result.data.data.description}`);
    }

    async pollForCompletion() {
        console.log('⏳ Step 3: Polling for task completion...');
        
        const startTime = Date.now();
        let attempts = 0;
        
        while (Date.now() - startTime < MAX_WAIT_TIME) {
            attempts++;
            
            try {
                const response = await fetch(`${FACTORY_URL}/api/tasks/${this.taskId}`);
                if (!response.ok) {
                    throw new Error(`Polling failed: ${response.status}`);
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error(`Polling failed: ${result.error}`);
                }

                const task = result.data;
                const elapsed = Math.round((Date.now() - startTime) / 1000);
                
                console.log(`🔄 Attempt ${attempts} (${elapsed}s): Status = ${task.status}`);

                if (task.status === 'completed') {
                    console.log(`✅ Task completed after ${elapsed} seconds`);
                    this.completedTask = task;
                    return;
                } else if (task.status === 'failed') {
                    throw new Error(`Task failed: ${task.error || 'Unknown error'}`);
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
                
            } catch (error) {
                console.error(`⚠️ Polling attempt ${attempts} failed: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
            }
        }

        throw new Error(`Task did not complete within ${MAX_WAIT_TIME / 1000} seconds`);
    }

    async verifyOutput() {
        console.log('🔍 Step 4: Verifying final output...');
        
        if (!this.completedTask) {
            throw new Error('No completed task to verify');
        }

        const task = this.completedTask;
        
        // Verify task structure
        if (!task.result) {
            throw new Error('Task completed but has no result');
        }

        const result = task.result;
        
        // Verify result has expected structure
        const requiredFields = ['status', 'output', 'files'];
        for (const field of requiredFields) {
            if (!result[field]) {
                throw new Error(`Result missing required field: ${field}`);
            }
        }

        // Verify files were generated
        if (!Array.isArray(result.files) || result.files.length === 0) {
            throw new Error('No files were generated');
        }

        // Verify file types match agent type
        const hasRelevantFiles = result.files.some(file => 
            file.includes('.js') || 
            file.includes('.ts') || 
            file.includes('api') ||
            file.includes('auth')
        );

        if (!hasRelevantFiles) {
            throw new Error('Generated files do not match expected backend agent output');
        }

        console.log(`✅ Output verification passed:`);
        console.log(`   ✓ Status: ${result.status}`);
        console.log(`   ✓ Files generated: ${result.files.length}`);
        console.log(`   ✓ Files: ${result.files.join(', ')}`);
        console.log(`   ✓ Description: ${result.description}`);
        
        const totalTime = Math.round((Date.now() - this.startTime) / 1000);
        console.log(`⏱️ Total E2E time: ${totalTime} seconds`);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('\n💥 UNCAUGHT EXCEPTION:');
    console.error(error);
    console.error('\n❌ E2E TEST FAILED - CRITICAL PATH BROKEN');
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('\n💥 UNHANDLED REJECTION:');
    console.error(error);
    console.error('\n❌ E2E TEST FAILED - CRITICAL PATH BROKEN');
    process.exit(1);
});

// Run the test
const runner = new E2ETestRunner();
runner.run();