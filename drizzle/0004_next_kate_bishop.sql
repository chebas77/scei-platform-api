CREATE TABLE "operator_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"email" text NOT NULL,
	"role_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operator_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE INDEX "operator_invitations_tenant_idx" ON "operator_invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "operator_invitations_email_idx" ON "operator_invitations" USING btree ("email");