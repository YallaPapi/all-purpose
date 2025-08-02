interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  component: string;
  message: string;
  requestId?: string;
  metadata?: any;
  stack?: string;
}

export class Logger {
  private context: string;
  private service: string;
  private requestId?: string;

  constructor(context: string, service: string = 'domain-agents') {
    this.context = context;
    this.service = service;
  }

  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  private createLogEntry(level: string, message: string, metadata?: any, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.service,
      component: this.context,
      message,
    };

    if (this.requestId) {
      entry.requestId = this.requestId;
    }

    if (metadata) {
      entry.metadata = metadata;
    }

    if (error && error.stack) {
      entry.stack = error.stack;
    }

    return entry;
  }

  private log(level: string, message: string, metadata?: any, error?: Error) {
    const entry = this.createLogEntry(level, message, metadata, error);
    const jsonString = JSON.stringify(entry);

    switch (level.toLowerCase()) {
      case 'error':
        console.error(jsonString);
        break;
      case 'warn':
        console.warn(jsonString);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
          console.debug(jsonString);
        }
        break;
      default:
        console.log(jsonString);
    }
  }

  info(message: string, metadata?: any) {
    this.log('info', message, metadata);
  }

  error(message: string, error?: Error | any, metadata?: any) {
    // Handle both Error objects and regular metadata
    if (error instanceof Error) {
      this.log('error', message, metadata, error);
    } else {
      // If second parameter is not an Error, treat it as metadata
      this.log('error', message, error);
    }
  }

  warn(message: string, metadata?: any) {
    this.log('warn', message, metadata);
  }

  debug(message: string, metadata?: any) {
    this.log('debug', message, metadata);
  }

  // Convenience method for HTTP request logging
  request(method: string, path: string, statusCode: number, duration: number, metadata?: any) {
    this.info(`${method} ${path}`, {
      ...metadata,
      method,
      path,
      statusCode,
      duration,
      type: 'http_request'
    });
  }

  // Convenience method for domain agent operations
  domain(operation: string, domain: string, metadata?: any) {
    this.info(`Domain operation: ${operation}`, {
      ...metadata,
      operation,
      domain,
      type: 'domain_operation'
    });
  }
}