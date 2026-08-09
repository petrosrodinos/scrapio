-- AlterTable
ALTER TABLE "users" ADD COLUMN "default_ai_user_integration_id" TEXT;

-- CreateIndex
CREATE INDEX "users_default_ai_user_integration_id_idx" ON "users"("default_ai_user_integration_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_default_ai_user_integration_id_fkey" FOREIGN KEY ("default_ai_user_integration_id") REFERENCES "user_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
