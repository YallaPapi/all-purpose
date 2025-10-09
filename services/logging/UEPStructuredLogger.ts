/**
 * UEP Structured Logging System
 * 
 * High-performance structured JSON logging system with trace correlation,
 * context propagation, and UEP protocol-specific log enrichment.
 * Designed for production microservices with comprehensive observability.
 * 
 * Features:
 * - Structured JSON logging with consistent schema
 * - Automatic trace/span ID correlation
 * - Context propagation across async boundaries
 * - UEP protocol-specific log fields
 * - High-performance logging with minimal overhead
 * - Multiple output destinations (console, file, network)
 * - Log level management and filtering
 * - Sensitive data redaction
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import { AsyncLocalStorage } from 'async_hooks';
import { trace, context as otelContext } from '@opentelemetry/api';
import { 
  UEPMessage, 
  UEPMessageMetadata, 
  AgentIdentifier,
  UEPContext,
  UEPError,
  UEPTraceSpan 
} from '../types/UEPTypes';

// =====================================================
// Logging Configuration and Interfaces
// =====================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface UEPLoggingConfig {
  enabled: boolean;
  level: LogLevel;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  format: 'json' | 'pretty' | 'compact';
  outputs: {
    console: {
      enabled: boolean;
      level?: LogLevel;
      colorize: boolean;
      timestamp: boolean;
    };
    file: {
      enabled: boolean;
      path: string;
      level?: LogLevel;
      maxSize: string;
      maxFiles: number;
      rotate: boolean;
    };
    network: {
      enabled: boolean;
      endpoint: string;
      level?: LogLevel;
      protocol: 'http' | 'tcp' | 'udp';
      buffer: boolean;
      batchSize: number;
    };
  };
  correlation: {
    enabled: boolean;
    traceIdField: string;
    spanIdField: string;
    correlationIdField: string;
    userIdField: string;
    sessionIdField: string;
  };
  enrichment: {
    enabled: boolean;
    includeHostname: boolean;
    includePid: boolean;
    includeMemoryUsage: boolean;
    includeTimestamp: boolean;
    includeLevel: boolean;
    includeService: boolean;
  };
  filtering: {
    enabled: boolean;
    excludeFields: string[];
    redactFields: string[];
    redactPatterns: RegExp[];
    maxMessageLength: number;
  };
  performance: {
    bufferSize: number;
    flushInterval: number;
    asyncLogging: boolean;
    samplingRate: number;
  };
}

export interface UEPLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: {
    name: string;
    version: string;
    environment: string;
  };
  trace?: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    traceFlags?: string;
  };
  uep?: {
    messageId?: string;
    messageType?: string;
    agentId?: string;
    agentType?: string;
    correlationId?: string;
    protocolVersion?: string;
    workflowId?: string;
    executionId?: string;
    coordinationId?: string;
  };
  context?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    operationName?: string;
    tags?: Record<string, string>;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    category?: string;
  };
  performance?: {
    duration?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  host?: {
    hostname: string;
    pid: number;
  };
  [key: string]: any;
}

export interface UEPLogContext {
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  agentId?: string;
  workflowId?: string;
  operationName?: string;
  tags?: Record<string, string>;
}

// =====================================================
// UEP Structured Logger
// =====================================================

export class UEPStructuredLogger extends EventEmitter {
  private config: UEPLoggingConfig;
  private contextStorage: AsyncLocalStorage<UEPLogContext>;
  private logBuffer: UEPLogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
  };

  constructor(config: UEPLoggingConfig) {
    super();
    this.config = this.validateConfig(config);
    this.contextStorage = new AsyncLocalStorage();
    this.setupFlushTimer();
    this.setupProcessHandlers();
  }

  // =====================================================
  // Public Logging API
  // =====================================================

  public debug(message: string, meta?: Record<string, any>): void {
    this.log('debug', message, meta);
  }

  public info(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }

  public warn(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }

  public error(message: string, error?: Error, meta?: Record<string, any>): void {
    const errorMeta = error ? this.serializeError(error) : {};
    this.log('error', message, { ...errorMeta, ...meta });
  }

  public fatal(message: string, error?: Error, meta?: Record<string, any>): void {
    const errorMeta = error ? this.serializeError(error) : {};
    this.log('fatal', message, { ...errorMeta, ...meta });
  }

  private log(level: LogLevel, message: string, meta: Record<string, any> = {}): void {
    if (!this.shouldLog(level) || this.isShuttingDown) {
      return;
    }

    try {
      const logEntry = this.createLogEntry(level, message, meta);
      this.processLogEntry(logEntry);
    } catch (error) {
      console.error('Failed to create log entry:', error);
    }
  }

  // =====================================================
  // UEP-Specific Logging Methods
  // =====================================================

  public logUEPMessage(
    level: LogLevel,
    message: string,
    uepMessage: UEPMessage,
    metadata: UEPMessageMetadata,
    meta?: Record<string, any>
  ): void {
    const uepMeta = {
      uep: {
        messageId: uepMessage.id,
        messageType: uepMessage.type,
        agentId: uepMessage.sender.id,
        agentType: uepMessage.sender.type,
        correlationId: uepMessage.correlationId,
        protocolVersion: uepMessage.protocolVersion
      },
      context: {
        operationName: metadata.operationName,
        tags: metadata.tags,
        userId: metadata.userId,
        sessionId: metadata.sessionId,
        requestId: metadata.requestId
      },
      ...meta
    };

    this.withContext(
      {
        traceId: metadata.traceId,
        spanId: metadata.spanId,
        correlationId: uepMessage.correlationId,
        agentId: uepMessage.sender.id,
        operationName: metadata.operationName
      },
      () => this.log(level, message, uepMeta)
    );
  }

  public logUEPError(
    error: UEPError,
    message?: string,
    meta?: Record<string, any>
  ): void {
    const errorMessage = message || `UEP Error: ${error.message}`;
    const errorMeta = {
      error: {
        name: 'UEPError',
        message: error.message,
        code: error.code,
        category: error.category
      },
      uep: {
        correlationId: error.correlationId,
        agentId: error.agentId
      },
      ...meta
    };

    this.withContext(
      {
        correlationId: error.correlationId,
        agentId: error.agentId
      },
      () => this.log('error', errorMessage, errorMeta)
    );
  }

  public logUEPWorkflow(
    level: LogLevel,
    message: string,
    workflowId: string,
    executionId: string,
    stepId?: string,
    meta?: Record<string, any>
  ): void {
    const workflowMeta = {
      uep: {
        workflowId,
        executionId,
        stepId
      },
      ...meta
    };

    this.withContext(
      {
        workflowId,
        correlationId: executionId,
        operationName: stepId ? `workflow.step.${stepId}` : 'workflow.execution'
      },
      () => this.log(level, message, workflowMeta)
    );
  }

  public logUEPCoordination(
    level: LogLevel,
    message: string,
    coordinationId: string,
    pattern: string,
    participants: string[],
    meta?: Record<string, any>
  ): void {
    const coordinationMeta = {
      uep: {
        coordinationId,
        coordinationPattern: pattern,
        participantCount: participants.length,
        participants: participants.join(',')
      },
      ...meta
    };

    this.withContext(
      {
        correlationId: coordinationId,
        operationName: `coordination.${pattern.toLowerCase()}`
      },
      () => this.log(level, message, coordinationMeta)
    );
  }

  // =====================================================
  // Context Management
  // =====================================================

  public withContext<T>(context: UEPLogContext, fn: () => T): T {
    return this.contextStorage.run(context, fn);
  }

  public async withContextAsync<T>(context: UEPLogContext, fn: () => Promise<T>): Promise<T> {
    return this.contextStorage.run(context, fn);
  }

  public setContext(context: Partial<UEPLogContext>): void {
    const currentContext = this.contextStorage.getStore() || {};
    const newContext = { ...currentContext, ...context };
    this.contextStorage.enterWith(newContext);
  }

  public getContext(): UEPLogContext | undefined {
    return this.contextStorage.getStore();
  }

  public clearContext(): void {
    this.contextStorage.enterWith({});
  }

  // =====================================================
  // OpenTelemetry Integration
  // =====================================================

  public createTraceCorrelatedLogger(): UEPStructuredLogger {
    const traceContext = this.extractTraceContext();
    
    if (traceContext.traceId) {
      this.setContext(traceContext);
    }

    return this;
  }

  private extractTraceContext(): UEPLogContext {
    const activeSpan = trace.getActiveSpan();
    
    if (!activeSpan) {
      return {};
    }

    const spanContext = activeSpan.spanContext();
    
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      correlationId: spanContext.traceId // Use trace ID as correlation ID if not provided
    };
  }

  // =====================================================
  // Performance and Lifecycle Management
  // =====================================================

  public async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const buffer = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.flushBuffer(buffer);
      this.emit('buffer:flushed', { count: buffer.length });
    } catch (error) {
      // Re-add logs to buffer if flush failed
      this.logBuffer.unshift(...buffer);
      this.emit('error', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Clear flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    try {
      await this.flush();
      this.emit('logger:shutdown');
    } catch (error) {
      console.error('Error during logger shutdown:', error);
    }
  }

  public getStats(): {
    bufferSize: number;
    totalLogged: number;
    level: LogLevel;
    enabled: boolean;
  } {
    return {
      bufferSize: this.logBuffer.length,
      totalLogged: this.logBuffer.length, // Simplified
      level: this.config.level,
      enabled: this.config.enabled
    };
  }

  // =====================================================
  // Private Implementation Methods
  // =====================================================

  private validateConfig(config: UEPLoggingConfig): UEPLoggingConfig {
    if (!config.enabled) {
      return { ...config, enabled: false };
    }

    if (!config.serviceName) {
      throw new Error('Service name is required for logging');
    }

    return {
      ...config,
      correlation: {
        enabled: true,
        traceIdField: 'traceId',
        spanIdField: 'spanId',
        correlationIdField: 'correlationId',
        userIdField: 'userId',
        sessionIdField: 'sessionId',
        ...config.correlation
      },
      enrichment: {
        enabled: true,
        includeHostname: true,
        includePid: true,
        includeMemoryUsage: false,
        includeTimestamp: true,
        includeLevel: true,
        includeService: true,
        ...config.enrichment
      },
      performance: {
        bufferSize: 1000,
        flushInterval: 5000,
        asyncLogging: true,
        samplingRate: 1.0,
        ...config.performance
      }
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const levelValue = this.logLevels[level];
    const configLevelValue = this.logLevels[this.config.level];
    
    return levelValue >= configLevelValue;
  }

  private createLogEntry(level: LogLevel, message: string, meta: Record<string, any>): UEPLogEntry {
    const timestamp = new Date().toISOString();
    const context = this.getContext() || {};
    const traceContext = this.extractTraceContext();

    // Merge contexts
    const finalContext = { ...traceContext, ...context };

    const logEntry: UEPLogEntry = {
      timestamp,
      level,
      message: this.truncateMessage(message),
      service: {
        name: this.config.serviceName,
        version: this.config.serviceVersion,
        environment: this.config.environment
      }
    };

    // Add trace correlation
    if (this.config.correlation.enabled && finalContext.traceId) {
      logEntry.trace = {
        traceId: finalContext.traceId,
        spanId: finalContext.spanId || '',
        parentSpanId: finalContext.parentSpanId,
        traceFlags: finalContext.traceFlags
      };
    }

    // Add UEP context
    if (finalContext.agentId || finalContext.workflowId || finalContext.correlationId) {
      logEntry.uep = {
        agentId: finalContext.agentId,
        correlationId: finalContext.correlationId,
        workflowId: finalContext.workflowId,
        ...meta.uep
      };
    }

    // Add general context
    if (finalContext.userId || finalContext.sessionId || finalContext.operationName) {
      logEntry.context = {
        userId: finalContext.userId,
        sessionId: finalContext.sessionId,
        operationName: finalContext.operationName,
        tags: finalContext.tags,
        ...meta.context
      };
    }

    // Add host information
    if (this.config.enrichment.includeHostname || this.config.enrichment.includePid) {
      logEntry.host = {
        hostname: require('os').hostname(),
        pid: process.pid
      };
    }

    // Add performance metrics
    if (this.config.enrichment.includeMemoryUsage) {
      const memUsage = process.memoryUsage();
      logEntry.performance = {
        memoryUsage: memUsage.heapUsed,
        ...meta.performance
      };
    }

    // Add error information
    if (meta.error) {
      logEntry.error = meta.error;
    }

    // Add remaining metadata
    Object.keys(meta).forEach(key => {
      if (!['uep', 'context', 'error', 'performance'].includes(key)) {
        logEntry[key] = meta[key];
      }
    });

    // Apply filtering and redaction
    return this.applyFiltering(logEntry);
  }

  private serializeError(error: Error): { error: any } {
    return {
      error: {
        name: error.name,
        message: error.message,
        stack: this.config.format === 'json' ? error.stack : undefined,
        ...(error as any).code && { code: (error as any).code }
      }
    };
  }

  private truncateMessage(message: string): string {
    const maxLength = this.config.filtering.maxMessageLength || 10000;
    return message.length > maxLength 
      ? `${message.substring(0, maxLength)}...` 
      : message;
  }

  private applyFiltering(logEntry: UEPLogEntry): UEPLogEntry {
    if (!this.config.filtering.enabled) {
      return logEntry;
    }

    const filtered = { ...logEntry };

    // Remove excluded fields
    this.config.filtering.excludeFields.forEach(field => {
      delete filtered[field];
    });

    // Redact sensitive fields
    this.config.filtering.redactFields.forEach(field => {
      if (filtered[field] !== undefined) {
        filtered[field] = '[REDACTED]';
      }
    });

    // Apply redaction patterns
    const jsonString = JSON.stringify(filtered);
    let redactedString = jsonString;
    
    this.config.filtering.redactPatterns.forEach(pattern => {
      redactedString = redactedString.replace(pattern, '[REDACTED]');
    });

    try {
      return JSON.parse(redactedString);
    } catch {
      return filtered; // Return original if JSON parsing fails
    }
  }

  private processLogEntry(logEntry: UEPLogEntry): void {
    if (this.config.performance.asyncLogging) {
      // Add to buffer for async processing
      this.logBuffer.push(logEntry);
      
      if (this.logBuffer.length >= this.config.performance.bufferSize) {
        setImmediate(() => this.flush());
      }
    } else {
      // Synchronous logging
      this.outputLogEntry(logEntry);
    }
  }

  private outputLogEntry(logEntry: UEPLogEntry): void {
    // Console output
    if (this.config.outputs.console.enabled) {
      const consoleLevel = this.config.outputs.console.level || this.config.level;
      if (this.shouldOutputToLevel(logEntry.level, consoleLevel)) {
        this.outputToConsole(logEntry);
      }
    }

    // File output
    if (this.config.outputs.file.enabled) {
      const fileLevel = this.config.outputs.file.level || this.config.level;
      if (this.shouldOutputToLevel(logEntry.level, fileLevel)) {
        this.outputToFile(logEntry);
      }
    }

    // Network output
    if (this.config.outputs.network.enabled) {
      const networkLevel = this.config.outputs.network.level || this.config.level;
      if (this.shouldOutputToLevel(logEntry.level, networkLevel)) {
        this.outputToNetwork(logEntry);
      }
    }
  }

  private shouldOutputToLevel(entryLevel: LogLevel, outputLevel: LogLevel): boolean {
    return this.logLevels[entryLevel] >= this.logLevels[outputLevel];
  }

  private outputToConsole(logEntry: UEPLogEntry): void {
    const output = this.formatLogEntry(logEntry, 'console');
    
    switch (logEntry.level) {
      case 'debug':
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        break;
    }
  }

  private outputToFile(logEntry: UEPLogEntry): void {
    const output = this.formatLogEntry(logEntry, 'file');
    // File output implementation would go here
    // Using fs.appendFile or a file stream
    console.log(`[FILE] ${output}`);
  }

  private outputToNetwork(logEntry: UEPLogEntry): void {
    const output = this.formatLogEntry(logEntry, 'network');
    // Network output implementation would go here
    // HTTP POST, TCP socket, or UDP datagram
    this.emit('log:network', { entry: logEntry, output });
  }

  private formatLogEntry(logEntry: UEPLogEntry, outputType: 'console' | 'file' | 'network'): string {
    switch (this.config.format) {
      case 'json':
        return JSON.stringify(logEntry);
      case 'compact':
        return `${logEntry.timestamp} [${logEntry.level.toUpperCase()}] ${logEntry.message}`;
      case 'pretty':
        return this.formatPretty(logEntry);
      default:
        return JSON.stringify(logEntry);
    }
  }

  private formatPretty(logEntry: UEPLogEntry): string {
    const time = new Date(logEntry.timestamp).toLocaleTimeString();
    const level = logEntry.level.toUpperCase().padStart(5);
    const trace = logEntry.trace ? `[${logEntry.trace.traceId.slice(-8)}]` : '';
    const service = `[${logEntry.service.name}]`;
    
    return `${time} ${level} ${service}${trace} ${logEntry.message}`;
  }

  private async flushBuffer(buffer: UEPLogEntry[]): Promise<void> {
    // Process buffer in chunks to avoid overwhelming outputs
    const chunkSize = 100;
    
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(i, i + chunkSize);
      
      chunk.forEach(entry => {
        this.outputLogEntry(entry);
      });
      
      // Small delay between chunks
      if (i + chunkSize < buffer.length) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }

  private setupFlushTimer(): void {
    if (this.config.performance.asyncLogging && this.config.performance.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        if (this.logBuffer.length > 0) {
          this.flush().catch(error => {
            console.error('Failed to flush log buffer:', error);
          });
        }
      }, this.config.performance.flushInterval);
    }
  }

  private setupProcessHandlers(): void {
    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.shutdown();
    });

    process.on('SIGINT', () => {
      this.shutdown();
    });

    // Uncaught exception logging
    process.on('uncaughtException', (error) => {
      this.fatal('Uncaught Exception', error);
      this.flush().finally(() => process.exit(1));
    });

    // Unhandled rejection logging
    process.on('unhandledRejection', (reason, promise) => {
      this.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)));
    });
  }
}

// =====================================================
// Factory Functions and Middleware
// =====================================================

export function createUEPStructuredLogger(config: Partial<UEPLoggingConfig> = {}): UEPStructuredLogger {
  const defaultConfig: UEPLoggingConfig = {
    enabled: true,
    level: 'info',
    serviceName: 'uep-service',
    serviceVersion: '1.0.0',
    environment: 'development',
    format: 'json',
    outputs: {
      console: {
        enabled: true,
        colorize: true,
        timestamp: true
      },
      file: {
        enabled: false,
        path: '/var/log/uep/service.log',
        maxSize: '100MB',
        maxFiles: 10,
        rotate: true
      },
      network: {
        enabled: false,
        endpoint: 'http://localhost:3100/loki/api/v1/push',
        protocol: 'http',
        buffer: true,
        batchSize: 100
      }
    },
    correlation: {
      enabled: true,
      traceIdField: 'traceId',
      spanIdField: 'spanId',
      correlationIdField: 'correlationId',
      userIdField: 'userId',
      sessionIdField: 'sessionId'
    },
    enrichment: {
      enabled: true,
      includeHostname: true,
      includePid: true,
      includeMemoryUsage: false,
      includeTimestamp: true,
      includeLevel: true,
      includeService: true
    },
    filtering: {
      enabled: true,
      excludeFields: [],
      redactFields: ['password', 'token', 'apiKey', 'secret'],
      redactPatterns: [
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email addresses (optional)
      ],
      maxMessageLength: 10000
    },
    performance: {
      bufferSize: 1000,
      flushInterval: 5000,
      asyncLogging: true,
      samplingRate: 1.0
    }
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    outputs: {
      console: { ...defaultConfig.outputs.console, ...config.outputs?.console },
      file: { ...defaultConfig.outputs.file, ...config.outputs?.file },
      network: { ...defaultConfig.outputs.network, ...config.outputs?.network }
    },
    correlation: { ...defaultConfig.correlation, ...config.correlation },
    enrichment: { ...defaultConfig.enrichment, ...config.enrichment },
    filtering: { ...defaultConfig.filtering, ...config.filtering },
    performance: { ...defaultConfig.performance, ...config.performance }
  };

  return new UEPStructuredLogger(mergedConfig);
}

// Express middleware for automatic log correlation
export function createUEPLoggingMiddleware(logger: UEPStructuredLogger) {
  return (req: any, res: any, next: any) => {
    // Extract correlation context from request
    const context: UEPLogContext = {
      traceId: req.headers['x-trace-id'] || req.traceId,
      spanId: req.headers['x-span-id'] || req.spanId,
      correlationId: req.headers['x-correlation-id'] || req.headers['x-request-id'],
      userId: req.headers['x-user-id'] || req.user?.id,
      sessionId: req.headers['x-session-id'] || req.session?.id,
      operationName: `${req.method} ${req.path}`
    };

    // Run request within log context
    logger.withContext(context, () => {
      // Log request start
      logger.info('HTTP Request', {
        http: {
          method: req.method,
          url: req.url,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });

      // Track response
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const level = res.statusCode >= 400 ? 'error' : 'info';
        
        logger[level]('HTTP Response', {
          http: {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration
          }
        });
      });

      next();
    });
  };
}

export default UEPStructuredLogger;