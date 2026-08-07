-- Migration: unify_workflow_models
-- Replaces Scraper/BrowserAgentConfig/PlainScrapeConfig with WorkflowConfig
-- Replaces CrawlRun/BrowserAgentRun/PlainScrapeRun with WorkflowRun

-- Rename crawl_schedule_tz → default_schedule_tz (idempotent)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'crawl_schedule_tz'
  ) THEN
    ALTER TABLE "users" RENAME COLUMN "crawl_schedule_tz" TO "default_schedule_tz";
  END IF;
END $$;

-- Enums introduced by the unified schema (not present in earlier migrations)
CREATE TYPE "WorkflowType" AS ENUM ('SCRAPER', 'BROWSER_AGENT', 'PLAIN_SCRAPE');
CREATE TYPE "OutputFormat" AS ENUM ('STRUCTURED_JSON', 'MARKDOWN');
CREATE TYPE "ExtractionScope" AS ENUM ('COMBINED', 'PER_URL');
CREATE TYPE "ExtractionFormatStatus" AS ENUM ('VALID', 'INVALID', 'FAILED');
CREATE TYPE "RunTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

ALTER TYPE "CrawlRunStatus" RENAME TO "RunStatus";

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BROWSER_AGENT_FAILURE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PLAIN_SCRAPE_FAILURE';

-- Extraction schemas (referenced by workflow configs/runs; not in earlier migrations)
CREATE TABLE "extraction_schemas" (
  "id"                TEXT         NOT NULL,
  "user_id"           TEXT         NOT NULL,
  "name"              TEXT         NOT NULL,
  "description"       TEXT,
  "active_version_id" TEXT,
  "version_count"     INTEGER      NOT NULL DEFAULT 0,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "extraction_schemas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "extraction_schema_versions" (
  "id"                   TEXT         NOT NULL,
  "extraction_schema_id" TEXT         NOT NULL,
  "version"              INTEGER      NOT NULL,
  "definition"           JSONB        NOT NULL,
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "extraction_schema_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "extraction_schemas_active_version_id_key" ON "extraction_schemas"("active_version_id");
CREATE UNIQUE INDEX "extraction_schema_versions_extraction_schema_id_version_key" ON "extraction_schema_versions"("extraction_schema_id", "version");
CREATE INDEX "extraction_schemas_user_id_idx" ON "extraction_schemas"("user_id");

ALTER TABLE "extraction_schemas" ADD CONSTRAINT "extraction_schemas_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extraction_schema_versions" ADD CONSTRAINT "extraction_schema_versions_extraction_schema_id_fkey"
  FOREIGN KEY ("extraction_schema_id") REFERENCES "extraction_schemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extraction_schemas" ADD CONSTRAINT "extraction_schemas_active_version_id_fkey"
  FOREIGN KEY ("active_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop dependent tables first (CASCADE handles child FK rows)
DROP TABLE IF EXISTS "diagnostics_artifacts" CASCADE;
DROP TABLE IF EXISTS "diagnostics_packages" CASCADE;
DROP TABLE IF EXISTS "extraction_results" CASCADE;
DROP TABLE IF EXISTS "plain_scraped_pages" CASCADE;
DROP TABLE IF EXISTS "extracted_items" CASCADE;
DROP TABLE IF EXISTS "scraper_execution_traces" CASCADE;
DROP TABLE IF EXISTS "computer_use_steps" CASCADE;
DROP TABLE IF EXISTS "job_logs" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;

-- Drop old run tables
DROP TABLE IF EXISTS "crawl_runs" CASCADE;
DROP TABLE IF EXISTS "browser_agent_runs" CASCADE;
DROP TABLE IF EXISTS "plain_scrape_runs" CASCADE;

-- Drop old scraper-specific tables
DROP TABLE IF EXISTS "scraper_versions" CASCADE;
DROP TABLE IF EXISTS "scraper_generation_runs" CASCADE;

-- Drop old config tables
DROP TABLE IF EXISTS "browser_agent_configs" CASCADE;
DROP TABLE IF EXISTS "plain_scrape_configs" CASCADE;
DROP TABLE IF EXISTS "scrapers" CASCADE;

-- ── workflow_configs ──────────────────────────────────────────────────────────
CREATE TABLE "workflow_configs" (
  "id"                           TEXT                NOT NULL,
  "user_id"                      TEXT                NOT NULL,
  "type"                         "WorkflowType"      NOT NULL,
  "name"                         TEXT                NOT NULL,
  "description"                  TEXT,
  -- SCRAPER only
  "website_target_id"            TEXT,
  "active_version_id"            TEXT,
  "version_count"                INTEGER             NOT NULL DEFAULT 0,
  "status"                       "ScraperStatus",
  "self_healing_enabled"         BOOLEAN             NOT NULL DEFAULT true,
  "diagnostics_mode"             "DiagnosticsMode"   NOT NULL DEFAULT 'PRODUCTION',
  "health"                       "ScraperHealth",
  "success_rate"                 DECIMAL(5,2),
  "avg_runtime_ms"               INTEGER,
  "consecutive_failures"         INTEGER             NOT NULL DEFAULT 0,
  "last_success_at"              TIMESTAMP(3),
  "last_failure_at"              TIMESTAMP(3),
  -- BROWSER_AGENT only
  "url"                          TEXT,
  -- PLAIN_SCRAPE only
  "urls"                         TEXT[]              NOT NULL DEFAULT '{}',
  "extraction_scope"             "ExtractionScope"   NOT NULL DEFAULT 'COMBINED',
  -- BROWSER_AGENT + PLAIN_SCRAPE
  "output_formats"               "OutputFormat"[]    NOT NULL DEFAULT '{}',
  "extraction_schema_version_id" TEXT,
  -- Scheduling (all types)
  "schedule_cron"                TEXT,
  "schedule_timezone"            TEXT,
  "schedule_enabled"             BOOLEAN             NOT NULL DEFAULT false,
  "created_at"                   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                   TIMESTAMP(3)        NOT NULL,
  CONSTRAINT "workflow_configs_pkey" PRIMARY KEY ("id")
);

-- ── scraper_versions ──────────────────────────────────────────────────────────
CREATE TABLE "scraper_versions" (
  "id"                           TEXT                        NOT NULL,
  "workflow_config_id"           TEXT                        NOT NULL,
  "version"                      INTEGER                     NOT NULL,
  "config"                       JSONB                       NOT NULL,
  "created_by"                   "ScraperVersionCreatedBy"   NOT NULL,
  "notes"                        TEXT,
  "generation_prompt"            TEXT,
  "output_formats"               "OutputFormat"[]            NOT NULL DEFAULT '{}',
  "extraction_schema_version_id" TEXT,
  "created_at"                   TIMESTAMP(3)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                   TIMESTAMP(3)                NOT NULL,
  CONSTRAINT "scraper_versions_pkey" PRIMARY KEY ("id")
);

-- ── scraper_generation_runs ───────────────────────────────────────────────────
CREATE TABLE "scraper_generation_runs" (
  "id"                  TEXT                  NOT NULL,
  "website_target_id"   TEXT                  NOT NULL,
  "workflow_config_id"  TEXT,
  "trigger"             "GenerationTrigger"   NOT NULL DEFAULT 'MANUAL',
  "status"              "GenerationRunStatus" NOT NULL DEFAULT 'QUEUED',
  "prompt"              TEXT,
  "max_steps"           INTEGER,
  "staged_config"       JSONB,
  "produced_version_id" TEXT,
  "error_message"       TEXT,
  "started_at"          TIMESTAMP(3),
  "finished_at"         TIMESTAMP(3),
  "duration_ms"         INTEGER,
  "created_at"          TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)          NOT NULL,
  CONSTRAINT "scraper_generation_runs_pkey" PRIMARY KEY ("id")
);

-- ── workflow_runs ─────────────────────────────────────────────────────────────
CREATE TABLE "workflow_runs" (
  "id"                           TEXT                NOT NULL,
  "workflow_config_id"           TEXT                NOT NULL,
  "user_id"                      TEXT                NOT NULL,
  "type"                         "WorkflowType"      NOT NULL,
  "trigger"                      "RunTrigger"        NOT NULL DEFAULT 'MANUAL',
  "status"                       "RunStatus"         NOT NULL DEFAULT 'QUEUED',
  -- SCRAPER run
  "website_target_id"            TEXT,
  "scraper_version_id"           TEXT,
  -- BROWSER_AGENT run
  "url"                          TEXT,
  "visited_urls"                 JSONB,
  "browser_actions"              JSONB,
  "collected_data"               JSONB,
  -- PLAIN_SCRAPE run
  "urls"                         TEXT[]              NOT NULL DEFAULT '{}',
  "extraction_scope"             "ExtractionScope",
  -- BROWSER_AGENT + PLAIN_SCRAPE
  "output_formats"               "OutputFormat"[]    NOT NULL DEFAULT '{}',
  "extraction_schema_version_id" TEXT,
  -- Common
  "ai_usage"                     JSONB,
  "error_message"                TEXT,
  "metadata"                     JSONB,
  "started_at"                   TIMESTAMP(3),
  "finished_at"                  TIMESTAMP(3),
  "duration_ms"                  INTEGER,
  "created_at"                   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                   TIMESTAMP(3)        NOT NULL,
  CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- ── computer_use_steps ────────────────────────────────────────────────────────
CREATE TABLE "computer_use_steps" (
  "id"                        TEXT                 NOT NULL,
  "scraper_generation_run_id" TEXT,
  "workflow_run_id"           TEXT,
  "step_index"                INTEGER              NOT NULL,
  "action_type"               "ComputerActionType" NOT NULL,
  "action_payload"            JSONB                NOT NULL,
  "screenshot_before_id"      TEXT,
  "screenshot_after_id"       TEXT,
  "model_reasoning"           TEXT,
  "created_at"                TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "computer_use_steps_pkey" PRIMARY KEY ("id")
);

-- ── scraper_execution_traces ──────────────────────────────────────────────────
CREATE TABLE "scraper_execution_traces" (
  "id"                 TEXT         NOT NULL,
  "workflow_config_id" TEXT         NOT NULL,
  "workflow_run_id"    TEXT,
  "steps"              JSONB        NOT NULL,
  "success"            BOOLEAN      NOT NULL,
  "error_summary"      TEXT,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scraper_execution_traces_pkey" PRIMARY KEY ("id")
);

-- ── extracted_items ───────────────────────────────────────────────────────────
CREATE TABLE "extracted_items" (
  "id"                TEXT         NOT NULL,
  "website_target_id" TEXT         NOT NULL,
  "workflow_run_id"   TEXT,
  "source_url"        TEXT         NOT NULL,
  "external_id"       TEXT,
  "raw_data"          JSONB        NOT NULL,
  "content_hash"      TEXT,
  "first_seen_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "extracted_items_pkey" PRIMARY KEY ("id")
);

-- ── plain_scraped_pages ───────────────────────────────────────────────────────
CREATE TABLE "plain_scraped_pages" (
  "id"              TEXT         NOT NULL,
  "workflow_run_id" TEXT         NOT NULL,
  "requested_url"   TEXT         NOT NULL,
  "final_url"       TEXT,
  "http_status"     INTEGER,
  "success"         BOOLEAN      NOT NULL DEFAULT false,
  "raw_html"        TEXT,
  "cleaned_content" TEXT,
  "title"           TEXT,
  "metadata"        JSONB,
  "error_message"   TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plain_scraped_pages_pkey" PRIMARY KEY ("id")
);

-- ── extraction_results ────────────────────────────────────────────────────────
CREATE TABLE "extraction_results" (
  "id"                           TEXT                      NOT NULL,
  "workflow_run_id"              TEXT,
  "plain_scraped_page_id"        TEXT,
  "extraction_schema_version_id" TEXT,
  "structured_status"            "ExtractionFormatStatus",
  "structured_data"              JSONB,
  "structured_raw_ai_output"     JSONB,
  "structured_validation_errors" JSONB,
  "structured_attempts"          INTEGER                   NOT NULL DEFAULT 0,
  "markdown_status"              "ExtractionFormatStatus",
  "markdown"                     TEXT,
  "markdown_validation_errors"   JSONB,
  "ai_usage"                     JSONB,
  "created_at"                   TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                   TIMESTAMP(3)              NOT NULL,
  CONSTRAINT "extraction_results_pkey" PRIMARY KEY ("id")
);

-- ── diagnostics_packages ──────────────────────────────────────────────────────
CREATE TABLE "diagnostics_packages" (
  "id"                 TEXT              NOT NULL,
  "workflow_run_id"    TEXT              NOT NULL,
  "workflow_config_id" TEXT              NOT NULL,
  "mode"               "DiagnosticsMode" NOT NULL,
  "url"                TEXT              NOT NULL,
  "worker_id"          TEXT,
  "browser_version"    TEXT,
  "playwright_version" TEXT,
  "scraper_version"    INTEGER,
  "retry_number"       INTEGER,
  "started_at"         TIMESTAMP(3)      NOT NULL,
  "finished_at"        TIMESTAMP(3)      NOT NULL,
  "duration_ms"        INTEGER           NOT NULL,
  "failure_reason"     TEXT,
  "exception"          TEXT,
  "created_at"         TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "diagnostics_packages_pkey" PRIMARY KEY ("id")
);

-- ── job_logs ──────────────────────────────────────────────────────────────────
CREATE TABLE "job_logs" (
  "id"              TEXT         NOT NULL,
  "queue_name"      TEXT         NOT NULL,
  "job_id"          TEXT,
  "job_name"        TEXT,
  "status"          "JobStatus"  NOT NULL,
  "attempt"         INTEGER      NOT NULL DEFAULT 0,
  "max_attempts"    INTEGER,
  "workflow_run_id" TEXT,
  "payload"         JSONB,
  "result"          JSONB,
  "error_message"   TEXT,
  "stack_trace"     TEXT,
  "started_at"      TIMESTAMP(3),
  "finished_at"     TIMESTAMP(3),
  "duration_ms"     INTEGER,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id")
);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE "notifications" (
  "id"                 TEXT                   NOT NULL,
  "type"               "NotificationType"     NOT NULL,
  "severity"           "NotificationSeverity" NOT NULL DEFAULT 'INFO',
  "title"              TEXT                   NOT NULL,
  "message"            TEXT                   NOT NULL,
  "website_target_id"  TEXT,
  "workflow_config_id" TEXT,
  "workflow_run_id"    TEXT,
  "is_read"            BOOLEAN                NOT NULL DEFAULT false,
  "created_at"         TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- ── Unique constraints ────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "workflow_configs_active_version_id_key"         ON "workflow_configs"("active_version_id");
CREATE UNIQUE INDEX "scraper_versions_workflow_config_id_version_key" ON "scraper_versions"("workflow_config_id", "version");
CREATE UNIQUE INDEX "scraper_generation_runs_produced_version_id_key" ON "scraper_generation_runs"("produced_version_id");
CREATE UNIQUE INDEX "extracted_items_website_target_id_source_url_key" ON "extracted_items"("website_target_id", "source_url");
CREATE UNIQUE INDEX "extraction_results_workflow_run_id_key"         ON "extraction_results"("workflow_run_id");
CREATE UNIQUE INDEX "extraction_results_plain_scraped_page_id_key"   ON "extraction_results"("plain_scraped_page_id");
CREATE UNIQUE INDEX "diagnostics_packages_workflow_run_id_key"       ON "diagnostics_packages"("workflow_run_id");

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX "workflow_configs_user_id_idx"              ON "workflow_configs"("user_id");
CREATE INDEX "workflow_configs_type_idx"                 ON "workflow_configs"("type");
CREATE INDEX "workflow_configs_website_target_id_idx"    ON "workflow_configs"("website_target_id");
CREATE INDEX "workflow_configs_status_idx"               ON "workflow_configs"("status");
CREATE INDEX "workflow_configs_health_idx"               ON "workflow_configs"("health");

CREATE INDEX "scraper_versions_extraction_schema_version_id_idx" ON "scraper_versions"("extraction_schema_version_id");

CREATE INDEX "scraper_generation_runs_website_target_id_idx"  ON "scraper_generation_runs"("website_target_id");
CREATE INDEX "scraper_generation_runs_workflow_config_id_idx" ON "scraper_generation_runs"("workflow_config_id");
CREATE INDEX "scraper_generation_runs_status_idx"             ON "scraper_generation_runs"("status");

CREATE INDEX "workflow_runs_workflow_config_id_idx"            ON "workflow_runs"("workflow_config_id");
CREATE INDEX "workflow_runs_user_id_idx"                       ON "workflow_runs"("user_id");
CREATE INDEX "workflow_runs_type_idx"                          ON "workflow_runs"("type");
CREATE INDEX "workflow_runs_website_target_id_idx"             ON "workflow_runs"("website_target_id");
CREATE INDEX "workflow_runs_scraper_version_id_idx"            ON "workflow_runs"("scraper_version_id");
CREATE INDEX "workflow_runs_status_idx"                        ON "workflow_runs"("status");
CREATE INDEX "workflow_runs_created_at_idx"                    ON "workflow_runs"("created_at");
CREATE INDEX "workflow_runs_extraction_schema_version_id_idx"  ON "workflow_runs"("extraction_schema_version_id");

CREATE INDEX "computer_use_steps_scraper_generation_run_id_idx"              ON "computer_use_steps"("scraper_generation_run_id");
CREATE INDEX "computer_use_steps_scraper_generation_run_id_step_index_idx"   ON "computer_use_steps"("scraper_generation_run_id", "step_index");
CREATE INDEX "computer_use_steps_workflow_run_id_idx"                        ON "computer_use_steps"("workflow_run_id");
CREATE INDEX "computer_use_steps_workflow_run_id_step_index_idx"             ON "computer_use_steps"("workflow_run_id", "step_index");

CREATE INDEX "scraper_execution_traces_workflow_config_id_idx" ON "scraper_execution_traces"("workflow_config_id");

CREATE INDEX "extracted_items_workflow_run_id_idx"           ON "extracted_items"("workflow_run_id");
CREATE INDEX "plain_scraped_pages_workflow_run_id_idx"       ON "plain_scraped_pages"("workflow_run_id");
CREATE INDEX "extraction_results_extraction_schema_version_id_idx" ON "extraction_results"("extraction_schema_version_id");
CREATE INDEX "diagnostics_packages_workflow_config_id_idx"   ON "diagnostics_packages"("workflow_config_id");

CREATE INDEX "job_logs_queue_name_idx"    ON "job_logs"("queue_name");
CREATE INDEX "job_logs_job_id_idx"        ON "job_logs"("job_id");
CREATE INDEX "job_logs_status_idx"        ON "job_logs"("status");
CREATE INDEX "job_logs_workflow_run_id_idx" ON "job_logs"("workflow_run_id");
CREATE INDEX "job_logs_created_at_idx"    ON "job_logs"("created_at");

CREATE INDEX "notifications_type_idx"       ON "notifications"("type");
CREATE INDEX "notifications_severity_idx"   ON "notifications"("severity");
CREATE INDEX "notifications_is_read_idx"    ON "notifications"("is_read");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- ── Foreign Keys ──────────────────────────────────────────────────────────────
ALTER TABLE "workflow_configs" ADD CONSTRAINT "workflow_configs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_configs" ADD CONSTRAINT "workflow_configs_website_target_id_fkey"
  FOREIGN KEY ("website_target_id") REFERENCES "website_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_configs" ADD CONSTRAINT "workflow_configs_extraction_schema_version_id_fkey"
  FOREIGN KEY ("extraction_schema_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "scraper_versions" ADD CONSTRAINT "scraper_versions_workflow_config_id_fkey"
  FOREIGN KEY ("workflow_config_id") REFERENCES "workflow_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scraper_versions" ADD CONSTRAINT "scraper_versions_extraction_schema_version_id_fkey"
  FOREIGN KEY ("extraction_schema_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- active_version FK added AFTER scraper_versions exists to avoid circular dependency ordering
ALTER TABLE "workflow_configs" ADD CONSTRAINT "workflow_configs_active_version_id_fkey"
  FOREIGN KEY ("active_version_id") REFERENCES "scraper_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "scraper_generation_runs" ADD CONSTRAINT "scraper_generation_runs_website_target_id_fkey"
  FOREIGN KEY ("website_target_id") REFERENCES "website_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scraper_generation_runs" ADD CONSTRAINT "scraper_generation_runs_workflow_config_id_fkey"
  FOREIGN KEY ("workflow_config_id") REFERENCES "workflow_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "scraper_generation_runs" ADD CONSTRAINT "scraper_generation_runs_produced_version_id_fkey"
  FOREIGN KEY ("produced_version_id") REFERENCES "scraper_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_config_id_fkey"
  FOREIGN KEY ("workflow_config_id") REFERENCES "workflow_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_website_target_id_fkey"
  FOREIGN KEY ("website_target_id") REFERENCES "website_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_scraper_version_id_fkey"
  FOREIGN KEY ("scraper_version_id") REFERENCES "scraper_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_extraction_schema_version_id_fkey"
  FOREIGN KEY ("extraction_schema_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "computer_use_steps" ADD CONSTRAINT "computer_use_steps_scraper_generation_run_id_fkey"
  FOREIGN KEY ("scraper_generation_run_id") REFERENCES "scraper_generation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "computer_use_steps" ADD CONSTRAINT "computer_use_steps_workflow_run_id_fkey"
  FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "computer_use_steps" ADD CONSTRAINT "computer_use_steps_screenshot_before_id_fkey"
  FOREIGN KEY ("screenshot_before_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "computer_use_steps" ADD CONSTRAINT "computer_use_steps_screenshot_after_id_fkey"
  FOREIGN KEY ("screenshot_after_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "scraper_execution_traces" ADD CONSTRAINT "scraper_execution_traces_workflow_config_id_fkey"
  FOREIGN KEY ("workflow_config_id") REFERENCES "workflow_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scraper_execution_traces" ADD CONSTRAINT "scraper_execution_traces_workflow_run_id_fkey"
  FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "extracted_items" ADD CONSTRAINT "extracted_items_website_target_id_fkey"
  FOREIGN KEY ("website_target_id") REFERENCES "website_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extracted_items" ADD CONSTRAINT "extracted_items_workflow_run_id_fkey"
  FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "plain_scraped_pages" ADD CONSTRAINT "plain_scraped_pages_workflow_run_id_fkey"
  FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_workflow_run_id_fkey"
  FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_plain_scraped_page_id_fkey"
  FOREIGN KEY ("plain_scraped_page_id") REFERENCES "plain_scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_extraction_schema_version_id_fkey"
  FOREIGN KEY ("extraction_schema_version_id") REFERENCES "extraction_schema_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "diagnostics_packages" ADD CONSTRAINT "diagnostics_packages_workflow_run_id_fkey"
  FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnostics_packages" ADD CONSTRAINT "diagnostics_packages_workflow_config_id_fkey"
  FOREIGN KEY ("workflow_config_id") REFERENCES "workflow_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_workflow_run_id_fkey"
  FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_website_target_id_fkey"
  FOREIGN KEY ("website_target_id") REFERENCES "website_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workflow_config_id_fkey"
  FOREIGN KEY ("workflow_config_id") REFERENCES "workflow_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workflow_run_id_fkey"
  FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── diagnostics_artifacts ─────────────────────────────────────────────────────
CREATE TABLE "diagnostics_artifacts" (
  "id"                     TEXT                      NOT NULL,
  "diagnostics_package_id" TEXT                      NOT NULL,
  "kind"                   "DiagnosticsArtifactKind" NOT NULL,
  "path"                   TEXT                      NOT NULL,
  "content_type"           TEXT                      NOT NULL,
  "size_bytes"             INTEGER                   NOT NULL,
  "created_at"             TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "diagnostics_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "diagnostics_artifacts_diagnostics_package_id_idx" ON "diagnostics_artifacts"("diagnostics_package_id");

ALTER TABLE "diagnostics_artifacts" ADD CONSTRAINT "diagnostics_artifacts_diagnostics_package_id_fkey"
  FOREIGN KEY ("diagnostics_package_id") REFERENCES "diagnostics_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
