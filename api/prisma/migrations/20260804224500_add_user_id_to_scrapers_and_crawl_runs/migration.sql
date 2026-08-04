ALTER TABLE "scrapers" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

UPDATE "scrapers" AS s
SET "user_id" = wt."user_id"
FROM "website_targets" AS wt
WHERE wt."id" = s."website_target_id"
  AND s."user_id" IS NULL;

UPDATE "scrapers" AS s
SET "user_id" = (
  SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1
)
WHERE s."user_id" IS NULL;

ALTER TABLE "scrapers" ALTER COLUMN "user_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "scrapers_user_id_idx" ON "scrapers"("user_id");

ALTER TABLE "scrapers" DROP CONSTRAINT IF EXISTS "scrapers_user_id_fkey";
ALTER TABLE "scrapers"
  ADD CONSTRAINT "scrapers_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crawl_runs" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

UPDATE "crawl_runs" AS cr
SET "user_id" = wt."user_id"
FROM "website_targets" AS wt
WHERE wt."id" = cr."website_target_id"
  AND cr."user_id" IS NULL;

UPDATE "crawl_runs" AS cr
SET "user_id" = (
  SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1
)
WHERE cr."user_id" IS NULL;

ALTER TABLE "crawl_runs" ALTER COLUMN "user_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "crawl_runs_user_id_idx" ON "crawl_runs"("user_id");

ALTER TABLE "crawl_runs" DROP CONSTRAINT IF EXISTS "crawl_runs_user_id_fkey";
ALTER TABLE "crawl_runs"
  ADD CONSTRAINT "crawl_runs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
