import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import type { Knex } from 'knex';
import { getEnv } from './config/env.js';
import { logger } from './config/logger.js';
import { requestId } from './common/middleware/request-id.js';
import { errorHandler, notFound } from './common/middleware/error-handler.js';
import { UserRepository } from './modules/users/user.repository.js';
import { WalletRepository } from './modules/wallets/wallet.repository.js';
import { AuthRepository } from './modules/auth/auth.repository.js';
import { KarmaRepository } from './modules/karma/karma.repository.js';
import { TransactionRepository } from './modules/transactions/transaction.repository.js';
import { AdjutorKarmaProvider } from './modules/karma/adjutor-karma.provider.js';
import type { KarmaProvider } from './modules/karma/karma.provider.js';
import { UserService } from './modules/users/user.service.js';
import { AuthService } from './modules/auth/auth.service.js';
import { TransactionService } from './modules/transactions/transaction.service.js';
import { UserController } from './modules/users/user.controller.js';
import { WalletController } from './modules/wallets/wallet.controller.js';
import { TransactionController } from './modules/transactions/transaction.controller.js';
import { apiRoutes } from './routes/index.js';
export function createApp(db: Knex, provider?: KarmaProvider): Express {
  const env = getEnv();
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({ origin: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map((v) => v.trim()) : false }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({
        requestId: (req as typeof req & { requestId?: string }).requestId ?? req.id,
      }),
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: env.NODE_ENV === 'test' ? 10_000 : 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  const users = new UserRepository(db);
  const wallets = new WalletRepository(db);
  const authRepo = new AuthRepository(db);
  const karma = new KarmaRepository(db);
  const transactions = new TransactionRepository(db);
  const karmaProvider =
    provider ??
    new AdjutorKarmaProvider(env.ADJUTOR_BASE_URL, env.ADJUTOR_API_KEY, env.ADJUTOR_TIMEOUT_MS);
  const userService = new UserService(db, users, wallets, authRepo, karma, karmaProvider);
  const authService = new AuthService(authRepo);
  const transactionService = new TransactionService(db, transactions, wallets, users);
  app.get('/health', (_req, res) =>
    res.json({ success: true, message: 'Service is alive', data: { status: 'ok' } }),
  );
  app.get('/ready', async (req, res) => {
    try {
      await db.raw('SELECT 1');
      res.json({ success: true, message: 'Service is ready', data: { status: 'ready' } });
    } catch {
      res.status(503).json({
        success: false,
        message: 'Service is not ready',
        error: { code: 'DATABASE_UNAVAILABLE', requestId: req.requestId },
      });
    }
  });
  const specPath = fs.existsSync(path.resolve('docs/openapi.yaml'))
    ? path.resolve('docs/openapi.yaml')
    : path.resolve('dist/openapi.yaml');
  const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.use(
    '/api/v1',
    apiRoutes({
      users: new UserController(userService, users),
      wallets: new WalletController(wallets),
      transactions: new TransactionController(transactionService),
      auth: authService,
    }),
  );
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
