/**
 * Logger Utility
 * 
 * Winston-based logging for Backend Agent
 */

import winston from 'winston';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');

/**
 * Create a logger instance for a specific component
 */
export function createLogger(component: string, level: string = 'info'): winston.Logger {
  return winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, component, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          component,
          message,
          ...meta
        });
      })
    ),
    defaultMeta: { service: 'backend-agent', component },
    transports: [
      // Console output
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ timestamp, level, message, component }) => {
            return `${timestamp} [${component}] ${level}: ${message}`;
          })
        )
      }),
      
      // Error log file
      new winston.transports.File({
        filename: path.join(logDir, 'backend-agent-error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      
      // Combined log file
      new winston.transports.File({
        filename: path.join(logDir, 'backend-agent-combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    ]
  });
}