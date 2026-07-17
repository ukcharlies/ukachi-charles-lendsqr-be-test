import type { Request, Response } from 'express';
import { NotFoundError } from '../../common/errors/app-error.js';
import { koboToNaira } from '../../common/utils/money.js';
import type { WalletRepository } from './wallet.repository.js';
export class WalletController {
  public constructor(private readonly wallets: WalletRepository) {}
  public me = async (req: Request, res: Response): Promise<void> => {
    const wallet = await this.wallets.findByUserId(req.auth!.id);
    if (!wallet) throw new NotFoundError('Wallet not found');
    res.json({
      success: true,
      message: 'Wallet retrieved successfully',
      data: {
        id: wallet.id,
        currency: wallet.currency,
        balance: koboToNaira(wallet.balance_kobo),
        status: wallet.status,
        createdAt: wallet.created_at,
      },
    });
  };
}
