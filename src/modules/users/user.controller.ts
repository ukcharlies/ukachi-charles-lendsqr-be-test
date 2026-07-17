import type { Request, Response } from 'express';
import { presentUser } from './user.types.js';
import type { UserService } from './user.service.js';
import type { UserRepository } from './user.repository.js';
import { NotFoundError } from '../../common/errors/app-error.js';
export class UserController {
  public constructor(
    private readonly service: UserService,
    private readonly users: UserRepository,
  ) {}
  public create = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user: presentUser(result.user), token: result.token, tokenType: 'Bearer' },
    });
  };
  public me = async (req: Request, res: Response): Promise<void> => {
    const user = await this.users.findById(req.auth!.id);
    if (!user) throw new NotFoundError('User not found');
    res.json({ success: true, message: 'User retrieved successfully', data: presentUser(user) });
  };
}
