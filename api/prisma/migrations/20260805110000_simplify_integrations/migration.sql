DROP TABLE IF EXISTS "user_integrations";
DROP TABLE IF EXISTS "integration_targets";

CREATE TABLE "user_integrations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "integration_type" "IntegrationType" NOT NULL,
    "credentials_encrypted" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_integrations_user_id_integration_type_key" ON "user_integrations"("user_id", "integration_type");
CREATE INDEX "user_integrations_user_id_idx" ON "user_integrations"("user_id");
CREATE INDEX "user_integrations_integration_type_idx" ON "user_integrations"("integration_type");
CREATE INDEX "user_integrations_is_active_idx" ON "user_integrations"("is_active");

ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
