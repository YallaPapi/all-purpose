/**
 * DevOps Agent - Logger Utility
 * 
 * Winston-based logging system for DevOps Agent
 */

import winston, { Logger } from 'winston';
import path from 'path';

// Log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Colors for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

winston.addColors(logColors);

/**
 * Create a logger instance with specified name and level
 */
export function createLogger(name: string, level: string = 'info'): Logger {
  // Determine log directory
  const logDir = path.join(process.cwd(), 'logs', 'devops-agent');
  
  // Console format
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${name}] ${level}: ${message}${metaStr ? '\n' + metaStr : ''}`;
    })
  );

  // File format
  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Create transports
  const transports: winston.transport[] = [
    // Console transport
    new winston.transports.Console({
      level,
      format: consoleFormat
    })
  ];

  // Add file transports if in development or production
  if (process.env.NODE_ENV !== 'test') {
    transports.push(
      // General log file
      new winston.transports.File({
        filename: path.join(logDir, 'devops-agent.log'),
        level: 'info',
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      }),
      
      // Error log file
      new winston.transports.File({
        filename: path.join(logDir, 'devops-agent-error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      })
    );
  }

  // Create logger
  const logger = winston.createLogger({
    levels: logLevels,
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true })
    ),
    transports,
    // Don't exit on handled exceptions
    exitOnError: false
  });

  // Handle uncaught exceptions and unhandled rejections
  if (process.env.NODE_ENV === 'production') {
    logger.exceptions.handle(
      new winston.transports.File({
        filename: path.join(logDir, 'devops-agent-exceptions.log'),
        format: fileFormat
      })
    );

    logger.rejections.handle(
      new winston.transports.File({
        filename: path.join(logDir, 'devops-agent-rejections.log'),
        format: fileFormat
      })
    );
  }

  return logger;
}

/**
 * Create a structured log entry
 */
export function createLogEntry(level: string, message: string, metadata: any = {}): object {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata
  };
}

/**
 * Performance logging utility
 */
export class PerformanceLogger {
  private logger: Logger;
  private startTimes = new Map<string, number>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Start timing an operation
   */
  start(operationId: string): void {
    this.startTimes.set(operationId, Date.now());
    this.logger.debug(`Started operation: ${operationId}`);
  }

  /**
   * End timing an operation and log the duration
   */
  end(operationId: string, metadata: any = {}): number {
    const startTime = this.startTimes.get(operationId);
    
    if (!startTime) {
      this.logger.warn(`No start time found for operation: ${operationId}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(operationId);

    this.logger.info(`Completed operation: ${operationId}`, {
      duration: `${duration}ms`,
      ...metadata
    });

    return duration;
  }

  /**
   * Log current performance metrics
   */
  logMetrics(operationId: string, metrics: Record<string, any>): void {
    this.logger.info(`Performance metrics for ${operationId}`, metrics);
  }
}

/**
 * Error logging utility
 */
export class ErrorLogger {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Log an error with context
   */
  logError(error: Error, context: any = {}): void {
    this.logger.error('Error occurred', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  /**
   * Log a critical error that requires immediate attention
   */
  logCriticalError(error: Error, context: any = {}): void {
    this.logger.error('CRITICAL ERROR', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      severity: 'critical',
      timestamp: new Date().toISOString(),
      ...context
    });

    // In production, you might want to send this to an alerting system
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, DataDog, etc.
      console.error('CRITICAL ERROR - Alert system notification should be sent', {
        error: error.message,
        context
      });
    }
  }

  /**
   * Log a validation error
   */
  logValidationError(field: string, value: any, expectedType: string, context: any = {}): void {
    this.logger.warn('Validation error', {
      field,
      value,
      expectedType,
      type: 'validation',
      ...context
    });
  }

  /**
   * Log a network error
   */
  logNetworkError(error: Error, endpoint: string, method: string = 'GET', context: any = {}): void {
    this.logger.error('Network error', {
      message: error.message,
      endpoint,
      method,
      type: 'network',
      ...context
    });
  }
}

/**
 * Audit logging utility for security and compliance
 */
export class AuditLogger {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Log user action
   */
  logUserAction(userId: string, action: string, resource: string, result: 'success' | 'failure', context: any = {}): void {
    this.logger.info('User action', {
      userId,
      action,
      resource,
      result,
      type: 'audit',
      timestamp: new Date().toISOString(),
      ...context
    });
  }

  /**
   * Log system event
   */
  logSystemEvent(event: string, component: string, severity: 'info' | 'warn' | 'error', context: any = {}): void {
    this.logger.log(severity, 'System event', {
      event,
      component,
      type: 'system',
      timestamp: new Date().toISOString(),
      ...context
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context: any = {}): void {
    this.logger.warn('Security event', {
      event,
      severity,
      type: 'security',
      timestamp: new Date().toISOString(),
      ...context
    });
  }
}

// Default logger instance
export const defaultLogger = createLogger('devops-agent');

// Export utilities
export {
  winston,
  logLevels,
  logColors
};