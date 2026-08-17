-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('AI', 'COMPUTER_USE');

-- CreateTable
CREATE TABLE "cost_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "amount" DECIMAL(12,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "workflow_run_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cost_entries_user_id_idx" ON "cost_entries"("user_id");

-- CreateIndex
CREATE INDEX "cost_entries_category_idx" ON "cost_entries"("category");

-- CreateIndex
CREATE INDEX "cost_entries_user_id_category_idx" ON "cost_entries"("user_id", "category");

-- CreateIndex
CREATE INDEX "cost_entries_workflow_run_id_idx" ON "cost_entries"("workflow_run_id");

-- CreateIndex
CREATE INDEX "cost_entries_created_at_idx" ON "cost_entries"("created_at");

-- AddForeignKey
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_workflow_run_id_fkey"
  FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
