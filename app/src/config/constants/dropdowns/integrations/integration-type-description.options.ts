import {
  IntegrationTypes,
  type IntegrationType,
} from "@/features/integrations/interfaces/integrations.interfaces";

export const IntegrationTypeDescriptionOptions: {
  id: IntegrationType;
  description: string;
}[] = [
  {
    id: IntegrationTypes.ANTHROPIC,
    description: "Used for computer use and the scraper generator.",
  },
  {
    id: IntegrationTypes.OPENAI,
    description: "Used for normalisation and other AI functionality.",
  },
  {
    id: IntegrationTypes.GEMINI,
    description: "Used for normalisation and other AI functionality.",
  },
  {
    id: IntegrationTypes.DEEPSEEK,
    description: "Used for normalisation and other AI functionality.",
  },
];

export function getIntegrationTypeDescription(type: IntegrationType | string): string {
  return (
    IntegrationTypeDescriptionOptions.find((option) => option.id === type)?.description ?? ""
  );
}
