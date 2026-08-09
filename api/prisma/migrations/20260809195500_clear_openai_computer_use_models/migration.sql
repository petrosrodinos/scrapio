-- Clear unused OpenAI computer use selections
UPDATE "user_integrations"
SET "computer_use_model" = NULL
WHERE "integration_type" = 'OPENAI'
  AND "computer_use_model" IS NOT NULL;
