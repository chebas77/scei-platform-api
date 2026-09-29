import { Tx } from '../../../../shared/database/tx';

export interface DeletionCertificate {
  id: string;
  tenantId: string;
  tenantSlug: string;
  legalName: string;
  purgedAt: Date;
  payload: Record<string, unknown>;
  signature: string;
}

export interface CertificateRepositoryPort {
  create(input: Omit<DeletionCertificate, 'id'> & { requestedBy: string | null; purgedBy: string | null }, tx?: Tx): Promise<DeletionCertificate>;
  findByTenant(tenantId: string): Promise<DeletionCertificate | null>;
}
export const CERTIFICATE_REPOSITORY = Symbol('CERTIFICATE_REPOSITORY');
