export class Logger {
    constructor(context, service = 'factory-core') {
        this.context = context;
        this.service = service;
    }
    setRequestId(requestId) {
        this.requestId = requestId;
    }
    createLogEntry(level, message, metadata, error) {
        const entry = {
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
    log(level, message, metadata, error) {
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
    info(message, metadata) {
        this.log('info', message, metadata);
    }
    error(message, error, metadata) {
        // Handle both Error objects and regular metadata
        if (error instanceof Error) {
            this.log('error', message, metadata, error);
        }
        else {
            // If second parameter is not an Error, treat it as metadata
            this.log('error', message, error);
        }
    }
    warn(message, metadata) {
        this.log('warn', message, metadata);
    }
    debug(message, metadata) {
        this.log('debug', message, metadata);
    }
    // Convenience method for HTTP request logging
    request(method, path, statusCode, duration, metadata) {
        this.info(`${method} ${path}`, {
            ...metadata,
            method,
            path,
            statusCode,
            duration,
            type: 'http_request'
        });
    }
    // Convenience method for agent operations
    agent(operation, agentType, metadata) {
        this.info(`Agent operation: ${operation}`, {
            ...metadata,
            operation,
            agentType,
            type: 'agent_operation'
        });
    }
}
