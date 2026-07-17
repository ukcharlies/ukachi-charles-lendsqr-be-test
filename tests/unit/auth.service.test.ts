import { jest } from '@jest/globals';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import type { AuthRepository } from '../../src/modules/auth/auth.repository.js';
describe('AuthService', () => {
  test('accepts active token', async () => {
    const repo = {
      findActiveUserByTokenHash: jest
        .fn<() => Promise<{ user_id: string; email: string; status: string } | undefined>>()
        .mockResolvedValue({ user_id: 'u1', email: 'a@b.com', status: 'ACTIVE' }),
    } as unknown as AuthRepository;
    await expect(new AuthService(repo).authenticate('token')).resolves.toEqual({
      id: 'u1',
      email: 'a@b.com',
      status: 'ACTIVE',
    });
  });
  test('rejects invalid token', async () => {
    const repo = {
      findActiveUserByTokenHash: jest
        .fn<() => Promise<{ user_id: string; email: string; status: string } | undefined>>()
        .mockResolvedValue(undefined),
    } as unknown as AuthRepository;
    await expect(new AuthService(repo).authenticate('bad')).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
