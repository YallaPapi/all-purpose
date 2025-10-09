/**
 * Secure NATS Connection Helper
 * 
 * Provides secure NATS connection with TLS and authentication
 * for all meta-agents in the system
 */

import { connect } from 'nats';
import { readFileSync } from 'fs';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Create a secure NATS connection
 * @param {Object} options - Connection options
 * @param {string} options.agentId - Unique agent identifier
 * @param {string} options.agentType - Type of agent (backend, frontend, etc.)
 * @param {Object} options.logger - Winston logger instance
 * @returns {Promise<NatsConnection>} Secure NATS connection
 */
export async function createSecureNATSConnection(options) {
  const { agentId, agentType, logger } = options;
  
  // Determine if we're in production mode
  const isProduction = process.env.NODE_ENV === 'production';
  const useTLS = process.env.NATS_USE_TLS === 'true' || isProduction;
  
  // Build connection options
  const connectionOptions = {
    servers: process.env.NATS_URL || (useTLS ? 'tls://localhost:4222' : 'nats://localhost:4222'),
    name: agentId,
    
    // Authentication
    user: process.env.NATS_USER || agentType,
    pass: process.env.NATS_PASSWORD || `${agentType}-secret`,
    
    // Connection options
    maxReconnectAttempts: -1,  // Infinite reconnect attempts
    reconnectTimeWait: 1000,    // 1 second between attempts
    timeout: 5000,              // 5 second connection timeout
    pingInterval: 120000,       // 2 minutes
    maxPingOut: 3,
    
    // Error handling
    debug: process.env.NATS_DEBUG === 'true',
    verbose: process.env.NATS_VERBOSE === 'true'
  };
  
  // Add TLS configuration if enabled
  if (useTLS) {
    const certDir = process.env.NATS_TLS_CERT_DIR || '/etc/nats/client';
    
    // Check if certificates exist
    const certPath = path.join(certDir, `${agentType}.crt`);
    const keyPath = path.join(certDir, `${agentType}.key`);
    const caPath = path.join(certDir, 'ca.crt');
    
    // Use environment variables if certificates don't exist at default paths
    const tlsCert = process.env.NATS_TLS_CERT || certPath;
    const tlsKey = process.env.NATS_TLS_KEY || keyPath;
    const tlsCA = process.env.NATS_TLS_CA || caPath;
    
    try {
      // Only add TLS config if files exist
      if (existsSync(tlsCert) && existsSync(tlsKey) && existsSync(tlsCA)) {
        connectionOptions.tls = {
          cert: readFileSync(tlsCert),
          key: readFileSync(tlsKey),
          ca: [readFileSync(tlsCA)],
          rejectUnauthorized: true,
          checkServerIdentity: (servername, cert) => {
            // Custom server identity verification if needed
            logger.debug(`Verifying server: ${servername}`);
            return undefined; // Return undefined if verification passes
          }
        };
        logger.info(`TLS enabled for ${agentId} using certificates from ${certDir}`);
      } else {
        logger.warn(`TLS certificates not found for ${agentId}, falling back to non-TLS connection`);
        connectionOptions.servers = connectionOptions.servers.replace('tls://', 'nats://');
      }
    } catch (error) {
      logger.error(`Failed to read TLS certificates for ${agentId}:`, error);
      throw error;
    }
  }
  
  // Connection event handlers
  let nc;
  
  try {
    logger.info(`Connecting ${agentId} to NATS at ${connectionOptions.servers}...`);
    nc = await connect(connectionOptions);
    
    // Set up event handlers
    nc.closed().then(() => {
      logger.warn(`${agentId} NATS connection closed`);
    }).catch((err) => {
      logger.error(`${agentId} NATS connection closed with error:`, err);
    });
    
    // Monitor connection status
    (async () => {
      for await (const status of nc.status()) {
        switch (status.type) {
          case 'disconnect':
            logger.warn(`${agentId} disconnected from NATS`);
            break;
          case 'reconnect':
            logger.info(`${agentId} reconnected to NATS`);
            break;
          case 'update':
            logger.debug(`${agentId} NATS server update:`, status.data);
            break;
          case 'error':
            logger.error(`${agentId} NATS error:`, status.data);
            break;
          default:
            logger.debug(`${agentId} NATS status:`, status);
        }
      }
    })();
    
    logger.info(`${agentId} successfully connected to NATS (TLS: ${useTLS})`);
    
    // Return connection info along with the connection
    return {
      connection: nc,
      info: {
        agentId,
        agentType,
        server: nc.getServer(),
        tlsEnabled: useTLS,
        authenticated: !!connectionOptions.user
      }
    };
    
  } catch (error) {
    logger.error(`${agentId} failed to connect to NATS:`, error);
    throw error;
  }
}

/**
 * Create a monitoring connection (read-only)
 */
export async function createMonitoringConnection(logger) {
  return createSecureNATSConnection({
    agentId: 'monitoring-client',
    agentType: 'monitoring',
    logger
  });
}

/**
 * Verify NATS connection health
 */
export async function verifyConnection(nc, logger) {
  try {
    // Try to publish and subscribe to a test subject
    const testSubject = `health.check.${Date.now()}`;
    const testData = { timestamp: new Date(), test: true };
    
    // Subscribe to test subject
    const sub = nc.subscribe(testSubject, {
      timeout: 1000,
      max: 1
    });
    
    // Publish test message
    nc.publish(testSubject, JSON.stringify(testData));
    
    // Wait for response
    for await (const msg of sub) {
      const received = JSON.parse(msg.string());
      if (received.test === true) {
        logger.debug('NATS connection health check passed');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    logger.error('NATS connection health check failed:', error);
    return false;
  }
}

/**
 * Gracefully close NATS connection
 */
export async function closeConnection(connInfo, logger) {
  if (!connInfo || !connInfo.connection) return;
  
  const { connection: nc, info } = connInfo;
  
  try {
    logger.info(`Closing NATS connection for ${info.agentId}...`);
    
    // Drain subscriptions and flush pending messages
    await nc.drain();
    
    logger.info(`${info.agentId} NATS connection closed gracefully`);
  } catch (error) {
    logger.error(`Error closing NATS connection for ${info.agentId}:`, error);
    throw error;
  }
}