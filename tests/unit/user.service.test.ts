import type { Knex } from 'knex';
import { UserService } from '../../src/modules/users/user.service.js';
import type { UserRepository } from '../../src/modules/users/user.repository.js';
import type { WalletRepository } from '../../src/modules/wallets/wallet.repository.js';
import type { AuthRepository } from '../../src/modules/auth/auth.repository.js';
import type { KarmaRepository } from '../../src/modules/karma/karma.repository.js';
import type { KarmaProvider } from '../../src/modules/karma/karma.provider.js';

describe('UserService Karma fallback', () => {
  test('creates a wallet user and exposes an audited warning for empty Adjutor responses', async () => {
    const records: Array<Record<string, unknown>> = [];
    const createdUser = {
      id: 'user-1',
      first_name: 'Chuka',
      last_name: 'Ukachi',
      email: 'chuka@example.com',
      phone: '+2348012345678',
      bvn_hash: null,
      status: 'ACTIVE' as const,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const db = {
      transaction: async (callback: (trx: Knex.Transaction) => Promise<void>) =>
        callback({} as Knex.Transaction),
    } as Knex;
    const users = {
      findByEmail: async () => undefined,
      findByPhone: async () => undefined,
      create: async () => undefined,
      findById: async () => createdUser,
    } as unknown as UserRepository;
    const wallets = { create: async () => undefined } as unknown as WalletRepository;
    const auth = { createToken: async () => undefined } as unknown as AuthRepository;
    const karma = {
      record: async (row: Record<string, unknown>) => {
        records.push(row);
      },
      linkChecks: async () => undefined,
    } as unknown as KarmaRepository;
    const provider = {
      check: async () => ({
        blacklisted: false,
        decision: 'INCONCLUSIVE' as const,
        responseCode: '200',
      }),
    } as KarmaProvider;

    const result = await new UserService(db, users, wallets, auth, karma, provider).create({
      firstName: 'Chuka',
      lastName: 'Ukachi',
      email: 'chuka@example.com',
      phone: '+2348012345678',
    });

    expect(result.user).toBe(createdUser);
    expect(result.token).toBeTruthy();
    expect(result.karmaCheck).toEqual({
      status: 'INCONCLUSIVE',
      message:
        'Account created, but Adjutor Karma validation was inconclusive because the test endpoint returned an empty response.',
      inconclusiveIdentities: ['EMAIL', 'PHONE'],
    });
    expect(records).toHaveLength(2);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          is_blacklisted: null,
          provider_status: 'INCONCLUSIVE',
          response_code: '200',
        }),
      ]),
    );
  });
});
