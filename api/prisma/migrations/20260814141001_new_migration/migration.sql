-- AlterTable
ALTER TABLE "workflow_configs" ADD COLUMN     "persist_results" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "persist_results" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "results_purged_at" TIMESTAMP(3);
