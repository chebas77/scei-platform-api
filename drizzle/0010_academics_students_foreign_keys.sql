-- Integridad referencial entre módulos (ver 0002_cross_module_foreign_keys.sql).
ALTER TABLE "academic_years"
  ADD CONSTRAINT "academic_years_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "grade_levels"
  ADD CONSTRAINT "grade_levels_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "sections"
  ADD CONSTRAINT "sections_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
--> statement-breakpoint
-- Al borrar un alumno se van con él sus matrículas (la baja del colegio borra alumnos, y esto arrastra las suyas).
ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "students"
  ADD CONSTRAINT "students_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "students"
  ADD CONSTRAINT "students_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;
