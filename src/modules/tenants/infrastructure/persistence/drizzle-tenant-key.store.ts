import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { SECRET_CIPHER, SecretCipherPort } from '../../../../shared/crypto/crypto.ports';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { TenantKeyStorePort } from '../../domain/ports/tenant-key.store.port';
import { tenantKeys } from './schema/tenant-keys.table';

@Injectable()
export class DrizzleTenantKeyStore implements TenantKeyStorePort {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipherPort,
  ) {}

  async provision(tenantId: string, tx?: Tx): Promise<{ keyVersion: number }> {
    const dek = randomBytes(32);
    const [row] = await pick(this.db, tx).insert(tenantKeys).values({ tenantId, wrappedDek: this.cipher.encrypt(dek) }).returning({ keyVersion: tenantKeys.keyVersion });
    dek.fill(0);
    return row;
  }

  async unwrap(tenantId: string): Promise<Buffer | null> {
    const [row] = await this.db.select({ w: tenantKeys.wrappedDek }).from(tenantKeys).where(eq(tenantKeys.tenantId, tenantId)).limit(1);
    return row?.w ? this.cipher.decrypt(row.w) : null;
  }

  async destroy(tenantId: string, now: Date, tx?: Tx): Promise<{ keyVersion: number } | null> {
    const [row] = await pick(this.db, tx)
      .update(tenantKeys)
      .set({ wrappedDek: null, destroyedAt: now })
      .where(and(eq(tenantKeys.tenantId, tenantId), isNull(tenantKeys.destroyedAt)))
      .returning({ keyVersion: tenantKeys.keyVersion });
    return row ?? null;
  }
}
