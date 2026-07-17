import type { Knex } from 'knex';
import { v4 as uuid } from 'uuid';
import {
  ConflictError,
  InsufficientFundsError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/app-error.js';
import { fingerprint, maskAccountNumber, normalizeEmail } from '../../common/utils/identity.js';
import { koboToNaira, nairaToKobo, safeAdd } from '../../common/utils/money.js';
import type { UserRepository } from '../users/user.repository.js';
import type { WalletRepository } from '../wallets/wallet.repository.js';
import type { TransactionRepository, TransactionFilters } from './transaction.repository.js';
import type { TransactionRow, TransactionType } from './transaction.types.js';
type Operation = {
  type: TransactionType;
  amount: string;
  description?: string;
  recipientEmail?: string;
  sourceReference?: string;
  bankCode?: string;
  accountNumber?: string;
};
export class TransactionService {
  public constructor(
    private readonly db: Knex,
    private readonly transactions: TransactionRepository,
    private readonly wallets: WalletRepository,
    private readonly users: UserRepository,
  ) {}
  public async funding(
    userId: string,
    key: string,
    input: { amount: string; sourceReference: string; description?: string },
  ): Promise<{ transaction: TransactionRow; replayed: boolean }> {
    return this.execute(userId, key, { type: 'FUNDING', ...input });
  }
  public async transfer(
    userId: string,
    key: string,
    input: { recipientEmail: string; amount: string; description?: string },
  ): Promise<{ transaction: TransactionRow; replayed: boolean }> {
    return this.execute(userId, key, {
      type: 'TRANSFER',
      ...input,
      recipientEmail: normalizeEmail(input.recipientEmail),
    });
  }
  public async withdrawal(
    userId: string,
    key: string,
    input: { amount: string; bankCode: string; accountNumber: string; description?: string },
  ): Promise<{ transaction: TransactionRow; replayed: boolean }> {
    return this.execute(userId, key, { type: 'WITHDRAWAL', ...input });
  }
  private async execute(
    userId: string,
    key: string,
    op: Operation,
  ): Promise<{ transaction: TransactionRow; replayed: boolean }> {
    const amount = nairaToKobo(op.amount);
    const canonical = { ...op, amount: koboToNaira(amount) };
    const requestFingerprint = fingerprint(canonical);
    const existing = await this.transactions.findByIdempotency(userId, key);
    if (existing) {
      if (existing.type !== op.type || existing.request_fingerprint !== requestFingerprint)
        throw new ConflictError(
          'Idempotency key was reused with a different request',
          'IDEMPOTENCY_KEY_CONFLICT',
        );
      return { transaction: existing, replayed: true };
    }
    const id = uuid();
    const reference = `DCR-${op.type.slice(0, 3)}-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 6).toUpperCase()}`;
    await this.db.transaction(async (trx) => {
      const concurrent = await this.transactions.findByIdempotency(userId, key, trx);
      if (concurrent)
        throw new ConflictError('Operation already processed', 'IDEMPOTENCY_KEY_CONFLICT');
      const sender = await this.wallets.findByUserId(userId, trx);
      if (!sender) throw new NotFoundError('Wallet not found');
      let recipientId: string | undefined;
      if (op.type === 'TRANSFER') {
        const recipient = await this.users.findByEmail(op.recipientEmail!, trx);
        if (!recipient) throw new NotFoundError('Recipient not found');
        if (recipient.id === userId) throw new ValidationError('Self-transfer is not allowed');
        recipientId = (await this.wallets.findByUserId(recipient.id, trx))?.id;
        if (!recipientId) throw new NotFoundError('Recipient wallet not found');
      }
      const locked = await this.wallets.lockByIds(
        [sender.id, ...(recipientId ? [recipientId] : [])],
        trx,
      );
      const lockedSender = locked.find((w) => w.id === sender.id)!;
      const before = BigInt(lockedSender.balance_kobo);
      let metadata: Record<string, unknown> = {};
      if (op.type === 'FUNDING') metadata = { sourceReference: op.sourceReference };
      if (op.type === 'WITHDRAWAL')
        metadata = { bankCode: op.bankCode, accountNumber: maskAccountNumber(op.accountNumber!) };
      if (op.type === 'TRANSFER') metadata = { recipientWalletId: recipientId };
      const row = {
        id,
        reference,
        type: op.type,
        status: 'COMPLETED' as const,
        amount_kobo: amount.toString(),
        currency: 'NGN' as const,
        initiated_by_user_id: userId,
        idempotency_key: key,
        request_fingerprint: requestFingerprint,
        description: op.description ?? null,
        metadata: JSON.stringify(metadata),
      };
      await this.transactions.create(row, trx);
      if (op.type === 'FUNDING') {
        const after = safeAdd(before, amount);
        await this.wallets.updateBalance(sender.id, after, trx);
        await this.ledger(id, sender.id, 'CREDIT', amount, before, after, trx);
      } else {
        if (before < amount) throw new InsufficientFundsError();
        const after = before - amount;
        await this.wallets.updateBalance(sender.id, after, trx);
        await this.ledger(id, sender.id, 'DEBIT', amount, before, after, trx);
        if (recipientId) {
          const recipient = locked.find((w) => w.id === recipientId)!;
          const recipientBefore = BigInt(recipient.balance_kobo);
          const recipientAfter = safeAdd(recipientBefore, amount);
          await this.wallets.updateBalance(recipientId, recipientAfter, trx);
          await this.ledger(
            id,
            recipientId,
            'CREDIT',
            amount,
            recipientBefore,
            recipientAfter,
            trx,
          );
        }
      }
    });
    const transaction = await this.transactions.findByIdempotency(userId, key);
    if (!transaction) throw new Error('Created transaction not found');
    return { transaction, replayed: false };
  }
  private async ledger(
    transactionId: string,
    walletId: string,
    type: 'CREDIT' | 'DEBIT',
    amount: bigint,
    before: bigint,
    after: bigint,
    trx: Knex.Transaction,
  ): Promise<void> {
    await this.transactions.createLedger(
      {
        id: uuid(),
        financial_transaction_id: transactionId,
        wallet_id: walletId,
        entry_type: type,
        amount_kobo: amount.toString(),
        balance_before_kobo: before.toString(),
        balance_after_kobo: after.toString(),
      },
      trx,
    );
  }
  public list(
    userId: string,
    filters: TransactionFilters,
  ): Promise<{ rows: TransactionRow[]; total: number }> {
    return this.transactions.listForUser(userId, filters);
  }
  public async get(userId: string, reference: string): Promise<TransactionRow> {
    const row = await this.transactions.findByReferenceForUser(reference, userId);
    if (!row) throw new NotFoundError('Transaction not found');
    return row;
  }
}
