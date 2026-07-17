import { jest } from '@jest/globals';
import request from 'supertest';
import knex from 'knex';
import type { KarmaProvider } from '../../src/modules/karma/karma.provider.js';
import type { KarmaResult } from '../../src/modules/karma/karma.types.js';
import { createApp } from '../../src/app.js';
const unavailableDb = knex({
  client: 'mysql2',
  connection: { host: '127.0.0.1', port: 1, user: 'x', database: 'x', connectTimeout: 50 },
  pool: { min: 0, max: 1 },
});
const provider = {
  check: jest.fn<() => Promise<KarmaResult>>().mockResolvedValue({ blacklisted: false }),
} as KarmaProvider;
const app = createApp(unavailableDb, provider);
afterAll(async () => unavailableDb.destroy());
describe('general API behavior', () => {
  test('health succeeds', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
  test('readiness reports database failure', async () => {
    const response = await request(app).get('/ready');
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('DATABASE_UNAVAILABLE');
  });
  test('unknown route uses consistent 404', async () => {
    const response = await request(app).get('/missing');
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });
  test('protected route rejects absent token', async () => {
    const response = await request(app).get('/api/v1/wallets/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });
  test('registration rejects unknown fields before database use', async () => {
    const response = await request(app).post('/api/v1/users').send({
      firstName: 'A',
      lastName: 'B',
      email: 'a@example.com',
      phone: '+2348012345678',
      admin: true,
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
  test('Swagger UI is exposed', async () =>
    expect((await request(app).get('/api-docs/')).status).toBe(200));
});
