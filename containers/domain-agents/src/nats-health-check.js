/**
 * NATS Health Check for Domain Agents
 * 
 * Simple health check that verifies NATS connectivity
 * for Docker container health monitoring
 */

import { connect } from 'nats';

async function healthCheck() {
    try {
        // Connect to NATS with a short timeout
        const nc = await connect({
            servers: process.env.NATS_URL || 'nats://localhost:4222',
            timeout: 5000,
            reconnect: false // Don't try to reconnect for health check
        });

        // If we can connect, we're healthy
        await nc.close();
        console.log('✅ NATS health check passed');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ NATS health check failed:', error.message);
        process.exit(1);
    }
}

// Run the health check
healthCheck();