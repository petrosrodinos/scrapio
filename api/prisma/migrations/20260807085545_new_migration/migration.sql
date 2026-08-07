/*
  Warnings:

  - The `status` column on the `crawl_runs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `crawl_interval` on the `website_targets` table. All the data in the column will be lost.
  - Added the required column `scraper_version_id` to the `crawl_runs` table without a default value. This is not possible if the table is not empty.
  - Made the column `scraper_id` on table `crawl_runs` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "OutputFormat" AS ENUM ('STRUCTURED_JSON', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "ExtractionScope" AS ENUM ('COMBINED', 'PER_URL');

-- CreateEnum
CREATE TYPE "ExtractionFormatStatus" AS ENUM ('VALID', 'INVALID', 'FAILED');

-- CreateEnum
CREATE TYPE "RunTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "crawl_runs" DROP CONSTRAINT "crawl_runs_scraper_id_fkey";

-- AlterTable
ALTER TABLE "computer_use_steps" ADD COLUMN     "browser_agent_run_id" TEXT,
ALTER COLUMN "scraper_generation_run_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "crawl_runs" ADD COLUMN     "scraper_version_id" TEXT NOT NULL,
ADD COLUMN     "trigger" "RunTrigger" NOT NULL DEFAULT 'MANUAL',
ALTER COLUMN "scraper_id" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "RunStatus" NOT NULL DEFAULT 'QUEUED';

-- AlterTable
ALTER TABLE "scraper_versions" ADD COLUMN     "extraction_schema_version_id" TEXT,
ADD COLUMN     "generation_prompt" TEXT,
ADD COLUMN     "output_formats" "OutputFormat"[];

-- AlterTable
ALTER TABLE "scrapers" ADD COLUMN     "schedule_cron" TEXT,
ADD COLUMN     "schedule_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "schedule_timezone" TEXT;

-- AlterTable
ALTER TABLE "website_targets" DROP COLUMN "crawl_interval";

-- DropEnum
DROP TYPE "CrawlRunStatus";

-- CreateTable
CREATE TABLE "extraction_schemas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active_version_id" TEXT,
    "version_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extraction_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_schema_versions" (
    "id" TEXT NOT NULL,
    "extraction_schema_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extraction_schema_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_agent_configs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "output_formats" "OutputFormat"[],
    "extraction_schema_version_id" TEXT,
    "schedule_cron" TEXT,
    "schedule_timezone" TEXT,
    "schedule_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browser_agent_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "browser_agent_runs" (
    "id" TEXT NOT NULL,
    "browser_agent_config_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trigger" "RunTrigger" NOT NULL DEFAULT 'MANUAL',
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "url" TEXT NOT NULL,
    "output_formats" "OutputFormat"[],
    "extraction_schema_version_id" TEXT,
    "visited_urls" JSONB,
    "browser_actions" JSONB,
    "collected_data" JSONB,
    "ai_usage" JSONB,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "browser_agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plain_scrape_configs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "urls" TEXT[],
    "output_formats" "OutputFormat"[],
    "extraction_schema_version_id" TEXT,
    "extraction_scope" "ExtractionScope" NOT NULL DEFAULT 'COMBINED',
    "schedule_cron" TEXT,
    "schedule_timezone" TEXT,
    "schedule_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plain_scrape_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plain_scrape_runs" (
    "id" TEXT NOT NULL,
    "plain_scrape_config_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trigger" "RunTrigger" NOT NULL DEFAULT 'MANUAL',
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "urls" TEXT[],
    "output_formats" "OutputFormat"[],
    "extraction_schema_version_id" TEXT,
    "extraction_scope" "ExtractionScope" NOT NULL DEFAULT 'COMBINED',
    "error_message" TEXT,
    "ai_usage" JSONB,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plain_scrape_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plain_scraped_pages" (
    "id" TEXT NOT NULL,
    "plain_scrape_run_id" TEXT NOT NULL,
    "requested_url" TEXT NOT NULL,
    "final_url" TEXT,
    "http_status" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "raw_html" TEXT,
    "cleaned_content" TEXT,
    "title" TEXT,
    "metadata" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plain_scraped_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_results" (
    "id" TEXT NOT NULL,
    "crawl_run_id" TEXT,
    "browser_agent_run_id" TEXT,
    "plain_scrape_run_id" TEXT,
    "plain_scraped_page_id" TEXT,
    "extraction_schema_version_id" TEXT,
    "structured_status" "ExtractionFormatStatus",
    "structured_data" JSONB,
    "structured_raw_ai_output" JSONB,
    "structured_validation_errors" JSONB,
    "structured_attempts" INTEGER NOT NULL DEFAULT 0,
    "markdown_status" "ExtractionFormatStatus",
    "markdown" TEXT,
    "markdown_validation_errors" JSONB,
    "ai_usage" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extraction_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "extraction_schemas_active_version_id_key" ON "extraction_schemas"("active_version_id");

-- CreateIndex
CREATE INDEX "extraction_schemas_user_id_idx" ON "extraction_schemas"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "extraction_schema_versions_extraction_schema_id_version_key" ON "extraction_schema_versions"("extraction_schema_id", "version");

-- CreateIndex
CREATE INDEX "browser_agent_configs_user_id_idx" ON "browser_agent_configs"("user_id");

-- CreateIndex
CREATE INDEX "browser_agent_configs_extraction_schema_version_id_idx" ON "browser_agent_configs"("extraction_schema_version_id");

-- CreateIndex
CREATE INDEX "browser_agent_runs_browser_agent_config_id_idx" ON "browser_agent_runs"("browser_agent_config_id");

-- CreateIndex
CREATE INDEX "browser_agent_runs_user_id_idx" ON "browser_agent_runs"("user_id");

-- CreateIndex
CREATE INDEX "browser_agent_runs_status_idx" ON "browser_agent_runs"("status");

-- CreateIndex
CREATE INDEX "browser_agent_runs_extraction_schema_version_id_idx" ON "browser_agent_runs"("extraction_schema_version_id");

-- CreateIndex
CREATE INDEX "plain_scrape_configs_user_id_idx" ON "plain_scrape_configs"("user_id");

-- CreateIndex
CREATE INDEX "plain_scrape_configs_extraction_schema_version_id_idx" ON "plain_scrape_configs"("extraction_schema_version_id");

-- CreateIndex
CREATE INDEX "plain_scrape_runs_plain_scrape_config_id_idx" ON "plain_scrape_runs"("plain_scrape_config_id");

-- CreateIndex
CREATE INDEX "plain_scrape_runs_user_id_idx" ON "plain_scrape_runs"("user_id");

-- CreateIndex
CREATE INDEX "plain_scrape_runs_status_idx" ON "plain_scrape_runs"("status");

-- CreateIndex
CREATE INDEX "plain_scrape_runs_extraction_schema_version_id_idx" ON "plain_scrape_runs"("extraction_schema_version_id");

-- CreateIndex
CREATE INDEX "plain_scraped_pages_plain_scrape_run_id_idx" ON "plain_scraped_pages"("plain_scrape_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "extraction_results_crawl_run_id_key" ON "extraction_results"("crawl_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "extraction_results_browser_agent_run_id_key" ON "extraction_results"("browser_agent_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "extraction_results_plain_scrape_run_id_key" ON "extraction_results"("plain_scrape_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "extraction_results_plain_scraped_page_id_key" ON "extraction_results"("plain_scraped_page_id");

-- CreateIndex
CREATE INDEX "extraction_results_extraction_schema_version_id_idx" ON "extraction_results"("extraction_schema_version_id");

-- CreateIndex
CREATE INDEX "computer_use_steps_browser_agent_run_id_idx" ON "computer_use_steps"("browser_agent_run_id");

-- CreateIndex
CREATE INDEX "computer_use_steps_browser_agent_run_id_step_index_idx" ON "computer_use_steps"("browser_agent_run_id", "step_index");

-- CreateIndex
CREATE INDEX "crawl_runs_scraper_version_id_idx" ON "crawl_runs"("scraper_version_id");

-- CreateIndex
CREATE INDEX "crawl_runs_status_idx" ON "crawl_runs"("status");

-- CreateIndex
CREATE INDEX "scraper_versions_extraction_schema_version_id_idx" ON "scraper_versions"("extraction_schema_version_id");

-- AddForeignKey
ALTER TABLE "computer_use_steps" ADD CONSTRAINT "computer_use_steps_browser_agent_run_id_fkey" FOREIGN KEY ("browser_agent_run_id") REFERENCES "browser_agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper_versions" ADD CONSTRAINT "scraper_versions_extraction_schema_version_id_fkey" FOREIGN KEY ("extraction_schema_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_scraper_id_fkey" FOREIGN KEY ("scraper_id") REFERENCES "scrapers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_scraper_version_id_fkey" FOREIGN KEY ("scraper_version_id") REFERENCES "scraper_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_schemas" ADD CONSTRAINT "extraction_schemas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_schemas" ADD CONSTRAINT "extraction_schemas_active_version_id_fkey" FOREIGN KEY ("active_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_schema_versions" ADD CONSTRAINT "extraction_schema_versions_extraction_schema_id_fkey" FOREIGN KEY ("extraction_schema_id") REFERENCES "extraction_schemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_agent_configs" ADD CONSTRAINT "browser_agent_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_agent_configs" ADD CONSTRAINT "browser_agent_configs_extraction_schema_version_id_fkey" FOREIGN KEY ("extraction_schema_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_agent_runs" ADD CONSTRAINT "browser_agent_runs_browser_agent_config_id_fkey" FOREIGN KEY ("browser_agent_config_id") REFERENCES "browser_agent_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_agent_runs" ADD CONSTRAINT "browser_agent_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "browser_agent_runs" ADD CONSTRAINT "browser_agent_runs_extraction_schema_version_id_fkey" FOREIGN KEY ("extraction_schema_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plain_scrape_configs" ADD CONSTRAINT "plain_scrape_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plain_scrape_configs" ADD CONSTRAINT "plain_scrape_configs_extraction_schema_version_id_fkey" FOREIGN KEY ("extraction_schema_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plain_scrape_runs" ADD CONSTRAINT "plain_scrape_runs_plain_scrape_config_id_fkey" FOREIGN KEY ("plain_scrape_config_id") REFERENCES "plain_scrape_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plain_scrape_runs" ADD CONSTRAINT "plain_scrape_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plain_scrape_runs" ADD CONSTRAINT "plain_scrape_runs_extraction_schema_version_id_fkey" FOREIGN KEY ("extraction_schema_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plain_scraped_pages" ADD CONSTRAINT "plain_scraped_pages_plain_scrape_run_id_fkey" FOREIGN KEY ("plain_scrape_run_id") REFERENCES "plain_scrape_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_browser_agent_run_id_fkey" FOREIGN KEY ("browser_agent_run_id") REFERENCES "browser_agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_plain_scrape_run_id_fkey" FOREIGN KEY ("plain_scrape_run_id") REFERENCES "plain_scrape_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_plain_scraped_page_id_fkey" FOREIGN KEY ("plain_scraped_page_id") REFERENCES "plain_scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_extraction_schema_version_id_fkey" FOREIGN KEY ("extraction_schema_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
