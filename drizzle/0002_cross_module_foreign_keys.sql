-- Integridad referencial entre módulos. Se declara aquí (y no en los esquemas Drizzle)
-- para que ningún módulo importe las tablas de otro.
ALTER TABLE "roles"
  ADD CONSTRAINT "roles_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "tenant_invitations"
  ADD CONSTRAINT "tenant_invitations_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "tenant_invitations"
  ADD CONSTRAINT "tenant_invitations_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "tenants"
  ADD CONSTRAINT "tenants_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
