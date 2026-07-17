import 'dotenv/config';
import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_NAME: z.string().min(1),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string(),
    DB_SSL: booleanString.default('false'),
    DB_SSL_CA_BASE64: z.string().optional(),
    DB_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    ADJUTOR_BASE_URL: z.string().url().default('https://adjutor.lendsqr.com'),
    ADJUTOR_API_KEY: z.string(),
    ADJUTOR_TIMEOUT_MS: z.coerce.number().int().positive().max(10000).default(3000),
    AUTH_TOKEN_PEPPER: z.string().min(32),
    AUTH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    CORS_ORIGINS: z.string().default(''),
  })
  .superRefine((env, ctx) => {
    if (env.DB_SSL && !env.DB_SSL_CA_BASE64)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DB_SSL_CA_BASE64'],
        message: 'Required when DB_SSL=true',
      });
    if (env.DB_POOL_MIN > env.DB_POOL_MAX)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DB_POOL_MIN'],
        message: 'Cannot exceed DB_POOL_MAX',
      });
  });
export type Env = z.infer<typeof schema>;
let cached: Env | undefined;
export function getEnv(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}
export function resetEnvForTests(): void {
  cached = undefined;
}
