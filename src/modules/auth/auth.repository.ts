import type { Knex } from 'knex';
interface TokenUserRow {
  user_id: string;
  email: string;
  status: string;
}
export class AuthRepository {
  public constructor(private readonly db: Knex) {}
  public findActiveUserByTokenHash(hash: string): Promise<TokenUserRow | undefined> {
    return this.db('api_tokens as t')
      .join('users as u', 'u.id', 't.user_id')
      .select('u.id as user_id', 'u.email', 'u.status')
      .where('t.token_hash', hash)
      .whereNull('t.revoked_at')
      .where('t.expires_at', '>', this.db.fn.now())
      .where('u.status', 'ACTIVE')
      .first();
  }
  public async createToken(row: object, trx: Knex.Transaction): Promise<void> {
    await trx('api_tokens').insert(row);
  }
}
