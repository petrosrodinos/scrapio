-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'OPENAPI_SPEC';

-- AlterTable
ALTER TABLE "workflow_configs" ADD COLUMN     "capture_api" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "capture_api" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "captured_requests" JSONB,
ADD COLUMN     "openapi_spec_document_id" TEXT;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_openapi_spec_document_id_fkey" FOREIGN KEY ("openapi_spec_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
