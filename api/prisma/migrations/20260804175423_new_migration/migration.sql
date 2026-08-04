-- CreateEnum
CREATE TYPE "ScraperStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPRECATED', 'TESTING', 'BROKEN');

-- CreateEnum
CREATE TYPE "ScraperHealth" AS ENUM ('EXCELLENT', 'GOOD', 'WARNING', 'CRITICAL', 'BROKEN');

-- CreateEnum
CREATE TYPE "CrawlRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiagnosticsMode" AS ENUM ('PRODUCTION', 'TRACE', 'FULL_DEBUG');

-- CreateEnum
CREATE TYPE "DiagnosticsArtifactKind" AS ENUM ('TRACE', 'SCREENSHOT', 'HTML_SNAPSHOT', 'CONSOLE_LOG', 'NETWORK_HAR', 'VIDEO');

-- CreateEnum
CREATE TYPE "GenerationRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'AWAITING_REVIEW', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GenerationTrigger" AS ENUM ('MANUAL', 'SELF_HEAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ComputerActionType" AS ENUM ('CLICK', 'DOUBLE_CLICK', 'TYPE', 'SCROLL', 'SCROLL_UP', 'SCROLL_DOWN', 'NAVIGATE', 'GO_BACK', 'CLOSE_TAB', 'WAIT', 'KEYPRESS', 'SCREENSHOT', 'DRAG', 'DONE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED', 'FAILED', 'DELAYED', 'PAUSED', 'STALLED');

-- CreateEnum
CREATE TYPE "ScraperVersionCreatedBy" AS ENUM ('AI', 'USER');

-- CreateEnum
CREATE TYPE "BlockSignal" AS ENUM ('BLOCKED', 'CHALLENGE');

-- CreateEnum
CREATE TYPE "BlockRuleSource" AS ENUM ('TITLE', 'TEXT', 'HTML', 'PATH', 'SCRIPT_CONTENT', 'SELECTOR');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('QUEUE_FAILURE', 'BROKEN_SCRAPER', 'WEBSITE_UNAVAILABLE', 'LARGE_CRAWL_FAILURE');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "source_agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "crawl_interval" TEXT NOT NULL DEFAULT '0 */6 * * *',
    "notes" TEXT,
    "last_success_at" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "last_error_message" TEXT,
    "metadata" JSONB,
    "block_handling_wait_timeout_ms" INTEGER,
    "block_handling_min_ready_body_length" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_rules" (
    "id" TEXT NOT NULL,
    "source_agency_id" TEXT NOT NULL,
    "label" TEXT,
    "signal" "BlockSignal" NOT NULL,
    "source" "BlockRuleSource" NOT NULL,
    "pattern" TEXT NOT NULL,
    "is_regex" BOOLEAN NOT NULL DEFAULT false,
    "regex_flags" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrapers" (
    "id" TEXT NOT NULL,
    "source_agency_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active_version_id" TEXT,
    "version_count" INTEGER NOT NULL DEFAULT 0,
    "status" "ScraperStatus" NOT NULL DEFAULT 'TESTING',
    "self_healing_enabled" BOOLEAN NOT NULL DEFAULT true,
    "diagnostics_mode" "DiagnosticsMode" NOT NULL DEFAULT 'PRODUCTION',
    "health" "ScraperHealth" NOT NULL DEFAULT 'GOOD',
    "success_rate" DECIMAL(5,2),
    "avg_runtime_ms" INTEGER,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "last_success_at" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scrapers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper_generation_runs" (
    "id" TEXT NOT NULL,
    "source_agency_id" TEXT NOT NULL,
    "scraper_id" TEXT,
    "trigger" "GenerationTrigger" NOT NULL DEFAULT 'MANUAL',
    "status" "GenerationRunStatus" NOT NULL DEFAULT 'QUEUED',
    "prompt" TEXT,
    "max_steps" INTEGER,
    "staged_config" JSONB,
    "produced_version_id" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scraper_generation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "computer_use_steps" (
    "id" TEXT NOT NULL,
    "scraper_generation_run_id" TEXT NOT NULL,
    "step_index" INTEGER NOT NULL,
    "action_type" "ComputerActionType" NOT NULL,
    "action_payload" JSONB NOT NULL,
    "screenshot_before_id" TEXT,
    "screenshot_after_id" TEXT,
    "model_reasoning" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "computer_use_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper_versions" (
    "id" TEXT NOT NULL,
    "scraper_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "created_by" "ScraperVersionCreatedBy" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scraper_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper_execution_traces" (
    "id" TEXT NOT NULL,
    "scraper_id" TEXT NOT NULL,
    "crawl_run_id" TEXT,
    "steps" JSONB NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scraper_execution_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_runs" (
    "id" TEXT NOT NULL,
    "source_agency_id" TEXT NOT NULL,
    "scraper_id" TEXT,
    "status" "CrawlRunStatus" NOT NULL DEFAULT 'QUEUED',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "total_found" INTEGER NOT NULL DEFAULT 0,
    "total_new_listings" INTEGER NOT NULL DEFAULT 0,
    "total_refreshed_listings" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crawl_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_items" (
    "id" TEXT NOT NULL,
    "source_agency_id" TEXT NOT NULL,
    "crawl_run_id" TEXT,
    "source_url" TEXT NOT NULL,
    "external_id" TEXT,
    "raw_data" JSONB NOT NULL,
    "content_hash" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extracted_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostics_packages" (
    "id" TEXT NOT NULL,
    "crawl_run_id" TEXT NOT NULL,
    "scraper_id" TEXT NOT NULL,
    "mode" "DiagnosticsMode" NOT NULL,
    "url" TEXT NOT NULL,
    "worker_id" TEXT,
    "browser_version" TEXT,
    "playwright_version" TEXT,
    "scraper_version" INTEGER,
    "retry_number" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3) NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "failure_reason" TEXT,
    "exception" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostics_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostics_artifacts" (
    "id" TEXT NOT NULL,
    "diagnostics_package_id" TEXT NOT NULL,
    "kind" "DiagnosticsArtifactKind" NOT NULL,
    "path" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostics_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_logs" (
    "id" TEXT NOT NULL,
    "queue_name" TEXT NOT NULL,
    "job_id" TEXT,
    "job_name" TEXT,
    "status" "JobStatus" NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER,
    "crawl_run_id" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "error_message" TEXT,
    "stack_trace" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source_agency_id" TEXT,
    "scraper_id" TEXT,
    "crawl_run_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "crawler_max_pages" INTEGER,
    "crawler_page_timeout_ms" INTEGER,
    "crawler_selector_timeout_ms" INTEGER,
    "crawler_scroll_pause_ms" INTEGER,
    "crawler_detail_concurrency" INTEGER,
    "crawler_detail_delay_ms" INTEGER,
    "crawler_worker_concurrency" INTEGER,
    "crawler_job_timeout_ms" INTEGER,
    "crawler_chromium_max_contexts_before_restart" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_agencies_base_url_key" ON "source_agencies"("base_url");

-- CreateIndex
CREATE INDEX "block_rules_source_agency_id_idx" ON "block_rules"("source_agency_id");

-- CreateIndex
CREATE UNIQUE INDEX "scrapers_active_version_id_key" ON "scrapers"("active_version_id");

-- CreateIndex
CREATE INDEX "scrapers_source_agency_id_idx" ON "scrapers"("source_agency_id");

-- CreateIndex
CREATE INDEX "scrapers_status_idx" ON "scrapers"("status");

-- CreateIndex
CREATE INDEX "scrapers_health_idx" ON "scrapers"("health");

-- CreateIndex
CREATE UNIQUE INDEX "scraper_generation_runs_produced_version_id_key" ON "scraper_generation_runs"("produced_version_id");

-- CreateIndex
CREATE INDEX "scraper_generation_runs_source_agency_id_idx" ON "scraper_generation_runs"("source_agency_id");

-- CreateIndex
CREATE INDEX "scraper_generation_runs_scraper_id_idx" ON "scraper_generation_runs"("scraper_id");

-- CreateIndex
CREATE INDEX "scraper_generation_runs_status_idx" ON "scraper_generation_runs"("status");

-- CreateIndex
CREATE INDEX "computer_use_steps_scraper_generation_run_id_idx" ON "computer_use_steps"("scraper_generation_run_id");

-- CreateIndex
CREATE INDEX "computer_use_steps_scraper_generation_run_id_step_index_idx" ON "computer_use_steps"("scraper_generation_run_id", "step_index");

-- CreateIndex
CREATE UNIQUE INDEX "scraper_versions_scraper_id_version_key" ON "scraper_versions"("scraper_id", "version");

-- CreateIndex
CREATE INDEX "scraper_execution_traces_scraper_id_idx" ON "scraper_execution_traces"("scraper_id");

-- CreateIndex
CREATE INDEX "crawl_runs_source_agency_id_idx" ON "crawl_runs"("source_agency_id");

-- CreateIndex
CREATE INDEX "crawl_runs_scraper_id_idx" ON "crawl_runs"("scraper_id");

-- CreateIndex
CREATE INDEX "crawl_runs_status_idx" ON "crawl_runs"("status");

-- CreateIndex
CREATE INDEX "crawl_runs_created_at_idx" ON "crawl_runs"("created_at");

-- CreateIndex
CREATE INDEX "extracted_items_crawl_run_id_idx" ON "extracted_items"("crawl_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "extracted_items_source_agency_id_source_url_key" ON "extracted_items"("source_agency_id", "source_url");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostics_packages_crawl_run_id_key" ON "diagnostics_packages"("crawl_run_id");

-- CreateIndex
CREATE INDEX "diagnostics_packages_scraper_id_idx" ON "diagnostics_packages"("scraper_id");

-- CreateIndex
CREATE INDEX "diagnostics_artifacts_diagnostics_package_id_idx" ON "diagnostics_artifacts"("diagnostics_package_id");

-- CreateIndex
CREATE INDEX "job_logs_queue_name_idx" ON "job_logs"("queue_name");

-- CreateIndex
CREATE INDEX "job_logs_job_id_idx" ON "job_logs"("job_id");

-- CreateIndex
CREATE INDEX "job_logs_status_idx" ON "job_logs"("status");

-- CreateIndex
CREATE INDEX "job_logs_crawl_run_id_idx" ON "job_logs"("crawl_run_id");

-- CreateIndex
CREATE INDEX "job_logs_created_at_idx" ON "job_logs"("created_at");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_severity_idx" ON "notifications"("severity");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "block_rules" ADD CONSTRAINT "block_rules_source_agency_id_fkey" FOREIGN KEY ("source_agency_id") REFERENCES "source_agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrapers" ADD CONSTRAINT "scrapers_source_agency_id_fkey" FOREIGN KEY ("source_agency_id") REFERENCES "source_agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrapers" ADD CONSTRAINT "scrapers_active_version_id_fkey" FOREIGN KEY ("active_version_id") REFERENCES "scraper_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper_generation_runs" ADD CONSTRAINT "scraper_generation_runs_source_agency_id_fkey" FOREIGN KEY ("source_agency_id") REFERENCES "source_agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper_generation_runs" ADD CONSTRAINT "scraper_generation_runs_scraper_id_fkey" FOREIGN KEY ("scraper_id") REFERENCES "scrapers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper_generation_runs" ADD CONSTRAINT "scraper_generation_runs_produced_version_id_fkey" FOREIGN KEY ("produced_version_id") REFERENCES "scraper_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computer_use_steps" ADD CONSTRAINT "computer_use_steps_scraper_generation_run_id_fkey" FOREIGN KEY ("scraper_generation_run_id") REFERENCES "scraper_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computer_use_steps" ADD CONSTRAINT "computer_use_steps_screenshot_before_id_fkey" FOREIGN KEY ("screenshot_before_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computer_use_steps" ADD CONSTRAINT "computer_use_steps_screenshot_after_id_fkey" FOREIGN KEY ("screenshot_after_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper_versions" ADD CONSTRAINT "scraper_versions_scraper_id_fkey" FOREIGN KEY ("scraper_id") REFERENCES "scrapers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper_execution_traces" ADD CONSTRAINT "scraper_execution_traces_scraper_id_fkey" FOREIGN KEY ("scraper_id") REFERENCES "scrapers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper_execution_traces" ADD CONSTRAINT "scraper_execution_traces_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_source_agency_id_fkey" FOREIGN KEY ("source_agency_id") REFERENCES "source_agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_scraper_id_fkey" FOREIGN KEY ("scraper_id") REFERENCES "scrapers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_items" ADD CONSTRAINT "extracted_items_source_agency_id_fkey" FOREIGN KEY ("source_agency_id") REFERENCES "source_agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_items" ADD CONSTRAINT "extracted_items_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostics_packages" ADD CONSTRAINT "diagnostics_packages_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostics_packages" ADD CONSTRAINT "diagnostics_packages_scraper_id_fkey" FOREIGN KEY ("scraper_id") REFERENCES "scrapers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostics_artifacts" ADD CONSTRAINT "diagnostics_artifacts_diagnostics_package_id_fkey" FOREIGN KEY ("diagnostics_package_id") REFERENCES "diagnostics_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_source_agency_id_fkey" FOREIGN KEY ("source_agency_id") REFERENCES "source_agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_scraper_id_fkey" FOREIGN KEY ("scraper_id") REFERENCES "scrapers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
