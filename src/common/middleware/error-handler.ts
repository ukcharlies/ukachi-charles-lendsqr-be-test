import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, NotFoundError } from '../errors/app-error.js';
import { logger } from '../../config/logger.js';
import { getEnv } from '../../config/env.js';
export const notFound: RequestHandler = (_req, _res, next) =>
  next(new NotFoundError('Route not found'));
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  let appError =
    error instanceof AppError
      ? error
      : new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR');
  const mysql = error as { code?: string };
  if (mysql?.code === 'ER_DUP_ENTRY')
    appError = new AppError('Resource already exists', 409, 'DUPLICATE_RESOURCE');
  logger[appError.statusCode >= 500 ? 'error' : 'warn'](
    { err: error, requestId: req.requestId, userId: req.auth?.id, errorCode: appError.code },
    appError.message,
  );
  res.status(appError.statusCode).json({
    success: false,
    message: appError.message,
    error: {
      code: appError.code,
      requestId: req.requestId,
      ...(getEnv().NODE_ENV !== 'production' && appError.details
        ? { details: appError.details }
        : {}),
    },
  });
};
