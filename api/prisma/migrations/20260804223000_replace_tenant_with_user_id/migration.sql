ALTER TABLE "website_targets" DROP CONSTRAINT IF EXISTS "website_targets_tenant_id_fkey";
DROP INDEX IF EXISTS "website_targets_tenant_id_base_url_key";
DROP INDEX IF EXISTS "website_targets_tenant_id_idx";

ALTER TABLE "website_targets" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

UPDATE "website_targets"
SET "user_id" = (
  SELECT "id"
  FROM "users"
  WHERE "role" IN ('SUPER_ADMIN', 'ADMIN')
  ORDER BY "created_at" ASC
  LIMIT 1
)
WHERE "user_id" IS NULL;

UPDATE "website_targets"
SET "user_id" = (
  SELECT "id"
  FROM "users"
  ORDER BY "created_at" ASC
  LIMIT 1
)
WHERE "user_id" IS NULL;

ALTER TABLE "website_targets" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "website_targets" ALTER COLUMN "user_id" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "website_targets_user_id_base_url_key"
  ON "website_targets"("user_id", "base_url");
CREATE INDEX IF NOT EXISTS "website_targets_user_id_idx" ON "website_targets"("user_id");

ALTER TABLE "website_targets"
  ADD CONSTRAINT "website_targets_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "tenant_members";
DROP TABLE IF EXISTS "tenants";
DROP TYPE IF EXISTS "TenantMemberRole";
