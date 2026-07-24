import type { Request, Response } from 'express';
import { ValidationError } from '../../common/errors/app-error.js';
import { presentTransaction } from '../../common/presenters.js';
import { idempotencyKeySchema, listSchema } from './transaction.schema.js';
import type { TransactionService } from './transaction.service.js';
export class TransactionController {
  public constructor(private readonly service: TransactionService) {}
  private key(req: Request): string {
    const parsed = idempotencyKeySchema.safeParse(req.header('idempotency-key'));
    if (!parsed.success) throw new ValidationError('A valid Idempotency-Key header is required');
    return parsed.data;
  }
  public fund = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.funding(req.auth!.id, this.key(req), req.body);
    res.status(result.replayed ? 200 : 201).json({
      success: true,
      message: result.replayed ? 'Funding already completed' : 'Wallet funded successfully',
      data: presentTransaction(result.transaction),
      meta: { idempotentReplay: result.replayed },
    });
  };
  public transfer = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.transfer(req.auth!.id, this.key(req), req.body);
    res.status(result.replayed ? 200 : 201).json({
      success: true,
      message: result.replayed ? 'Transfer already completed' : 'Transfer completed successfully',
      data: presentTransaction(result.transaction),
      meta: { idempotentReplay: result.replayed },
    });
  };
  public withdraw = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.withdrawal(req.auth!.id, this.key(req), req.body);
    res.status(result.replayed ? 200 : 201).json({
      success: true,
      message: result.replayed
        ? 'Withdrawal already completed'
        : 'Withdrawal completed successfully',
      data: presentTransaction(result.transaction),
      meta: { idempotentReplay: result.replayed },
    });
  };
  public list = async (req: Request, res: Response): Promise<void> => {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success)
      throw new ValidationError('Query validation failed', parsed.error.flatten());
    const filters = parsed.data;
    const result = await this.service.list(req.auth!.id, filters);
    res.json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: result.rows.map(presentTransaction),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        pages: Math.ceil(result.total / filters.limit),
      },
    });
  };
  public get = async (req: Request, res: Response): Promise<void> => {
    const reference = req.params.reference;
    if (typeof reference !== 'string') throw new ValidationError('Invalid transaction reference');
    const row = await this.service.get(req.auth!.id, reference);
    res.json({
      success: true,
      message: 'Transaction retrieved successfully',
      data: presentTransaction(row),
    });
  };
}
