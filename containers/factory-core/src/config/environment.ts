/**
 * Environment Configuration for Factory Core
 * Handles both container and development environments
 */

interface Config {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  redis: {
    url: string;
  };
  nats: {
    url: string;
  };
  observability: {
    url: string;
  };
  agents: {
    rootPath: string;
    memoryEnabled: boolean;
  };
  logging: {
    level: string;
    format: string;
  };
  container: {
    isContainer: boolean;
    healthCheckPort: number;
  };
}

function createConfig(): Config {
  const isContainer = process.env.DOCKER_CONTAINER === 'true' || 
                      process.cwd().startsWith('/app') ||
                      process.env.NODE_ENV === 'production';

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'factory-core-secret',
    
    redis: {
      url: process.env.REDIS_URL || (isContainer ? 'redis://redis:6379' : 'redis://localhost:6379')
    },
    
    nats: {
      url: process.env.NATS_URL || (isContainer ? 'nats://nats-broker:4222' : 'nats://localhost:4222')
    },
    
    observability: {
      url: process.env.OBSERVABILITY_URL || 'http://observability:3000'
    },
    
    agents: {
      rootPath: isContainer ? '/app' : process.cwd(),
      memoryEnabled: process.env.AGENT_MEMORY_ENABLED !== 'false'
    },
    
    logging: {
      level: process.env.LOG_LEVEL || (isContainer ? 'info' : 'debug'),
      format: process.env.LOG_FORMAT || (isContainer ? 'json' : 'simple')
    },
    
    container: {
      isContainer,
      healthCheckPort: parseInt(process.env.HEALTH_CHECK_PORT || '3000', 10)
    }
  };
}

export const config = createConfig();

// Export for use in other modules
export default config;