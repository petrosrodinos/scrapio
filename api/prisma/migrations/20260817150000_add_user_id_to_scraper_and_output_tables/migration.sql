-- AlterTable
ALTER TABLE "scraper_versions" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked workflow_config's owner
UPDATE "scraper_versions"
SET "user_id" = "workflow_configs"."user_id"
FROM "workflow_configs"
WHERE "scraper_versions"."workflow_config_id" = "workflow_configs"."id";

-- CreateIndex
CREATE INDEX "scraper_versions_user_id_idx" ON "scraper_versions"("user_id");

-- AddForeignKey
ALTER TABLE "scraper_versions" ADD CONSTRAINT "scraper_versions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "scraper_generation_runs" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked website_target's owner
UPDATE "scraper_generation_runs"
SET "user_id" = "website_targets"."user_id"
FROM "website_targets"
WHERE "scraper_generation_runs"."website_target_id" = "website_targets"."id";

-- CreateIndex
CREATE INDEX "scraper_generation_runs_user_id_idx" ON "scraper_generation_runs"("user_id");

-- AddForeignKey
ALTER TABLE "scraper_generation_runs" ADD CONSTRAINT "scraper_generation_runs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "computer_use_steps" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked scraper_generation_run's owner (now populated above), falling back
-- to the linked workflow_run's owner
UPDATE "computer_use_steps"
SET "user_id" = COALESCE(
  (SELECT "scraper_generation_runs"."user_id" FROM "scraper_generation_runs" WHERE "scraper_generation_runs"."id" = "computer_use_steps"."scraper_generation_run_id"),
  (SELECT "workflow_runs"."user_id" FROM "workflow_runs" WHERE "workflow_runs"."id" = "computer_use_steps"."workflow_run_id")
);

-- CreateIndex
CREATE INDEX "computer_use_steps_user_id_idx" ON "computer_use_steps"("user_id");

-- AddForeignKey
ALTER TABLE "computer_use_steps" ADD CONSTRAINT "computer_use_steps_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "scraper_execution_traces" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked workflow_config's owner
UPDATE "scraper_execution_traces"
SET "user_id" = "workflow_configs"."user_id"
FROM "workflow_configs"
WHERE "scraper_execution_traces"."workflow_config_id" = "workflow_configs"."id";

-- CreateIndex
CREATE INDEX "scraper_execution_traces_user_id_idx" ON "scraper_execution_traces"("user_id");

-- AddForeignKey
ALTER TABLE "scraper_execution_traces" ADD CONSTRAINT "scraper_execution_traces_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "extracted_items" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked website_target's owner
UPDATE "extracted_items"
SET "user_id" = "website_targets"."user_id"
FROM "website_targets"
WHERE "extracted_items"."website_target_id" = "website_targets"."id";

-- CreateIndex
CREATE INDEX "extracted_items_user_id_idx" ON "extracted_items"("user_id");

-- AddForeignKey
ALTER TABLE "extracted_items" ADD CONSTRAINT "extracted_items_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "plain_scraped_pages" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked workflow_run's owner
UPDATE "plain_scraped_pages"
SET "user_id" = "workflow_runs"."user_id"
FROM "workflow_runs"
WHERE "plain_scraped_pages"."workflow_run_id" = "workflow_runs"."id";

-- CreateIndex
CREATE INDEX "plain_scraped_pages_user_id_idx" ON "plain_scraped_pages"("user_id");

-- AddForeignKey
ALTER TABLE "plain_scraped_pages" ADD CONSTRAINT "plain_scraped_pages_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "extraction_results" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked workflow_run's owner, falling back to the linked plain_scraped_page's
-- owner (now populated above)
UPDATE "extraction_results"
SET "user_id" = COALESCE(
  (SELECT "workflow_runs"."user_id" FROM "workflow_runs" WHERE "workflow_runs"."id" = "extraction_results"."workflow_run_id"),
  (SELECT "plain_scraped_pages"."user_id" FROM "plain_scraped_pages" WHERE "plain_scraped_pages"."id" = "extraction_results"."plain_scraped_page_id")
);

-- CreateIndex
CREATE INDEX "extraction_results_user_id_idx" ON "extraction_results"("user_id");

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ai_batch_request_items" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked ai_batch_job's owner
UPDATE "ai_batch_request_items"
SET "user_id" = "ai_batch_jobs"."user_id"
FROM "ai_batch_jobs"
WHERE "ai_batch_request_items"."ai_batch_job_id" = "ai_batch_jobs"."id";

-- CreateIndex
CREATE INDEX "ai_batch_request_items_user_id_idx" ON "ai_batch_request_items"("user_id");

-- AddForeignKey
ALTER TABLE "ai_batch_request_items" ADD CONSTRAINT "ai_batch_request_items_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "block_rules" ADD COLUMN     "user_id" TEXT;

-- Backfill from the linked website_target's owner
UPDATE "block_rules"
SET "user_id" = "website_targets"."user_id"
FROM "website_targets"
WHERE "block_rules"."website_target_id" = "website_targets"."id";

-- CreateIndex
CREATE INDEX "block_rules_user_id_idx" ON "block_rules"("user_id");

-- AddForeignKey
ALTER TABLE "block_rules" ADD CONSTRAINT "block_rules_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
