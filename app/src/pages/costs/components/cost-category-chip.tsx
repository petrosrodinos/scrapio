import { Chip } from "@heroui/react";
import { CostCategoryFilterOptions } from "@/config/constants/dropdowns/costs/cost-category-filter.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { CostCategories, type CostCategory } from "@/features/costs/interfaces/costs.interfaces";

const categoryColor: Record<CostCategory, "accent" | "default"> = {
  [CostCategories.AI]: "accent",
  [CostCategories.COMPUTER_USE]: "default",
};

interface CostCategoryChipProps {
  category: CostCategory;
}

export function CostCategoryChip({ category }: CostCategoryChipProps) {
  return (
    <Chip color={categoryColor[category]} size="sm" variant="soft">
      <Chip.Label>{getDropdownOptionLabel(CostCategoryFilterOptions, category)}</Chip.Label>
    </Chip>
  );
}
