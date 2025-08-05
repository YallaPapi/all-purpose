#!/usr/bin/env node

/**
 * Combined Health Check for NATS Workers
 * 
 * This comprehensive health check combines multiple approaches:
 * 1. Process health (Node.js responsive)
 * 2. NATS connectivity 
 * 3. Memory usage
 * 4. Optional: Message queue health
 * 
 * Best for production environments where you need robust health checking
 */

const { connect } = require('nats');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const NATS_URL = process.env.NATS_URL || 'nats://nats-broker:4222';
const HEALTH_CHECK_TIMEOUT = 8000; // 8 seconds total
const AGENT_TYPE = process.env.AGENT_TYPE || 'backend';
const MEMORY_THRESHOLD = 90; // Memory usage threshold percentage

class CombinedHealthCheck {
    constructor() {
        this.checks = {
            process: false,
            memory: false,
            nats: false
        };
    }

    async runAllChecks() {
        console.log(`🔍 Running comprehensive health check for ${AGENT_TYPE} agent...`);
        
        try {
            // Run all checks in parallel for speed
            const [processCheck, memoryCheck, natsCheck] = await Promise.allSettled([
                this.checkProcess(),
                this.checkMemory(),
                this.checkNATS()
            ]);

            // Evaluate results
            this.checks.process = processCheck.status === 'fulfilled' && processCheck.value;
            this.checks.memory = memoryCheck.status === 'fulfilled' && memoryCheck.value;
            this.checks.nats = natsCheck.status === 'fulfilled' && natsCheck.value;

            // Log results
            this.logResults();

            // Determine overall health
            const criticalChecks = [this.checks.process, this.checks.nats];
            const allCriticalPassed = criticalChecks.every(check => check === true);
            
            if (allCriticalPassed) {
                console.log(`✅ ${AGENT_TYPE} agent is healthy`);
                process.exit(0);
            } else {
                console.log(`❌ ${AGENT_TYPE} agent health check failed`);
                process.exit(1);
            }

        } catch (error) {
            console.error(`❌ Health check error:`, error.message);
            process.exit(1);
        }
    }

    async checkProcess() {
        try {
            const { stdout } = await execAsync(`pgrep -f "simple-domain-agent"`);
            if (stdout.trim()) {
                console.log(`✅ Process check: ${AGENT_TYPE} agent process is running`);
                return true;
            } else {
                console.log(`❌ Process check: ${AGENT_TYPE} agent process not found`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Process check: ${AGENT_TYPE} agent process not running`);
            return false;
        }
    }

    async checkMemory() {
        try {
            const memoryUsage = process.memoryUsage();
            const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
            const usagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

            if (usagePercent < MEMORY_THRESHOLD) {
                console.log(`✅ Memory check: ${usagePercent}% used (${heapUsedMB}MB/${heapTotalMB}MB)`);
                return true;
            } else {
                console.log(`⚠️ Memory check: High usage ${usagePercent}% (${heapUsedMB}MB/${heapTotalMB}MB)`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Memory check failed:`, error.message);
            return false;
        }
    }

    async checkNATS() {
        let nc = null;
        
        try {
            // Connect to NATS
            nc = await connect({
                servers: NATS_URL,
                timeout: 5000,
                reconnect: false
            });

            // Test publish/subscribe round trip
            const testSubject = `health.test.${AGENT_TYPE}.${Date.now()}`;
            const responseSubject = nc.createInbox();
            
            // Set up subscription
            const sub = nc.subscribe(responseSubject, { max: 1 });
            
            // Publish test message
            await nc.publish(testSubject, Buffer.from('health-ping'), { reply: responseSubject });
            
            // Wait for response with timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('NATS response timeout')), 3000);
            });
            
            const responsePromise = (async () => {
                for await (const msg of sub) {
                    return msg.data.toString();
                }
            })();
            
            await Promise.race([responsePromise, timeoutPromise]);
            
            await nc.drain();
            console.log(`✅ NATS check: Connected and responsive`);
            return true;
            
        } catch (error) {
            if (nc) {
                try {
                    await nc.close();
                } catch (closeError) {
                    // Ignore close errors
                }
            }
            console.log(`❌ NATS check failed:`, error.message);
            return false;
        }
    }

    logResults() {
        console.log('\n📊 Health Check Results:');
        console.log(`   Process:  ${this.checks.process ? '✅' : '❌'}`);
        console.log(`   Memory:   ${this.checks.memory ? '✅' : '⚠️'}`);
        console.log(`   NATS:     ${this.checks.nats ? '✅' : '❌'}`);
        console.log('');
    }
}

// Set global timeout
const globalTimeout = setTimeout(() => {
    console.error(`❌ Health check timed out after ${HEALTH_CHECK_TIMEOUT}ms`);
    process.exit(1);
}, HEALTH_CHECK_TIMEOUT);

// Run health check
const healthCheck = new CombinedHealthCheck();
healthCheck.runAllChecks().finally(() => {
    clearTimeout(globalTimeout);
});