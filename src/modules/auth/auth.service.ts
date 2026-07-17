import { getEnv } from '../../config/env.js';
import { AuthenticationError } from '../../common/errors/app-error.js';
import { hashToken } from '../../common/utils/identity.js';
import type { AuthenticatedUser } from './auth.types.js';
import type { AuthRepository } from './auth.repository.js';
export class AuthService {
  public constructor(private readonly repo: AuthRepository) {}
  public async authenticate(rawToken: string): Promise<AuthenticatedUser> {
    const row = await this.repo.findActiveUserByTokenHash(
      hashToken(rawToken, getEnv().AUTH_TOKEN_PEPPER),
    );
    if (!row) throw new AuthenticationError('Invalid or expired token');
    return { id: row.user_id, email: row.email, status: 'ACTIVE' };
  }
}
