-- AlterEnum
ALTER TYPE "CostCategory" ADD VALUE 'UI_GENERATION';

-- AlterTable
ALTER TABLE "extraction_results" ADD COLUMN     "generated_ui_html" TEXT;
