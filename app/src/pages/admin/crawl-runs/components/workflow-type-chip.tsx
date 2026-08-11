import { Chip } from "@heroui/react";
import { WorkflowTypes, type WorkflowType } from "@/features/crawl-runs/interfaces/crawl-runs.interfaces";

const workflowTypeLabel: Record<WorkflowType, string> = {
  [WorkflowTypes.SCRAPER]: "Reusable scraper",
  [WorkflowTypes.PLAIN_SCRAPE]: "Plain scrape",
  [WorkflowTypes.BROWSER_AGENT]: "Browser agent",
};

const workflowTypeColor: Record<WorkflowType, "default" | "success" | "warning" | "danger"> = {
  [WorkflowTypes.SCRAPER]: "success",
  [WorkflowTypes.PLAIN_SCRAPE]: "default",
  [WorkflowTypes.BROWSER_AGENT]: "warning",
};

interface WorkflowTypeChipProps {
  type: WorkflowType;
}

export function WorkflowTypeChip({ type }: WorkflowTypeChipProps) {
  return (
    <Chip color={workflowTypeColor[type]} size="sm" variant="soft">
      <Chip.Label>{workflowTypeLabel[type]}</Chip.Label>
    </Chip>
  );
}
