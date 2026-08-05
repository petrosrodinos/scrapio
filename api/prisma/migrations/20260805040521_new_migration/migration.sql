-- DropIndex
DROP INDEX "source_agencies_base_url_key";

-- AlterTable
ALTER TABLE "website_targets" RENAME CONSTRAINT "source_agencies_pkey" TO "website_targets_pkey";

-- RenameForeignKey
ALTER TABLE "block_rules" RENAME CONSTRAINT "block_rules_source_agency_id_fkey" TO "block_rules_website_target_id_fkey";

-- RenameForeignKey
ALTER TABLE "crawl_runs" RENAME CONSTRAINT "crawl_runs_source_agency_id_fkey" TO "crawl_runs_website_target_id_fkey";

-- RenameForeignKey
ALTER TABLE "extracted_items" RENAME CONSTRAINT "extracted_items_source_agency_id_fkey" TO "extracted_items_website_target_id_fkey";

-- RenameForeignKey
ALTER TABLE "notifications" RENAME CONSTRAINT "notifications_source_agency_id_fkey" TO "notifications_website_target_id_fkey";

-- RenameForeignKey
ALTER TABLE "scraper_generation_runs" RENAME CONSTRAINT "scraper_generation_runs_source_agency_id_fkey" TO "scraper_generation_runs_website_target_id_fkey";

-- RenameForeignKey
ALTER TABLE "scrapers" RENAME CONSTRAINT "scrapers_source_agency_id_fkey" TO "scrapers_website_target_id_fkey";
