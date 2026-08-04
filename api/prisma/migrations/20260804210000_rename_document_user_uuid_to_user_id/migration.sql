ALTER TABLE "documents" RENAME COLUMN "user_uuid" TO "user_id";

ALTER INDEX "documents_user_uuid_idx" RENAME TO "documents_user_id_idx";
