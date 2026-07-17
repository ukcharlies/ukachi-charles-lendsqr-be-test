import pino from 'pino';
import { getEnv } from './env.js';
export const logger = pino({
  level: getEnv().LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      '*.password',
      '*.bvn',
      '*.token',
      '*.apiKey',
      '*.accountNumber',
    ],
    censor: '[REDACTED]',
  },
});
