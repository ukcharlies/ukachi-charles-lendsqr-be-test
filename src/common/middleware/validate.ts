import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../errors/app-error.js';
export const validateBody =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success)
      return next(new ValidationError('Request validation failed', result.error.flatten()));
    req.body = result.data;
    next();
  };
