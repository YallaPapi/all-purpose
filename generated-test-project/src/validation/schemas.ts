
/**
 * Validation Schemas
 * Joi schemas for API request validation
 */

import joi from 'joi';

export const validationSchemas: Record<string, joi.Schema> = {
  'registerUser': joi.object({
    body: joi.object({
      // TODO: Define body schema for registerUser
    }),
    query: joi.object({
      // TODO: Define query schema for registerUser
    })
  }),
  'loginUser': joi.object({
    body: joi.object({
      // TODO: Define body schema for loginUser
    }),
    query: joi.object({
      // TODO: Define query schema for loginUser
    })
  }),
  'getAllTasks': joi.object({
    body: joi.object({
      // TODO: Define body schema for getAllTasks
    }),
    query: joi.object({
      // TODO: Define query schema for getAllTasks
    })
  }),
  'getTaskById': joi.object({
    params: joi.object({
      id: joi.string().required(),
    }),
    body: joi.object({
      // TODO: Define body schema for getTaskById
    }),
    query: joi.object({
      // TODO: Define query schema for getTaskById
    })
  }),
  'createTask': joi.object({
    body: joi.object({
      // TODO: Define body schema for createTask
    }),
    query: joi.object({
      // TODO: Define query schema for createTask
    })
  }),
  'updateTask': joi.object({
    params: joi.object({
      id: joi.string().required(),
    }),
    body: joi.object({
      // TODO: Define body schema for updateTask
    }),
    query: joi.object({
      // TODO: Define query schema for updateTask
    })
  }),
  'deleteTask': joi.object({
    params: joi.object({
      id: joi.string().required(),
    }),
    body: joi.object({
      // TODO: Define body schema for deleteTask
    }),
    query: joi.object({
      // TODO: Define query schema for deleteTask
    })
  }),
};
