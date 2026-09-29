import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Db, DB, Tx, executor as pick } from '../../../../shared/database/tx';
import { CertificateRepositoryPort, DeletionCertificate } from '../../domain/ports/certificate.repository.port';
import { deletionCertificates as c } from './schema/deletion-certificates.table';

const toDomain = (r: typeof c.$inferSelect): DeletionCertificate => ({
  id: r.id, tenantId: r.tenantId, tenantSlug: r.tenantSlug, legalName: r.legalName,
  purgedAt: r.purgedAt, payload: r.payload, signature: r.signature,
});

@Injectable()
export class DrizzleCertificateRepository implements CertificateRepositoryPort {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(input: Parameters<CertificateRepositoryPort['create']>[0], tx?: Tx): Promise<DeletionCertificate> {
    const [row] = await pick(this.db, tx).insert(c).values(input).returning();
    return toDomain(row);
  }

  async findByTenant(tenantId: string): Promise<DeletionCertificate | null> {
    const [row] = await this.db.select().from(c).where(eq(c.tenantId, tenantId)).limit(1);
    return row ? toDomain(row) : null;
  }
}
