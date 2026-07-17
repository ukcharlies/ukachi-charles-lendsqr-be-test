import { koboToNaira } from './utils/money.js';
import type { TransactionRow } from '../modules/transactions/transaction.types.js';
export function presentTransaction(row: TransactionRow): object {
  return {
    id: row.id,
    reference: row.reference,
    type: row.type,
    status: row.status,
    amount: koboToNaira(row.amount_kobo),
    currency: row.currency,
    description: row.description,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    createdAt: row.created_at,
  };
}
