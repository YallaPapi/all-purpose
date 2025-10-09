/**
 * Winston Logging Configuration
 * 
 * Configures structured logging with different transports for
 * development and production environments.
 */

import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

export function createWinstonConfig(): WinstonModuleOptions {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const logLevel = process.env.LOG_LEVEL || 'info';

  const formats = [
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ];

  // Add colorize for development
  if (nodeEnv === 'development') {
    formats.push(winston.format.colorize({ all: true }));
  }

  const transports: winston.transport[] = [];

  // Console transport
  if (nodeEnv === 'development') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
            let log = `${timestamp} [${level}]`;
            
            if (context) {
              log += ` [${context}]`;
            }
            
            log += ` ${message}`;
            
            if (Object.keys(meta).length > 0) {
              log += ` ${JSON.stringify(meta)}`;
            }
            
            if (trace) {
              log += `\n${trace}`;
            }
            
            return log;
          }),
        ),
      }),
    );
  } else {
    // Production console transport (JSON format)
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(...formats),
      }),
    );
  }

  // File transports for production
  if (nodeEnv === 'production') {
    // Error log file
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(...formats),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    );

    // Combined log file
    transports.push(
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(...formats),
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      }),
    );

    // UEP-specific log file
    transports.push(
      new winston.transports.File({
        filename: 'logs/uep-registry.log',
        format: winston.format.combine(
          winston.format.label({ label: 'UEP-Registry' }),
          ...formats,
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      }),
    );
  }

  return {
    level: logLevel,
    format: winston.format.combine(...formats),
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
    // Handle uncaught exceptions
    exceptionHandlers: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ],
    // Handle unhandled promise rejections
    rejectionHandlers: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ],
  };
}