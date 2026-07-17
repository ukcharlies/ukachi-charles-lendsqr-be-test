import type { Knex } from 'knex';
import { v4 as uuid } from 'uuid';
import { addDays } from '../../common/utils/date.js';
import {
  ConflictError,
  ExternalServiceError,
  ForbiddenError,
} from '../../common/errors/app-error.js';
import {
  createOpaqueToken,
  hashIdentity,
  normalizeEmail,
  normalizeNigerianPhone,
} from '../../common/utils/identity.js';
import { getEnv } from '../../config/env.js';
import type { AuthRepository } from '../auth/auth.repository.js';
import type { KarmaProvider } from '../karma/karma.provider.js';
import type { KarmaRepository } from '../karma/karma.repository.js';
import type { IdentityType } from '../karma/karma.types.js';
import type { WalletRepository } from '../wallets/wallet.repository.js';
import type { CreateUserInput, UserRow } from './user.types.js';
import type { UserRepository } from './user.repository.js';
export class UserService {
  public constructor(
    private readonly db: Knex,
    private readonly users: UserRepository,
    private readonly wallets: WalletRepository,
    private readonly auth: AuthRepository,
    private readonly karma: KarmaRepository,
    private readonly provider: KarmaProvider,
  ) {}
  public async create(input: CreateUserInput): Promise<{ user: UserRow; token: string }> {
    const email = normalizeEmail(input.email);
    const phone = normalizeNigerianPhone(input.phone);
    if (await this.users.findByEmail(email))
      throw new ConflictError('Email is already registered', 'DUPLICATE_EMAIL');
    if (await this.users.findByPhone(phone))
      throw new ConflictError('Phone is already registered', 'DUPLICATE_PHONE');
    const identities: Array<{ type: IdentityType; value: string }> = [
      { type: 'EMAIL', value: email },
      { type: 'PHONE', value: phone },
      ...(input.bvn ? [{ type: 'BVN' as const, value: input.bvn }] : []),
    ];
    const hashes: string[] = [];
    for (const identity of identities) {
      const hash = hashIdentity(identity.value);
      hashes.push(hash);
      try {
        const result = await this.provider.check(identity.value);
        await this.karma.record({
          id: uuid(),
          identity_type: identity.type,
          identity_value_hash: hash,
          is_blacklisted: result.blacklisted,
          provider_status: 'COMPLETED',
          provider_reference: result.providerReference ?? null,
          response_code: result.responseCode ?? null,
          checked_at: new Date(),
        });
        if (result.blacklisted)
          throw new ForbiddenError('Account registration is not allowed', 'ONBOARDING_NOT_ALLOWED');
      } catch (error) {
        if (error instanceof ForbiddenError) throw error;
        await this.karma.record({
          id: uuid(),
          identity_type: identity.type,
          identity_value_hash: hash,
          is_blacklisted: null,
          provider_status: 'FAILED',
          response_code: 'PROVIDER_ERROR',
          checked_at: new Date(),
        });
        throw new ExternalServiceError();
      }
    }
    const id = uuid();
    const token = createOpaqueToken(getEnv().AUTH_TOKEN_PEPPER);
    await this.db.transaction(async (trx) => {
      await this.users.create(
        {
          id,
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          email,
          phone,
          bvn_hash: input.bvn ? hashIdentity(input.bvn) : null,
          status: 'ACTIVE',
        },
        trx,
      );
      await this.wallets.create(
        { id: uuid(), user_id: id, currency: 'NGN', balance_kobo: '0', status: 'ACTIVE' },
        trx,
      );
      await this.auth.createToken(
        {
          id: uuid(),
          user_id: id,
          token_hash: token.hash,
          expires_at: addDays(new Date(), getEnv().AUTH_TOKEN_TTL_DAYS),
        },
        trx,
      );
      await this.karma.linkChecks(hashes, id, trx);
    });
    const user = await this.users.findById(id);
    if (!user) throw new Error('Created user not found');
    return { user, token: token.raw };
  }
}
