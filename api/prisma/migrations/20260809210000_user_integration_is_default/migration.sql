-- AlterTable
ALTER TABLE "user_integrations" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing user-level default preference onto user_integrations
UPDATE "user_integrations" AS ui
SET "is_default" = true
FROM "users" AS u
WHERE u."default_ai_user_integration_id" = ui."id";

-- For users with AI integrations but no default yet, pick latest AI connection
UPDATE "user_integrations" AS ui
SET "is_default" = true
WHERE ui."id" IN (
  SELECT DISTINCT ON (ui2."user_id") ui2."id"
  FROM "user_integrations" AS ui2
  WHERE ui2."is_active" = true
    AND ui2."ai_model" IS NOT NULL
    AND ui2."integration_type" IN ('OPENAI', 'GEMINI', 'DEEPSEEK')
    AND NOT EXISTS (
      SELECT 1
      FROM "user_integrations" AS ui3
      WHERE ui3."user_id" = ui2."user_id"
        AND ui3."is_default" = true
    )
  ORDER BY ui2."user_id", ui2."updated_at" DESC
);

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_default_ai_user_integration_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "users_default_ai_user_integration_id_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "default_ai_user_integration_id";

-- CreateIndex
CREATE INDEX "user_integrations_user_id_is_default_idx" ON "user_integrations"("user_id", "is_default");
