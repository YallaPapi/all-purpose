/**
 * Configuration Validation
 * 
 * Validates environment variables and configuration using Joi schema.
 * Ensures all required configuration is present and properly formatted.
 */

import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Application configuration
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  HTTP_PORT: Joi.number().port().default(3001),
  GRPC_PORT: Joi.number().port().default(50051),
  
  // CORS configuration
  CORS_ORIGIN: Joi.string().default('*'),
  
  // etcd configuration
  ETCD_ENDPOINTS: Joi.string().required(),
  ETCD_USERNAME: Joi.string().optional(),
  ETCD_PASSWORD: Joi.string().optional(),
  ETCD_ROOT_CERT_PATH: Joi.string().optional(),
  ETCD_PRIVATE_KEY_PATH: Joi.string().optional(),
  ETCD_CERT_CHAIN_PATH: Joi.string().optional(),
  
  // Redis configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  
  // Monitoring configuration
  METRICS_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECKS_ENABLED: Joi.boolean().default(true),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  
  // UEP specific configuration
  UEP_REGISTRY_TTL_SECONDS: Joi.number().min(10).max(3600).default(300),
  UEP_HEALTH_CHECK_INTERVAL_SECONDS: Joi.number().min(5).max(300).default(30),
  UEP_CLEANUP_INTERVAL_SECONDS: Joi.number().min(30).max(3600).default(300),
  
  // Performance configuration
  MAX_CONCURRENT_REGISTRATIONS: Joi.number().min(1).max(1000).default(100),
  MAX_WATCH_CONNECTIONS: Joi.number().min(1).max(10000).default(1000),
  DISCOVERY_CACHE_TTL_SECONDS: Joi.number().min(1).max(300).default(60),
});

export function validateConfig(config: Record<string, unknown>) {
  const { error, value } = configValidationSchema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    throw new Error(`Configuration validation error: ${error.message}`);
  }

  return value;
}