import { z } from 'zod';

// Base event schema
export const BaseEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  source: z.string(),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
  replyTo: z.string().optional()
});

// Meta-Agent Event Schemas
export const MetaAgentCreatedSchema = BaseEventSchema.extend({
  type: z.literal('meta.agent.created'),
  data: z.object({
    agentId: z.string(),
    type: z.enum([
      'all-purpose-pattern',
      'prd-parser', 
      'scaffold-generator',
      'template-engine-factory',
      'parameter-flow',
      'five-document-framework',
      'thirty-minute-rule',
      'vercel-native-architecture',
      'infra-orchestrator',
      'backend-agent',
      'frontend-agent'
    ]),
    status: z.literal('created'),
    config: z.record(z.any()).optional()
  })
});

export const MetaAgentStartedSchema = BaseEventSchema.extend({
  type: z.literal('meta.agent.started'),
  data: z.object({
    agentId: z.string(),
    taskId: z.string(),
    status: z.literal('running')
  })
});

export const MetaAgentCompletedSchema = BaseEventSchema.extend({
  type: z.literal('meta.agent.completed'),
  data: z.object({
    agentId: z.string(),
    taskId: z.string(),
    result: z.any(),
    status: z.literal('completed'),
    executionTime: z.number().optional(),
    resourcesUsed: z.record(z.any()).optional()
  })
});

export const MetaAgentFailedSchema = BaseEventSchema.extend({
  type: z.literal('meta.agent.failed'),
  data: z.object({
    agentId: z.string(),
    taskId: z.string(),
    error: z.string(),
    status: z.literal('failed'),
    retryCount: z.number().optional(),
    stackTrace: z.string().optional()
  })
});

export const MetaAgentDeletedSchema = BaseEventSchema.extend({
  type: z.literal('meta.agent.deleted'),
  data: z.object({
    agentId: z.string(),
    type: z.string(),
    reason: z.string().optional()
  })
});

// Domain Agent Event Schemas
export const DomainAgentEventSchema = BaseEventSchema.extend({
  type: z.string().regex(/^domain\.(lead-generation|documentation|qa-testing|devops|prospector)\./),
  data: z.object({
    domain: z.enum(['lead-generation', 'documentation', 'qa-testing', 'devops', 'prospector']),
    action: z.enum(['execute', 'analyze', 'complete', 'error']),
    payload: z.any(),
    metadata: z.record(z.any()).optional()
  })
});

// Factory Coordination Event Schemas
export const FactoryTaskAssignedSchema = BaseEventSchema.extend({
  type: z.literal('factory.task.assigned'),
  data: z.object({
    taskId: z.string(),
    agentId: z.string(),
    task: z.any(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    deadline: z.string().datetime().optional()
  })
});

export const FactoryTaskProgressSchema = BaseEventSchema.extend({
  type: z.literal('factory.task.progress'),
  data: z.object({
    taskId: z.string(),
    agentId: z.string(),
    progress: z.number().min(0).max(100),
    stage: z.string(),
    estimatedCompletion: z.string().datetime().optional()
  })
});

export const FactoryTaskCompletedSchema = BaseEventSchema.extend({
  type: z.literal('factory.task.completed'),
  data: z.object({
    taskId: z.string(),
    agentId: z.string(),
    result: z.any(),
    completedAt: z.string().datetime(),
    qualityMetrics: z.record(z.number()).optional()
  })
});

export const FactoryWorkflowStartedSchema = BaseEventSchema.extend({
  type: z.literal('factory.workflow.started'),
  data: z.object({
    workflowId: z.string(),
    workflowType: z.string(),
    tasks: z.array(z.string()),
    dependencies: z.record(z.array(z.string())).optional()
  })
});

export const FactoryWorkflowCompletedSchema = BaseEventSchema.extend({
  type: z.literal('factory.workflow.completed'),
  data: z.object({
    workflowId: z.string(),
    completedTasks: z.array(z.string()),
    totalDuration: z.number(),
    success: z.boolean()
  })
});

export const FactoryErrorReportedSchema = BaseEventSchema.extend({
  type: z.literal('factory.error.reported'),
  data: z.object({
    errorId: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    component: z.string(),
    message: z.string(),
    stackTrace: z.string().optional(),
    context: z.record(z.any()).optional()
  })
});

// System Metrics Event Schemas
export const PerformanceMetricsSchema = BaseEventSchema.extend({
  type: z.string().regex(/^metrics\.performance\./),
  data: z.object({
    component: z.string(),
    metrics: z.object({
      cpu: z.number().optional(),
      memory: z.number().optional(),
      responseTime: z.number().optional(),
      throughput: z.number().optional(),
      errorRate: z.number().optional()
    }),
    timestamp: z.string().datetime()
  })
});

export const HealthMetricsSchema = BaseEventSchema.extend({
  type: z.string().regex(/^metrics\.health\./),
  data: z.object({
    service: z.string(),
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    checks: z.array(z.object({
      name: z.string(),
      status: z.enum(['pass', 'fail', 'warn']),
      message: z.string().optional(),
      duration: z.number().optional()
    })),
    timestamp: z.string().datetime()
  })
});

export const ResourceMetricsSchema = BaseEventSchema.extend({
  type: z.string().regex(/^metrics\.resource\./),
  data: z.object({
    resource: z.enum(['cpu', 'memory', 'disk', 'network']),
    usage: z.number().min(0).max(100),
    available: z.number(),
    threshold: z.number().optional(),
    alert: z.boolean().optional()
  })
});

export const AlertEventSchema = BaseEventSchema.extend({
  type: z.string().regex(/^alerts\./),
  data: z.object({
    alertId: z.string(),
    severity: z.enum(['critical', 'warning', 'info']),
    title: z.string(),
    description: z.string(),
    source: z.string(),
    affectedServices: z.array(z.string()).optional(),
    resolvedAt: z.string().datetime().optional()
  })
});

// Schema registry for validation
export const EventSchemas = {
  'meta.agent.created': MetaAgentCreatedSchema,
  'meta.agent.started': MetaAgentStartedSchema,
  'meta.agent.completed': MetaAgentCompletedSchema,
  'meta.agent.failed': MetaAgentFailedSchema,
  'meta.agent.deleted': MetaAgentDeletedSchema,
  'factory.task.assigned': FactoryTaskAssignedSchema,
  'factory.task.progress': FactoryTaskProgressSchema,
  'factory.task.completed': FactoryTaskCompletedSchema,
  'factory.workflow.started': FactoryWorkflowStartedSchema,
  'factory.workflow.completed': FactoryWorkflowCompletedSchema,
  'factory.error.reported': FactoryErrorReportedSchema
} as const;

// Type exports
export type MetaAgentCreatedEvent = z.infer<typeof MetaAgentCreatedSchema>;
export type MetaAgentStartedEvent = z.infer<typeof MetaAgentStartedSchema>;
export type MetaAgentCompletedEvent = z.infer<typeof MetaAgentCompletedSchema>;
export type MetaAgentFailedEvent = z.infer<typeof MetaAgentFailedSchema>;
export type MetaAgentDeletedEvent = z.infer<typeof MetaAgentDeletedSchema>;

export type DomainAgentEvent = z.infer<typeof DomainAgentEventSchema>;

export type FactoryTaskAssignedEvent = z.infer<typeof FactoryTaskAssignedSchema>;
export type FactoryTaskProgressEvent = z.infer<typeof FactoryTaskProgressSchema>;
export type FactoryTaskCompletedEvent = z.infer<typeof FactoryTaskCompletedSchema>;
export type FactoryWorkflowStartedEvent = z.infer<typeof FactoryWorkflowStartedSchema>;
export type FactoryWorkflowCompletedEvent = z.infer<typeof FactoryWorkflowCompletedSchema>;
export type FactoryErrorReportedEvent = z.infer<typeof FactoryErrorReportedSchema>;

export type PerformanceMetricsEvent = z.infer<typeof PerformanceMetricsSchema>;
export type HealthMetricsEvent = z.infer<typeof HealthMetricsSchema>;
export type ResourceMetricsEvent = z.infer<typeof ResourceMetricsSchema>;
export type AlertEvent = z.infer<typeof AlertEventSchema>;

// Validation helper
export function validateEvent(eventType: string, event: any): { valid: boolean; errors?: string[] } {
  // Check for domain-specific patterns
  if (eventType.startsWith('domain.')) {
    try {
      DomainAgentEventSchema.parse(event);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, errors: error.issues.map(issue => issue.message) };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  // Check for metrics patterns
  if (eventType.startsWith('metrics.performance.')) {
    try {
      PerformanceMetricsSchema.parse(event);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, errors: error.issues.map(issue => issue.message) };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  if (eventType.startsWith('metrics.health.')) {
    try {
      HealthMetricsSchema.parse(event);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, errors: error.issues.map(issue => issue.message) };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  if (eventType.startsWith('metrics.resource.')) {
    try {
      ResourceMetricsSchema.parse(event);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, errors: error.issues.map(issue => issue.message) };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  if (eventType.startsWith('alerts.')) {
    try {
      AlertEventSchema.parse(event);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, errors: error.issues.map(issue => issue.message) };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  // Check exact schema matches
  const schema = EventSchemas[eventType as keyof typeof EventSchemas];
  if (schema) {
    try {
      schema.parse(event);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { valid: false, errors: error.issues.map(issue => issue.message) };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  return { valid: false, errors: [`No schema found for event type: ${eventType}`] };
}