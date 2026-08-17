-- webhook_deliveries: add user_id, backfill from the linked webhook_endpoint's owner (always
-- present — WebhookEndpoint.user_id is required), then lock it down to NOT NULL.
ALTER TABLE "webhook_deliveries" ADD COLUMN     "user_id" TEXT;

UPDATE "webhook_deliveries"
SET "user_id" = "webhook_endpoints"."user_id"
FROM "webhook_endpoints"
WHERE "webhook_deliveries"."webhook_endpoint_id" = "webhook_endpoints"."id";

ALTER TABLE "webhook_deliveries" ALTER COLUMN "user_id" SET NOT NULL;

CREATE INDEX "webhook_deliveries_user_id_idx" ON "webhook_deliveries"("user_id");

ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- job_logs: user_id was added nullable in 20260817080000_add_user_id_to_job_logs and every
-- existing row is already populated (all 3 creation sites pass the owning WorkflowRun's user_id),
-- so this goes straight to NOT NULL. onDelete switches from SET NULL to CASCADE to match the
-- required-FK pattern used elsewhere.
ALTER TABLE "job_logs" DROP CONSTRAINT "job_logs_user_id_fkey";
ALTER TABLE "job_logs" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
