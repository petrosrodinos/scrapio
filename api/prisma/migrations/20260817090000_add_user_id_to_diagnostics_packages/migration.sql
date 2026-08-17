-- AlterTable
ALTER TABLE "diagnostics_packages" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked workflow_config's owner
UPDATE "diagnostics_packages"
SET "user_id" = "workflow_configs"."user_id"
FROM "workflow_configs"
WHERE "diagnostics_packages"."workflow_config_id" = "workflow_configs"."id";

-- CreateIndex
CREATE INDEX "diagnostics_packages_user_id_idx" ON "diagnostics_packages"("user_id");

-- AddForeignKey
ALTER TABLE "diagnostics_packages" ADD CONSTRAINT "diagnostics_packages_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
