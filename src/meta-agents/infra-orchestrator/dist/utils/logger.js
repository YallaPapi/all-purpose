/**
 * Logger Utility
 *
 * Use context7: Structured logging for IOA operations
 * Following All-Purpose Pattern: Configurable logging that works in ANY environment
 */
import winston from 'winston';
import * as path from 'path';
// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
// Configure log format
const logFormat = winston.format.combine(winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston.format.errors({ stack: true }), winston.format.json());
// Create logger instance
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'infra-orchestrator-agent',
        version: '1.0.0'
    },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple(), winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} [${level}]: ${message}${metaStr}`;
            }))
        }),
        // File transport for persistent logging
        new winston.transports.File({
            filename: path.join(logsDir, 'ioa-error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'ioa-combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});
// Create logs directory
import * as fs from 'fs-extra';
fs.ensureDirSync(logsDir);
// Add process-level error handling
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});
export default logger;
//# sourceMappingURL=logger.js.map