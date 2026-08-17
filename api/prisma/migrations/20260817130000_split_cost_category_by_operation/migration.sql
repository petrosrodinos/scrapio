-- Replace the generic AI / COMPUTER_USE categories with per-operation ones, so cost entries can
-- be broken down by what actually incurred the cost (structured extraction, markdown generation,
-- embeddings, browser-agent runs, scraper generation) instead of a single "AI" bucket.

-- CreateEnum
CREATE TYPE "CostCategory_new" AS ENUM (
  'STRUCTURED_EXTRACTION',
  'MARKDOWN_GENERATION',
  'EMBEDDING',
  'BROWSER_AGENT_RUN',
  'SCRAPER_GENERATION'
);

-- Migrate existing rows using metadata recorded alongside them to pick the right operation.
ALTER TABLE "cost_entries" ADD COLUMN "category_new" "CostCategory_new";

UPDATE "cost_entries" SET "category_new" =
  CASE
    WHEN "category"::text = 'AI' AND "metadata" ->> 'stage' = 'markdown'
      THEN 'MARKDOWN_GENERATION'::"CostCategory_new"
    WHEN "category"::text = 'AI'
      THEN 'STRUCTURED_EXTRACTION'::"CostCategory_new"
    WHEN "category"::text = 'COMPUTER_USE' AND "metadata" ->> 'source' = 'scraper_generation'
      THEN 'SCRAPER_GENERATION'::"CostCategory_new"
    WHEN "category"::text = 'COMPUTER_USE'
      THEN 'BROWSER_AGENT_RUN'::"CostCategory_new"
  END;

ALTER TABLE "cost_entries" DROP COLUMN "category";
ALTER TABLE "cost_entries" RENAME COLUMN "category_new" TO "category";
ALTER TABLE "cost_entries" ALTER COLUMN "category" SET NOT NULL;

DROP TYPE "CostCategory";
ALTER TYPE "CostCategory_new" RENAME TO "CostCategory";

-- Recreate the indexes dropped along with the old "category" column.
CREATE INDEX "cost_entries_category_idx" ON "cost_entries"("category");
CREATE INDEX "cost_entries_user_id_category_idx" ON "cost_entries"("user_id", "category");
