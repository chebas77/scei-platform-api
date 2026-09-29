export interface TenantBasic {
  id: string;
  slug: string;
  legalName: string;
  status: 'active' | 'suspended' | 'pending_deletion' | 'purged';
}

/** Datos mínimos de un colegio para pantallas y autorización de otros módulos (lo implementa Tenants). */
export interface TenantDirectoryPort {
  findBasic(id: string): Promise<TenantBasic | null>;
  /** Resuelve el colegio a partir del `X-Tenant-Slug` de las solicitudes de ámbito colegio. */
  findBySlug(slug: string): Promise<TenantBasic | null>;
  /** Límites vigentes del plan del colegio (p. ej. para no crear más kioscos de los contratados). */
  getPlanLimits(tenantId: string): Promise<{ maxStudents: number; maxKiosks: number } | null>;
}
export const TENANT_DIRECTORY = Symbol('TENANT_DIRECTORY');
