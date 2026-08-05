import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Accordion, useOverlayState } from "@heroui/react";
import { Routes } from "@/routes/routes";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { CrawlRunStatusChip } from "./components/crawl-run-status-chip";
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
import { JobStatusChip } from "./components/job-status-chip";
import type { JobStatus } from "@/features/jobs/interfaces/jobs.interfaces";
import { formatDateTime } from "@/lib/date";
import { formatDuration } from "@/lib/duration";

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
  const traces = run.execution_traces ?? [];
  const jobLogs = run.job_logs ?? [];

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
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {run.website_target?.name ?? run.website_target_id}
          </p>
          <CrawlRunStatusChip status={run.status} />
          {isActive && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isActive ? (
            <ActionButtonWithPending
              variant="danger"
              isPending={cancelRun.isPending}
              isDisabled={cancelRun.isPending}
              onPress={stopConfirm.open}
            >
              Stop
            </ActionButtonWithPending>
          ) : (
            <ActionButtonWithPending
              variant="secondary"
              isPending={rerun.isPending}
              isDisabled={rerun.isPending}
              onPress={() =>
                rerun.mutate(run.id, {
                  onSuccess: (newRun) => navigate(Routes.crawlRuns.detail(newRun.id)),
                })
              }
            >
              Rerun
            </ActionButtonWithPending>
          )}
          <ActionButtonWithPending
            variant="danger"
            isPending={deleteRun.isPending}
            isDisabled={deleteRun.isPending}
            onPress={deleteConfirm.open}
          >
            Delete
          </ActionButtonWithPending>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Scrape</span>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Found</span>
            <span className="font-mono text-2xl font-bold text-foreground">{run.total_found}</span>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">New</span>
            <span className="font-mono text-2xl font-bold text-success">{run.total_new_listings}</span>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Refreshed</span>
            <span className="font-mono text-2xl font-bold text-foreground">{run.total_refreshed_listings}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Scraper</span>
          {run.scraper_id ? (
            <button
              className="text-sm text-accent hover:underline text-left"
              onClick={() => navigate(Routes.scrapers.detail(run.scraper_id!))}
            >
              {run.scraper?.name ?? run.scraper_id}
            </button>
          ) : (
            <span className="text-sm text-foreground">—</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Website target</span>
          <button
            className="text-sm text-accent hover:underline text-left"
            onClick={() => navigate(Routes.websiteTargets.detail(run.website_target_id))}
          >
            {run.website_target?.name ?? run.website_target_id}
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Started / finished
          </span>
          <span className="text-sm text-foreground">
            {formatDateTime(run.started_at)} / {formatDateTime(run.finished_at)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Duration</span>
          <span className="text-sm text-foreground">{formatDuration(run.duration_ms)}</span>
        </div>
        {run.error_message && (
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Error</span>
            <span className="text-sm text-danger">{run.error_message}</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface px-6">
        <Accordion defaultExpandedKeys={[]} hideSeparator>
          <Accordion.Item id="execution-traces">
            <Accordion.Heading>
              <Accordion.Trigger className="text-sm font-medium text-foreground">
                Execution traces ({traces.length})
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>
                <div className="flex flex-col gap-4 pb-4">
                  {run.diagnostics_package ? (
                    <button
                      className="text-sm text-accent hover:underline self-start"
                      onClick={() =>
                        navigate(Routes.diagnostics.detail(run.diagnostics_package!.id))
                      }
                    >
                      View diagnostics
                    </button>
                  ) : null}
                  {traces.length === 0 ? (
                    <p className="text-sm text-muted">No execution traces recorded.</p>
                  ) : (
                    traces.map((trace) => (
                      <div key={trace.id} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={trace.success ? "text-success" : "text-danger"}>
                            {trace.success ? "Success" : "Failed"}
                          </span>
                          <span className="text-muted">{formatDateTime(trace.created_at)}</span>
                          {trace.error_summary ? (
                            <span className="text-danger text-xs">{trace.error_summary}</span>
                          ) : null}
                        </div>
                        <pre className="rounded-lg border border-border bg-background p-3 text-xs overflow-auto max-h-96">
                          {JSON.stringify(trace.steps, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>

      <div className="rounded-xl border border-border bg-surface px-6">
        <Accordion defaultExpandedKeys={[]} hideSeparator>
          <Accordion.Item id="linked-jobs">
            <Accordion.Heading>
              <Accordion.Trigger className="text-sm font-medium text-foreground">
                Linked jobs ({jobLogs.length})
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>
                <div className="pb-4">
                  {jobLogs.length === 0 ? (
                    <p className="text-sm text-muted">No linked job logs.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {jobLogs.map((job) => (
                        <button
                          key={job.id}
                          onClick={() => navigate(Routes.admin.jobs.detail(job.id))}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-left hover:border-accent/50 transition-colors"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm text-foreground">
                              {job.job_name ?? job.queue_name}
                            </span>
                            <span className="text-xs text-muted">
                              attempt {job.attempt}
                              {job.max_attempts !== null ? ` / ${job.max_attempts}` : ""}
                              {job.duration_ms !== null
                                ? ` · ${formatDuration(job.duration_ms)}`
                                : ""}
                            </span>
                          </div>
                          <JobStatusChip status={job.status as JobStatus} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>

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
