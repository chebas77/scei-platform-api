-- Integridad referencial entre módulos (ver 0002_cross_module_foreign_keys.sql).
ALTER TABLE "kiosks"
  ADD CONSTRAINT "kiosks_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
