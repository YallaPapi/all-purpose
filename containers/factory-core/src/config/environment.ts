export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'factory-core-secret',
  redis: {
    url: process.env.REDIS_URL || 'redis://redis:6379'
  },
  nats: {
    url: process.env.NATS_URL || 'nats://nats-broker:4222'
  },
  observability: {
    url: process.env.OBSERVABILITY_URL || 'http://observability:3000'
  }
};