import { CostCategories, type CostCategory } from "@/features/costs/interfaces/costs.interfaces";

export const CostCategoryFilterOptions: { id: CostCategory | "all"; label: string }[] = [
  { id: "all", label: "All categories" },
  { id: CostCategories.STRUCTURED_EXTRACTION, label: "Structured extraction" },
  { id: CostCategories.MARKDOWN_GENERATION, label: "Markdown generation" },
  { id: CostCategories.EMBEDDING, label: "Embedding" },
  { id: CostCategories.BROWSER_AGENT_RUN, label: "Browser agent run" },
  { id: CostCategories.SCRAPER_GENERATION, label: "Scraper generation" },
];

export function getCostCategoryLabel(category: CostCategory | string): string {
  return CostCategoryFilterOptions.find((option) => option.id === category)?.label ?? category;
}
