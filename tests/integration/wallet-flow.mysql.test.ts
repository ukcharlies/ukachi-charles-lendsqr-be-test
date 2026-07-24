import { jest } from '@jest/globals';
import knex, { type Knex } from 'knex';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { databaseConfig } from '../../src/config/database.js';
import type { KarmaProvider } from '../../src/modules/karma/karma.provider.js';
import type { KarmaResult } from '../../src/modules/karma/karma.types.js';

const shouldRun = process.env.RUN_MYSQL_INTEGRATION === 'true';
const describeMySql = shouldRun ? describe : describe.skip;

describeMySql('complete wallet API flow with MySQL', () => {
  let db: Knex;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const aliceEmail = `alice-${suffix}@example.com`;
  const bobEmail = `bob-${suffix}@example.com`;
  const charlieEmail = `charlie-${suffix}@example.com`;
  const provider = {
    check: jest.fn<() => Promise<KarmaResult>>().mockResolvedValue({
      blacklisted: false,
      decision: 'CLEAR',
      responseCode: '404',
    }),
  } as KarmaProvider;

  let app: ReturnType<typeof createApp>;
  let aliceToken = '';
  let bobToken = '';
  let charlieToken = '';
  let aliceFundingReference = '';

  beforeAll(() => {
    if (!process.env.DB_NAME?.endsWith('_test')) {
      throw new Error('MySQL integration tests require a database name ending in _test');
    }
    db = knex(databaseConfig());
    app = createApp(db, provider);
  });

  afterAll(async () => {
    const users = await db('users')
      .select('id')
      .whereIn('email', [aliceEmail, bobEmail, charlieEmail]);
    const userIds = users.map((row: { id: string }) => row.id);
    if (userIds.length) {
      await db.transaction(async (trx) => {
        const wallets = await trx('wallets').select('id').whereIn('user_id', userIds);
        const walletIds = wallets.map((row: { id: string }) => row.id);
        const transactions = walletIds.length
          ? await trx('ledger_entries')
              .distinct('financial_transaction_id')
              .whereIn('wallet_id', walletIds)
          : [];
        const transactionIds = transactions.map(
          (row: { financial_transaction_id: string }) => row.financial_transaction_id,
        );
        if (transactionIds.length) {
          await trx('ledger_entries').whereIn('financial_transaction_id', transactionIds).delete();
          await trx('financial_transactions').whereIn('id', transactionIds).delete();
        }
        await trx('karma_checks').whereIn('user_id', userIds).delete();
        await trx('api_tokens').whereIn('user_id', userIds).delete();
        await trx('wallets').whereIn('user_id', userIds).delete();
        await trx('users').whereIn('id', userIds).delete();
      });
    }
    await db.destroy();
  });

  test('1: health, readiness, and Swagger are available', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/ready')).status).toBe(200);
    expect((await request(app).get('/api-docs/')).status).toBe(200);
  });

  test('2: registers three eligible users with wallets and tokens', async () => {
    const registrations = await Promise.all([
      request(app).post('/api/v1/users').send({
        firstName: 'Alice',
        lastName: 'Wallet',
        email: aliceEmail,
        phone: '+2348011111001',
      }),
      request(app).post('/api/v1/users').send({
        firstName: 'Bob',
        lastName: 'Wallet',
        email: bobEmail,
        phone: '+2348011111002',
      }),
      request(app).post('/api/v1/users').send({
        firstName: 'Charlie',
        lastName: 'Wallet',
        email: charlieEmail,
        phone: '+2348011111003',
      }),
    ]);
    for (const response of registrations) expect(response.status).toBe(201);
    for (const response of registrations)
      expect(response.body.data.karmaCheck).toMatchObject({
        status: 'VERIFIED',
        inconclusiveIdentities: [],
      });
    aliceToken = registrations[0].body.data.token;
    bobToken = registrations[1].body.data.token;
    charlieToken = registrations[2].body.data.token;
    expect(
      await db('wallets').whereIn(
        'user_id',
        db('users').select('id').whereIn('email', [aliceEmail, bobEmail, charlieEmail]),
      ),
    ).toHaveLength(3);
  });

  test('3: rejects duplicate email and invalid registration', async () => {
    expect(
      (
        await request(app).post('/api/v1/users').send({
          firstName: 'Duplicate',
          lastName: 'User',
          email: aliceEmail,
          phone: '+2348011111004',
        })
      ).status,
    ).toBe(409);
    expect(
      (await request(app).post('/api/v1/users').send({ firstName: '', email: 'invalid' })).status,
    ).toBe(400);
  });

  test('4: enforces bearer authentication', async () => {
    expect((await request(app).get('/api/v1/wallets/me')).status).toBe(401);
    expect(
      (await request(app).get('/api/v1/wallets/me').set('Authorization', 'Bearer invalid-token'))
        .status,
    ).toBe(401);
    expect(
      (await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${aliceToken}`))
        .status,
    ).toBe(200);
  });

  test('5: funds a wallet and creates one credit ledger entry', async () => {
    const response = await request(app)
      .post('/api/v1/wallet-fundings')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('Idempotency-Key', `fund-${suffix}`)
      .send({ amount: '5000.00', sourceReference: `SRC-${suffix}` });
    expect(response.status).toBe(201);
    aliceFundingReference = response.body.data.reference as string;
    expect(response.body.data.amount).toBe('5000.00');
    expect(
      await db('ledger_entries').where({ financial_transaction_id: response.body.data.id }),
    ).toHaveLength(1);
  });

  test('6: returns the original funding for an identical retry', async () => {
    const response = await request(app)
      .post('/api/v1/wallet-fundings')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('Idempotency-Key', `fund-${suffix}`)
      .send({ amount: '5000.00', sourceReference: `SRC-${suffix}` });
    expect(response.status).toBe(200);
    expect(response.body.meta.idempotentReplay).toBe(true);
    expect(response.body.data.reference).toBe(aliceFundingReference);
  });

  test('7: rejects changed payload with a reused idempotency key', async () => {
    const response = await request(app)
      .post('/api/v1/wallet-fundings')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('Idempotency-Key', `fund-${suffix}`)
      .send({ amount: '5001.00', sourceReference: `SRC-${suffix}` });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
  });

  test('8: transfers atomically and creates debit and credit entries', async () => {
    const response = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('Idempotency-Key', `transfer-${suffix}`)
      .send({ recipientEmail: bobEmail, amount: '1200.00' });
    expect(response.status).toBe(201);
    expect(
      await db('ledger_entries').where({ financial_transaction_id: response.body.data.id }),
    ).toHaveLength(2);
  });

  test('9: withdraws, rejects overspending, and preserves balances', async () => {
    expect(
      (
        await request(app)
          .post('/api/v1/withdrawals')
          .set('Authorization', `Bearer ${aliceToken}`)
          .set('Idempotency-Key', `withdraw-${suffix}`)
          .send({ amount: '300.00', bankCode: '058', accountNumber: '0123456789' })
      ).status,
    ).toBe(201);
    expect(
      (
        await request(app)
          .post('/api/v1/withdrawals')
          .set('Authorization', `Bearer ${bobToken}`)
          .set('Idempotency-Key', `overspend-${suffix}`)
          .send({ amount: '2000.00', bankCode: '058', accountNumber: '0123456789' })
      ).status,
    ).toBe(422);
    expect(
      (await request(app).get('/api/v1/wallets/me').set('Authorization', `Bearer ${aliceToken}`))
        .body.data.balance,
    ).toBe('3500.00');
    expect(
      (await request(app).get('/api/v1/wallets/me').set('Authorization', `Bearer ${bobToken}`)).body
        .data.balance,
    ).toBe('1200.00');
  });

  test('10: paginates history and prevents unrelated transaction access', async () => {
    const history = await request(app)
      .get('/api/v1/transactions?page=1&limit=2')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(2);
    expect(history.body.meta.total).toBe(3);
    expect(
      (
        await request(app)
          .get(`/api/v1/transactions/${aliceFundingReference}`)
          .set('Authorization', `Bearer ${charlieToken}`)
      ).status,
    ).toBe(404);
  });

  test('11: rejects invalid transaction query parameters', async () => {
    const response = await request(app)
      .get('/api/v1/transactions?page=0&limit=500')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
