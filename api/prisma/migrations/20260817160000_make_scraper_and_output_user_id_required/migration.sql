-- Every row in these 9 tables was already backfilled with a non-null user_id by the previous
-- migration (20260817150000_add_user_id_to_scraper_and_output_tables), so this can go straight
-- to NOT NULL without further backfill. onDelete switches from SET NULL to CASCADE to match the
-- required-FK pattern used elsewhere in the schema (e.g. WorkflowRun.user_id).

-- scraper_versions
ALTER TABLE "scraper_versions" DROP CONSTRAINT "scraper_versions_user_id_fkey";
ALTER TABLE "scraper_versions" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "scraper_versions" ADD CONSTRAINT "scraper_versions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- scraper_generation_runs
ALTER TABLE "scraper_generation_runs" DROP CONSTRAINT "scraper_generation_runs_user_id_fkey";
ALTER TABLE "scraper_generation_runs" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "scraper_generation_runs" ADD CONSTRAINT "scraper_generation_runs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- computer_use_steps
ALTER TABLE "computer_use_steps" DROP CONSTRAINT "computer_use_steps_user_id_fkey";
ALTER TABLE "computer_use_steps" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "computer_use_steps" ADD CONSTRAINT "computer_use_steps_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- scraper_execution_traces
ALTER TABLE "scraper_execution_traces" DROP CONSTRAINT "scraper_execution_traces_user_id_fkey";
ALTER TABLE "scraper_execution_traces" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "scraper_execution_traces" ADD CONSTRAINT "scraper_execution_traces_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- extracted_items
ALTER TABLE "extracted_items" DROP CONSTRAINT "extracted_items_user_id_fkey";
ALTER TABLE "extracted_items" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "extracted_items" ADD CONSTRAINT "extracted_items_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- plain_scraped_pages
ALTER TABLE "plain_scraped_pages" DROP CONSTRAINT "plain_scraped_pages_user_id_fkey";
ALTER TABLE "plain_scraped_pages" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "plain_scraped_pages" ADD CONSTRAINT "plain_scraped_pages_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- extraction_results
ALTER TABLE "extraction_results" DROP CONSTRAINT "extraction_results_user_id_fkey";
ALTER TABLE "extraction_results" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ai_batch_request_items
ALTER TABLE "ai_batch_request_items" DROP CONSTRAINT "ai_batch_request_items_user_id_fkey";
ALTER TABLE "ai_batch_request_items" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "ai_batch_request_items" ADD CONSTRAINT "ai_batch_request_items_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- block_rules
ALTER TABLE "block_rules" DROP CONSTRAINT "block_rules_user_id_fkey";
ALTER TABLE "block_rules" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "block_rules" ADD CONSTRAINT "block_rules_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
