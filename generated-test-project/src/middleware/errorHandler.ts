
/**
 * Error Handling Middleware
 * Centralized error handling
 */

import { Request, Response, NextFunction } from 'express';

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', error);

  // Default error response
  let status = 500;
  let message = 'Internal server error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
  } else if (error.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (error.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  }

  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};
