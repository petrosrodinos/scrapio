-- CreateEnum
CREATE TYPE "AiBatchJobStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "RunStatus" ADD VALUE 'AWAITING_AI_BATCH';

-- AlterEnum
ALTER TYPE "WebhookEventType" ADD VALUE 'WORKFLOW_RUN_AI_BATCH_SUBMITTED';

-- AlterTable
ALTER TABLE "workflow_configs" ADD COLUMN     "ai_batch_mode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "ai_batch_mode" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ai_batch_jobs" (
    "id" TEXT NOT NULL,
    "workflow_run_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "external_batch_id" TEXT NOT NULL,
    "input_file_id" TEXT NOT NULL,
    "output_file_id" TEXT,
    "error_file_id" TEXT,
    "status" "AiBatchJobStatus" NOT NULL DEFAULT 'SUBMITTED',
    "request_count" INTEGER NOT NULL,
    "error_message" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "last_polled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_batch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_batch_request_items" (
    "id" TEXT NOT NULL,
    "ai_batch_job_id" TEXT NOT NULL,
    "custom_id" TEXT NOT NULL,
    "plain_scraped_page_id" TEXT,
    "source_url" TEXT,
    "content_label" TEXT,
    "content" TEXT NOT NULL,
    "instructions" TEXT,
    "wants_markdown" BOOLEAN NOT NULL DEFAULT false,
    "regex_data" JSONB,
    "status" "ExtractionFormatStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_batch_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_batch_jobs_workflow_run_id_key" ON "ai_batch_jobs"("workflow_run_id");

-- CreateIndex
CREATE INDEX "ai_batch_jobs_status_idx" ON "ai_batch_jobs"("status");

-- CreateIndex
CREATE INDEX "ai_batch_jobs_user_id_idx" ON "ai_batch_jobs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_batch_request_items_ai_batch_job_id_custom_id_key" ON "ai_batch_request_items"("ai_batch_job_id", "custom_id");

-- AddForeignKey
ALTER TABLE "ai_batch_jobs" ADD CONSTRAINT "ai_batch_jobs_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_batch_request_items" ADD CONSTRAINT "ai_batch_request_items_ai_batch_job_id_fkey" FOREIGN KEY ("ai_batch_job_id") REFERENCES "ai_batch_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_batch_request_items" ADD CONSTRAINT "ai_batch_request_items_plain_scraped_page_id_fkey" FOREIGN KEY ("plain_scraped_page_id") REFERENCES "plain_scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
