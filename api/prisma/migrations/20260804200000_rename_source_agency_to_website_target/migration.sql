-- Rename SourceAgency to WebsiteTarget

ALTER TABLE "source_agencies" RENAME TO "website_targets";

ALTER TABLE "block_rules" RENAME COLUMN "source_agency_id" TO "website_target_id";
ALTER INDEX "block_rules_source_agency_id_idx" RENAME TO "block_rules_website_target_id_idx";

ALTER TABLE "scrapers" RENAME COLUMN "source_agency_id" TO "website_target_id";
ALTER INDEX "scrapers_source_agency_id_idx" RENAME TO "scrapers_website_target_id_idx";

ALTER TABLE "scraper_generation_runs" RENAME COLUMN "source_agency_id" TO "website_target_id";
ALTER INDEX "scraper_generation_runs_source_agency_id_idx" RENAME TO "scraper_generation_runs_website_target_id_idx";

ALTER TABLE "crawl_runs" RENAME COLUMN "source_agency_id" TO "website_target_id";
ALTER INDEX "crawl_runs_source_agency_id_idx" RENAME TO "crawl_runs_website_target_id_idx";

ALTER TABLE "extracted_items" RENAME COLUMN "source_agency_id" TO "website_target_id";
ALTER INDEX "extracted_items_source_agency_id_idx" RENAME TO "extracted_items_website_target_id_idx";
ALTER INDEX "extracted_items_source_agency_id_source_url_key" RENAME TO "extracted_items_website_target_id_source_url_key";

ALTER TABLE "notifications" RENAME COLUMN "source_agency_id" TO "website_target_id";
