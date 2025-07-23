"use strict";
/**
 * Logging Utility
 *
 * Centralized logging for RAG system components
 * Following All-Purpose Pattern: Configurable logging for ANY environment
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceLogger = exports.apiLogger = exports.processingLogger = exports.memoryLogger = exports.embeddingLogger = exports.qdrantLogger = exports.createContextLogger = exports.httpLogStream = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
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
winston_1.default.addColors(logColors);
// Create console format
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
}));
// Create file format
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// Determine log level from environment
const getLogLevel = () => {
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
const transports = [
    // Console transport
    new winston_1.default.transports.Console({
        level: getLogLevel(),
        format: consoleFormat,
    }),
];
// Add file transports if not in test environment
if (process.env.NODE_ENV !== 'test') {
    const logDir = path_1.default.join(process.cwd(), 'logs');
    transports.push(
    // Error log file
    new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }), 
    // Combined log file
    new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }));
}
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: getLogLevel(),
    levels: logLevels,
    format: fileFormat,
    transports,
    exitOnError: false,
});
// Create stream for HTTP request logging
exports.httpLogStream = {
    write: (message) => {
        exports.logger.http(message.substring(0, message.lastIndexOf('\n')));
    },
};
// Logger extensions for specific contexts
const createContextLogger = (context) => {
    return {
        error: (message, meta) => exports.logger.error(`[${context}] ${message}`, meta),
        warn: (message, meta) => exports.logger.warn(`[${context}] ${message}`, meta),
        info: (message, meta) => exports.logger.info(`[${context}] ${message}`, meta),
        http: (message, meta) => exports.logger.http(`[${context}] ${message}`, meta),
        debug: (message, meta) => exports.logger.debug(`[${context}] ${message}`, meta),
    };
};
exports.createContextLogger = createContextLogger;
// Specialized loggers for different components
exports.qdrantLogger = (0, exports.createContextLogger)('QDRANT');
exports.embeddingLogger = (0, exports.createContextLogger)('EMBEDDING');
exports.memoryLogger = (0, exports.createContextLogger)('MEMORY');
exports.processingLogger = (0, exports.createContextLogger)('PROCESSING');
exports.apiLogger = (0, exports.createContextLogger)('API');
// Performance logging utilities
exports.performanceLogger = {
    startTimer: (label) => {
        const start = Date.now();
        return {
            end: (meta) => {
                const duration = Date.now() - start;
                exports.logger.info(`Performance: ${label} completed in ${duration}ms`, meta);
                return duration;
            }
        };
    },
    logMemoryUsage: (label) => {
        const used = process.memoryUsage();
        exports.logger.debug(`Memory usage [${label}]:`, {
            rss: Math.round(used.rss / 1024 / 1024 * 100) / 100 + ' MB',
            heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100 + ' MB',
            heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100 + ' MB',
            external: Math.round(used.external / 1024 / 1024 * 100) / 100 + ' MB'
        });
    }
};
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map