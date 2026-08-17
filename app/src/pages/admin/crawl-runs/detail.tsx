import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Play, Square, Trash2 } from "lucide-react";
import { useOverlayState } from "@heroui/react";
import { Routes } from "@/routes/routes";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { CrawlRunStatusChip } from "./components/crawl-run-status-chip";
import { CrawlRunDetailBody } from "./components/crawl-run-detail-body";
import { WorkflowTypeChip } from "./components/workflow-type-chip";
import {
  useCancelCrawlRun,
  useCrawlRun,
  useDeleteCrawlRun,
  useRerunCrawlRun,
} from "@/features/crawl-runs/hooks/use-crawl-runs";
import {
  CrawlRunStatuses,
  type CrawlRunStatus,
} from "@/features/crawl-runs/interfaces/crawl-runs.interfaces";

const ACTIVE_STATUSES: CrawlRunStatus[] = [
  CrawlRunStatuses.QUEUED,
  CrawlRunStatuses.RUNNING,
];

export default function CrawlRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stopConfirm = useOverlayState();
  const deleteConfirm = useOverlayState();

  const { data: run, isPending } = useCrawlRun(id!);
  const rerun = useRerunCrawlRun();
  const cancelRun = useCancelCrawlRun();
  const deleteRun = useDeleteCrawlRun();

  if (isPending || !run) {
    return <DetailSkeleton fieldCount={6} showSubTable subTableRows={3} />;
  }

  const isActive = ACTIVE_STATUSES.includes(run.status);
  const targetLabel =
    run.website_target?.name ?? run.url ?? run.urls?.[0] ?? run.workflow_config?.name ?? "Crawl run";

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate(Routes.crawlRuns.list)}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to crawl runs
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-2xl font-semibold tracking-tight text-foreground">{targetLabel}</p>
          <WorkflowTypeChip type={run.type} />
          <CrawlRunStatusChip status={run.status} />
          {isActive && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
        </div>
        <TableRowActionsMenu
          triggerLabel="Actions"
          ariaLabel="Crawl run actions"
          actions={[
            isActive
              ? {
                  id: "stop",
                  label: "Stop",
                  icon: Square,
                  isDisabled: cancelRun.isPending,
                }
              : {
                  id: "rerun",
                  label: "Rerun",
                  icon: Play,
                  isDisabled: rerun.isPending,
                },
            {
              id: "delete",
              label: "Delete",
              variant: "danger",
              icon: Trash2,
              isDisabled: deleteRun.isPending,
            },
          ]}
          onAction={(actionId) => {
            if (actionId === "stop") {
              stopConfirm.open();
              return;
            }
            if (actionId === "rerun") {
              rerun.mutate(run.id, {
                onSuccess: (newRun) => navigate(Routes.crawlRuns.detail(newRun.id)),
              });
              return;
            }
            if (actionId === "delete") {
              deleteConfirm.open();
            }
          }}
        />
      </div>

      <CrawlRunDetailBody run={run} />

      <ConfirmationDialog
        state={stopConfirm}
        title="Stop this crawl run?"
        description="The run will be marked cancelled and removed from the queue if possible. An already-running worker may still finish its current scrape work."
        confirmLabel="Stop crawl"
        isPending={cancelRun.isPending}
        onConfirm={async () => {
          await cancelRun.mutateAsync(run.id);
        }}
      />

      <ConfirmationDialog
        state={deleteConfirm}
        title="Delete this crawl run?"
        description="This will permanently delete the crawl run and its execution traces. This cannot be undone."
        confirmLabel="Delete"
        isPending={deleteRun.isPending}
        onConfirm={async () => {
          await deleteRun.mutateAsync(run.id);
          navigate(Routes.crawlRuns.list);
        }}
      />
    </div>
  );
}
