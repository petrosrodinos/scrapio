-- Drop Prisma-generated array defaults that aren't in the schema,
-- and remove website_targets.crawl_interval (schedules live on workflow_configs now).

ALTER TABLE "scraper_versions" ALTER COLUMN "output_formats" DROP DEFAULT;

ALTER TABLE "website_targets" DROP COLUMN IF EXISTS "crawl_interval";

ALTER TABLE "workflow_configs" ALTER COLUMN "urls" DROP DEFAULT,
ALTER COLUMN "output_formats" DROP DEFAULT;

ALTER TABLE "workflow_runs" ALTER COLUMN "urls" DROP DEFAULT,
ALTER COLUMN "output_formats" DROP DEFAULT;
