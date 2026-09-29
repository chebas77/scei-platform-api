CREATE TABLE "kiosks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kiosks_tenant_code_uq" UNIQUE("tenant_id","code"),
	CONSTRAINT "kiosks_status_chk" CHECK ("kiosks"."status" in ('active','inactive'))
);
--> statement-breakpoint
CREATE INDEX "kiosks_tenant_idx" ON "kiosks" USING btree ("tenant_id");