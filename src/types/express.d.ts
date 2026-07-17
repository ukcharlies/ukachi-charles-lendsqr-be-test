import type { AuthenticatedUser } from '../modules/auth/auth.types.js';
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: AuthenticatedUser;
    }
  }
}
export {};
