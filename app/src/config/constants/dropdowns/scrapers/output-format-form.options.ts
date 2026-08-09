import {
  OutputFormats,
  type OutputFormat,
} from "@/features/scraper-generation/interfaces/output-config.interfaces";

export const OutputFormatFormOptions: { id: OutputFormat; label: string; description: string }[] =
  [
    {
      id: OutputFormats.STRUCTURED_JSON,
      label: "Structured JSON",
      description: "Normalized data validated against your output schema",
    },
    {
      id: OutputFormats.MARKDOWN,
      label: "Markdown",
      description: "Readable summary document from collected pages",
    },
  ];

export function getOutputFormatLabel(format: OutputFormat | string): string {
  return OutputFormatFormOptions.find((option) => option.id === format)?.label ?? format;
}
