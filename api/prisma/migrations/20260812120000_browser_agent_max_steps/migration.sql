ALTER TABLE "workflow_configs" ADD COLUMN "max_steps" INTEGER DEFAULT 25;
ALTER TABLE "workflow_runs" ADD COLUMN "max_steps" INTEGER;
