ALTER TABLE "password_reset_tokens" RENAME COLUMN "user_uuid" TO "user_id";

ALTER INDEX "password_reset_tokens_user_uuid_idx" RENAME TO "password_reset_tokens_user_id_idx";

ALTER TABLE "password_reset_tokens" RENAME CONSTRAINT "password_reset_tokens_user_uuid_fkey" TO "password_reset_tokens_user_id_fkey";
