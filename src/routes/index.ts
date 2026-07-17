import { Router } from 'express';
import type { UserController } from '../modules/users/user.controller.js';
import type { WalletController } from '../modules/wallets/wallet.controller.js';
import type { TransactionController } from '../modules/transactions/transaction.controller.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import { authenticationMiddleware } from '../modules/auth/auth.middleware.js';
import { validateBody } from '../common/middleware/validate.js';
import { createUserSchema } from '../modules/users/user.schema.js';
import {
  fundingSchema,
  transferSchema,
  withdrawalSchema,
} from '../modules/transactions/transaction.schema.js';
export function apiRoutes(deps: {
  users: UserController;
  wallets: WalletController;
  transactions: TransactionController;
  auth: AuthService;
}): Router {
  const router = Router();
  const auth = authenticationMiddleware(deps.auth);
  router.post('/users', validateBody(createUserSchema), deps.users.create);
  router.get('/users/me', auth, deps.users.me);
  router.get('/wallets/me', auth, deps.wallets.me);
  router.post('/wallet-fundings', auth, validateBody(fundingSchema), deps.transactions.fund);
  router.post('/transfers', auth, validateBody(transferSchema), deps.transactions.transfer);
  router.post('/withdrawals', auth, validateBody(withdrawalSchema), deps.transactions.withdraw);
  router.get('/transactions', auth, deps.transactions.list);
  router.get('/transactions/:reference', auth, deps.transactions.get);
  return router;
}
