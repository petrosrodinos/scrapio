import { CostCategories, type CostCategory } from "@/features/costs/interfaces/costs.interfaces";

export const CostCategoryFilterOptions: { id: CostCategory | "all"; label: string }[] = [
  { id: "all", label: "All categories" },
  { id: CostCategories.AI, label: "AI" },
  { id: CostCategories.COMPUTER_USE, label: "Computer use" },
];

export function getCostCategoryLabel(category: CostCategory | string): string {
  return CostCategoryFilterOptions.find((option) => option.id === category)?.label ?? category;
}
