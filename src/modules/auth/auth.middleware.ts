import type { NextFunction, Request, Response } from 'express';
import { AuthenticationError } from '../../common/errors/app-error.js';
import type { AuthService } from './auth.service.js';
export const authenticationMiddleware =
  (service: AuthService) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authorization = req.header('authorization');
      if (!authorization) throw new AuthenticationError();
      const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(authorization);
      if (!match?.[1]) throw new AuthenticationError('Malformed Authorization header');
      req.auth = await service.authenticate(match[1]);
      next();
    } catch (error) {
      next(error);
    }
  };
