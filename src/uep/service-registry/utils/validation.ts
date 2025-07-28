/**
 * Agent Registration Validation Utilities
 * Task 220.3: Comprehensive validation for agent registration data
 */

import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { 
  AgentRegistrationMetadata, 
  AgentStatus,
  validateAgentRegistration,
  isValidAgentId,
  isValidAgentStatus,
  convertToConsulRegistration
} from '../types/AgentRegistration.js';

// Import JSON schema
import agentRegistrationSchema from '../schemas/agent-registration.schema.json' assert { type: 'json' };

export class AgentRegistrationValidator {
  private ajv: Ajv;
  private validateSchema: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    
    // Add custom formats
    this.ajv.addFormat('uuid', {
      type: 'string',
      validate: (data: string) => isValidAgentId(data)
    });
    
    this.ajv.addFormat('kubernetes-name', {
      type: 'string',
      validate: (data: string) => /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(data) && data.length <= 253
    });
    
    this.ajv.addFormat('resource-quantity', {
      type: 'string',
      validate: (data: string) => /^\d+([KMGT]i?|m)?$/.test(data)
    });
    
    // Compile schema
    this.validateSchema = this.ajv.compile(agentRegistrationSchema);
  }

  /**
   * Validate agent registration against JSON schema
   */
  validateSchema(registration: any): ValidationResult {
    const isValid = this.validateSchema(registration);
    
    if (!isValid) {
      return {
        valid: false,
        errors: this.validateSchema.errors?.map(error => ({
          field: error.instancePath || error.schemaPath,
          message: error.message || 'Validation error',
          value: error.data,
          constraint: error.params
        })) || []
      };
    }
    
    return { valid: true, errors: [] };
  }

  /**
   * Validate agent registration with business logic
   */
  validateRegistration(registration: Partial<AgentRegistrationMetadata>): ValidationResult {
    const schemaResult = this.validateSchema(registration);
    if (!schemaResult.valid) {
      return schemaResult;
    }

    const businessLogicResult = validateAgentRegistration(registration);
    if (!businessLogicResult.valid) {
      return {
        valid: false,
        errors: businessLogicResult.errors.map(error => ({
          field: 'business-logic',
          message: error,
          value: undefined
        }))
      };
    }

    // Additional validation rules
    const additionalErrors: ValidationError[] = [];

    // Validate version consistency
    if (registration.version && registration.capabilities) {
      for (const capability of registration.capabilities) {
        if (!this.isValidSemanticVersion(capability.version)) {
          additionalErrors.push({
            field: `capabilities[${capability.name}].version`,
            message: 'Invalid semantic version format',
            value: capability.version
          });
        }
      }
    }

    // Validate network configuration
    if (registration.network) {
      const { port, additionalPorts, healthCheckPort, metricsPort } = registration.network;
      const allPorts = [port];
      
      if (additionalPorts) {
        allPorts.push(...Object.values(additionalPorts));
      }
      if (healthCheckPort) allPorts.push(healthCheckPort);
      if (metricsPort) allPorts.push(metricsPort);
      
      // Check for port conflicts
      const uniquePorts = new Set(allPorts);
      if (uniquePorts.size !== allPorts.length) {
        additionalErrors.push({
          field: 'network.ports',
          message: 'Port conflicts detected',
          value: allPorts
        });
      }
    }

    // Validate resource requirements consistency
    if (registration.resources) {
      const { cpu, memory } = registration.resources;
      
      if (!this.isValidResourceProgression(cpu.min, cpu.preferred, cpu.max)) {
        additionalErrors.push({
          field: 'resources.cpu',
          message: 'Invalid resource progression (min <= preferred <= max)',
          value: cpu
        });
      }
      
      if (!this.isValidResourceProgression(memory.min, memory.preferred, memory.max)) {
        additionalErrors.push({
          field: 'resources.memory',
          message: 'Invalid resource progression (min <= preferred <= max)',
          value: memory
        });
      }
    }

    // Validate health check configuration
    if (registration.healthCheck) {
      const { interval, timeout } = registration.healthCheck;
      
      if (this.parseTimeToSeconds(timeout) >= this.parseTimeToSeconds(interval)) {
        additionalErrors.push({
          field: 'healthCheck',
          message: 'Health check timeout must be less than interval',
          value: { interval, timeout }
        });
      }
    }

    // Validate load metrics
    if (registration.currentMetrics) {
      const { currentLoad, maxCapacity, errorRate } = registration.currentMetrics;
      
      if (currentLoad > 100) {
        additionalErrors.push({
          field: 'currentMetrics.currentLoad',
          message: 'Current load cannot exceed 100%',
          value: currentLoad
        });
      }
      
      if (errorRate > 1) {
        additionalErrors.push({
          field: 'currentMetrics.errorRate',
          message: 'Error rate cannot exceed 1.0 (100%)',
          value: errorRate
        });
      }
    }

    return {
      valid: additionalErrors.length === 0,
      errors: additionalErrors
    };
  }

  /**
   * Validate agent registration update
   */
  validateUpdate(update: any, existingRegistration?: AgentRegistrationMetadata): ValidationResult {
    if (!update.agentId) {
      return {
        valid: false,
        errors: [{ field: 'agentId', message: 'Agent ID is required for updates', value: undefined }]
      };
    }

    if (!isValidAgentId(update.agentId)) {
      return {
        valid: false,
        errors: [{ field: 'agentId', message: 'Invalid agent ID format', value: update.agentId }]
      };
    }

    if (!update.lastHeartbeat) {
      return {
        valid: false,
        errors: [{ field: 'lastHeartbeat', message: 'Last heartbeat is required for updates', value: undefined }]
      };
    }

    // Validate that update fields are allowed to be modified
    const allowedUpdateFields = new Set([
      'agentId', 'lastHeartbeat', 'currentMetrics', 'status', 'configuration',
      'featureFlags', 'labels', 'annotations', 'network'
    ]);

    const updateFields = Object.keys(update);
    const invalidFields = updateFields.filter(field => !allowedUpdateFields.has(field));
    
    if (invalidFields.length > 0) {
      return {
        valid: false,
        errors: invalidFields.map(field => ({
          field,
          message: 'Field is not allowed in updates',
          value: update[field]
        }))
      };
    }

    // Validate status transition if provided
    if (update.status && existingRegistration) {
      const validTransition = this.isValidStatusTransition(existingRegistration.status, update.status);
      if (!validTransition) {
        return {
          valid: false,
          errors: [{
            field: 'status',
            message: `Invalid status transition from ${existingRegistration.status} to ${update.status}`,
            value: update.status
          }]
        };
      }
    }

    return { valid: true, errors: [] };
  }

  /**
   * Validate Consul service registration
   */
  validateConsulRegistration(consulReg: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!consulReg.ID || typeof consulReg.ID !== 'string') {
      errors.push({ field: 'ID', message: 'Service ID is required', value: consulReg.ID });
    }

    if (!consulReg.Name || typeof consulReg.Name !== 'string') {
      errors.push({ field: 'Name', message: 'Service name is required', value: consulReg.Name });
    }

    if (!consulReg.Address || typeof consulReg.Address !== 'string') {
      errors.push({ field: 'Address', message: 'Service address is required', value: consulReg.Address });
    }

    if (!consulReg.Port || typeof consulReg.Port !== 'number' || consulReg.Port < 1 || consulReg.Port > 65535) {
      errors.push({ field: 'Port', message: 'Valid service port is required (1-65535)', value: consulReg.Port });
    }

    if (!Array.isArray(consulReg.Tags)) {
      errors.push({ field: 'Tags', message: 'Tags must be an array', value: consulReg.Tags });
    }

    if (consulReg.Meta && typeof consulReg.Meta !== 'object') {
      errors.push({ field: 'Meta', message: 'Meta must be an object', value: consulReg.Meta });
    }

    return { valid: errors.length === 0, errors };
  }

  // Private helper methods
  
  private isValidSemanticVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    return semverRegex.test(version);
  }

  private isValidResourceProgression(min: string, preferred: string, max: string): boolean {
    try {
      const minVal = this.parseResourceQuantity(min);
      const prefVal = this.parseResourceQuantity(preferred);
      const maxVal = this.parseResourceQuantity(max);
      
      return minVal <= prefVal && prefVal <= maxVal;
    } catch {
      return false;
    }
  }

  private parseResourceQuantity(quantity: string): number {
    // Simple parser for Kubernetes resource quantities
    const match = quantity.match(/^(\d+(?:\.\d+)?)([KMGT]i?|m)?$/);
    if (!match) throw new Error('Invalid resource quantity');
    
    const value = parseFloat(match[1]);
    const unit = match[2] || '';
    
    const multipliers: Record<string, number> = {
      'm': 0.001,
      'K': 1000, 'Ki': 1024,
      'M': 1000000, 'Mi': 1048576,
      'G': 1000000000, 'Gi': 1073741824,
      'T': 1000000000000, 'Ti': 1099511627776
    };
    
    return value * (multipliers[unit] || 1);
  }

  private parseTimeToSeconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smh])$/);
    if (!match) throw new Error('Invalid time format');
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers: Record<string, number> = {
      's': 1,
      'm': 60,
      'h': 3600
    };
    
    return value * multipliers[unit];
  }

  private isValidStatusTransition(from: AgentStatus, to: AgentStatus): boolean {
    // Define valid status transitions
    const validTransitions: Record<AgentStatus, AgentStatus[]> = {
      'initializing': ['healthy', 'unhealthy', 'unknown'],
      'healthy': ['degraded', 'unhealthy', 'maintenance', 'shutting-down'],
      'degraded': ['healthy', 'unhealthy', 'maintenance', 'shutting-down'],
      'unhealthy': ['healthy', 'degraded', 'shutting-down', 'unknown'],
      'maintenance': ['healthy', 'degraded', 'shutting-down'],
      'shutting-down': [], // Terminal state
      'unknown': ['initializing', 'healthy', 'degraded', 'unhealthy']
    };
    
    return validTransitions[from]?.includes(to) || false;
  }
}

// Export interfaces and types
export interface ValidationError {
  field: string;
  message: string;
  value: any;
  constraint?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Export singleton instance
export const validator = new AgentRegistrationValidator();

// Export convenience functions
export function validateAgentMetadata(registration: any): ValidationResult {
  return validator.validateRegistration(registration);
}

export function validateAgentUpdate(update: any, existing?: AgentRegistrationMetadata): ValidationResult {
  return validator.validateUpdate(update, existing);
}

export function validateConsulRegistration(consulReg: any): ValidationResult {
  return validator.validateConsulRegistration(consulReg);
}

// Testing utilities
export function createTestRegistration(overrides: Partial<AgentRegistrationMetadata> = {}): AgentRegistrationMetadata {
  const baseTime = new Date().toISOString();
  
  const defaults: AgentRegistrationMetadata = {
    agentId: '550e8400-e29b-41d4-a716-446655440000',
    agentName: 'test-agent',
    agentType: 'prd-parser',
    instanceId: 'test-instance-001',
    
    version: {
      major: 1,
      minor: 0,
      patch: 0
    },
    
    capabilities: [{
      name: 'test-capability',
      version: '1.0.0',
      description: 'Test capability for validation'
    }],
    
    supportedProtocols: ['UEP/2.0'],
    
    network: {
      address: '127.0.0.1',
      port: 8080,
      protocol: 'http',
      tlsEnabled: false
    },
    
    resources: {
      cpu: { min: '100m', max: '500m', preferred: '250m' },
      memory: { min: '128Mi', max: '512Mi', preferred: '256Mi' }
    },
    
    currentMetrics: {
      currentLoad: 0,
      maxCapacity: 10,
      averageResponseTime: 100,
      errorRate: 0,
      queueLength: 0,
      lastUpdated: baseTime
    },
    
    healthCheck: {
      endpoint: '/health',
      method: 'GET',
      interval: '30s',
      timeout: '5s',
      failureThreshold: 3,
      successThreshold: 1
    },
    
    monitoring: {
      metricsEnabled: true,
      metricsEndpoint: '/metrics',
      metricsFormat: 'prometheus',
      tracingEnabled: false,
      loggingLevel: 'info',
      healthMetrics: true
    },
    
    security: {
      tlsRequired: false,
      encryptionEnabled: false,
      auditLogging: false
    },
    
    environment: 'development',
    cluster: 'test-cluster',
    namespace: 'test-namespace',
    
    startTime: baseTime,
    lastHeartbeat: baseTime,
    registrationTime: baseTime,
    status: 'healthy',
    
    configuration: {},
    featureFlags: {},
    labels: {},
    annotations: {}
  };
  
  return { ...defaults, ...overrides };
}