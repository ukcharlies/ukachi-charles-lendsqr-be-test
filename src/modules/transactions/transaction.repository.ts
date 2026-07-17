import type { Knex } from 'knex';
import type { LedgerRow, TransactionRow, TransactionType } from './transaction.types.js';
export interface TransactionFilters {
  page: number;
  limit: number;
  type?: TransactionType | undefined;
  status?: string | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
}
export class TransactionRepository {
  public constructor(private readonly db: Knex) {}
  public findByIdempotency(
    userId: string,
    key: string,
    trx: Knex = this.db,
  ): Promise<TransactionRow | undefined> {
    return trx<TransactionRow>('financial_transactions')
      .where({ initiated_by_user_id: userId, idempotency_key: key })
      .first();
  }
  public findByReferenceForUser(
    reference: string,
    userId: string,
  ): Promise<TransactionRow | undefined> {
    return this.db<TransactionRow>('financial_transactions as ft')
      .distinct('ft.*')
      .join('ledger_entries as le', 'le.financial_transaction_id', 'ft.id')
      .join('wallets as w', 'w.id', 'le.wallet_id')
      .where({ 'ft.reference': reference, 'w.user_id': userId })
      .first();
  }
  public async create(row: Partial<TransactionRow>, trx: Knex.Transaction): Promise<void> {
    await trx<TransactionRow>('financial_transactions').insert(row);
  }
  public async createLedger(row: Partial<LedgerRow>, trx: Knex.Transaction): Promise<void> {
    await trx<LedgerRow>('ledger_entries').insert(row);
  }
  public async listForUser(
    userId: string,
    filters: TransactionFilters,
  ): Promise<{ rows: TransactionRow[]; total: number }> {
    let query = this.db<TransactionRow>('financial_transactions as ft')
      .distinct('ft.*')
      .join('ledger_entries as le', 'le.financial_transaction_id', 'ft.id')
      .join('wallets as w', 'w.id', 'le.wallet_id')
      .where('w.user_id', userId);
    if (filters.type) query = query.where('ft.type', filters.type);
    if (filters.status) query = query.where('ft.status', filters.status);
    if (filters.from) query = query.where('ft.created_at', '>=', filters.from);
    if (filters.to) query = query.where('ft.created_at', '<=', filters.to);
    const countQuery = query
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct<{ count: string }[]>({ count: 'ft.id' });
    const rows = await query
      .select('ft.*')
      .orderBy('ft.created_at', 'desc')
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);
    const [count] = await countQuery;
    return { rows, total: Number(count?.count ?? 0) };
  }
}
