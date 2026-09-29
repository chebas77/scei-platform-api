import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { APP_CONFIG, AppConfig } from '../config/env';
import { Db, DB, Tx, TransactionRunnerPort, TRANSACTION_RUNNER } from './tx';

const POOL = Symbol('PG_POOL');

@Injectable()
class PoolLifecycle implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Injectable()
class DrizzleTransactionRunner implements TransactionRunnerPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  run<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction((t) => work(t as unknown as Tx));
  }
}

@Global()
@Module({
  providers: [
    {
      provide: POOL,
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig) =>
        new Pool({ connectionString: cfg.DATABASE_URL, max: cfg.DATABASE_POOL_MAX, statement_timeout: 15_000 }),
    },
    { provide: DB, inject: [POOL], useFactory: (pool: Pool): Db => drizzle(pool) },
    { provide: TRANSACTION_RUNNER, useClass: DrizzleTransactionRunner },
    PoolLifecycle,
  ],
  exports: [DB, TRANSACTION_RUNNER],
})
export class DatabaseModule {}
