import { NodePgDatabase } from 'drizzle-orm/node-postgres';

/** Ejecutor de consultas: la base o una transacción (ambas exponen la misma API). */
export type Db = NodePgDatabase;
export type DbExecutor = Pick<Db, 'select' | 'insert' | 'update' | 'delete' | 'execute'>;

/**
 * Manija opaca de transacción. La capa de aplicación la recibe y la pasa a los
 * puertos sin conocer Drizzle; solo los adaptadores de infraestructura la abren.
 */
export type Tx = { readonly __brand: 'Tx' };

export interface TransactionRunnerPort {
  run<T>(work: (tx: Tx) => Promise<T>): Promise<T>;
}
export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');

export const DB = Symbol('DB');

/** Usado por los repositorios: si hay transacción la usa, si no la conexión general. */
export function executor(db: Db, tx?: Tx): DbExecutor {
  return (tx as unknown as DbExecutor | undefined) ?? db;
}
