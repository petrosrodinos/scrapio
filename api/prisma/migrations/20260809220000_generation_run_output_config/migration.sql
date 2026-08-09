ALTER TABLE "scraper_generation_runs" ADD COLUMN "output_formats" "OutputFormat"[];
ALTER TABLE "scraper_generation_runs" ADD COLUMN "output_schema" JSONB;
