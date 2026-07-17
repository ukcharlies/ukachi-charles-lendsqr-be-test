export type TransactionType = 'FUNDING' | 'TRANSFER' | 'WITHDRAWAL';
export interface TransactionRow {
  id: string;
  reference: string;
  type: TransactionType;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  amount_kobo: string;
  currency: 'NGN';
  initiated_by_user_id: string;
  idempotency_key: string;
  request_fingerprint: string;
  description: string | null;
  metadata: Record<string, unknown> | string | null;
  created_at: Date;
  updated_at: Date;
}
export interface LedgerRow {
  id: string;
  financial_transaction_id: string;
  wallet_id: string;
  entry_type: 'CREDIT' | 'DEBIT';
  amount_kobo: string;
  balance_before_kobo: string;
  balance_after_kobo: string;
  created_at: Date;
}
