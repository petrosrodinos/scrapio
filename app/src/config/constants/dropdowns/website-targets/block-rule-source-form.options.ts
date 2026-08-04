import type { BlockRuleSource } from "@/features/website-targets/interfaces/website-targets.interfaces";

export const BlockRuleSourceFormOptions: {
  id: BlockRuleSource;
  label: string;
}[] = [
  { id: "TITLE", label: "Page title" },
  { id: "TEXT", label: "Visible text" },
  { id: "HTML", label: "HTML" },
  { id: "PATH", label: "URL path" },
  { id: "SCRIPT_CONTENT", label: "Script content" },
  { id: "SELECTOR", label: "CSS selector" },
];

export function getBlockRuleSourceLabel(
  source: BlockRuleSource | string,
): string {
  return (
    BlockRuleSourceFormOptions.find((option) => option.id === source)?.label ??
    source
  );
}
