
/**
 * Request Validation Middleware
 * Joi-based request validation
 */

import joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { validationSchemas } from '../validation/schemas.js';

export const validateRequest = (schemaName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = validationSchemas[schemaName];
    
    if (!schema) {
      return next();
    }

    const { error } = schema.validate({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    next();
  };
};
