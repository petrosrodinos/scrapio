-- AlterEnum
ALTER TYPE "ComputerUseModel" ADD VALUE 'COMPUTER_USE_PREVIEW';
ALTER TYPE "ComputerUseModel" ADD VALUE 'GEMINI_2_5_PRO';
ALTER TYPE "ComputerUseModel" ADD VALUE 'GEMINI_2_5_FLASH';
ALTER TYPE "ComputerUseModel" ADD VALUE 'GEMINI_2_0_FLASH';
ALTER TYPE "ComputerUseModel" ADD VALUE 'GEMINI_1_5_PRO';
ALTER TYPE "ComputerUseModel" ADD VALUE 'GEMINI_1_5_FLASH';
ALTER TYPE "ComputerUseModel" ADD VALUE 'DEEPSEEK_CHAT';
ALTER TYPE "ComputerUseModel" ADD VALUE 'DEEPSEEK_REASONER';

-- AlterTable
ALTER TABLE "user_integrations" ADD COLUMN "ai_model" "ComputerUseModel";

-- Move previously stored OpenAI chat models onto ai_model
UPDATE "user_integrations"
SET
  "ai_model" = "computer_use_model",
  "computer_use_model" = NULL
WHERE "integration_type" = 'OPENAI'
  AND "computer_use_model" IN (
    'GPT_4O',
    'GPT_4O_MINI',
    'GPT_4_TURBO',
    'GPT_4',
    'GPT_35_TURBO'
  );
