import { useNavigate } from "react-router-dom";
import { Button, Skeleton } from "@heroui/react";
import { Routes } from "@/routes/routes";
import { useCrawlRun, useCrawlRuns } from "@/features/crawl-runs/hooks/use-crawl-runs";
import { CrawlRunDetailBody } from "./crawl-run-detail-body";
import { CrawlRunStatusChip } from "./crawl-run-status-chip";

interface LatestCrawlRunProps {
  workflowConfigId: string;
}

export function LatestCrawlRun({ workflowConfigId }: LatestCrawlRunProps) {
  const navigate = useNavigate();
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-lg font-semibold text-foreground">Latest crawl run</p>
          <CrawlRunStatusChip status={run.status} />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => navigate(Routes.crawlRuns.detail(run.id))}
        >
          View run
        </Button>
      </div>
      <CrawlRunDetailBody run={run} />
    </div>
  );
}
