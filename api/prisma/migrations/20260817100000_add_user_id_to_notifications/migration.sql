-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked workflow_run's owner, falling back to the linked workflow_config's owner
UPDATE "notifications"
SET "user_id" = COALESCE(
  (SELECT "workflow_runs"."user_id" FROM "workflow_runs" WHERE "workflow_runs"."id" = "notifications"."workflow_run_id"),
  (SELECT "workflow_configs"."user_id" FROM "workflow_configs" WHERE "workflow_configs"."id" = "notifications"."workflow_config_id"),
  (SELECT "website_targets"."user_id" FROM "website_targets" WHERE "website_targets"."id" = "notifications"."website_target_id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
