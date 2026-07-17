import type { Knex } from 'knex';
import type { UserRow } from './user.types.js';
export class UserRepository {
  public constructor(private readonly db: Knex) {}
  public findByEmail(email: string, trx: Knex = this.db): Promise<UserRow | undefined> {
    return trx<UserRow>('users').where({ email }).first();
  }
  public findByPhone(phone: string, trx: Knex = this.db): Promise<UserRow | undefined> {
    return trx<UserRow>('users').where({ phone }).first();
  }
  public findById(id: string, trx: Knex = this.db): Promise<UserRow | undefined> {
    return trx<UserRow>('users').where({ id }).first();
  }
  public async create(row: Partial<UserRow>, trx: Knex.Transaction): Promise<void> {
    await trx<UserRow>('users').insert(row);
  }
}
