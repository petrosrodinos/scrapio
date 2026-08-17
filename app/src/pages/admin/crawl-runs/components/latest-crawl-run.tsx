import { Skeleton } from "@heroui/react";
import { useCrawlRun, useCrawlRuns } from "@/features/crawl-runs/hooks/use-crawl-runs";
import { CrawlRunDetailBody } from "./crawl-run-detail-body";
import { CrawlRunStatusChip } from "./crawl-run-status-chip";

interface LatestCrawlRunProps {
  workflowConfigId: string;
}

export function LatestCrawlRun({ workflowConfigId }: LatestCrawlRunProps) {
  const { data: runsData, isPending: isListPending } = useCrawlRuns({
    workflow_config_id: workflowConfigId,
    limit: 10,
  });
  const latestId = runsData?.data[0]?.id;
  const { data: run, isPending: isDetailPending } = useCrawlRun(latestId ?? "");

  if (isListPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40 rounded-md" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!latestId) {
    return null;
  }

  if (isDetailPending || !run) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-40 rounded-md" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <p className="text-lg font-semibold text-foreground">Latest crawl run</p>
        <CrawlRunStatusChip status={run.status} />
      </div>
      <CrawlRunDetailBody run={run} />
    </div>
  );
}
