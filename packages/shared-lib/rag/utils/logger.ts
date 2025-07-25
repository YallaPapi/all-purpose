/**
 * Logging Utility
 * 
 * Centralized logging for RAG system components
 * Following All-Purpose Pattern: Configurable logging for ANY environment
 */

import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Create console format
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create file format
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determine log level from environment
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  switch (env) {
    case 'production':
      return 'warn';
    case 'test':
      return 'error';
    default:
      return 'debug';
  }
};

// Create transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: getLogLevel(),
    format: consoleFormat,
  }),
];

// Add file transports if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const logDir = path.join(process.cwd(), 'logs');
  
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: getLogLevel(),
  levels: logLevels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Create stream for HTTP request logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.substring(0, message.lastIndexOf('\n')));
  },
};

// Logger extensions for specific contexts
export const createContextLogger = (context: string) => {
  return {
    error: (message: string, meta?: any) => logger.error(`[${context}] ${message}`, meta),
    warn: (message: string, meta?: any) => logger.warn(`[${context}] ${message}`, meta),
    info: (message: string, meta?: any) => logger.info(`[${context}] ${message}`, meta),
    http: (message: string, meta?: any) => logger.http(`[${context}] ${message}`, meta),
    debug: (message: string, meta?: any) => logger.debug(`[${context}] ${message}`, meta),
  };
};

// Specialized loggers for different components
export const qdrantLogger = createContextLogger('QDRANT');
export const embeddingLogger = createContextLogger('EMBEDDING');
export const memoryLogger = createContextLogger('MEMORY');
export const processingLogger = createContextLogger('PROCESSING');
export const apiLogger = createContextLogger('API');

// Performance logging utilities
export const performanceLogger = {
  startTimer: (label: string) => {
    const start = Date.now();
    return {
      end: (meta?: any) => {
        const duration = Date.now() - start;
        logger.info(`Performance: ${label} completed in ${duration}ms`, meta);
        return duration;
      }
    };
  },
  
  logMemoryUsage: (label: string) => {
    const used = process.memoryUsage();
    logger.debug(`Memory usage [${label}]:`, {
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100 + ' MB',
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100 + ' MB',
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100 + ' MB',
      external: Math.round(used.external / 1024 / 1024 * 100) / 100 + ' MB'
    });
  }
};

export default logger;