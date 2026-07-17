import type { Knex } from 'knex';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.string('id', 36).primary();
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.string('email', 254).notNullable().unique();
    t.string('phone', 20).notNullable().unique();
    t.string('bvn_hash', 64).nullable();
    t.enum('status', ['ACTIVE', 'SUSPENDED']).notNullable().defaultTo('ACTIVE');
    t.timestamp('created_at', { useTz: false }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('wallets', (t) => {
    t.string('id', 36).primary();
    t.string('user_id', 36)
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');
    t.enum('currency', ['NGN']).notNullable().defaultTo('NGN');
    t.bigInteger('balance_kobo').unsigned().notNullable().defaultTo(0);
    t.enum('status', ['ACTIVE', 'FROZEN']).notNullable().defaultTo('ACTIVE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('api_tokens', (t) => {
    t.string('id', 36).primary();
    t.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash', 64).notNullable().unique();
    t.timestamp('expires_at').notNullable();
    t.timestamp('revoked_at').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'expires_at']);
  });
  await knex.schema.createTable('financial_transactions', (t) => {
    t.string('id', 36).primary();
    t.string('reference', 40).notNullable().unique();
    t.enum('type', ['FUNDING', 'TRANSFER', 'WITHDRAWAL']).notNullable();
    t.enum('status', ['PENDING', 'COMPLETED', 'FAILED']).notNullable();
    t.bigInteger('amount_kobo').unsigned().notNullable();
    t.enum('currency', ['NGN']).notNullable().defaultTo('NGN');
    t.string('initiated_by_user_id', 36)
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');
    t.string('idempotency_key', 128).notNullable();
    t.string('request_fingerprint', 64).notNullable();
    t.string('description', 255).nullable();
    t.json('metadata').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['initiated_by_user_id', 'idempotency_key'], {
      indexName: 'uq_fin_tx_user_idempotency',
    });
    t.index(['initiated_by_user_id', 'created_at']);
  });
  await knex.schema.createTable('ledger_entries', (t) => {
    t.string('id', 36).primary();
    t.string('financial_transaction_id', 36)
      .notNullable()
      .references('id')
      .inTable('financial_transactions')
      .onDelete('RESTRICT');
    t.string('wallet_id', 36)
      .notNullable()
      .references('id')
      .inTable('wallets')
      .onDelete('RESTRICT');
    t.enum('entry_type', ['CREDIT', 'DEBIT']).notNullable();
    t.bigInteger('amount_kobo').unsigned().notNullable();
    t.bigInteger('balance_before_kobo').unsigned().notNullable();
    t.bigInteger('balance_after_kobo').unsigned().notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['wallet_id', 'created_at']);
  });
  await knex.schema.createTable('karma_checks', (t) => {
    t.string('id', 36).primary();
    t.string('user_id', 36).nullable().references('id').inTable('users').onDelete('SET NULL');
    t.enum('identity_type', ['EMAIL', 'PHONE', 'BVN']).notNullable();
    t.string('identity_value_hash', 64).notNullable();
    t.boolean('is_blacklisted').nullable();
    t.string('provider_status', 32).notNullable();
    t.string('provider_reference', 100).nullable();
    t.string('response_code', 40).nullable();
    t.timestamp('checked_at').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['identity_value_hash', 'checked_at']);
  });
}
export async function down(knex: Knex): Promise<void> {
  for (const table of [
    'karma_checks',
    'ledger_entries',
    'financial_transactions',
    'api_tokens',
    'wallets',
    'users',
  ])
    await knex.schema.dropTableIfExists(table);
}
