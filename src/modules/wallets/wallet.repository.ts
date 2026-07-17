import type { Knex } from 'knex';
import type { WalletRow } from './wallet.types.js';
export class WalletRepository {
  public constructor(private readonly db: Knex) {}
  public findByUserId(userId: string, trx: Knex = this.db): Promise<WalletRow | undefined> {
    return trx<WalletRow>('wallets').where({ user_id: userId }).first();
  }
  public findById(id: string, trx: Knex = this.db): Promise<WalletRow | undefined> {
    return trx<WalletRow>('wallets').where({ id }).first();
  }
  public async lockByIds(ids: string[], trx: Knex.Transaction): Promise<WalletRow[]> {
    return trx<WalletRow>('wallets')
      .whereIn('id', [...ids].sort())
      .orderBy('id')
      .forUpdate();
  }
  public async create(row: Partial<WalletRow>, trx: Knex.Transaction): Promise<void> {
    await trx<WalletRow>('wallets').insert(row);
  }
  public async updateBalance(id: string, balance: bigint, trx: Knex.Transaction): Promise<void> {
    await trx<WalletRow>('wallets')
      .where({ id })
      .update({ balance_kobo: balance.toString(), updated_at: trx.fn.now() });
  }
}
