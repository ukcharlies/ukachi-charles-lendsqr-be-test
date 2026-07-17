export interface WalletRow {
  id: string;
  user_id: string;
  currency: 'NGN';
  balance_kobo: string;
  status: 'ACTIVE' | 'FROZEN';
  created_at: Date;
  updated_at: Date;
}
