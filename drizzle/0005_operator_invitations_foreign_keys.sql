-- Integridad referencial entre módulos (ver 0002_cross_module_foreign_keys.sql).
ALTER TABLE "operator_invitations"
  ADD CONSTRAINT "operator_invitations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "operator_invitations"
  ADD CONSTRAINT "operator_invitations_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "operator_invitations"
  ADD CONSTRAINT "operator_invitations_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
