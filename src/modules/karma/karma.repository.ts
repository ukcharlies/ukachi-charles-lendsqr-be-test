import type { Knex } from 'knex';
export class KarmaRepository {
  public constructor(private readonly db: Knex) {}
  public async record(row: object): Promise<void> {
    await this.db('karma_checks').insert(row);
  }
  public async linkChecks(
    identityHashes: string[],
    userId: string,
    trx: Knex.Transaction,
  ): Promise<void> {
    await trx('karma_checks')
      .whereIn('identity_value_hash', identityHashes)
      .whereNull('user_id')
      .update({ user_id: userId });
  }
}
