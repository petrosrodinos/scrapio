import { useNavigate } from "react-router-dom";
import { Skeleton, Table } from "@heroui/react";
import { Routes } from "@/routes/routes";
import { formatDateTime } from "@/lib/date";
import { formatDuration } from "@/lib/duration";
import { useCrawlRuns } from "@/features/crawl-runs/hooks/use-crawl-runs";
import { CrawlRunStatusChip } from "./crawl-run-status-chip";

interface RecentCrawlRunsProps {
  workflowConfigId: string;
}

export function RecentCrawlRuns({ workflowConfigId }: RecentCrawlRunsProps) {
  const navigate = useNavigate();
  const { data: runsData, isPending } = useCrawlRuns({
    workflow_config_id: workflowConfigId,
    limit: 10,
  });
  const runs = runsData?.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg font-semibold text-foreground">Recent runs</p>
      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No runs yet.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Recent runs">
                <Table.Header>
                  <Table.Column isRowHeader>Status</Table.Column>
                  <Table.Column>Started</Table.Column>
                  <Table.Column>Duration</Table.Column>
                </Table.Header>
                <Table.Body>
                  {runs.map((run) => (
                    <Table.Row
                      key={run.id}
                      id={run.id}
                      onAction={() => navigate(Routes.crawlRuns.detail(run.id))}
                      className="cursor-pointer"
                    >
                      <Table.Cell>
                        <CrawlRunStatusChip status={run.status} />
                      </Table.Cell>
                      <Table.Cell>{formatDateTime(run.started_at)}</Table.Cell>
                      <Table.Cell>{formatDuration(run.duration_ms)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      )}
    </div>
  );
}
