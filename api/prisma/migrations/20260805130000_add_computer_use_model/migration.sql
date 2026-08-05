CREATE TYPE "ComputerUseModel" AS ENUM ('CLAUDE_OPUS_4_8', 'CLAUDE_SONNET_4_6');

ALTER TABLE "user_integrations" ADD COLUMN "computer_use_model" "ComputerUseModel";
