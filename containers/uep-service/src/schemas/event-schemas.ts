export interface UEPEventSchema {
  eventType: string;
  version: string;
  description: string;
  schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
    additionalProperties?: boolean;
  };
  enforcement: {
    level: 'strict' | 'warn' | 'monitor';
    rules: string[];
  };
  transformation?: {
    enabled: boolean;
    rules: Array<{
      field: string;
      transform: string;
      config?: any;
    }>;
  };
}

export const EVENT_SCHEMAS: Record<string, UEPEventSchema> = {
  'meta.agent.created': {
    eventType: 'meta.agent.created',
    version: '1.0.0',
    description: 'Meta-agent creation event',
    schema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', pattern: '^[a-zA-Z0-9-_]+$' },
        agentType: { 
          type: 'string', 
          enum: ['backend', 'frontend', 'devops', 'qa', 'documentation'] 
        },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        capabilities: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 50
        },
        configuration: {
          type: 'object',
          properties: {
            maxMemory: { type: 'number', maximum: 8192 },
            maxCpu: { type: 'number', maximum: 4.0 },
            timeout: { type: 'number', maximum: 300000 }
          }
        },
        creator: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['agentId', 'agentType', 'version', 'creator', 'timestamp'],
      additionalProperties: false
    },
    enforcement: {
      level: 'strict',
      rules: ['agent-creation-limit', 'resource-validation', 'naming-convention']
    },
    transformation: {
      enabled: true,
      rules: [
        { field: 'agentId', transform: 'sanitize-identifier' },
        { field: 'configuration.maxMemory', transform: 'clamp-resource', config: { min: 128, max: 8192 } }
      ]
    }
  },

  'meta.agent.started': {
    eventType: 'meta.agent.started',
    version: '1.0.0',
    description: 'Meta-agent execution start event',
    schema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        task: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            priority: { type: 'number', minimum: 1, maximum: 10 },
            estimatedDuration: { type: 'number', maximum: 3600000 }
          },
          required: ['id', 'type']
        },
        environment: {
          type: 'object',
          properties: {
            containerLimits: {
              type: 'object',
              properties: {
                memory: { type: 'number', maximum: 8192 },
                cpu: { type: 'number', maximum: 4.0 }
              }
            }
          }
        },
        startedBy: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['agentId', 'task', 'startedBy', 'timestamp'],
      additionalProperties: false
    },
    enforcement: {
      level: 'strict',
      rules: ['execution-rate-limit', 'resource-allocation', 'task-validation']
    }
  },

  'meta.agent.completed': {
    eventType: 'meta.agent.completed',
    version: '1.0.0',
    description: 'Meta-agent execution completion event',
    schema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        taskId: { type: 'string' },
        status: { type: 'string', enum: ['success', 'failure', 'timeout', 'cancelled'] },
        duration: { type: 'number', minimum: 0 },
        output: {
          type: 'object',
          properties: {
            artifacts: { type: 'array', items: { type: 'string' } },
            logs: { type: 'array', maxItems: 1000 },
            metrics: {
              type: 'object',
              properties: {
                memoryUsed: { type: 'number' },
                cpuUsed: { type: 'number' },
                ioOperations: { type: 'number' }
              }
            }
          }
        },
        error: { type: 'string' },
        completedBy: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['agentId', 'taskId', 'status', 'duration', 'completedBy', 'timestamp'],
      additionalProperties: false
    },
    enforcement: {
      level: 'warn',
      rules: ['output-size-limit', 'duration-validation', 'error-reporting']
    }
  },

  'domain.backend.deploy': {
    eventType: 'domain.backend.deploy',
    version: '1.0.0',
    description: 'Backend deployment event',
    schema: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string' },
        service: { type: 'string' },
        version: { type: 'string' },
        environment: { type: 'string', enum: ['development', 'staging', 'production'] },
        configuration: {
          type: 'object',
          properties: {
            replicas: { type: 'number', minimum: 1, maximum: 10 },
            resources: {
              type: 'object',
              properties: {
                memory: { type: 'string', pattern: '^\\d+[GMK]i$' },
                cpu: { type: 'string', pattern: '^\\d+m?$' }
              }
            }
          }
        },
        deployedBy: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['deploymentId', 'service', 'version', 'environment', 'deployedBy', 'timestamp'],
      additionalProperties: false
    },
    enforcement: {
      level: 'strict',
      rules: ['deployment-approval', 'environment-protection', 'resource-quotas']
    }
  },

  'domain.frontend.build': {
    eventType: 'domain.frontend.build',
    version: '1.0.0',
    description: 'Frontend build event',
    schema: {
      type: 'object',
      properties: {
        buildId: { type: 'string' },
        project: { type: 'string' },
        branch: { type: 'string' },
        commit: { type: 'string', pattern: '^[a-f0-9]{7,40}$' },
        buildConfig: {
          type: 'object',
          properties: {
            target: { type: 'string', enum: ['development', 'production'] },
            optimization: { type: 'boolean' },
            bundleAnalysis: { type: 'boolean' }
          }
        },
        initiatedBy: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['buildId', 'project', 'branch', 'commit', 'initiatedBy', 'timestamp'],
      additionalProperties: false
    },
    enforcement: {
      level: 'warn',
      rules: ['build-frequency-limit', 'artifact-size-limit', 'security-scan']
    }
  },

  'domain.qa.test': {
    eventType: 'domain.qa.test',
    version: '1.0.0',
    description: 'QA test execution event',
    schema: {
      type: 'object',
      properties: {
        testId: { type: 'string' },
        testSuite: { type: 'string' },
        testType: { type: 'string', enum: ['unit', 'integration', 'e2e', 'performance', 'security'] },
        target: {
          type: 'object',
          properties: {
            service: { type: 'string' },
            version: { type: 'string' },
            environment: { type: 'string' }
          },
          required: ['service', 'version']
        },
        configuration: {
          type: 'object',
          properties: {
            parallel: { type: 'boolean' },
            timeout: { type: 'number', maximum: 1800000 },
            retries: { type: 'number', maximum: 3 }
          }
        },
        triggeredBy: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['testId', 'testSuite', 'testType', 'target', 'triggeredBy', 'timestamp'],
      additionalProperties: false
    },
    enforcement: {
      level: 'warn',
      rules: ['test-resource-limit', 'concurrent-test-limit', 'environment-isolation']
    }
  },

  'factory.coordination.request': {
    eventType: 'factory.coordination.request',
    version: '1.0.0',
    description: 'Factory coordination request event',
    schema: {
      type: 'object',
      properties: {
        requestId: { type: 'string' },
        coordinationType: { type: 'string', enum: ['workflow', 'resource-allocation', 'scaling', 'dependency-resolution'] },
        priority: { type: 'number', minimum: 1, maximum: 10 },
        participants: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 20
        },
        configuration: {
          type: 'object',
          properties: {
            timeout: { type: 'number', maximum: 600000 },
            consensus: { type: 'string', enum: ['majority', 'unanimous', 'leader'] }
          }
        },
        requestedBy: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['requestId', 'coordinationType', 'participants', 'requestedBy', 'timestamp'],
      additionalProperties: false
    },
    enforcement: {
      level: 'strict',
      rules: ['coordination-authorization', 'participant-validation', 'request-rate-limit']
    }
  },

  'metrics.performance': {
    eventType: 'metrics.performance',
    version: '1.0.0',
    description: 'Performance metrics event',
    schema: {
      type: 'object',
      properties: {
        metricId: { type: 'string' },
        source: { type: 'string' },
        metrics: {
          type: 'object',
          properties: {
            responseTime: { type: 'number', minimum: 0 },
            throughput: { type: 'number', minimum: 0 },
            errorRate: { type: 'number', minimum: 0, maximum: 1 },
            resourceUtilization: {
              type: 'object',
              properties: {
                cpu: { type: 'number', minimum: 0, maximum: 100 },
                memory: { type: 'number', minimum: 0, maximum: 100 },
                disk: { type: 'number', minimum: 0, maximum: 100 }
              }
            }
          }
        },
        interval: { type: 'number', minimum: 1000 },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['metricId', 'source', 'metrics', 'timestamp'],
      additionalProperties: false
    },
    enforcement: {
      level: 'monitor',
      rules: ['metrics-volume-limit', 'data-retention', 'anomaly-detection']
    }
  },

  'security.violation': {
    eventType: 'security.violation',
    version: '1.0.0',
    description: 'Security violation event',
    schema: {
      type: 'object',
      properties: {
        violationId: { type: 'string' },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        violationType: { type: 'string', enum: ['authentication', 'authorization', 'data-access', 'resource-abuse', 'injection', 'other'] },
        source: { type: 'string' },
        target: { type: 'string' },
        details: {
          type: 'object',
          properties: {
            description: { type: 'string', maxLength: 1000 },
            evidence: { type: 'array', items: { type: 'string' } },
            mitigation: { type: 'string' }
          },
          required: ['description']
        },
        reportedBy: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['violationId', 'severity', 'violationType', 'source', 'details', 'reportedBy', 'timestamp'],
      additionalProperties: false
    },
    enforcement: {
      level: 'strict',
      rules: ['immediate-alert', 'incident-creation', 'access-review', 'compliance-reporting']
    }
  }
};

export function getEventSchema(eventType: string): UEPEventSchema | null {
  return EVENT_SCHEMAS[eventType] || null;
}

export function getAllEventTypes(): string[] {
  return Object.keys(EVENT_SCHEMAS);
}

export function getSchemasByEnforcementLevel(level: 'strict' | 'warn' | 'monitor'): UEPEventSchema[] {
  return Object.values(EVENT_SCHEMAS).filter(schema => schema.enforcement.level === level);
}

export function validateEventAgainstSchema(eventType: string, eventData: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const schema = getEventSchema(eventType);
  if (!schema) {
    return {
      isValid: false,
      errors: [`No schema found for event type: ${eventType}`],
      warnings: []
    };
  }

  // Basic schema validation (simplified - in production use a proper JSON schema validator)
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  for (const field of schema.schema.required) {
    if (!(field in eventData)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check data types and constraints (simplified validation)
  for (const [field, definition] of Object.entries(schema.schema.properties)) {
    if (field in eventData) {
      const value = eventData[field];
      const def = definition as any;

      if (def.type === 'string' && typeof value !== 'string') {
        errors.push(`Field ${field} must be a string`);
      } else if (def.type === 'number' && typeof value !== 'number') {
        errors.push(`Field ${field} must be a number`);
      } else if (def.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Field ${field} must be a boolean`);
      } else if (def.type === 'array' && !Array.isArray(value)) {
        errors.push(`Field ${field} must be an array`);
      } else if (def.type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
        errors.push(`Field ${field} must be an object`);
      }

      // Check constraints
      if (def.maximum && typeof value === 'number' && value > def.maximum) {
        errors.push(`Field ${field} exceeds maximum value of ${def.maximum}`);
      }
      if (def.minimum && typeof value === 'number' && value < def.minimum) {
        errors.push(`Field ${field} below minimum value of ${def.minimum}`);
      }
      if (def.maxLength && typeof value === 'string' && value.length > def.maxLength) {
        errors.push(`Field ${field} exceeds maximum length of ${def.maxLength}`);
      }
      if (def.pattern && typeof value === 'string' && !new RegExp(def.pattern).test(value)) {
        errors.push(`Field ${field} does not match required pattern`);
      }
      if (def.enum && !def.enum.includes(value)) {
        errors.push(`Field ${field} must be one of: ${def.enum.join(', ')}`);
      }
    }
  }

  // Check for additional properties
  if (schema.schema.additionalProperties === false) {
    const allowedFields = Object.keys(schema.schema.properties);
    for (const field of Object.keys(eventData)) {
      if (!allowedFields.includes(field)) {
        warnings.push(`Additional property not allowed: ${field}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}