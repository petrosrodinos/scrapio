-- AlterTable
ALTER TABLE "job_logs" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked workflow_run's owner where available
UPDATE "job_logs"
SET "user_id" = "workflow_runs"."user_id"
FROM "workflow_runs"
WHERE "job_logs"."workflow_run_id" = "workflow_runs"."id";

-- CreateIndex
CREATE INDEX "job_logs_user_id_idx" ON "job_logs"("user_id");

-- AddForeignKey
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
